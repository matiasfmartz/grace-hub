
'use server';
import type { GDI, GdiWriteData, Member, MeetingSeries } from '@/lib/types';
import { executeQuery, getRowsAndTotal } from '@/lib/mysql-connector';
import { deleteMeetingSeries } from './meetingService'; // Assumes this service is/will be MySQL backed
import { getAllMembersNonPaginated } from './memberService'; // For role calculation & affected IDs

// Helper to parse comma-separated member IDs string from DB
const parseMemberIdsString = (memberIdsStr: string | null | undefined): string[] => {
  if (!memberIdsStr) return [];
  return memberIdsStr.split(',').filter(id => id.trim() !== '');
};

interface GdiQueryResult extends Omit<GDI, 'memberIds'> {
  memberIds: string | null; // Comma-separated string from DB
}


export async function getAllGdis(): Promise<GDI[]> {
  try {
    const results = await executeQuery<GdiQueryResult[]>('CALL sp_GetAllGdis()');
    const rows = getRowsAndTotal<GdiQueryResult>(results).rows;
    return rows.map(gdi => ({
      ...gdi,
      memberIds: parseMemberIdsString(gdi.memberIds),
    }));
  } catch (error) {
    console.error("Error in getAllGdis service:", error);
    throw error;
  }
}

export async function getGdiById(id: string): Promise<GDI | undefined> {
  try {
    const results = await executeQuery<GdiQueryResult[]>('CALL sp_GetGdiById(?)', [id]);
    const rows = getRowsAndTotal<GdiQueryResult>(results).rows;
    if (rows.length > 0) {
      const gdi = rows[0];
      return {
        ...gdi,
        memberIds: parseMemberIdsString(gdi.memberIds),
      };
    }
    return undefined;
  } catch (error) {
    console.error(`Error in getGdiById service for ID ${id}:`, error);
    throw error;
  }
}

export async function addGdi(gdiData: GdiWriteData): Promise<GDI> {
  const newGdiId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    await executeQuery<any>(
      'CALL sp_AddGDI(?, ?, ?, ?, ?, ?)',
      [
        newGdiId,
        gdiData.name,
        gdiData.guideId,
        gdiData.coordinatorId || null,
        gdiData.mentorId || null,
        (gdiData.memberIds && gdiData.memberIds.length > 0) ? gdiData.memberIds.join(',') : null
      ]
    );
    
    // The SP sp_AddGDI now also handles initial member assignments if p_MemberIds is passed.
    // If more complex logic is needed for member re-assignment from other GDIs, that would
    // need to be orchestrated here with more SP calls or enhanced SP logic.

    const newGdi = await getGdiById(newGdiId);
    if (!newGdi) throw new Error("Failed to retrieve newly added GDI.");
    return newGdi;
  } catch (error) {
    console.error("Error in addGdi service:", error);
    throw error;
  }
}

export async function updateGdiAndSyncMembers(
  gdiIdToUpdate: string,
  updatedGdiData: Partial<Pick<GDI, 'name' | 'guideId' | 'coordinatorId' | 'mentorId' | 'memberIds'>>
): Promise<{ updatedGdi: GDI; affectedMemberIds: string[] }> {
  try {
    const originalGdi = await getGdiById(gdiIdToUpdate);
    if (!originalGdi) {
      throw new Error(`GDI with ID ${gdiIdToUpdate} not found.`);
    }

    const affectedMemberIds = new Set<string>();

    // Add original and new guide/coordinator/mentor to affected list
    if (originalGdi.guideId) affectedMemberIds.add(originalGdi.guideId);
    if (updatedGdiData.guideId) affectedMemberIds.add(updatedGdiData.guideId);
    if (originalGdi.coordinatorId) affectedMemberIds.add(originalGdi.coordinatorId);
    if (updatedGdiData.coordinatorId) affectedMemberIds.add(updatedGdiData.coordinatorId);
    if (originalGdi.mentorId) affectedMemberIds.add(originalGdi.mentorId);
    if (updatedGdiData.mentorId) affectedMemberIds.add(updatedGdiData.mentorId);

    // Add original and new members to affected list
    (originalGdi.memberIds || []).forEach(id => affectedMemberIds.add(id));
    (updatedGdiData.memberIds || []).forEach(id => affectedMemberIds.add(id));
    
    const finalMemberIdsStr = (updatedGdiData.memberIds && updatedGdiData.memberIds.length > 0)
      ? updatedGdiData.memberIds.join(',')
      : null;

    await executeQuery<any>(
      'CALL sp_UpdateGDI(?, ?, ?, ?, ?, ?)',
      [
        gdiIdToUpdate,
        updatedGdiData.name ?? originalGdi.name,
        updatedGdiData.guideId ?? originalGdi.guideId,
        updatedGdiData.coordinatorId ?? originalGdi.coordinatorId,
        updatedGdiData.mentorId ?? originalGdi.mentorId,
        finalMemberIdsStr 
      ]
    );
    
    // The SP sp_UpdateGDI now also handles updating member assignments if p_MemberIds is passed.
    // This implies it removes old members not in the new list and adds new ones.

    const updatedGdi = await getGdiById(gdiIdToUpdate);
    if (!updatedGdi) throw new Error("Failed to retrieve updated GDI.");
    
    return { updatedGdi, affectedMemberIds: Array.from(affectedMemberIds).filter(Boolean) as string[] };
  } catch (error) {
    console.error(`Error in updateGdiAndSyncMembers for ID ${gdiIdToUpdate}:`, error);
    throw error;
  }
}

export async function deleteGdi(gdiId: string): Promise<string[]> {
  try {
    const gdiToDelete = await getGdiById(gdiId);
    if (!gdiToDelete) {
      throw new Error(`GDI with ID ${gdiId} not found for deletion.`);
    }
    
    const affectedMemberIds = new Set<string>();
    if (gdiToDelete.guideId) affectedMemberIds.add(gdiToDelete.guideId);
    if (gdiToDelete.coordinatorId) affectedMemberIds.add(gdiToDelete.coordinatorId);
    if (gdiToDelete.mentorId) affectedMemberIds.add(gdiToDelete.mentorId);
    (gdiToDelete.memberIds || []).forEach(id => affectedMemberIds.add(id));

    // Call SP to delete the GDI. This SP should also handle unassigning members.
    await executeQuery<any>('CALL sp_DeleteGDI(?)', [gdiId]);

    // Cascade delete to meeting series associated with this GDI
    // This assumes getAllMeetingSeries and deleteMeetingSeries are MySQL-backed
    const allMeetingSeries = await getAllMeetingSeries(); // Fetch all series
    const seriesToDelete = allMeetingSeries.filter(
      series => series.seriesType === 'gdi' && series.ownerGroupId === gdiId
    );

    for (const series of seriesToDelete) {
      await deleteMeetingSeries(series.id); // This should call its own SP to delete series & related data
    }
    
    return Array.from(affectedMemberIds).filter(Boolean) as string[];
  } catch (error) {
    console.error(`Error in deleteGdi service for ID ${gdiId}:`, error);
    throw error;
  }
}
