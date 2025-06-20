
'use server';
import type { Member, MemberWriteData, GDI, MinistryArea, MemberRoleType } from '@/lib/types';
import { NO_ROLE_FILTER_VALUE, NO_GDI_FILTER_VALUE, NO_AREA_FILTER_VALUE } from '@/lib/types';
// import { readDbFile, writeDbFile } from '@/lib/db-utils'; // Commented out
// import { placeholderMembers, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data'; // Commented out
import { calculateMemberRoles } from '@/lib/roleUtils';
import { executeQuery, getRowsAndTotal } from '@/lib/mysql-connector';
import { getAllGdis } from './gdiService'; // Still needed for role calculation logic if kept in TS
import { getAllMinistryAreas } from './ministryAreaService'; // Still needed for role calculation

// const MEMBERS_DB_FILE = 'members-db.json'; // No longer used
// const GDIS_DB_FILE = 'gdis-db.json'; // No longer used by this service directly for member data
// const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json'; // No longer used by this service directly

const roleDisplayMap: Record<MemberRoleType, string> = {
  Leader: "Líder",
  Worker: "Obrero",
  GeneralAttendee: "Asistente General",
};
const statusDisplayMap: Record<Member['status'], string> = {
  Active: "Activo",
  Inactive: "Inactivo",
  New: "Nuevo"
};

// Helper to convert array to comma-separated string for SPs
const arrayToCsv = (arr?: string[]): string | null => {
  if (!arr || arr.length === 0) return null;
  return arr.join(',');
};

// Helper to parse roles and assignedAreaIds from SP string results
const parseStringList = (str: string | null | undefined): string[] => {
  if (!str) return [];
  return str.split(',');
}

interface MemberQueryResult extends Omit<Member, 'roles' | 'assignedAreaIds'> {
  roles: string | null; // Comma-separated string from DB
  assignedAreaIds: string | null; // Comma-separated string from DB
}


export async function getAllMembers(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  memberStatusFiltersParam?: string[],
  roleFilterParams?: string[],
  guideIdFilterParams?: string[],
  areaIdFilterParams?: string[]
): Promise<{ members: Member[], totalMembers: number, totalPages: number }> {
  try {
    const statusFiltersCsv = arrayToCsv(memberStatusFiltersParam);
    const roleFiltersCsv = arrayToCsv(roleFilterParams);
    const guideFiltersCsv = arrayToCsv(guideIdFilterParams);
    const areaFiltersCsv = arrayToCsv(areaIdFilterParams);

    const results = await executeQuery<any[]>(
      'CALL sp_GetAllMembers(?, ?, ?, ?, ?, ?, ?)',
      [page, pageSize, searchTerm || null, statusFiltersCsv, roleFiltersCsv, guideFiltersCsv, areaFiltersCsv]
    );

    const { rows, totalCount } = getRowsAndTotal<MemberQueryResult>(results);
    
    const members: Member[] = rows.map(row => ({
        ...row,
        birthDate: row.birthDate ? new Date(row.birthDate).toISOString().split('T')[0] : undefined,
        churchJoinDate: row.churchJoinDate ? new Date(row.churchJoinDate).toISOString().split('T')[0] : undefined,
        roles: parseStringList(row.roles) as MemberRoleType[],
        assignedAreaIds: parseStringList(row.assignedAreaIds),
    }));

    const totalPages = Math.ceil(totalCount / pageSize);
    return { members, totalMembers: totalCount, totalPages };

  } catch (error) {
    console.error("Error in getAllMembers service:", error);
    throw error;
  }
}


export async function getAllMembersNonPaginated(): Promise<Member[]> {
   try {
    // Calling sp_GetAllMembers with null pagination params, or create a specific SP if needed
    // For simplicity, using a high page size to fetch all. Not ideal for very large datasets.
    const results = await executeQuery<any[]>('CALL sp_GetAllMembers(?, ?, ?, ?, ?, ?, ?)', [1, 10000, null, null, null, null, null]);
    const { rows } = getRowsAndTotal<MemberQueryResult>(results);
     return rows.map(row => ({
        ...row,
        birthDate: row.birthDate ? new Date(row.birthDate).toISOString().split('T')[0] : undefined,
        churchJoinDate: row.churchJoinDate ? new Date(row.churchJoinDate).toISOString().split('T')[0] : undefined,
        roles: parseStringList(row.roles) as MemberRoleType[],
        assignedAreaIds: parseStringList(row.assignedAreaIds),
    }));
  } catch (error) {
    console.error("Error in getAllMembersNonPaginated service:", error);
    throw error;
  }
}


