
'use server';
import type { Member, MemberWriteData, GDI, MinistryArea } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderMembers, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data'; // Ensure placeholders are imported if used

const MEMBERS_DB_FILE = 'members-db.json';
const GDIS_DB_FILE = 'gdis-db.json';
const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';

export async function getAllMembers(page: number = 1, pageSize: number = 10): Promise<{ members: Member[], totalMembers: number, totalPages: number }> {
  const allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const totalMembers = allMembers.length;
  const totalPages = Math.ceil(totalMembers / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const membersForPage = allMembers.slice(startIndex, endIndex);
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
  const newMember: Member = {
    ...memberData,
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    avatarUrl: memberData.avatarUrl || 'https://placehold.co/100x100',
  };
  const updatedMembers = [...members, newMember];
  await writeDbFile<Member>(MEMBERS_DB_FILE, updatedMembers);
  return newMember;
}

export async function updateMember(memberId: string, updates: Partial<Omit<Member, 'id'>>): Promise<Member> {
  let members = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const memberIndex = members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) {
    throw new Error(`Member with ID ${memberId} not found.`);
  }
  members[memberIndex] = { 
    ...members[memberIndex], 
    ...updates,
    avatarUrl: updates.avatarUrl || members[memberIndex].avatarUrl || 'https://placehold.co/100x100',
  };
  await writeDbFile<Member>(MEMBERS_DB_FILE, members);
  return members[memberIndex];
}

export async function updateMemberAssignments(
  memberId: string,
  originalMemberData: Member, // Pass the full original member data
  updatedMemberData: Member   // Pass the full updated member data
): Promise<void> {
  const oldAssignedGDIId = originalMemberData.assignedGDIId;
  const newAssignedGDIId = updatedMemberData.assignedGDIId;
  const oldAssignedAreaIds = originalMemberData.assignedAreaIds || [];
  const newAssignedAreaIds = updatedMemberData.assignedAreaIds || [];

  // Synchronize with GDIs
  if (oldAssignedGDIId !== newAssignedGDIId) {
    let allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
    let gdisDbChanged = false;

    // Remove from old GDI
    if (oldAssignedGDIId) {
      const oldGdiIndex = allGdis.findIndex(gdi => gdi.id === oldAssignedGDIId);
      if (oldGdiIndex !== -1) {
        if (allGdis[oldGdiIndex].guideId === memberId) {
          // If member was guide, set guide to placeholder (or handle appropriately)
          allGdis[oldGdiIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${oldAssignedGDIId}`; 
        }
        allGdis[oldGdiIndex].memberIds = allGdis[oldGdiIndex].memberIds.filter(id => id !== memberId);
        gdisDbChanged = true;
      }
    }
    // Add to new GDI (if not guide of this GDI - guide assignment handled by GDI management)
    if (newAssignedGDIId) {
      const newGdiIndex = allGdis.findIndex(gdi => gdi.id === newAssignedGDIId);
      if (newGdiIndex !== -1) {
         // Ensure member is not added as a regular member if they are the guide of this GDI
        if (allGdis[newGdiIndex].guideId !== memberId && !allGdis[newGdiIndex].memberIds.includes(memberId)) {
          allGdis[newGdiIndex].memberIds.push(memberId);
          gdisDbChanged = true;
        }
      }
    }
    if (gdisDbChanged) {
      await writeDbFile<GDI>(GDIS_DB_FILE, allGdis);
    }
  }

  // Synchronize with Ministry Areas
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
        allMinistryAreas[areaIndex].memberIds.push(memberId);
        ministryAreasDbChanged = true;
      }
    });
    areasRemovedFrom.forEach(areaId => {
      const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
      if (areaIndex !== -1) {
        // Also check if they were leader of this area - if so, area needs new leader (placeholder for now)
        if (allMinistryAreas[areaIndex].leaderId === memberId) {
             allMinistryAreas[areaIndex].leaderId = placeholderMembers[0]?.id || `NEEDS_LEADER_${areaId}`;
        }
        allMinistryAreas[areaIndex].memberIds = allMinistryAreas[areaIndex].memberIds.filter(id => id !== memberId);
        ministryAreasDbChanged = true;
      }
    });
    if (ministryAreasDbChanged) {
      await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, allMinistryAreas);
    }
  }
}

export async function addMemberToAssignments(
  newMember: Member
): Promise<void> {
  if (newMember.assignedGDIId) {
    let allGdis = await readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
    const gdiIndex = allGdis.findIndex(gdi => gdi.id === newMember.assignedGDIId);
    if (gdiIndex !== -1 && allGdis[gdiIndex].guideId !== newMember.id && !allGdis[gdiIndex].memberIds.includes(newMember.id)) {
      allGdis[gdiIndex].memberIds.push(newMember.id);
      await writeDbFile<GDI>(GDIS_DB_FILE, allGdis);
    }
  }

  const assignedAreaIds = newMember.assignedAreaIds || [];
  if (assignedAreaIds.length > 0) {
    let allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);
    let ministryAreasDbChanged = false;
    assignedAreaIds.forEach(areaId => {
      const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
      if (areaIndex !== -1 && !allMinistryAreas[areaIndex].memberIds.includes(newMember.id)) {
        allMinistryAreas[areaIndex].memberIds.push(newMember.id);
        ministryAreasDbChanged = true;
      }
    });
    if (ministryAreasDbChanged) {
      await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, allMinistryAreas);
    }
  }
}
