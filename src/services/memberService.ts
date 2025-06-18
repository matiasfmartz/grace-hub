
'use server';
import type { Member, MemberWriteData, GDI, MinistryArea, MemberRoleType } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderMembers, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import { calculateMemberRoles } from '@/lib/roleUtils';

const MEMBERS_DB_FILE = 'members-db.json';
const GDIS_DB_FILE = 'gdis-db.json';
const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';

export async function getAllMembers(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  statusFilterParam?: string,
  roleFilter?: string,
  guideIdFilter?: string
): Promise<{ members: Member[], totalMembers: number, totalPages: number }> {
  const allMembersFromFile = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  let workingFilteredMembers = [...allMembersFromFile]; // Start with a copy of all members

  // Apply status filter
  if (statusFilterParam) {
    workingFilteredMembers = workingFilteredMembers.filter(member => member.status === statusFilterParam);
  }

  // Apply role filter
  if (roleFilter) {
    workingFilteredMembers = workingFilteredMembers.filter(member => member.roles?.includes(roleFilter as MemberRoleType));
  }

  // Apply guide filter
  if (guideIdFilter) {
    const allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs); // Consider caching this if called often
    const gdisLedByThisGuide = allGdis.filter(gdi => gdi.guideId === guideIdFilter);
    if (gdisLedByThisGuide.length > 0) {
        const membersToInclude = new Set<string>();
        membersToInclude.add(guideIdFilter); // Add the guide themselves
        gdisLedByThisGuide.forEach(gdi => {
            gdi.memberIds.forEach(memberId => membersToInclude.add(memberId));
        });
        workingFilteredMembers = workingFilteredMembers.filter(member => membersToInclude.has(member.id));
    } else {
        // If a specific guide is selected but they don't lead any GDI, result in no members for this filter.
        workingFilteredMembers = [];
    }
  }

  // Then apply general search term to the already filtered list
  if (searchTerm) {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    workingFilteredMembers = workingFilteredMembers.filter(member =>
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(lowercasedSearchTerm) ||
      member.email.toLowerCase().includes(lowercasedSearchTerm) ||
      member.phone.toLowerCase().includes(lowercasedSearchTerm) ||
      (member.status && member.status.toLowerCase().includes(lowercasedSearchTerm)) || // Search in raw status
      (member.status && statusDisplayMap[member.status]?.toLowerCase().includes(lowercasedSearchTerm)) || // Search in displayed status
      (member.roles && member.roles.some(role => role.toLowerCase().includes(lowercasedSearchTerm))) || // Search in raw roles
      (member.roles && member.roles.some(role => { // Search in displayed roles
         return (roleDisplayMap[role] || role).toLowerCase().includes(lowercasedSearchTerm);
      }))
    );
  }

  const totalMembers = workingFilteredMembers.length;
  const totalPages = Math.ceil(totalMembers / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const membersForPage = workingFilteredMembers.slice(startIndex, endIndex);
  return { members: membersForPage, totalMembers, totalPages };
}

// Helper maps for searching displayed values (if needed by search logic)
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


export async function getAllMembersNonPaginated(): Promise<Member[]> {
  return readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
}


export async function getMemberById(id: string): Promise<Member | undefined> {
  const members = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  return members.find(member => member.id === id);
}

export async function addMember(memberData: MemberWriteData): Promise<Member> {
  const members = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
  const allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);

  const tempMemberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
      id: '', // Temporary, will be replaced
      assignedGDIId: memberData.assignedGDIId,
      assignedAreaIds: memberData.assignedAreaIds
  };

  const newMemberId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
  tempMemberForRoleCalc.id = newMemberId; // Use the generated ID for role calculation

  const calculatedRoles = calculateMemberRoles(tempMemberForRoleCalc, allGdis, allMinistryAreas);

  const newMember: Member = {
    ...memberData,
    id: newMemberId,
    avatarUrl: memberData.avatarUrl || 'https://placehold.co/100x100',
    roles: calculatedRoles,
  };

  const updatedMembers = [...members, newMember];
  await writeDbFile<Member>(MEMBERS_DB_FILE, updatedMembers);
  await addMemberToAssignments(newMember); // This function needs to be defined or imported

  return newMember;
}

