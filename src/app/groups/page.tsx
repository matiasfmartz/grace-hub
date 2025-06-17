
'use server';
import type { MinistryArea, Member, GDI, AddMinistryAreaFormValues, AddGdiFormValues, MinistryAreaWriteData, GdiWriteData } from '@/lib/types';
import ManageGroupsTabs from '@/components/groups/manage-groups-tabs';
import { revalidatePath } from 'next/cache';
import { getAllMinistryAreas, addMinistryArea } from '@/services/ministryAreaService';
import { getAllGdis, addGdi } from '@/services/gdiService';
import { getAllMembersNonPaginated, bulkRecalculateAndUpdateRoles } from '@/services/memberService'; 

export async function addMinistryAreaActionSvc(newAreaData: AddMinistryAreaFormValues): Promise<{ success: boolean; message: string; newArea?: MinistryArea }> {
  try {
    const areaToWrite: MinistryAreaWriteData = {
        name: newAreaData.name,
        description: newAreaData.description,
        leaderId: newAreaData.leaderId,
        imageUrl: newAreaData.imageUrl || 'https://placehold.co/600x400',
        memberIds: [] 
    };
    const newArea = await addMinistryArea(areaToWrite);
    
    // Recalculate roles for the new leader
    if (newArea.leaderId) {
      await bulkRecalculateAndUpdateRoles([newArea.leaderId]);
    }

    revalidatePath('/groups');
    revalidatePath(`/members`); 
    return { success: true, message: `Ministry Area "${newArea.name}" added successfully. Leader role updated.`, newArea };
  } catch (error: any) {
    console.error("Error adding ministry area:", error);
    return { success: false, message: `Error adding ministry area: ${error.message}` };
  }
}

export async function addGdiActionSvc(newGdiData: AddGdiFormValues): Promise<{ success: boolean; message: string; newGdi?: GDI }> {
  try {
    const gdiToWrite: GdiWriteData = {
        name: newGdiData.name,
        guideId: newGdiData.guideId,
        memberIds: [] 
    };
    const newGdi = await addGdi(gdiToWrite);

    // Recalculate roles for the new guide
    if (newGdi.guideId) {
      await bulkRecalculateAndUpdateRoles([newGdi.guideId]);
    }

    revalidatePath('/groups');
    revalidatePath(`/members`);
    return { success: true, message: `GDI "${newGdi.name}" added successfully. Guide role updated.`, newGdi };
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

