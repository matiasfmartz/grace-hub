
'use server';
import type { GDI, GdiWriteData, Member, MeetingSeries } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderGDIs, placeholderMembers } from '@/lib/placeholder-data';
import { deleteMeetingSeries } from './meetingService'; // Import for cascading delete

const GDIS_DB_FILE = 'gdis-db.json';
const MEMBERS_DB_FILE = 'members-db.json'; 
const MEETING_SERIES_DB_FILE = 'meeting-series-db.json';

export async function getAllGdis(): Promise<GDI[]> {
  return readDbFile<GDI>(GDIS_DB_FILE, placeholderGDIs);
}

export async function getGdiById(id: string): Promise<GDI | undefined> {
  const gdis = await getAllGdis();
  return gdis.find(gdi => gdi.id === id);
}

export async function addGdi(gdiData: GdiWriteData): Promise<GDI> {
  const gdis = await getAllGdis();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const guideMemberIndex = allMembers.findIndex(m => m.id === gdiData.guideId);
  
  const newGdiId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;

  if (guideMemberIndex !== -1) {
    const previousGDIIdOfNewGuide = allMembers[guideMemberIndex].assignedGDIId;
    if (previousGDIIdOfNewGuide) {
        const prevGdiIdx = gdis.findIndex(g => g.id === previousGDIIdOfNewGuide);
        if (prevGdiIdx !== -1 && gdis[prevGdiIdx].guideId !== gdiData.guideId) { 
            gdis[prevGdiIdx].memberIds = gdis[prevGdiIdx].memberIds.filter(id => id !== gdiData.guideId);
        }
    }
    const otherGdiIdx = gdis.findIndex(g => g.guideId === gdiData.guideId);
    if (otherGdiIdx !== -1) {
      gdis[otherGdiIdx].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${gdis[otherGdiIdx].id}`; 
      gdis[otherGdiIdx].memberIds = gdis[otherGdiIdx].memberIds.filter(id => id !== gdiData.guideId);
    }
    allMembers[guideMemberIndex].assignedGDIId = newGdiId; 
  }

  const newGdi: GDI = {
    ...gdiData,
    id: newGdiId,
    memberIds: gdiData.memberIds || [], // Use provided members or empty array
  };
  
  // Ensure provided members are correctly assigned and unassigned from other GDIs
  if (newGdi.memberIds.length > 0) {
    for (const memberId of newGdi.memberIds) {
      const memberIdx = allMembers.findIndex(m => m.id === memberId);
      if (memberIdx !== -1 && memberId !== newGdi.guideId) { // Don't process guide as a regular member here
        const previousGDIIdOfMember = allMembers[memberIdx].assignedGDIId;
        if (previousGDIIdOfMember && previousGDIIdOfMember !== newGdi.id) {
          const prevGdiIdx = gdis.findIndex(g => g.id === previousGDIIdOfMember);
          if (prevGdiIdx !== -1 && gdis[prevGdiIdx].guideId !== memberId) {
            gdis[prevGdiIdx].memberIds = gdis[prevGdiIdx].memberIds.filter(id => id !== memberId);
          }
        }
        allMembers[memberIdx].assignedGDIId = newGdi.id;
      }
    }
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
  
  const newMemberIdsFromClient = (updatedGdiData.memberIds ?? originalGdi.memberIds).filter(id => id !== newGuideId); 

  affectedMemberIds.add(newGuideId); 
  if (originalGdi.guideId) affectedMemberIds.add(originalGdi.guideId); 

  if (newGuideId && newGuideId !== originalGdi.guideId) {
    if (originalGdi.guideId) {
      const oldGuideMemberIndex = allMembers.findIndex(m => m.id === originalGdi.guideId);
      if (oldGuideMemberIndex !== -1 && allMembers[oldGuideMemberIndex].assignedGDIId === gdiIdToUpdate) {
        allMembers[oldGuideMemberIndex].assignedGDIId = null;
      }
    }
    const newGuideMemberIndex = allMembers.findIndex(m => m.id === newGuideId);
    if (newGuideMemberIndex !== -1) {
      const previousGDIIdOfNewGuide = allMembers[newGuideMemberIndex].assignedGDIId;
      const otherGdiIdx = allGdis.findIndex(g => g.guideId === newGuideId && g.id !== gdiIdToUpdate);
      if (otherGdiIdx !== -1) {
        allGdis[otherGdiIdx].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allGdis[otherGdiIdx].id}`;
        allGdis[otherGdiIdx].memberIds = allGdis[otherGdiIdx].memberIds.filter(id => id !== newGuideId);
        if(allGdis[otherGdiIdx].guideId !== placeholderMembers[0]?.id) affectedMemberIds.add(allGdis[otherGdiIdx].guideId); 
      }
      if (previousGDIIdOfNewGuide && previousGDIIdOfNewGuide !== gdiIdToUpdate) {
         const prevGdiIdx = allGdis.findIndex(g => g.id === previousGDIIdOfNewGuide);
         if (prevGdiIdx !== -1 && allGdis[prevGdiIdx].guideId !== newGuideId) {
           allGdis[prevGdiIdx].memberIds = allGdis[prevGdiIdx].memberIds.filter(id => id !== newGuideId);
         }
      }
      allMembers[newGuideMemberIndex].assignedGDIId = gdiIdToUpdate;
    }
  } else if (!newGuideId && originalGdi.guideId) { 
      const oldGuideIdx = allMembers.findIndex(m => m.id === originalGdi.guideId);
      if (oldGuideIdx !== -1 && allMembers[oldGuideIdx].assignedGDIId === gdiIdToUpdate) {
        allMembers[oldGuideIdx].assignedGDIId = null;
      }
  }

  const originalMemberIdsInGdi = originalGdi.memberIds.filter(id => id !== originalGdi.guideId);
  
  const membersAddedToGdiList = newMemberIdsFromClient.filter(id => !originalMemberIdsInGdi.includes(id));
  const membersRemovedFromGdiList = originalMemberIdsInGdi.filter(id => !newMemberIdsFromClient.includes(id));

  membersAddedToGdiList.forEach(memberId => {
    affectedMemberIds.add(memberId);
    const memberIdx = allMembers.findIndex(m => m.id === memberId);
    if (memberIdx !== -1) {
      const previousGDIIdOfMember = allMembers[memberIdx].assignedGDIId;
      const otherGdiIdx = allGdis.findIndex(g => g.guideId === memberId && g.id !== gdiIdToUpdate);
      if (otherGdiIdx !== -1) {
          allGdis[otherGdiIdx].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allGdis[otherGdiIdx].id}`;
          allGdis[otherGdiIdx].memberIds = allGdis[otherGdiIdx].memberIds.filter(id => id !== memberId);
          if(allGdis[otherGdiIdx].guideId !== placeholderMembers[0]?.id) affectedMemberIds.add(allGdis[otherGdiIdx].guideId);
      }
      if (previousGDIIdOfMember && previousGDIIdOfMember !== gdiIdToUpdate) {
           const prevGdiIdx = allGdis.findIndex(g => g.id === previousGDIIdOfMember);
           if (prevGdiIdx !== -1 && allGdis[prevGdiIdx].guideId !== memberId) { 
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

  const gdiAfterServerUpdate: GDI = {
    id: gdiIdToUpdate,
    name: newName,
    guideId: newGuideId,
    memberIds: newMemberIdsFromClient, 
  };
  allGdis[gdiIndexToUpdate] = gdiAfterServerUpdate;
  
  await writeDbFile<GDI>(GDIS_DB_FILE, allGdis);
  await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers); 

  return { updatedGdi: gdiAfterServerUpdate, affectedMemberIds: Array.from(affectedMemberIds).filter(Boolean) as string[] };
}

export async function deleteGdi(gdiId: string): Promise<string[]> {
  let allGdis = await getAllGdis();
  const gdiToDelete = allGdis.find(g => g.id === gdiId);

  if (!gdiToDelete) {
    throw new Error(`GDI with ID ${gdiId} not found.`);
  }

  const remainingGdis = allGdis.filter(gdi => gdi.id !== gdiId);
  await writeDbFile<GDI>(GDIS_DB_FILE, remainingGdis);

  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  const affectedMemberIds = new Set<string>();

  // Add guide and all members of the deleted GDI to affectedMemberIds
  if (gdiToDelete.guideId) {
    affectedMemberIds.add(gdiToDelete.guideId);
  }
  gdiToDelete.memberIds.forEach(memberId => affectedMemberIds.add(memberId));

  // Update members who were part of the deleted GDI
  const updatedMembers = allMembers.map(member => {
    if (member.assignedGDIId === gdiId) {
      return { ...member, assignedGDIId: null };
    }
    return member;
  });
  await writeDbFile<Member>(MEMBERS_DB_FILE, updatedMembers);

  // Delete associated meeting series
  const allMeetingSeries = await readDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, []);
  const seriesToDelete = allMeetingSeries.filter(
    series => series.seriesType === 'gdi' && series.ownerGroupId === gdiId
  );

  for (const series of seriesToDelete) {
    await deleteMeetingSeries(series.id); // This will also delete instances and attendance
  }
  
  return Array.from(affectedMemberIds);
}
