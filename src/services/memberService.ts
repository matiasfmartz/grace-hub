
'use server';
import type { Member, MemberWriteData, GDI, MinistryArea, MemberRoleType } from '@/lib/types';
import { NO_ROLE_FILTER_VALUE, NO_GDI_FILTER_VALUE, NO_AREA_FILTER_VALUE } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderMembers, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import { calculateMemberRoles } from '@/lib/roleUtils';

const MEMBERS_DB_FILE = 'members-db.json';
const GDIS_DB_FILE = 'gdis-db.json';
const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';

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

export async function getAllMembers(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  memberStatusFiltersParam?: string[],
  roleFilterParams?: string[],
  guideIdFilterParams?: string[],
  areaIdFilterParams?: string[] 
): Promise<{ members: Member[], totalMembers: number, totalPages: number }> {
  const allMembersFromFile = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs); 
  const allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);

  const workingFilteredMembers = allMembersFromFile.filter(member => {
    let statusMatch = true;
    if (memberStatusFiltersParam && memberStatusFiltersParam.length > 0) {
      statusMatch = member.status && memberStatusFiltersParam.includes(member.status);
    }

    let roleMatch = true;
    const hasNoRoleFilter = roleFilterParams?.includes(NO_ROLE_FILTER_VALUE);
    const actualRoleFilters = roleFilterParams?.filter(r => r !== NO_ROLE_FILTER_VALUE) || [];
    if (roleFilterParams && roleFilterParams.length > 0) {
      const memberHasActualRole = actualRoleFilters.length > 0 && member.roles && member.roles.some(role => actualRoleFilters.includes(role));
      const memberHasNoRole = !member.roles || member.roles.length === 0;

      if (hasNoRoleFilter && actualRoleFilters.length > 0) {
        roleMatch = memberHasActualRole || memberHasNoRole;
      } else if (hasNoRoleFilter) {
        roleMatch = memberHasNoRole;
      } else if (actualRoleFilters.length > 0) {
        roleMatch = memberHasActualRole;
      }
    }

    let guideMatch = true;
    const hasNoGdiFilter = guideIdFilterParams?.includes(NO_GDI_FILTER_VALUE);
    const actualGuideIdFilters = guideIdFilterParams?.filter(id => id !== NO_GDI_FILTER_VALUE) || [];
    if (guideIdFilterParams && guideIdFilterParams.length > 0) {
      const memberHasNoGdi = !member.assignedGDIId;
      let memberMatchesActualGuide = false;

      if (actualGuideIdFilters.length > 0) {
        const membersToIncludeFromActualGuides = new Set<string>();
        actualGuideIdFilters.forEach(guideId => {
          membersToIncludeFromActualGuides.add(guideId); 
          const gdisLedByThisGuide = allGdis.filter(gdi => gdi.guideId === guideId);
          gdisLedByThisGuide.forEach(gdi => {
            if (gdi.memberIds) gdi.memberIds.forEach(memberId => membersToIncludeFromActualGuides.add(memberId));
          });
        });
        memberMatchesActualGuide = membersToIncludeFromActualGuides.has(member.id);
      }

      if (hasNoGdiFilter && actualGuideIdFilters.length > 0) {
        guideMatch = memberHasNoGdi || memberMatchesActualGuide;
      } else if (hasNoGdiFilter) {
        guideMatch = memberHasNoGdi;
      } else if (actualGuideIdFilters.length > 0) {
        guideMatch = memberMatchesActualGuide;
      }
    }

    let areaMatch = true;
    const hasNoAreaFilter = areaIdFilterParams?.includes(NO_AREA_FILTER_VALUE);
    const actualAreaIdFilters = areaIdFilterParams?.filter(id => id !== NO_AREA_FILTER_VALUE) || [];
    if (areaIdFilterParams && areaIdFilterParams.length > 0) {
        const memberHasNoArea = !member.assignedAreaIds || member.assignedAreaIds.length === 0;
        let memberMatchesActualArea = false;

        if (actualAreaIdFilters.length > 0) {
            memberMatchesActualArea = member.assignedAreaIds && member.assignedAreaIds.some(areaId => actualAreaIdFilters.includes(areaId));
        }
        
        if (hasNoAreaFilter && actualAreaIdFilters.length > 0) {
            areaMatch = memberHasNoArea || memberMatchesActualArea;
        } else if (hasNoAreaFilter) {
            areaMatch = memberHasNoArea;
        } else if (actualAreaIdFilters.length > 0) {
            areaMatch = memberMatchesActualArea;
        }
    }
    
    let searchTermMatch = true;
    if (searchTerm) {
        const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
        if (lowercasedSearchTerm) {
          searchTermMatch =
            `${member.firstName} ${member.lastName}`.toLowerCase().includes(lowercasedSearchTerm) ||
            member.email.toLowerCase().includes(lowercasedSearchTerm) ||
            (member.phone && member.phone.toLowerCase().includes(lowercasedSearchTerm)) ||
            (member.status && member.status.toLowerCase().includes(lowercasedSearchTerm)) ||
            (member.status && statusDisplayMap[member.status]?.toLowerCase().includes(lowercasedSearchTerm)) ||
            (member.roles && member.roles.some(role => role.toLowerCase().includes(lowercasedSearchTerm))) ||
            (member.roles && member.roles.some(role => (roleDisplayMap[role as MemberRoleType] || role).toLowerCase().includes(lowercasedSearchTerm)));
        }
    }

    return statusMatch && roleMatch && guideMatch && areaMatch && searchTermMatch;
  });

  const totalMembers = workingFilteredMembers.length;
  const totalPages = Math.ceil(totalMembers / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const membersForPage = workingFilteredMembers.slice(startIndex, endIndex);
  
  return { members: membersForPage, totalMembers, totalPages };
}


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
      id: '', 
      assignedGDIId: memberData.assignedGDIId,
      assignedAreaIds: memberData.assignedAreaIds
  };

  const newMemberId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
  tempMemberForRoleCalc.id = newMemberId; 

  const calculatedRoles = calculateMemberRoles(tempMemberForRoleCalc, allGdis, allMinistryAreas);

  const newMember: Member = {
    ...memberData,
    id: newMemberId,
    avatarUrl: memberData.avatarUrl || 'https://placehold.co/100x100',
    roles: calculatedRoles,
  };

  const updatedMembers = [...members, newMember];
  await writeDbFile<Member>(MEMBERS_DB_FILE, updatedMembers);
  await addMemberToAssignments(newMember); 

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

  const updatedMemberInstance: Member = {
    ...members[memberIndex],
    ...updates,
    avatarUrl: updates.avatarUrl || members[memberIndex].avatarUrl || 'https://placehold.co/100x100',
  };

  
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


