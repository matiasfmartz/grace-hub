
'use server';
import type { Member, MemberWriteData, GDI, MinistryArea } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderMembers } from '@/lib/placeholder-data';

const MEMBERS_DB_FILE = 'members-db.json';

export async function getAllMembers(): Promise<Member[]> {
  return readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  const members = await getAllMembers();
  return members.find(member => member.id === id);
}

export async function addMember(memberData: MemberWriteData): Promise<Member> {
  const members = await getAllMembers();
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
  let members = await getAllMembers();
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

// This function is specific to how member updates affect other entities (GDIs, MinistryAreas)
// It's called by the server action orchestrating the update.
export async function updateMemberAssignments(
  memberId: string,
  oldAssignedGDIId: string | null | undefined,
  newAssignedGDIId: string | null | undefined,
  oldAssignedAreaIds: string[] | undefined,
  newAssignedAreaIds: string[] | undefined,
  gdiDbPath: string, // Pass GDI DB path to avoid circular dependency
  ministryAreaDbPath: string // Pass Ministry Area DB path
): Promise<void> {
  // Synchronize with GDIs
  if (oldAssignedGDIId !== newAssignedGDIId) {
    let allGdis = await readDbFile<GDI>(gdiDbPath, []);
    let gdisDbChanged = false;

    if (oldAssignedGDIId) {
      const oldGdiIndex = allGdis.findIndex(gdi => gdi.id === oldAssignedGDIId);
      if (oldGdiIndex !== -1) {
        if (allGdis[oldGdiIndex].guideId === memberId) {
          allGdis[oldGdiIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${oldAssignedGDIId}`;
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
      }
    }
    if (gdisDbChanged) {
      await writeDbFile<GDI>(gdiDbPath, allGdis);
    }
  }

  // Synchronize with Ministry Areas
  const originalAreaIdsSet = new Set(oldAssignedAreaIds || []);
  const updatedAreaIdsSet = new Set(newAssignedAreaIds || []);
  const areasAddedTo = Array.from(updatedAreaIdsSet).filter(id => !originalAreaIdsSet.has(id));
  const areasRemovedFrom = Array.from(originalAreaIdsSet).filter(id => !updatedAreaIdsSet.has(id));

  if (areasAddedTo.length > 0 || areasRemovedFrom.length > 0) {
    let allMinistryAreas = await readDbFile<MinistryArea>(ministryAreaDbPath, []);
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
        allMinistryAreas[areaIndex].memberIds = allMinistryAreas[areaIndex].memberIds.filter(id => id !== memberId);
        ministryAreasDbChanged = true;
      }
    });
    if (ministryAreasDbChanged) {
      await writeDbFile<MinistryArea>(ministryAreaDbPath, allMinistryAreas);
    }
  }
}

export async function addMemberToAssignments(
  newMember: Member,
  gdiDbPath: string,
  ministryAreaDbPath: string
): Promise<void> {
  if (newMember.assignedGDIId) {
    let allGdis = await readDbFile<GDI>(gdiDbPath, []);
    const gdiIndex = allGdis.findIndex(gdi => gdi.id === newMember.assignedGDIId);
    if (gdiIndex !== -1 && allGdis[gdiIndex].guideId !== newMember.id && !allGdis[gdiIndex].memberIds.includes(newMember.id)) {
      allGdis[gdiIndex].memberIds.push(newMember.id);
      await writeDbFile<GDI>(gdiDbPath, allGdis);
    }
  }

  const assignedAreaIds = newMember.assignedAreaIds || [];
  if (assignedAreaIds.length > 0) {
    let allMinistryAreas = await readDbFile<MinistryArea>(ministryAreaDbPath, []);
    let ministryAreasDbChanged = false;
    assignedAreaIds.forEach(areaId => {
      const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
      if (areaIndex !== -1 && !allMinistryAreas[areaIndex].memberIds.includes(newMember.id)) {
        allMinistryAreas[areaIndex].memberIds.push(newMember.id);
        ministryAreasDbChanged = true;
      }
    });
    if (ministryAreasDbChanged) {
      await writeDbFile<MinistryArea>(ministryAreaDbPath, allMinistryAreas);
    }
  }
}
