
'use server';
import type { MinistryArea, Member } from '@/lib/types';
import ManageSingleMinistryAreaView from '@/components/groups/manage-single-ministry-area-view';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getMinistryAreaById, updateMinistryAreaAndSyncMembers } from '@/services/ministryAreaService';
import { getAllMembers } from '@/services/memberService';

export async function updateMinistryAreaDetailsAction(
  areaId: string,
  updatedData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description' | 'imageUrl'>>
): Promise<{ success: boolean; message: string; updatedArea?: MinistryArea }> {
  try {
    const updatedArea = await updateMinistryAreaAndSyncMembers(areaId, updatedData);
    
    revalidatePath(`/groups/ministry-areas/${areaId}/manage`);
    revalidatePath('/groups');
    revalidatePath('/members'); 

    return { success: true, message: `Ministry Area "${updatedArea.name}" updated successfully. Member assignments synchronized.`, updatedArea };
  } catch (error: any) {
    console.error("Error updating ministry area and member assignments:", error);
    return { success: false, message: `Error updating ministry area: ${error.message}` };
  }
}

interface ManageMinistryAreaPageProps {
  params: { areaId: string };
}

async function getData(areaId: string): Promise<{ ministryArea: MinistryArea | null; allMembers: Member[] }> {
  const ministryArea = await getMinistryAreaById(areaId);
  const allMembers = await getAllMembers();
  return { ministryArea, allMembers };
}

export default async function ManageMinistryAreaPage({ params }: ManageMinistryAreaPageProps) {
  const { ministryArea, allMembers } = await getData(params.areaId);

  if (!ministryArea) {
    notFound();
  }
  
  const activeMembers = allMembers.filter(m => m.status === 'Active');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Link>
        </Button>
      </div>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Manage: {ministryArea.name}</h1>
        <p className="text-muted-foreground mt-2">
          Update leader, assign members, and manage other details for this ministry area.
        </p>
      </div>
      <ManageSingleMinistryAreaView
        ministryArea={ministryArea}
        allMembers={allMembers} 
        activeMembers={activeMembers}
        updateMinistryAreaAction={updateMinistryAreaDetailsAction}
      />
    </div>
  );
}
