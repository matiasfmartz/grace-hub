
'use server';
import type { MinistryArea, MinistryAreaWriteData, Member, MeetingSeries } from '@/lib/types';
import { executeQuery, getRowsAndTotal } from '@/lib/mysql-connector';
import { deleteMeetingSeries } from './meetingService'; // Assumes this service is/will be MySQL backed

// Helper to parse comma-separated member IDs string from DB
const parseMemberIdsString = (memberIdsStr: string | null | undefined): string[] => {
  if (!memberIdsStr) return [];
  return memberIdsStr.split(',').filter(id => id.trim() !== '');
};

interface MinistryAreaQueryResult extends Omit<MinistryArea, 'memberIds'> {
  memberIds: string | null; // Comma-separated string from DB
}

export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
  try {
    const results = await executeQuery<MinistryAreaQueryResult[]>('CALL sp_GetAllMinistryAreas()');
    const rows = getRowsAndTotal<MinistryAreaQueryResult>(results).rows;
    return rows.map(area => ({
      ...area,
      memberIds: parseMemberIdsString(area.memberIds),
    }));
  } catch (error) {
    console.error("Error in getAllMinistryAreas service:", error);
    throw error;
  }
}

export async function getMinistryAreaById(id: string): Promise<MinistryArea | undefined> {
  try {
    const results = await executeQuery<MinistryAreaQueryResult[]>('CALL sp_GetMinistryAreaById(?)', [id]);
    const rows = getRowsAndTotal<MinistryAreaQueryResult>(results).rows;
    if (rows.length > 0) {
      const area = rows[0];
      return {
        ...area,
        memberIds: parseMemberIdsString(area.memberIds),
      };
    }
    return undefined;
  } catch (error) {
    console.error(`Error in getMinistryAreaById service for ID ${id}:`, error);
    throw error;
  }
}

export async function addMinistryArea(areaData: MinistryAreaWriteData): Promise<MinistryArea> {
  const newAreaId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    await executeQuery<any>(
      'CALL sp_AddMinistryArea(?, ?, ?, ?, ?, ?)',
      [
        newAreaId,
        areaData.name,
        areaData.description || null,
        areaData.leaderId,
        areaData.coordinatorId || null,
        areaData.mentorId || null,
      ]
    );

    // Assign members using sp_SetMinistryAreaMembers
    // The SP should handle the MemberMinistryAreas junction table.
    // The SP should also ideally update Members.assignedAreaIds or this is handled by a trigger.
    if (areaData.memberIds && areaData.memberIds.length > 0) {
      // Ensure leader is not in the memberIds list passed to sp_SetMinistryAreaMembers
      const membersToAssign = areaData.memberIds.filter(id => id !== areaData.leaderId);
      if (membersToAssign.length > 0) {
        await executeQuery<any>(
          'CALL sp_SetMinistryAreaMembers(?, ?)',
          [newAreaId, membersToAssign.join(',')]
        );
      }
    }
    // It's important that sp_AddMinistryArea also ensures the leader is assigned if not done by sp_SetMinistryAreaMembers

    const newArea = await getMinistryAreaById(newAreaId);
    if (!newArea) throw new Error("Failed to retrieve newly added Ministry Area.");
    return newArea;
  } catch (error) {
    console.error("Error in addMinistryArea service:", error);
    throw error;
  }
}