export async function getMemberById(id: string): Promise<Member | undefined> {
  try {
    const results = await executeQuery<MemberQueryResult[]>('CALL sp_GetMemberById(?)', [id]);
    if (results && results.length > 0) {
      const row = results[0];
       return {
        ...row,
        birthDate: row.birthDate ? new Date(row.birthDate).toISOString().split('T')[0] : undefined,
        churchJoinDate: row.churchJoinDate ? new Date(row.churchJoinDate).toISOString().split('T')[0] : undefined,
        roles: parseStringList(row.roles) as MemberRoleType[],
        assignedAreaIds: parseStringList(row.assignedAreaIds),
      };
    }
    return undefined;
  } catch (error) {
    console.error(`Error in getMemberById service for ID ${id}:`, error);
    throw error;
  }
}

export async function addMember(memberData: MemberWriteData): Promise<Member> {
  const newMemberId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    const allGdis = await getAllGdis(); // Still needed for role calculation
    const allMinistryAreas = await getAllMinistryAreas(); // Still needed for role calculation

    await executeQuery<any>(
      'CALL sp_AddMember(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newMemberId,
        memberData.firstName,
        memberData.lastName,
        memberData.email || null,
        memberData.phone,
        memberData.birthDate ? new Date(memberData.birthDate) : null,
        memberData.churchJoinDate ? new Date(memberData.churchJoinDate) : null,
        memberData.baptismDate || null,
        memberData.attendsLifeSchool || false,
        memberData.attendsBibleInstitute || false,
        memberData.fromAnotherChurch || false,
        memberData.status,
        memberData.avatarUrl || 'https://placehold.co/100x100',
        memberData.assignedGDIId || null
      ]
    );
    
    // Handle Area Assignments
    if (memberData.assignedAreaIds && memberData.assignedAreaIds.length > 0) {
        await executeQuery<any>(
            'CALL sp_SetMemberMinistryAreas(?, ?)',
            [newMemberId, memberData.assignedAreaIds.join(',')]
        );
    }
    
    // Calculate roles (application layer)
    const tempMemberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
        id: newMemberId,
        assignedGDIId: memberData.assignedGDIId,
        assignedAreaIds: memberData.assignedAreaIds
    };
    const calculatedRoles = calculateMemberRoles(tempMemberForRoleCalc, allGdis, allMinistryAreas);

    // Save roles
    if (calculatedRoles.length > 0) {
        await executeQuery<any>(
            'CALL sp_SetMemberRoles(?, ?)',
            [newMemberId, calculatedRoles.join(',')]
        );
    }
    
    const newMember = await getMemberById(newMemberId);
    if (!newMember) throw new Error("Failed to retrieve newly added member.");
    return newMember;

  } catch (error) {
    console.error("Error in addMember service:", error);
    throw error;
  }
}

export async function updateMember(memberId: string, updates: Partial<Omit<Member, 'id'>>): Promise<Member> {
   try {
    const existingMember = await getMemberById(memberId);
    if (!existingMember) {
        throw new Error(`Member with ID ${memberId} not found for update.`);
    }

    // Merge updates with existing data to ensure all fields are present if SP expects them
    const memberToUpdate = { ...existingMember, ...updates };
    
    await executeQuery<any>(
      'CALL sp_UpdateMember(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        memberId,
        memberToUpdate.firstName,
        memberToUpdate.lastName,
        memberToUpdate.email || null,
        memberToUpdate.phone,
        memberToUpdate.birthDate ? new Date(memberToUpdate.birthDate) : null,
        memberToUpdate.churchJoinDate ? new Date(memberToUpdate.churchJoinDate) : null,
        memberToUpdate.baptismDate || null,
        memberToUpdate.attendsLifeSchool || false,
        memberToUpdate.attendsBibleInstitute || false,
        memberToUpdate.fromAnotherChurch || false,
        memberToUpdate.status,
        memberToUpdate.avatarUrl || 'https://placehold.co/100x100',
        memberToUpdate.assignedGDIId || null
      ]
    );

    // Handle Area Assignment Changes
    // If assignedAreaIds is part of updates, it means we need to resync them.
    if (updates.assignedAreaIds !== undefined) {
        await executeQuery<any>(
            'CALL sp_SetMemberMinistryAreas(?, ?)',
            [memberId, (updates.assignedAreaIds || []).join(',')]
        );
    }

    // Recalculate and Update Roles
    const allGdis = await getAllGdis();
    const allMinistryAreas = await getAllMinistryAreas();
    const tempMemberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
        id: memberId,
        assignedGDIId: memberToUpdate.assignedGDIId,
        assignedAreaIds: memberToUpdate.assignedAreaIds
    };
    const calculatedRoles = calculateMemberRoles(tempMemberForRoleCalc, allGdis, allMinistryAreas);
     await executeQuery<any>(
        'CALL sp_SetMemberRoles(?, ?)',
        [memberId, calculatedRoles.join(',')]
    );

    const updatedMember = await getMemberById(memberId);
    if (!updatedMember) throw new Error("Failed to retrieve updated member.");
    return updatedMember;

  } catch (error) {
    console.error(`Error in updateMember service for ID ${memberId}:`, error);
    throw error;
  }
}

