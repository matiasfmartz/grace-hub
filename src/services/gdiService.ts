
'use server';
import type { GDI, GdiWriteData, Member } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderGDIs, placeholderMembers } from '@/lib/placeholder-data';

const GDIS_DB_FILE = 'gdis-db.json';
const MEMBERS_DB_FILE = 'members-db.json'; // Needed for member sync

export async function getAllGdis(): Promise<GDI[]> {
  return readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
}

export async function getGdiById(id: string): Promise<GDI | undefined> {
  const gdis = await getAllGdis();
  return gdis.find(gdi => gdi.id === id);
}

export async function addGdi(gdiData: GdiWriteData): Promise<GDI> {
  const gdis = await getAllGdis();
  const newGdi: GDI = {
    ...gdiData,
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    memberIds: [], // Initially no members except implicitly the guide
  };
  const updatedGdis = [...gdis, newGdi];
  await writeDbFile<GDI>(GDIS_DB_FILE, updatedGdis);
  // Note: Guide assignment in members-db is typically handled by updateGdiAndSyncMembers
  return newGdi;
}

export async function updateGdiAndSyncMembers(
  gdiIdToUpdate: string,
  updatedGdiData: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
): Promise<GDI> {
  let allGdis = await getAllGdis();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers); // Read members for sync

  const gdiIndexToUpdate = allGdis.findIndex(gdi => gdi.id === gdiIdToUpdate);
  if (gdiIndexToUpdate === -1) {
    throw new Error(`GDI with ID ${gdiIdToUpdate} not found.`);
  }

  const originalGdi = { ...allGdis[gdiIndexToUpdate] };
  const newName = updatedGdiData.name ?? originalGdi.name;
  const newGuideId = updatedGdiData.guideId ?? originalGdi.guideId;
  const newMemberIdsFromClient = (updatedGdiData.memberIds ?? originalGdi.memberIds).filter(id => id !== newGuideId); // Ensure guide is not in memberIds

  // --- Member DB Sync Logic ---
  // 1. Handle Guide Change
  if (newGuideId && newGuideId !== originalGdi.guideId) {
    // Demote Old Guide
    if (originalGdi.guideId) {
      const oldGuideMemberIndex = allMembers.findIndex(m => m.id === originalGdi.guideId);
      if (oldGuideMemberIndex !== -1 && allMembers[oldGuideMemberIndex].assignedGDIId === gdiIdToUpdate) {
        allMembers[oldGuideMemberIndex].assignedGDIId = null;
      }
    }
    // Promote New Guide
    const newGuideMemberIndex = allMembers.findIndex(m => m.id === newGuideId);
    if (newGuideMemberIndex !== -1) {
      const previousGDIIdOfNewGuide = allMembers[newGuideMemberIndex].assignedGDIId;
      // If new guide was guiding another GDI:
      const otherGdiIdx = allGdis.findIndex(g => g.guideId === newGuideId && g.id !== gdiIdToUpdate);
      if (otherGdiIdx !== -1) {
        allGdis[otherGdiIdx].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allGdis[otherGdiIdx].id}`;
        allGdis[otherGdiIdx].memberIds = allGdis[otherGdiIdx].memberIds.filter(id => id !== newGuideId); // Also remove from members of that GDI
      }
      // If new guide was a member of another GDI (and not its guide):
      if (previousGDIIdOfNewGuide && previousGDIIdOfNewGuide !== gdiIdToUpdate) {
         const prevGdiIdx = allGdis.findIndex(g => g.id === previousGDIIdOfNewGuide);
         if (prevGdiIdx !== -1 && allGdis[prevGdiIdx].guideId !== newGuideId) {
           allGdis[prevGdiIdx].memberIds = allGdis[prevGdiIdx].memberIds.filter(id => id !== newGuideId);
         }
      }
      allMembers[newGuideMemberIndex].assignedGDIId = gdiIdToUpdate;
    }
  } else if (!newGuideId && originalGdi.guideId) { // Guide removed
      const oldGuideIdx = allMembers.findIndex(m => m.id === originalGdi.guideId);
      if (oldGuideIdx !== -1 && allMembers[oldGuideIdx].assignedGDIId === gdiIdToUpdate) {
        allMembers[oldGuideIdx].assignedGDIId = null;
      }
  }

  // 2. Handle Member List Changes for this GDI
  const originalEffectiveMemberIds = originalGdi.memberIds.filter(id => id !== originalGdi.guideId);
  const membersAdded = newMemberIdsFromClient.filter(id => !originalEffectiveMemberIds.includes(id));
  const membersRemoved = originalEffectiveMemberIds.filter(id => !newMemberIdsFromClient.includes(id));

  membersAdded.forEach(memberId => {
    const memberIdx = allMembers.findIndex(m => m.id === memberId);
    if (memberIdx !== -1) {
      const previousGDIIdOfMember = allMembers[memberIdx].assignedGDIId;
      // If member was guiding another GDI:
      const otherGdiIdx = allGdis.findIndex(g => g.guideId === memberId && g.id !== gdiIdToUpdate);
      if (otherGdiIdx !== -1) {
          allGdis[otherGdiIdx].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allGdis[otherGdiIdx].id}`;
          allGdis[otherGdiIdx].memberIds = allGdis[otherGdiIdx].memberIds.filter(id => id !== memberId);
      }
      // If member was a member of another GDI:
      if (previousGDIIdOfMember && previousGDIIdOfMember !== gdiIdToUpdate) {
           const prevGdiIdx = allGdis.findIndex(g => g.id === previousGDIIdOfMember);
           if (prevGdiIdx !== -1 && allGdis[prevGdiIdx].guideId !== memberId) { // was not guide, just member
              allGdis[prevGdiIdx].memberIds = allGdis[prevGdiIdx].memberIds.filter(id => id !== memberId);
           }
      }
      allMembers[memberIdx].assignedGDIId = gdiIdToUpdate;
    }
  });

  membersRemoved.forEach(memberId => {
    const memberIdx = allMembers.findIndex(m => m.id === memberId);
    if (memberIdx !== -1 && allMembers[memberIdx].assignedGDIId === gdiIdToUpdate) {
      allMembers[memberIdx].assignedGDIId = null;
    }
  });

  // --- Update GDI in gdis-db.json ---
  const gdiAfterServerUpdate: GDI = {
    id: gdiIdToUpdate,
    name: newName,
    guideId: newGuideId,
    memberIds: newMemberIdsFromClient,
  };
  allGdis[gdiIndexToUpdate] = gdiAfterServerUpdate;
  
  await writeDbFile<GDI>(GDIS_DB_FILE, allGdis);
  await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers); // Save changes to members DB

  return gdiAfterServerUpdate;
}
