
'use server';
import type { AttendanceRecord, Meeting, Member } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';

const ATTENDANCE_DB_FILE = 'attendance-db.json';
const MEMBERS_DB_FILE = 'members-db.json'; // For fetching member details

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

// Returns Member objects for UIDs provided in meeting.attendeeUids
export async function getResolvedAttendees(
    meeting: Meeting,
    allMembers?: Member[] // Optional: pass all members to avoid re-reading file
): Promise<Member[]> {
    const membersToFetch = allMembers || await readDbFile<Member>(MEMBERS_DB_FILE, []);
    
    if (!meeting.attendeeUids || meeting.attendeeUids.length === 0) {
        return [];
    }

    // Removed "&& member.status === 'Active'" to include all members listed in attendeeUids
    return membersToFetch
        .filter(member => meeting.attendeeUids.includes(member.id)) 
        .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
}

