
'use server';
import type { MinistryArea, Member, GDI, MinistryAreaWriteData, GdiWriteData } from '@/lib/types';
import ManageGroupsTabs from '@/components/groups/manage-groups-tabs';
import { revalidatePath } from 'next/cache';
import { 
    getAllMinistryAreas, 
    addMinistryArea as addMinistryAreaService, // Renamed to avoid conflict
    updateMinistryAreaAndSyncMembers // For updating member assignments
} from '@/services/ministryAreaService';
import { 
    getAllGdis, 
    addGdi as addGdiService, // Renamed to avoid conflict
    updateGdiAndSyncMembers // For updating member assignments
} from '@/services/gdiService';
import { getAllMembersNonPaginated, bulkRecalculateAndUpdateRoles, updateMemberAssignments } from '@/services/memberService'; 
import { writeDbFile, readDbFile } from '@/lib/db-utils'; // For direct member updates if needed

const MEMBERS_DB_FILE = 'members-db.json';


export async function addMinistryAreaActionSvc(
  newAreaData: Partial<Omit<MinistryArea, 'id'>> & { name: string; leaderId: string } // Ensure name and leaderId are present
): Promise<{ success: boolean; message: string; newArea?: MinistryArea }> {
  try {
    const areaToWrite: MinistryAreaWriteData = {
        name: newAreaData.name,
        description: newAreaData.description || "",
        leaderId: newAreaData.leaderId,
        memberIds: newAreaData.memberIds || [] 
    };
    const newArea = await addMinistryAreaService(areaToWrite); // Calls the renamed service function
    
    const affectedMemberIds = new Set<string>();
    affectedMemberIds.add(newArea.leaderId);
    (newAreaData.memberIds || []).forEach(id => affectedMemberIds.add(id));

    // Update member assignments for leader and new members
    let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, []);
    
    // Update Leader
    const leaderIdx = allMembers.findIndex(m => m.id === newArea.leaderId);
    if (leaderIdx !== -1) {
        if (!allMembers[leaderIdx].assignedAreaIds) allMembers[leaderIdx].assignedAreaIds = [];
        if (!allMembers[leaderIdx].assignedAreaIds!.includes(newArea.id)) {
            allMembers[leaderIdx].assignedAreaIds!.push(newArea.id);
        }
    }

    // Update Members
    (newAreaData.memberIds || []).forEach(memberId => {
        const memberIdx = allMembers.findIndex(m => m.id === memberId);
        if (memberIdx !== -1) {
            if (!allMembers[memberIdx].assignedAreaIds) allMembers[memberIdx].assignedAreaIds = [];
            if (!allMembers[memberIdx].assignedAreaIds!.includes(newArea.id)) {
                allMembers[memberIdx].assignedAreaIds!.push(newArea.id);
            }
        }
    });
    await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);
    
    if (affectedMemberIds.size > 0) {
      await bulkRecalculateAndUpdateRoles(Array.from(affectedMemberIds));
    }

    revalidatePath('/groups');
    revalidatePath(`/members`); 
    return { success: true, message: `Ministry Area "${newArea.name}" added successfully. Roles updated.`, newArea };
  } catch (error: any) {
    console.error("Error adding ministry area:", error);
    return { success: false, message: `Error adding ministry area: ${error.message}` };
  }
}

