
'use server';
import type { AttendanceRecord, AttendanceRecordWriteData, GDI, Meeting, Member, MinistryArea } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';

const ATTENDANCE_DB_FILE = 'attendance-db.json';

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
      // Update existing record
      allRecords[recordIndex].attended = newAtt.attended;
      allRecords[recordIndex].notes = newAtt.notes || allRecords[recordIndex].notes; // Keep existing notes if new one isn't provided
    } else {
      // Add new record
      const newRecord: AttendanceRecord = {
        id: `${meetingId}-${newAtt.memberId}-${Date.now()}`, // More unique ID
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


export function getResolvedAttendees(
    meeting: Meeting,
    allMembers: Member[],
    allGdis: GDI[],
    allMinistryAreas: MinistryArea[]
): Member[] {
    const resolvedAttendeesSet = new Set<string>();

    switch (meeting.type) {
        case 'General_Service':
            // All active members are potential attendees for a general service.
            // For simplicity, we might list all active members or those in GDIs.
            // Let's assume for now it's all active members who are part of a GDI.
            allMembers.forEach(member => {
                if (member.status === 'Active' && member.assignedGDIId) {
                    resolvedAttendeesSet.add(member.id);
                }
            });
            break;

        case 'GDI_Meeting':
            if (meeting.relatedGdiId) {
                const gdi = allGdis.find(g => g.id === meeting.relatedGdiId);
                if (gdi) {
                    resolvedAttendeesSet.add(gdi.guideId);
                    gdi.memberIds.forEach(id => resolvedAttendeesSet.add(id));
                }
            }
            break;

        case 'Obreros_Meeting':
            // GDI Guides
            allGdis.forEach(gdi => resolvedAttendeesSet.add(gdi.guideId));
            // Ministry Area Leaders and Members
            allMinistryAreas.forEach(area => {
                resolvedAttendeesSet.add(area.leaderId);
                area.memberIds.forEach(memberId => resolvedAttendeesSet.add(memberId));
            });
            break;

        case 'Lideres_Meeting':
            // GDI Guides
            allGdis.forEach(gdi => resolvedAttendeesSet.add(gdi.guideId));
            // Ministry Area Leaders
            allMinistryAreas.forEach(area => resolvedAttendeesSet.add(area.leaderId));
            break;

        case 'Area_Meeting':
            if (meeting.relatedAreaId) {
                const area = allMinistryAreas.find(a => a.id === meeting.relatedAreaId);
                if (area) {
                    resolvedAttendeesSet.add(area.leaderId);
                    area.memberIds.forEach(id => resolvedAttendeesSet.add(id));
                }
            }
            break;

        case 'Special_Meeting':
            // Attendees are directly listed in meeting.attendeeUids
            if (meeting.attendeeUids) {
                meeting.attendeeUids.forEach(id => resolvedAttendeesSet.add(id));
            }
            break;
        
        default:
            // For unknown types, or if more granular logic is needed later
            break;
    }
    
    // Filter out inactive/new members and map IDs to Member objects
    return allMembers.filter(member => 
        resolvedAttendeesSet.has(member.id) && member.status === 'Active'
    ).sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
}