export async function updateMemberAssignments(
  memberId: string,
  originalMemberData: Member,
  updatedMemberData: Member
): Promise<string[]> { 
  const oldAssignedGDIId = originalMemberData.assignedGDIId;
  const newAssignedGDIId = updatedMemberData.assignedGDIId;
  const oldAssignedAreaIds = originalMemberData.assignedAreaIds || [];
  const newAssignedAreaIds = updatedMemberData.assignedAreaIds || [];

  let affectedMemberIdsForRoleRecalculation = new Set<string>([memberId]);

  
  if (oldAssignedGDIId !== newAssignedGDIId) {
    let allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
    let gdisDbChanged = false;

    
    if (oldAssignedGDIId) {
      const oldGdiIndex = allGdis.findIndex(gdi => gdi.id === oldAssignedGDIId);
      if (oldGdiIndex !== -1) {
        
        if (allGdis[oldGdiIndex].guideId === memberId) {
           allGdis[oldGdiIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${oldAssignedGDIId}`; 
           affectedMemberIdsForRoleRecalculation.add(allGdis[oldGdiIndex].guideId); 
        }
        
        allGdis[oldGdiIndex].memberIds = allGdis[oldGdiIndex].memberIds.filter(id => id !== memberId);
        gdisDbChanged = true;
      }
    }

    
    if (newAssignedGDIId) {
      const newGdiIndex = allGdis.findIndex(gdi => gdi.id === newAssignedGDIId);
      if (newGdiIndex !== -1) {
        
        if (allGdis[newGdiIndex].guideId !== memberId && !allGdis[newGdiIndex].memberIds.includes(memberId)) {
          allGdis[newGdiIndex].memberIds.push(memberId);
          gdisDbChanged = true;
        }
        
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
          allMinistryAreas[areaIndex].leaderId = placeholderMembers[0]?.id || `NEEDS_LEADER_${areaId}`; 
          affectedMemberIdsForRoleRecalculation.add(allMinistryAreas[areaIndex].leaderId);
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
  newMember: Member
): Promise<void> {
  

  if (newMember.assignedGDIId) {
    let allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
    const gdiIndex = allGdis.findIndex(gdi => gdi.id === newMember.assignedGDIId);
    if (gdiIndex !== -1) {
      
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
      
      const memberForRoleCalc: Pick<Member, 'id' | 'assignedGDIId' | 'assignedAreaIds'> = {
        id: memberToUpdate.id,
        assignedGDIId: memberToUpdate.assignedGDIId,
        assignedAreaIds: memberToUpdate.assignedAreaIds,
      };
      const newRoles = calculateMemberRoles(memberForRoleCalc, allGdis, allMinistryAreas);

      
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

