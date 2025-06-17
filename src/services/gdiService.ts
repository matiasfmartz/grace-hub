
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
  // Update the new GDI's guide in members-db.json
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const guideMemberIndex = allMembers.findIndex(m => m.id === gdiData.guideId);
  if (guideMemberIndex !== -1) {
    // If the new guide was part of another GDI as a member, remove them from that GDI's member list
    const previousGDIIdOfNewGuide = allMembers[guideMemberIndex].assignedGDIId;
    if (previousGDIIdOfNewGuide) {
        const prevGdiIdx = gdis.findIndex(g => g.id === previousGDIIdOfNewGuide);
        if (prevGdiIdx !== -1 && gdis[prevGdiIdx].guideId !== gdiData.guideId) { // Ensure it's not the GDI they are already guiding
            gdis[prevGdiIdx].memberIds = gdis[prevGdiIdx].memberIds.filter(id => id !== gdiData.guideId);
        }
    }
    // If the new guide was guiding another GDI, remove them as guide there
    const otherGdiIdx = gdis.findIndex(g => g.guideId === gdiData.guideId);
      if (otherGdiIdx !== -1) {
        gdis[otherGdiIdx].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${gdis[otherGdiIdx].id}`; // Assign placeholder or handle appropriately
        gdis[otherGdiIdx].memberIds = gdis[otherGdiIdx].memberIds.filter(id => id !== gdiData.guideId);
      }
    allMembers[guideMemberIndex].assignedGDIId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`; // temporary unique id for new GDI, will be replaced by actual one
  }

  const newGdi: GDI = {
    ...gdiData,
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    memberIds: [], // Initially no members except implicitly the guide
  };
  
  if (guideMemberIndex !== -1) {
    allMembers[guideMemberIndex].assignedGDIId = newGdi.id; // Assign the actual new GDI ID
  }
  await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);


  const updatedGdis = [...gdis, newGdi];
  await writeDbFile<GDI>(GDIS_DB_FILE, updatedGdis);
  return newGdi;
}

export async function updateGdiAndSyncMembers(
  gdiIdToUpdate: string,
  updatedGdiData: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
): Promise<{ updatedGdi: GDI; affectedMemberIds: string[] }> {
  let allGdis = await getAllGdis();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  let affectedMemberIds = new Set<string>();

  const gdiIndexToUpdate = allGdis.findIndex(gdi => gdi.id === gdiIdToUpdate);
  if (gdiIndexToUpdate === -1) {
    throw new Error(`GDI with ID ${gdiIdToUpdate} not found.`);
  }

  const originalGdi = { ...allGdis[gdiIndexToUpdate] };
  const newName = updatedGdiData.name ?? originalGdi.name;
  const newGuideId = updatedGdiData.guideId ?? originalGdi.guideId;
  
  // Ensure newMemberIdsFromClient does not contain the newGuideId
  const newMemberIdsFromClient = (updatedGdiData.memberIds ?? originalGdi.memberIds).filter(id => id !== newGuideId); 

  affectedMemberIds.add(newGuideId); // New guide's roles might change
  if (originalGdi.guideId) affectedMemberIds.add(originalGdi.guideId); // Old guide's roles might change

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
        allGdis[otherGdiIdx].memberIds = allGdis[otherGdiIdx].memberIds.filter(id => id !== newGuideId);
        if(allGdis[otherGdiIdx].guideId !== placeholderMembers[0]?.id) affectedMemberIds.add(allGdis[otherGdiIdx].guideId); // the new placeholder guide
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
  const originalMemberIdsInGdi = originalGdi.memberIds.filter(id => id !== originalGdi.guideId);
  
  const membersAddedToGdiList = newMemberIdsFromClient.filter(id => !originalMemberIdsInGdi.includes(id));
  const membersRemovedFromGdiList = originalMemberIdsInGdi.filter(id => !newMemberIdsFromClient.includes(id));

  membersAddedToGdiList.forEach(memberId => {
    affectedMemberIds.add(memberId);
    const memberIdx = allMembers.findIndex(m => m.id === memberId);
    if (memberIdx !== -1) {
      const previousGDIIdOfMember = allMembers[memberIdx].assignedGDIId;
      // If member was guiding another GDI:
      const otherGdiIdx = allGdis.findIndex(g => g.guideId === memberId && g.id !== gdiIdToUpdate);
      if (otherGdiIdx !== -1) {
          allGdis[otherGdiIdx].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allGdis[otherGdiIdx].id}`;
          allGdis[otherGdiIdx].memberIds = allGdis[otherGdiIdx].memberIds.filter(id => id !== memberId);
          if(allGdis[otherGdiIdx].guideId !== placeholderMembers[0]?.id) affectedMemberIds.add(allGdis[otherGdiIdx].guideId);
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

  membersRemovedFromGdiList.forEach(memberId => {
    affectedMemberIds.add(memberId);
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
    memberIds: newMemberIdsFromClient, // Use the filtered list
  };
  allGdis[gdiIndexToUpdate] = gdiAfterServerUpdate;
  
  await writeDbFile<GDI>(GDIS_DB_FILE, allGdis);
  await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers); // Save changes to members DB

  return { updatedGdi: gdiAfterServerUpdate, affectedMemberIds: Array.from(affectedMemberIds).filter(Boolean) as string[] };
}

