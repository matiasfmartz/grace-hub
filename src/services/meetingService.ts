
'use server';
import type { Meeting, MeetingWriteData, MeetingSeries, MeetingSeriesWriteData, Member, GDI, MinistryArea, MeetingTargetRoleType, AttendanceRecord, DayOfWeekType, MonthlyRuleType, WeekOrdinalType, MeetingFrequencyType } from '@/lib/types';
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
): Promise<{series: MeetingSeries, instance?: Meeting}> {
  const seriesList = await getAllMeetingSeries();
  const newSeriesId = `series-${Date.now().toString()}-${Math.random().toString(36).substring(2, 7)}`;
  
  const newSeries: MeetingSeries = {
    id: newSeriesId,
    name: seriesData.name,
    description: seriesData.description,
    defaultTime: seriesData.defaultTime,
    defaultLocation: seriesData.defaultLocation,
    defaultImageUrl: seriesData.defaultImageUrl || 'https://placehold.co/600x400',
    targetAttendeeGroups: seriesData.targetAttendeeGroups,
    frequency: seriesData.frequency,
    oneTimeDate: seriesData.frequency === "OneTime" ? seriesData.oneTimeDate : undefined,
    weeklyDays: seriesData.frequency === "Weekly" ? seriesData.weeklyDays : undefined,
    monthlyRuleType: seriesData.frequency === "Monthly" ? seriesData.monthlyRuleType : undefined,
    monthlyDayOfMonth: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfMonth" ? seriesData.monthlyDayOfMonth : undefined,
    monthlyWeekOrdinal: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyWeekOrdinal : undefined,
    monthlyDayOfWeek: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyDayOfWeek : undefined,
  };
  
  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, [...seriesList, newSeries]);

  let meetingInstance: Meeting | undefined = undefined;
  if (newSeries.frequency === "OneTime" && newSeries.oneTimeDate) {
    const resolvedUids = await resolveAttendeeUids(newSeries.targetAttendeeGroups);
    const oneTimeDateObj = parseISO(newSeries.oneTimeDate); // oneTimeDate is string YYYY-MM-DD
    meetingInstance = await addMeetingInstance({
        seriesId: newSeries.id,
        name: `${newSeries.name} (${format(oneTimeDateObj, 'd MMM')})`,
        date: newSeries.oneTimeDate, // Already YYYY-MM-DD
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

  const existingSeries = seriesList[seriesIndex];
  const updatedSeries: MeetingSeries = {
    ...existingSeries,
    ...updates,
    defaultImageUrl: updates.defaultImageUrl || existingSeries.defaultImageUrl || 'https://placehold.co/600x400',
    // Conditionally keep or clear recurrence fields based on new frequency
    oneTimeDate: updates.frequency === "OneTime" ? updates.oneTimeDate ?? existingSeries.oneTimeDate : undefined,
    weeklyDays: updates.frequency === "Weekly" ? updates.weeklyDays ?? existingSeries.weeklyDays : undefined,
    monthlyRuleType: updates.frequency === "Monthly" ? updates.monthlyRuleType ?? existingSeries.monthlyRuleType : undefined,
    monthlyDayOfMonth: updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfMonth" ? updates.monthlyDayOfMonth ?? existingSeries.monthlyDayOfMonth : undefined,
    monthlyWeekOrdinal: updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfWeekOfMonth" ? updates.monthlyWeekOrdinal ?? existingSeries.monthlyWeekOrdinal : undefined,
    monthlyDayOfWeek: updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfWeekOfMonth" ? updates.monthlyDayOfWeek ?? existingSeries.monthlyDayOfWeek : undefined,
  };
  
  // If frequency changed FROM OneTime, ensure oneTimeDate is cleared
  if (existingSeries.frequency === "OneTime" && updates.frequency && updates.frequency !== "OneTime") {
    updatedSeries.oneTimeDate = undefined;
  }
  // Similar logic for weekly and monthly fields if frequency changes away from them
  if (existingSeries.frequency === "Weekly" && updates.frequency && updates.frequency !== "Weekly") {
    updatedSeries.weeklyDays = undefined;
  }
  if (existingSeries.frequency === "Monthly" && updates.frequency && updates.frequency !== "Monthly") {
    updatedSeries.monthlyRuleType = undefined;
    updatedSeries.monthlyDayOfMonth = undefined;
    updatedSeries.monthlyWeekOrdinal = undefined;
    updatedSeries.monthlyDayOfWeek = undefined;
  }


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
  if (updates.date && typeof updates.date === 'string' && !isNaN(parseISO(updates.date).getTime())) {
    // Assuming updates.date is already YYYY-MM-DD string
    formattedUpdates.date = updates.date;
  } else if (updates.date && updates.date instanceof Date) {
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
