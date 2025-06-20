
'use server';
import type { AttendanceRecord, Meeting, Member, MeetingSeries, GDI, MinistryArea } from '@/lib/types';
import { executeQuery, getRowsAndTotal } from '@/lib/mysql-connector';

// Import other service functions for fallbacks in getResolvedAttendees
import { getAllMembersNonPaginated } from './memberService';
import { getAllMeetingSeries } from './meetingService';
import { getAllGdis } from './gdiService';
import { getAllMinistryAreas } from './ministryAreaService';


export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const results = await executeQuery<AttendanceRecord[]>('CALL sp_GetAllAttendanceRecords()');
    // The SP directly returns the array of records
    return results && Array.isArray(results) ? results[0] as AttendanceRecord[] : [];
  } catch (error) {
    console.error("Error in getAllAttendanceRecords service:", error);
    throw error;
  }
}

export async function getAttendanceForMeeting(meetingId: string): Promise<AttendanceRecord[]> {
  try {
    const results = await executeQuery<AttendanceRecord[]>(
      'CALL sp_GetAttendanceByMeetingId(?)',
      [meetingId]
    );
    return results && Array.isArray(results) ? results[0] as AttendanceRecord[] : [];
  } catch (error) {
    console.error(`Error in getAttendanceForMeeting service for meeting ID ${meetingId}:`, error);
    throw error;
  }
}

export async function saveMeetingAttendance(
  meetingId: string,
  memberAttendances: Array<{ memberId: string; attended: boolean; notes?: string }>
): Promise<void> {
  try {
    for (const newAtt of memberAttendances) {
      const recordId = `${meetingId}-${newAtt.memberId}-${Date.now()}`; // Generate ID, SP will upsert based on meetingId & memberId
      await executeQuery<any>(
        'CALL sp_UpsertAttendanceRecord(?, ?, ?, ?, ?)',
        [
          recordId, // Pass generated ID for potential insert
          meetingId,
          newAtt.memberId,
          newAtt.attended,
          newAtt.notes || null,
        ]
      );
    }
  } catch (error) {
    console.error("Error in saveMeetingAttendance service:", error);
    throw error;
  }
}

export async function getResolvedAttendees(
    meeting: Meeting,
    allMembersParam?: Member[],
    allMeetingSeriesParam?: MeetingSeries[]
): Promise<Member[]> {
    const allMembers = allMembersParam || await getAllMembersNonPaginated();
    const allMeetingSeriesData = allMeetingSeriesParam || await getAllMeetingSeries();

    const parentSeries = allMeetingSeriesData.find(s => s.id === meeting.seriesId);

    if (!parentSeries) {
        if (!meeting.attendeeUids || meeting.attendeeUids.length === 0) return [];
        return allMembers.filter(member => meeting.attendeeUids.includes(member.id))
            .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }

    if (parentSeries.seriesType === 'general') {
        if (parentSeries.targetAttendeeGroups.includes("allMembers")) {
            return [...allMembers].sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        } else {
            if (!meeting.attendeeUids || meeting.attendeeUids.length === 0) return [];
            return allMembers.filter(member => meeting.attendeeUids.includes(member.id))
                .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        }
    } else if ((parentSeries.seriesType === 'gdi' || parentSeries.seriesType === 'ministryArea') && parentSeries.ownerGroupId) {
        let groupMemberIds: string[] = [];
        if (parentSeries.seriesType === 'gdi') {
            const gdis = await getAllGdis();
            const gdi = gdis.find(g => g.id === parentSeries.ownerGroupId);
            if (gdi) {
                groupMemberIds = [gdi.guideId, ...(gdi.memberIds || [])];
            }
        } else if (parentSeries.seriesType === 'ministryArea') {
            const areas = await getAllMinistryAreas();
            const area = areas.find(a => a.id === parentSeries.ownerGroupId);
            if (area) {
                groupMemberIds = [area.leaderId, ...(area.memberIds || [])];
                if (area.coordinatorId) groupMemberIds.push(area.coordinatorId);
                if (area.mentorId) groupMemberIds.push(area.mentorId);
            }
        }
        
        // Deduplicate IDs before filtering members
        groupMemberIds = Array.from(new Set(groupMemberIds.filter(Boolean)));


        if (!meeting.attendeeUids || meeting.attendeeUids.length === 0) {
             if (groupMemberIds.length > 0) {
                 return allMembers.filter(member => groupMemberIds.includes(member.id))
                    .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
             }
             return [];
        }

        return allMembers.filter(member => meeting.attendeeUids.includes(member.id))
            .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }
    
    if (meeting.attendeeUids && meeting.attendeeUids.length > 0) {
        return allMembers.filter(member => meeting.attendeeUids.includes(member.id))
            .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }
    
    return [];
}
