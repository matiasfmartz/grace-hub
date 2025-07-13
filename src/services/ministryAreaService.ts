
'use server';
import type { MinistryArea, MinistryAreaWriteData, Member, MeetingSeries } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { deleteMeetingSeries } from './meetingService'; // Import for cascading delete

const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';
const MEMBERS_DB_FILE = 'members-db.json';
const MEETING_SERIES_DB_FILE = 'meeting-series-db.json';


export async function getAllMinistryAreas(): Promise<MinistryArea[]> {
  return readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, []);
}

export async function getMinistryAreaById(id: string): Promise<MinistryArea | undefined> {
  const areas = await getAllMinistryAreas();
  return areas.find(area => area.id === id);
}

export async function addMinistryArea(areaData: MinistryAreaWriteData): Promise<MinistryArea> {
  const areas = await getAllMinistryAreas();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, []);
  const newAreaId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;

  const leaderMemberIndex = allMembers.findIndex(m => m.id === areaData.leaderId);
  if (leaderMemberIndex !== -1) {
    if(!allMembers[leaderMemberIndex].assignedAreaIds){
      allMembers[leaderMemberIndex].assignedAreaIds = [];
    }
    if (!allMembers[leaderMemberIndex].assignedAreaIds!.includes(newAreaId)) {
         allMembers[leaderMemberIndex].assignedAreaIds!.push(newAreaId);
    }
  }

  // Assign provided members to the new area
  if (areaData.memberIds && areaData.memberIds.length > 0) {
    for (const memberId of areaData.memberIds) {
      if (memberId === areaData.leaderId) continue; // Skip if member is also the leader
      const memberIdx = allMembers.findIndex(m => m.id === memberId);
      if (memberIdx !== -1) {
        if (!allMembers[memberIdx].assignedAreaIds) {
          allMembers[memberIdx].assignedAreaIds = [];
        }
        if (!allMembers[memberIdx].assignedAreaIds!.includes(newAreaId)) {
          allMembers[memberIdx].assignedAreaIds!.push(newAreaId);
        }
      }
    }
  }
  await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);

  const newArea: MinistryArea = {
    ...areaData,
    id: newAreaId,
    memberIds: areaData.memberIds ? areaData.memberIds.filter(id => id !== areaData.leaderId) : [], // Ensure leader is not in memberIds
  };

  const updatedAreas = [...areas, newArea];
  await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, updatedAreas);
  return newArea;
}

export async function updateMinistryAreaAndSyncMembers(
  areaId: string,
  updatedAreaData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description'>>
): Promise<{ updatedArea: MinistryArea; affectedMemberIds: string[] }> {
  let allCurrentAreas = await getAllMinistryAreas();
  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, []);
  let affectedMemberIds = new Set<string>();

  const areaIndex = allCurrentAreas.findIndex(area => area.id === areaId);
  if (areaIndex === -1) {
    throw new Error(`Ministry Area with ID ${areaId} not found.`);
  }

  const currentAreaBeforeUpdate = { ...allCurrentAreas[areaIndex] };
  const newLeaderId = updatedAreaData.leaderId ?? currentAreaBeforeUpdate.leaderId;
  const newMemberIdsFromClient = (updatedAreaData.memberIds ?? currentAreaBeforeUpdate.memberIds).filter(id => id !== newLeaderId);

  affectedMemberIds.add(newLeaderId); 
  if(currentAreaBeforeUpdate.leaderId) affectedMemberIds.add(currentAreaBeforeUpdate.leaderId); 

  const areaAfterClientUpdate: MinistryArea = {
    ...currentAreaBeforeUpdate,
    name: updatedAreaData.name ?? currentAreaBeforeUpdate.name,
    description: updatedAreaData.description ?? currentAreaBeforeUpdate.description,
    leaderId: newLeaderId,
    memberIds: newMemberIdsFromClient, 
  };
  
  allCurrentAreas[areaIndex] = areaAfterClientUpdate;
  await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, allCurrentAreas);

  if (newLeaderId && newLeaderId !== currentAreaBeforeUpdate.leaderId) {
    if (currentAreaBeforeUpdate.leaderId) {
      const oldLeaderIdx = allMembers.findIndex(m => m.id === currentAreaBeforeUpdate.leaderId);
      if (oldLeaderIdx !== -1 && allMembers[oldLeaderIdx].assignedAreaIds) {
        allMembers[oldLeaderIdx].assignedAreaIds = allMembers[oldLeaderIdx].assignedAreaIds!.filter(id => id !== areaId);
      }
    }
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

export async function deleteMinistryArea(areaId: string): Promise<string[]> {
  let allMinistryAreas = await getAllMinistryAreas();
  const areaToDelete = allMinistryAreas.find(area => area.id === areaId);

  if (!areaToDelete) {
    throw new Error(`Ministry Area with ID ${areaId} not found.`);
  }

  const remainingAreas = allMinistryAreas.filter(area => area.id !== areaId);
  await writeDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, remainingAreas);

  let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, []);
  const affectedMemberIds = new Set<string>();

  // Add leader and all members of the deleted area to affectedMemberIds
  if (areaToDelete.leaderId) {
    affectedMemberIds.add(areaToDelete.leaderId);
  }
  areaToDelete.memberIds.forEach(memberId => affectedMemberIds.add(memberId));

  // Update members who were part of the deleted area
  const updatedMembers = allMembers.map(member => {
    if (member.assignedAreaIds && member.assignedAreaIds.includes(areaId)) {
      return { ...member, assignedAreaIds: member.assignedAreaIds.filter(id => id !== areaId) };
    }
    return member;
  });
  await writeDbFile<Member>(MEMBERS_DB_FILE, updatedMembers);

  // Delete associated meeting series
  const allMeetingSeries = await readDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, []);
  const seriesToDelete = allMeetingSeries.filter(
    series => series.seriesType === 'ministryArea' && series.ownerGroupId === areaId
  );

  for (const series of seriesToDelete) {
    await deleteMeetingSeries(series.id); // This will also delete instances and attendance
  }

  return Array.from(affectedMemberIds);
}
