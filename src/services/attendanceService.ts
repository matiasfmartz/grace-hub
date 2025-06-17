
'use server';
import type { AttendanceRecord, Meeting, Member, MeetingSeries } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';

const ATTENDANCE_DB_FILE = 'attendance-db.json';
const MEMBERS_DB_FILE = 'members-db.json'; 
const MEETING_SERIES_DB_FILE = 'meeting-series-db.json'; // Added for dynamic resolution

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

    if (parentSeries && parentSeries.targetAttendeeGroups.includes("allMembers")) {
        // "allMembers" (Todos) means everyone, no status filtering.
        return [...allMembers].sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }

    // Original logic for other target groups (workers, leaders) or specific UIDs stored in meeting.attendeeUids
    // If meeting.attendeeUids is empty (because it was an "allMembers" series), this will correctly return []
    // unless other logic (like workers/leaders) specifically populated it for some reason.
    if (!meeting.attendeeUids || meeting.attendeeUids.length === 0) {
        return [];
    }
    
    return allMembers
        .filter(member => meeting.attendeeUids.includes(member.id)) 
        .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
}
