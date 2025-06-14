
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
  const newArea: MinistryArea = {
    ...areaData,
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    memberIds: [], // Initially no members except implicitly the leader
    imageUrl: areaData.imageUrl || 'https://placehold.co/600x400',
  };
  const updatedAreas = [...areas, newArea];
  await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, updatedAreas);
  // Leader's assignedAreaIds in members-db should be updated if this is the primary way leaders are set.
  // For now, assuming member update action or area update action handles sync.
  return newArea;
}

export async function updateMinistryAreaAndSyncMembers(
  areaId: string,
  updatedAreaData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description' | 'imageUrl'>>
): Promise<MinistryArea> {
  let allCurrentAreas = await getAllMinistryAreas();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, placeholderMembers);

  const areaIndex = allCurrentAreas.findIndex(area => area.id === areaId);
  if (areaIndex === -1) {
    throw new Error(`Ministry Area with ID ${areaId} not found.`);
  }

  const currentAreaBeforeUpdate = { ...allCurrentAreas[areaIndex] };
  const areaAfterClientUpdate: MinistryArea = {
    ...currentAreaBeforeUpdate,
    ...updatedAreaData,
    imageUrl: updatedAreaData.imageUrl || currentAreaBeforeUpdate.imageUrl || 'https://placehold.co/600x400',
    // Ensure memberIds does not contain the leaderId after update
    memberIds: (updatedAreaData.memberIds || currentAreaBeforeUpdate.memberIds).filter(mId => mId !== (updatedAreaData.leaderId || currentAreaBeforeUpdate.leaderId))
  };
  
  allCurrentAreas[areaIndex] = areaAfterClientUpdate;
  await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, allCurrentAreas);

  // Synchronize member assignments in members-db.json
  const oldMemberAndLeaderSet = new Set([currentAreaBeforeUpdate.leaderId, ...(currentAreaBeforeUpdate.memberIds || [])].filter(Boolean));
  const newMemberAndLeaderSet = new Set([areaAfterClientUpdate.leaderId, ...(areaAfterClientUpdate.memberIds || [])].filter(Boolean));

  const membersAddedToArea = Array.from(newMemberAndLeaderSet).filter(id => !oldMemberAndLeaderSet.has(id));
  const membersRemovedFromArea = Array.from(oldMemberAndLeaderSet).filter(id => !newMemberAndLeaderSet.has(id));

  let membersDbChanged = false;
  membersAddedToArea.forEach(memberId => {
    const memberIndex = allMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1) {
      if (!allMembers[memberIndex].assignedAreaIds) {
        allMembers[memberIndex].assignedAreaIds = [];
      }
      if (!allMembers[memberIndex].assignedAreaIds!.includes(areaId)) {
        allMembers[memberIndex].assignedAreaIds!.push(areaId);
        membersDbChanged = true;
      }
    }
  });

  membersRemovedFromArea.forEach(memberId => {
    const memberIndex = allMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1 && allMembers[memberIndex].assignedAreaIds) {
      const initialLength = allMembers[memberIndex].assignedAreaIds!.length;
      allMembers[memberIndex].assignedAreaIds = allMembers[memberIndex].assignedAreaIds!.filter(id => id !== areaId);
      if (allMembers[memberIndex].assignedAreaIds!.length !== initialLength) {
        membersDbChanged = true;
      }
    }
  });

  if (membersDbChanged) {
    await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);
  }
  return areaAfterClientUpdate;
}
