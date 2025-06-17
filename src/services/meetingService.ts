
'use server';
import type { Meeting, MeetingWriteData, MeetingSeries, MeetingSeriesWriteData, Member, GDI, MinistryArea, MeetingTargetRoleType, AttendanceRecord } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { format, parseISO } from 'date-fns';

const MEETINGS_DB_FILE = 'meetings-db.json';
const MEETING_SERIES_DB_FILE = 'meeting-series-db.json';
const MEMBERS_DB_FILE = 'members-db.json'; 
const GDIS_DB_FILE = 'gdis-db.json';
const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';
const ATTENDANCE_DB_FILE = 'attendance-db.json';


// Meeting Series Functions
export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
  return readDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, []);
}

export async function getMeetingSeriesById(id: string): Promise<MeetingSeries | undefined> {
  const seriesList = await getAllMeetingSeries();
  return seriesList.find(series => series.id === id);
}

async function resolveAttendeeUids(targetGroups: MeetingTargetRoleType[]): Promise<string[]> {
    const allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, []);
    const allGdis = await readDbFile<GDI>(GDIS_DB_FILE, []);
    const allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, []);
    const attendeeSet = new Set<string>();

    for (const role of targetGroups) {
        if (role === 'generalAttendees') {
            allMembers.forEach(member => {
                if (member.assignedGDIId && member.status === 'Active') { 
                    attendeeSet.add(member.id);
                }
            });
        } else if (role === 'workers') {
            allGdis.forEach(gdi => {
                const guide = allMembers.find(m => m.id === gdi.guideId && m.status === 'Active');
                if(guide) attendeeSet.add(gdi.guideId);
            });
            allMinistryAreas.forEach(area => {
                const leader = allMembers.find(m => m.id === area.leaderId && m.status === 'Active');
                if(leader) attendeeSet.add(area.leaderId);
                area.memberIds.forEach(memberId => {
                    const member = allMembers.find(m => m.id === memberId && m.status === 'Active');
                    if (member && memberId !== area.leaderId) attendeeSet.add(memberId);
                });
            });
        } else if (role === 'leaders') {
            allGdis.forEach(gdi => {
                 const guide = allMembers.find(m => m.id === gdi.guideId && m.status === 'Active');
                 if(guide) attendeeSet.add(gdi.guideId);
            });
            allMinistryAreas.forEach(area => {
                const leader = allMembers.find(m => m.id === area.leaderId && m.status === 'Active');
                if(leader) attendeeSet.add(area.leaderId);
            });
        }
    }
    return Array.from(attendeeSet);
}

export async function addMeetingSeries(
  seriesData: MeetingSeriesWriteData,
  oneTimeDate?: Date
): Promise<{series: MeetingSeries, instance?: Meeting}> {
  const seriesList = await getAllMeetingSeries();
  const newSeriesId = `series-${Date.now().toString()}-${Math.random().toString(36).substring(2, 7)}`;
  const newSeries: MeetingSeries = {
    id: newSeriesId,
    ...seriesData,
    defaultImageUrl: seriesData.defaultImageUrl || 'https://placehold.co/600x400',
  };
  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, [...seriesList, newSeries]);

  let meetingInstance: Meeting | undefined = undefined;
  if (newSeries.frequency === "OneTime" && oneTimeDate) {
    const resolvedUids = await resolveAttendeeUids(newSeries.targetAttendeeGroups);
    meetingInstance = await addMeetingInstance({
        seriesId: newSeries.id,
        name: `${newSeries.name} (${format(oneTimeDate, 'd MMM')})`,
        date: format(oneTimeDate, 'yyyy-MM-dd'),
        time: newSeries.defaultTime,
        location: newSeries.defaultLocation,
        description: newSeries.description,
        imageUrl: newSeries.defaultImageUrl,
        attendeeUids: resolvedUids,
        minute: null,
    });
  }
  return {series: newSeries, instance: meetingInstance};
}

export async function updateMeetingSeries(seriesId: string, updates: Partial<MeetingSeriesWriteData>): Promise<MeetingSeries> {
  const seriesList = await getAllMeetingSeries();
  const seriesIndex = seriesList.findIndex(s => s.id === seriesId);
  if (seriesIndex === -1) {
    throw new Error(`MeetingSeries with ID ${seriesId} not found.`);
  }

  const updatedSeries: MeetingSeries = {
    ...seriesList[seriesIndex],
    ...updates,
    defaultImageUrl: updates.defaultImageUrl || seriesList[seriesIndex].defaultImageUrl || 'https://placehold.co/600x400',
  };

  seriesList[seriesIndex] = updatedSeries;
  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, seriesList);
  return updatedSeries;
}

export async function deleteMeetingSeries(seriesId: string): Promise<void> {
  // 1. Delete the series itself
  const seriesList = await getAllMeetingSeries();
  const updatedSeriesList = seriesList.filter(s => s.id !== seriesId);
  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, updatedSeriesList);

  // 2. Delete associated meeting instances
  const allMeetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingsToDelete = allMeetings.filter(m => m.seriesId === seriesId);
  const meetingIdsToDelete = meetingsToDelete.map(m => m.id);
  const remainingMeetings = allMeetings.filter(m => m.seriesId !== seriesId);
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, remainingMeetings);

  // 3. Delete attendance records for the deleted meetings
  if (meetingIdsToDelete.length > 0) {
    const allAttendance = await readDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, []);
    const remainingAttendance = allAttendance.filter(att => !meetingIdsToDelete.includes(att.meetingId));
    await writeDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, remainingAttendance);
  }
}


// Meeting Instance Functions
export async function getAllMeetings(): Promise<Meeting[]> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []); 
  return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getMeetingsBySeriesId(seriesId: string): Promise<Meeting[]> {
  const allMeetings = await getAllMeetings();
  return allMeetings.filter(meeting => meeting.seriesId === seriesId)
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const meetings = await getAllMeetings();
  return meetings.find(meeting => meeting.id === id);
}

export async function addMeetingInstance(meetingInstanceData: Omit<Meeting, 'id'>): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  
  const newMeetingInstance: Meeting = {
    id: `instance-${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    ...meetingInstanceData,
    attendeeUids: meetingInstanceData.attendeeUids || [] 
  };
  const updatedMeetings = [...meetings, newMeetingInstance];
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, updatedMeetings);
  return newMeetingInstance;
}

export async function updateMeeting(meetingId: string, updates: Partial<MeetingWriteData>): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingIndex = meetings.findIndex(m => m.id === meetingId);

  if (meetingIndex === -1) {
    throw new Error(`Meeting with ID ${meetingId} not found.`);
  }
  
  let formattedUpdates = { ...updates } as Partial<Meeting>;
  if (updates.date && updates.date instanceof Date) {
    formattedUpdates.date = format(updates.date, 'yyyy-MM-dd');
  }

  const updatedMeeting: Meeting = {
    ...meetings[meetingIndex],
    ...formattedUpdates,
    attendeeUids: 'attendeeUids' in updates && Array.isArray(updates.attendeeUids) 
                  ? updates.attendeeUids 
                  : meetings[meetingIndex].attendeeUids,
  };

  meetings[meetingIndex] = updatedMeeting;
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, meetings);
  return updatedMeeting;
}


export async function updateMeetingMinute(meetingId: string, minute: string | null): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingIndex = meetings.findIndex(m => m.id === meetingId);

  if (meetingIndex === -1) {
    throw new Error(`Meeting with ID ${meetingId} not found.`);
  }

  meetings[meetingIndex].minute = minute;
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, meetings);
  return meetings[meetingIndex];
}