// updateMemberAssignments is more complex and involves cross-service logic.
// It's typically handled in the application layer after an update.
// The sp_UpdateMember should handle the direct data, and then this function
// would be called in the route handler/server action if GDI/Area assignments changed.
// For now, the SPs for Add/UpdateMember don't deeply manage these cross-entity assignments;
// that's orchestrated by the calling service or will need more sophisticated SPs.
// The `updateMember` above now includes calls to `sp_SetMemberMinistryAreas` and `sp_SetMemberRoles`.
// Logic for unassigning from old GDIs/Areas if changed is part of the SPs for GDI/Area updates.

export async function updateMemberAssignments(
  memberId: string,
  originalMemberData: Member,
  updatedMemberData: Member
): Promise<string[]> {
  // This function's logic needs to be re-evaluated.
  // With SPs, assignments might be handled when updating the GDI/Area itself,
  // or by calling specific SPs like `sp_AssignMemberToGDI`, `sp_RemoveMemberFromArea`, etc.
  // The current `sp_UpdateMember` and `sp_AddMember` assume assignments are handled
  // by `sp_SetMemberMinistryAreas` and by setting `assignedGDIId`.
  // The `sp_UpdateGdi` and `sp_UpdateMinistryArea` should manage their member lists.
  
  // For roles, the `updateMember` service function already recalculates and sets them.
  // This function might become a wrapper for more granular SP calls if needed,
  // or its logic might be fully absorbed by the individual entity update SPs.
  
  console.warn("updateMemberAssignments may need refactoring with Stored Procedures. Current role/area updates are handled within addMember/updateMember services.");
  let affectedIdsForRoleRecalculation = new Set<string>([memberId]);
  
  // If GDI changed
  if (originalMemberData.assignedGDIId !== updatedMemberData.assignedGDIId) {
    if (originalMemberData.assignedGDIId) {
        // Potentially tell old GDI's SP to remove member
    }
    if (updatedMemberData.assignedGDIId) {
        // Potentially tell new GDI's SP to add member
    }
  }

  // If Areas changed
  const oldAreas = new Set(originalMemberData.assignedAreaIds || []);
  const newAreas = new Set(updatedMemberData.assignedAreaIds || []);
  const addedToAreas = [...newAreas].filter(areaId => !oldAreas.has(areaId));
  const removedFromAreas = [...oldAreas].filter(areaId => !newAreas.has(areaId));

  // addedToAreas.forEach(areaId => call sp_AddMemberToArea(memberId, areaId));
  // removedFromAreas.forEach(areaId => call sp_RemoveMemberFromArea(memberId, areaId));

  return Array.from(affectedIdsForRoleRecalculation);
}

// addMemberToAssignments also needs re-evaluation.
// The `sp_AddMember` now handles initial GDI and `sp_SetMemberMinistryAreas` handles areas.
export async function addMemberToAssignments(
  newMember: Member
): Promise<void> {
    console.warn("addMemberToAssignments logic mostly handled by sp_AddMember and related SP calls. Review if still needed.");
    // Initial GDI assignment is done in sp_AddMember by passing p_AssignedGDIId
    // Initial Area assignments are done by calling sp_SetMemberMinistryAreas in addMember service
}

export async function bulkRecalculateAndUpdateRoles(memberIdsToUpdate: string[]): Promise<void> {
  if (memberIdsToUpdate.length === 0) {
    return;
  }
  try {
    const allGdis = await getAllGdis();
    const allMinistryAreas = await getAllMinistryAreas();

    for (const memberId of memberIdsToUpdate) {
      const member = await getMemberById(memberId); // Fetch current member data for assignments
      if (member) {
        const memberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
          id: member.id,
          assignedGDIId: member.assignedGDIId,
          assignedAreaIds: member.assignedAreaIds,
        };
        const newRoles = calculateMemberRoles(memberForRoleCalc, allGdis, allMinistryAreas);
        await executeQuery<any>(
            'CALL sp_SetMemberRoles(?, ?)',
            [memberId, newRoles.join(',')]
        );
      }
    }
  } catch (error) {
    console.error("Error in bulkRecalculateAndUpdateRoles:", error);
    throw error;
  }
}

    