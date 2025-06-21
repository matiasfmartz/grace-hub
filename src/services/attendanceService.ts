
'use server';
import type { AttendanceRecord, Meeting, Member, MeetingSeries, GDI, MinistryArea } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';

const ATTENDANCE_DB_FILE = 'attendance-db.json';
const MEMBERS_DB_FILE = 'members-db.json'; 
const MEETING_SERIES_DB_FILE = 'meeting-series-db.json';
const GDIS_DB_FILE = 'gdis-db.json';
const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  return readDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, []);
}

export async function getAttendanceForMeeting(meetingId: string): Promise<AttendanceRecord[]> {
  const allRecords = await getAllAttendanceRecords();
  return allRecords.filter(record => record.meetingId === meetingId);
}

export async function saveMeetingAttendance(
  meetingId: string,
  memberAttendances: Array<{ memberId: string; attended: boolean; notes?: string }>
): Promise<void> {
  let allRecords = await getAllAttendanceRecords();
  
  memberAttendances.forEach(newAtt => {
    const recordIndex = allRecords.findIndex(
      r => r.meetingId === meetingId && r.memberId === newAtt.memberId
    );

    if (recordIndex !== -1) {
      allRecords[recordIndex].attended = newAtt.attended;
      allRecords[recordIndex].notes = newAtt.notes || allRecords[recordIndex].notes; 
    } else {
      const newRecord: AttendanceRecord = {
        id: `${meetingId}-${newAtt.memberId}-${Date.now()}`, 
        meetingId,
        memberId: newAtt.memberId,
        attended: newAtt.attended,
        notes: newAtt.notes || '',
      };
      allRecords.push(newRecord);
    }
  });

  await writeDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, allRecords);
}

export async function getResolvedAttendees(
    meeting: Meeting,
    allMembersParam?: Member[],
    allMeetingSeriesParam?: MeetingSeries[] 
): Promise<Member[]> {
    const allMembers = allMembersParam || await readDbFile<Member>(MEMBERS_DB_FILE, []);
    const allMeetingSeries = allMeetingSeriesParam || await readDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, []);

    const parentSeries = allMeetingSeries.find(s => s.id === meeting.seriesId);

    if (!parentSeries) {
        // If series not found, fall back to UIDs stored in meeting if any
        if (!meeting.attendeeUids || meeting.attendeeUids.length === 0) return [];
        return allMembers.filter(member => meeting.attendeeUids.includes(member.id))
            .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }

    if (parentSeries.seriesType === 'general') {
        if (parentSeries.targetAttendeeGroups.includes("allMembers")) {
            // For 'general' series with 'allMembers' target, all members are expected.
            return [...allMembers].sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        } else {
            // For 'general' series with specific roles (workers, leaders), use UIDs from meeting.attendeeUids (resolved at series creation)
            if (!meeting.attendeeUids || meeting.attendeeUids.length === 0) return [];
            return allMembers.filter(member => meeting.attendeeUids.includes(member.id))
                .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        }
    } else if ((parentSeries.seriesType === 'gdi' || parentSeries.seriesType === 'ministryArea') && parentSeries.ownerGroupId) {
        // For group-specific meetings, always dynamically resolve attendees based on current group membership.
        // This ensures that changes to the group (like adding a member) are immediately reflected in who is expected at meetings.
        let groupMemberIds: string[] = [];
        if (parentSeries.seriesType === 'gdi') {
            const gdis = await readDbFile<GDI>(GDIS_DB_FILE, []);
            const gdi = gdis.find(g => g.id === parentSeries.ownerGroupId);
            if (gdi) {
                // Combine guide and members, ensuring no duplicates.
                groupMemberIds = Array.from(new Set([gdi.guideId, ...gdi.memberIds]));
            }
        } else if (parentSeries.seriesType === 'ministryArea') {
            const areas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, []);
            const area = areas.find(a => a.id === parentSeries.ownerGroupId);
            if (area) {
                 // Combine leader and members, ensuring no duplicates.
                groupMemberIds = Array.from(new Set([area.leaderId, ...area.memberIds]));
            }
        }
        
        return allMembers.filter(member => groupMemberIds.includes(member.id))
            .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }
    
    // Default fallback: if UIDs are directly stored in meeting (e.g. occasional meeting with custom list)
    if (meeting.attendeeUids && meeting.attendeeUids.length > 0) {
        return allMembers.filter(member => meeting.attendeeUids.includes(member.id))
            .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }
    
    return [];
}
