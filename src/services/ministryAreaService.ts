
'use server';
import type { MinistryArea, MinistryAreaWriteData, Member } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderMinistryAreas, placeholderMembers } from '@/lib/placeholder-data';

const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';
const MEMBERS_DB_FILE = 'members-db.json'; // Needed for member sync

export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
  return readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, placeholderMinistryAreas);
}

export async function getMinistryAreaById(id: string): Promise<MinistryArea | undefined> {
  const areas = await getAllMinistryAreas();
  return areas.find(area => area.id === id);
}

export async function addMinistryArea(areaData: MinistryAreaWriteData): Promise<MinistryArea> {
  const areas = await getAllMinistryAreas();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);

  const leaderMemberIndex = allMembers.findIndex(m => m.id === areaData.leaderId);
  if (leaderMemberIndex !== -1) {
    if(!allMembers[leaderMemberIndex].assignedAreaIds){
      allMembers[leaderMemberIndex].assignedAreaIds = [];
    }
    // A leader could lead multiple areas, so we just add, not replace.
    // However, ensure the assignedAreaIds itself exists
    if (!allMembers[leaderMemberIndex].assignedAreaIds!.includes(`${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}` /* temp will be replaced */)) {
        // Placeholder for ID, will be replaced after area is created
    }
  }


  const newArea: MinistryArea = {
    ...areaData,
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    memberIds: [], // Initially no members other than the leader (leader is not in memberIds array)
    imageUrl: areaData.imageUrl || 'https://placehold.co/600x400',
  };

  if (leaderMemberIndex !== -1) {
    if (!allMembers[leaderMemberIndex].assignedAreaIds!.includes(newArea.id)) {
         allMembers[leaderMemberIndex].assignedAreaIds!.push(newArea.id);
    }
  }
  await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);

  const updatedAreas = [...areas, newArea];
  await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, updatedAreas);
  return newArea;
}

export async function updateMinistryAreaAndSyncMembers(
  areaId: string,
  updatedAreaData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description' | 'imageUrl'>>
): Promise<{ updatedArea: MinistryArea; affectedMemberIds: string[] }> {
  let allCurrentAreas = await getAllMinistryAreas();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);
  let affectedMemberIds = new Set<string>();

  const areaIndex = allCurrentAreas.findIndex(area => area.id === areaId);
  if (areaIndex === -1) {
    throw new Error(`Ministry Area with ID ${areaId} not found.`);
  }

  const currentAreaBeforeUpdate = { ...allCurrentAreas[areaIndex] };
  const newLeaderId = updatedAreaData.leaderId ?? currentAreaBeforeUpdate.leaderId;
  
  // Ensure newMemberIdsFromClient does not contain the newLeaderId
  const newMemberIdsFromClient = (updatedAreaData.memberIds ?? currentAreaBeforeUpdate.memberIds).filter(id => id !== newLeaderId);

  affectedMemberIds.add(newLeaderId); // New leader's roles might change
  if(currentAreaBeforeUpdate.leaderId) affectedMemberIds.add(currentAreaBeforeUpdate.leaderId); // Old leader's roles might change

  const areaAfterClientUpdate: MinistryArea = {
    ...currentAreaBeforeUpdate,
    ...updatedAreaData,
    leaderId: newLeaderId,
    memberIds: newMemberIdsFromClient, // Use the filtered list
    imageUrl: updatedAreaData.imageUrl || currentAreaBeforeUpdate.imageUrl || 'https://placehold.co/600x400',
  };
  
  allCurrentAreas[areaIndex] = areaAfterClientUpdate;
  await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, allCurrentAreas);

  // --- Member DB Sync Logic ---
  // 1. Handle Leader Change
  if (newLeaderId && newLeaderId !== currentAreaBeforeUpdate.leaderId) {
    // Unassign old leader from this specific area in their assignedAreaIds
    if (currentAreaBeforeUpdate.leaderId) {
      const oldLeaderIdx = allMembers.findIndex(m => m.id === currentAreaBeforeUpdate.leaderId);
      if (oldLeaderIdx !== -1 && allMembers[oldLeaderIdx].assignedAreaIds) {
        allMembers[oldLeaderIdx].assignedAreaIds = allMembers[oldLeaderIdx].assignedAreaIds!.filter(id => id !== areaId);
      }
    }
    // Assign new leader to this area in their assignedAreaIds
    const newLeaderIdx = allMembers.findIndex(m => m.id === newLeaderId);
    if (newLeaderIdx !== -1) {
      if (!allMembers[newLeaderIdx].assignedAreaIds) {
        allMembers[newLeaderIdx].assignedAreaIds = [];
      }
      if (!allMembers[newLeaderIdx].assignedAreaIds!.includes(areaId)) {
        allMembers[newLeaderIdx].assignedAreaIds!.push(areaId);
      }
    }
  }

  // 2. Handle Member List Changes for this Area
  const originalMemberIdsInArea = currentAreaBeforeUpdate.memberIds.filter(id => id !== currentAreaBeforeUpdate.leaderId);

  const membersAddedToAreaList = newMemberIdsFromClient.filter(id => !originalMemberIdsInArea.includes(id));
  const membersRemovedFromAreaList = originalMemberIdsInArea.filter(id => !newMemberIdsFromClient.includes(id));

  membersAddedToAreaList.forEach(memberId => {
    affectedMemberIds.add(memberId);
    const memberIndex = allMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1) {
      if (!allMembers[memberIndex].assignedAreaIds) {
        allMembers[memberIndex].assignedAreaIds = [];
      }
      if (!allMembers[memberIndex].assignedAreaIds!.includes(areaId)) {
        allMembers[memberIndex].assignedAreaIds!.push(areaId);
      }
    }
  });

  membersRemovedFromAreaList.forEach(memberId => {
    affectedMemberIds.add(memberId);
    const memberIndex = allMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1 && allMembers[memberIndex].assignedAreaIds) {
      allMembers[memberIndex].assignedAreaIds = allMembers[memberIndex].assignedAreaIds!.filter(id => id !== areaId);
    }
  });
  
  await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);

  return { updatedArea: areaAfterClientUpdate, affectedMemberIds: Array.from(affectedMemberIds).filter(Boolean) as string[] };
}