export async function updateMinistryAreaAndSyncMembers(
  areaId: string,
  updatedAreaData: Partial<Pick<MinistryArea, 'leaderId' | 'coordinatorId' | 'mentorId' | 'memberIds' | 'name' | 'description'>>
): Promise<{ updatedArea: MinistryArea; affectedMemberIds: string[] }> {
  try {
    const originalArea = await getMinistryAreaById(areaId);
    if (!originalArea) {
      throw new Error(`Ministry Area with ID ${areaId} not found.`);
    }

    const affectedMemberIds = new Set<string>();

    // Add original and new leader/coordinator/mentor to affected list
    if (originalArea.leaderId) affectedMemberIds.add(originalArea.leaderId);
    if (updatedAreaData.leaderId) affectedMemberIds.add(updatedAreaData.leaderId);
    if (originalArea.coordinatorId) affectedMemberIds.add(originalArea.coordinatorId);
    if (updatedAreaData.coordinatorId) affectedMemberIds.add(updatedAreaData.coordinatorId);
    if (originalArea.mentorId) affectedMemberIds.add(originalArea.mentorId);
    if (updatedAreaData.mentorId) affectedMemberIds.add(updatedAreaData.mentorId);

    // Add original and new members to affected list
    (originalArea.memberIds || []).forEach(id => affectedMemberIds.add(id));
    if (updatedAreaData.memberIds) { // Only if memberIds are being explicitly updated
        updatedAreaData.memberIds.forEach(id => affectedMemberIds.add(id));
    }


    await executeQuery<any>(
      'CALL sp_UpdateMinistryArea(?, ?, ?, ?, ?, ?)',
      [
        areaId,
        updatedAreaData.name ?? originalArea.name,
        updatedAreaData.description ?? originalArea.description,
        updatedAreaData.leaderId ?? originalArea.leaderId,
        updatedAreaData.coordinatorId !== undefined ? updatedAreaData.coordinatorId : originalArea.coordinatorId,
        updatedAreaData.mentorId !== undefined ? updatedAreaData.mentorId : originalArea.mentorId,
      ]
    );

    // If memberIds are part of the update, sync them
    if (updatedAreaData.memberIds !== undefined) {
      const membersToAssign = updatedAreaData.memberIds.filter(id => id !== (updatedAreaData.leaderId || originalArea.leaderId));
      await executeQuery<any>(
        'CALL sp_SetMinistryAreaMembers(?, ?)',
        [areaId, membersToAssign.length > 0 ? membersToAssign.join(',') : null]
      );
    }

    const updatedArea = await getMinistryAreaById(areaId);
    if (!updatedArea) throw new Error("Failed to retrieve updated Ministry Area.");
    
    return { updatedArea, affectedMemberIds: Array.from(affectedMemberIds).filter(Boolean) as string[] };
  } catch (error) {
    console.error(`Error in updateMinistryAreaAndSyncMembers for ID ${areaId}:`, error);
    throw error;
  }
}

export async function deleteMinistryArea(areaId: string): Promise<string[]> {
  try {
    const areaToDelete = await getMinistryAreaById(areaId);
    if (!areaToDelete) {
      throw new Error(`Ministry Area with ID ${areaId} not found for deletion.`);
    }
    
    const affectedMemberIds = new Set<string>();
    if (areaToDelete.leaderId) affectedMemberIds.add(areaToDelete.leaderId);
    if (areaToDelete.coordinatorId) affectedMemberIds.add(areaToDelete.coordinatorId);
    if (areaToDelete.mentorId) affectedMemberIds.add(areaToDelete.mentorId);
    (areaToDelete.memberIds || []).forEach(id => affectedMemberIds.add(id));

    // Call SP to delete the Ministry Area. This SP should also handle
    // unassigning members from MemberMinistryAreas and potentially updating Members.assignedAreaIds
    // (or rely on triggers for the latter).
    await executeQuery<any>('CALL sp_DeleteMinistryArea(?)', [areaId]);

    // Cascade delete to meeting series associated with this area
    // This assumes getAllMeetingSeries and deleteMeetingSeries are MySQL-backed
    const allMeetingSeries = await getAllMeetingSeries(); // Fetch all series
    const seriesToDelete = allMeetingSeries.filter(
      series => series.seriesType === 'ministryArea' && series.ownerGroupId === areaId
    );

    for (const series of seriesToDelete) {
      await deleteMeetingSeries(series.id); // This should call its own SP to delete series & related data
    }
    
    return Array.from(affectedMemberIds).filter(Boolean) as string[];
  } catch (error) {
    console.error(`Error in deleteMinistryArea service for ID ${areaId}:`, error);
    throw error;
  }
}