export async function addGdiActionSvc(
  newGdiData: Partial<Omit<GDI, 'id'>> & { name: string; guideId: string } // Ensure name and guideId are present
): Promise<{ success: boolean; message: string; newGdi?: GDI }> {
  try {
    const gdiToWrite: GdiWriteData = {
        name: newGdiData.name,
        guideId: newGdiData.guideId,
        memberIds: newGdiData.memberIds || [] 
    };
    const newGdi = await addGdiService(gdiToWrite); // Calls the renamed service function

    const affectedMemberIds = new Set<string>();
    affectedMemberIds.add(newGdi.guideId);
    (newGdiData.memberIds || []).forEach(id => affectedMemberIds.add(id));

    // Update member assignments for guide and new members
    let allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, []);

    // Update Guide
    const guideIdx = allMembers.findIndex(m => m.id === newGdi.guideId);
    if (guideIdx !== -1) {
        // If guide was in another GDI as member, remove them
        if (allMembers[guideIdx].assignedGDIId && allMembers[guideIdx].assignedGDIId !== newGdi.id) {
            const oldGdi = await readDbFile<GDI>('gdis-db.json', []).then(gdis => gdis.find(g => g.id === allMembers[guideIdx].assignedGDIId));
            if (oldGdi && oldGdi.guideId !== newGdi.guideId) { // Don't remove if they were guide of that old GDI
                const allGdis = await readDbFile<GDI>('gdis-db.json', []);
                const oldGdiIdx = allGdis.findIndex(g => g.id === oldGdi.id);
                if (oldGdiIdx !== -1) {
                    allGdis[oldGdiIdx].memberIds = allGdis[oldGdiIdx].memberIds.filter(id => id !== newGdi.guideId);
                    await writeDbFile<GDI>('gdis-db.json', allGdis);
                }
            }
        }
        allMembers[guideIdx].assignedGDIId = newGdi.id;
    }
    
    // Update Members
    (newGdiData.memberIds || []).forEach(async (memberId) => {
        const memberIdx = allMembers.findIndex(m => m.id === memberId);
        if (memberIdx !== -1) {
            // If member was in another GDI, remove them
            if (allMembers[memberIdx].assignedGDIId && allMembers[memberIdx].assignedGDIId !== newGdi.id) {
                 const oldGdi = await readDbFile<GDI>('gdis-db.json', []).then(gdis => gdis.find(g => g.id === allMembers[memberIdx].assignedGDIId));
                 if (oldGdi && oldGdi.guideId !== memberId) { // Don't remove if they were guide of that old GDI
                    const allGdis = await readDbFile<GDI>('gdis-db.json', []);
                    const oldGdiIdx = allGdis.findIndex(g => g.id === oldGdi.id);
                    if (oldGdiIdx !== -1) {
                        allGdis[oldGdiIdx].memberIds = allGdis[oldGdiIdx].memberIds.filter(id => id !== memberId);
                        await writeDbFile<GDI>('gdis-db.json', allGdis);
                    }
                }
            }
            allMembers[memberIdx].assignedGDIId = newGdi.id;
        }
    });
    await writeDbFile<Member>(MEMBERS_DB_FILE, allMembers);
    
    if (affectedMemberIds.size > 0) {
      await bulkRecalculateAndUpdateRoles(Array.from(affectedMemberIds));
    }

    revalidatePath('/groups');
    revalidatePath(`/members`);
    return { success: true, message: `GDI "${newGdi.name}" added successfully. Roles updated.`, newGdi };
  } catch (error: any) {
    console.error("Error adding GDI:", error);
    return { success: false, message: `Error adding GDI: ${error.message}` };
  }
}

async function getGroupsData(): Promise<{ ministryAreas: MinistryArea[], gdis: GDI[], members: Member[] }> {
  const ministryAreas = await getAllMinistryAreas();
  const gdis = await getAllGdis();
  const members = await getAllMembersNonPaginated(); 
  return { ministryAreas, gdis, members };
}

export default async function GroupsPage() {
  const { ministryAreas, gdis, members } = await getGroupsData();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-10 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Manage Groups</h1>
        <p className="text-muted-foreground mt-2">Oversee Ministry Areas and GDIs within the church community.</p>
      </div>
      <ManageGroupsTabs
        initialMinistryAreas={ministryAreas}
        initialGdis={gdis}
        allMembers={members} 
        addMinistryAreaAction={addMinistryAreaActionSvc} 
        addGdiAction={addGdiActionSvc} 
      />
    </div>
  );
}