export async function updateMember(memberId: string, updates: Partial<Omit<Member, 'id'>>): Promise<Member> {
  let members = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
  const allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);

  const memberIndex = members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) {
    throw new Error(`Member with ID ${memberId} not found.`);
  }

  // Merge updates with existing member data
  const updatedMemberInstance: Member = {
    ...members[memberIndex],
    ...updates,
    avatarUrl: updates.avatarUrl || members[memberIndex].avatarUrl || 'https://placehold.co/100x100', // Ensure avatarUrl has a fallback
  };

  // Recalculate roles based on potentially updated assignments
  const memberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
    id: memberId,
    assignedGDIId: updatedMemberInstance.assignedGDIId,
    assignedAreaIds: updatedMemberInstance.assignedAreaIds,
  };
  updatedMemberInstance.roles = calculateMemberRoles(memberForRoleCalc, allGdis, allMinistryAreas);

  members[memberIndex] = updatedMemberInstance;
  await writeDbFile<Member>(MEMBERS_DB_FILE, members);
  return members[memberIndex];
}

// This function handles synchronizing a member's GDI and Ministry Area assignments
// when their direct assignments (assignedGDIId, assignedAreaIds on Member object) change.
export async function updateMemberAssignments(
  memberId: string,
  originalMemberData: Member, // Member data *before* the direct assignment changes
  updatedMemberData: Member   // Member data *after* the direct assignment changes
): Promise<string[]> { // Returns array of member IDs whose roles might need recalculation
  const oldAssignedGDIId = originalMemberData.assignedGDIId;
  const newAssignedGDIId = updatedMemberData.assignedGDIId;
  const oldAssignedAreaIds = originalMemberData.assignedAreaIds || [];
  const newAssignedAreaIds = updatedMemberData.assignedAreaIds || [];

  let affectedMemberIdsForRoleRecalculation = new Set<string>([memberId]);

  // 1. Sync GDI Assignment Changes
  if (oldAssignedGDIId !== newAssignedGDIId) {
    let allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
    let gdisDbChanged = false;

    // Remove member from old GDI's memberIds list (if they were a member, not guide)
    // Or update guide if they were the guide.
    if (oldAssignedGDIId) {
      const oldGdiIndex = allGdis.findIndex(gdi => gdi.id === oldAssignedGDIId);
      if (oldGdiIndex !== -1) {
        if (allGdis[oldGdiIndex].guideId === memberId) {
          // If member was the guide, the GDI needs a new guide or to be marked as needing one.
          // For simplicity, we'll assign a placeholder. A real app might require explicit new guide selection.
           allGdis[oldGdiIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${oldAssignedGDIId}`; // Needs a valid member ID or a strategy
           affectedMemberIdsForRoleRecalculation.add(allGdis[oldGdiIndex].guideId); // The new placeholder guide
        }
        // Always remove from memberIds if present
        allGdis[oldGdiIndex].memberIds = allGdis[oldGdiIndex].memberIds.filter(id => id !== memberId);
        gdisDbChanged = true;
      }
    }

    // Add member to new GDI's memberIds list (if they are not the guide)
    if (newAssignedGDIId) {
      const newGdiIndex = allGdis.findIndex(gdi => gdi.id === newAssignedGDIId);
      if (newGdiIndex !== -1) {
        if (allGdis[newGdiIndex].guideId !== memberId && !allGdis[newGdiIndex].memberIds.includes(memberId)) {
          allGdis[newGdiIndex].memberIds.push(memberId);
          gdisDbChanged = true;
        }
        // If the member became the guide of this GDI, ensure they aren't in its memberIds
        if (allGdis[newGdiIndex].guideId === memberId) {
            allGdis[newGdiIndex].memberIds = allGdis[newGdiIndex].memberIds.filter(id => id !== memberId);
            gdisDbChanged = true;
        }
      }
    }
    if (gdisDbChanged) {
      await writeDbFile<GDI>(GDIS_DB_FILE, allGdis);
    }
  }

  // 2. Sync Ministry Area Assignment Changes
  const originalAreaIdsSet = new Set(oldAssignedAreaIds);
  const updatedAreaIdsSet = new Set(newAssignedAreaIds);

  const areasAddedTo = Array.from(updatedAreaIdsSet).filter(id => !originalAreaIdsSet.has(id));
  const areasRemovedFrom = Array.from(originalAreaIdsSet).filter(id => !updatedAreaIdsSet.has(id));

  if (areasAddedTo.length > 0 || areasRemovedFrom.length > 0) {
    let allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);
    let ministryAreasDbChanged = false;

    areasAddedTo.forEach(areaId => {
      const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
      if (areaIndex !== -1 && !allMinistryAreas[areaIndex].memberIds.includes(memberId)) {
        // Add to memberIds only if not the leader of that area
        if(allMinistryAreas[areaIndex].leaderId !== memberId){
            allMinistryAreas[areaIndex].memberIds.push(memberId);
            ministryAreasDbChanged = true;
        }
      }
    });

    areasRemovedFrom.forEach(areaId => {
      const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
      if (areaIndex !== -1) {
        if (allMinistryAreas[areaIndex].leaderId === memberId) {
          // If member was the leader, the Area needs a new leader.
          allMinistryAreas[areaIndex].leaderId = placeholderMembers[0]?.id || `NEEDS_LEADER_${areaId}`; // Placeholder
          affectedMemberIdsForRoleRecalculation.add(allMinistryAreas[areaIndex].leaderId); // The new placeholder leader
        }
        allMinistryAreas[areaIndex].memberIds = allMinistryAreas[areaIndex].memberIds.filter(id => id !== memberId);
        ministryAreasDbChanged = true;
      }
    });

    if (ministryAreasDbChanged) {
      await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, allMinistryAreas);
    }
  }
  return Array.from(affectedMemberIdsForRoleRecalculation);
}

export async function addMemberToAssignments(
  newMember: Member // The newly added member object
): Promise<void> {
  // This function is called *after* a new member is added.
  // Their assignedGDIId and assignedAreaIds are already set on the newMember object.
  // We need to update the GDI and MinistryArea files to include this new member.

  let affectedMemberIds = new Set<string>([newMember.id]); // For role recalc

  if (newMember.assignedGDIId) {
    let allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
    const gdiIndex = allGdis.findIndex(gdi => gdi.id === newMember.assignedGDIId);
    if (gdiIndex !== -1) {
      // Add to memberIds only if they are not the guide of this GDI
      if (allGdis[gdiIndex].guideId !== newMember.id && !allGdis[gdiIndex].memberIds.includes(newMember.id)) {
        allGdis[gdiIndex].memberIds.push(newMember.id);
        await writeDbFile<GDI>(GDIS_DB_FILE, allGdis);
      }
    }
  }

  const assignedAreaIds = newMember.assignedAreaIds || [];
  if (assignedAreaIds.length > 0) {
    let allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);
    let ministryAreasDbChanged = false;
    assignedAreaIds.forEach(areaId => {
      const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
      if (areaIndex !== -1) {
        // Add to memberIds only if they are not the leader of this Area
        if (allMinistryAreas[areaIndex].leaderId !== newMember.id && !allMinistryAreas[areaIndex].memberIds.includes(newMember.id)) {
          allMinistryAreas[areaIndex].memberIds.push(newMember.id);
          ministryAreasDbChanged = true;
        }
      }
    });
    if (ministryAreasDbChanged) {
      await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, allMinistryAreas);
    }
  }
  // Role recalculation should happen after assignments are updated in other services/DBs if needed.
  // For now, this function only updates GDI/Area member lists.
  // The caller of addMember (e.g., the page action) should handle revalidating paths and potentially triggering role updates.
}


export async function bulkRecalculateAndUpdateRoles(memberIdsToUpdate: string[]): Promise<void> {
  if (memberIdsToUpdate.length === 0) {
    return;
  }

  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
  const allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);

  let membersDbChanged = false;

  for (const memberId of memberIdsToUpdate) {
    const memberIndex = allMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1) {
      const memberToUpdate = allMembers[memberIndex];
      // Ensure assignedGDIId and assignedAreaIds are current for the calculation
      const memberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
        id: memberToUpdate.id,
        assignedGDIId: memberToUpdate.assignedGDIId, // Use the member's current GDI assignment
        assignedAreaIds: memberToUpdate.assignedAreaIds, // Use the member's current Area assignments
      };
      const newRoles = calculateMemberRoles(memberForRoleCalc, allGdis, allMinistryAreas);

      // Check if roles actually changed to avoid unnecessary writes
      const currentRolesSorted = [...(memberToUpdate.roles || [])].sort();
      const newRolesSorted = [...newRoles].sort();

      if (JSON.stringify(currentRolesSorted) !== JSON.stringify(newRolesSorted)) {
        allMembers[memberIndex].roles = newRoles;
        membersDbChanged = true;
      }
    }
  }

  if (membersDbChanged) {
    await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);
  }
}


    