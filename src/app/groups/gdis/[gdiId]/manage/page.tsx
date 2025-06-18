
'use server';
import type { GDI, Member } from '@/lib/types';
import ManageSingleGdiView from '@/components/groups/manage-single-gdi-view';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react'; // Added Settings
import { getGdiById, getAllGdis, updateGdiAndSyncMembers } from '@/services/gdiService';
import { getAllMembersNonPaginated, bulkRecalculateAndUpdateRoles } from '@/services/memberService';


export async function updateGdiDetailsAction(
  gdiIdToUpdate: string,
  updatedData: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
): Promise<{ success: boolean; message: string; updatedGdi?: GDI }> {
  try {
    // Ensure memberIds does not contain the guideId before sending to server
    const finalMemberIds = (updatedData.memberIds || []).filter(id => id !== updatedData.guideId);
    const finalDataToUpdate = {
      name: updatedData.name,
      guideId: updatedData.guideId,
      memberIds: finalMemberIds,
    };
    
    const { updatedGdi, affectedMemberIds } = await updateGdiAndSyncMembers(gdiIdToUpdate, finalDataToUpdate);

    // Recalculate roles for all affected members
    if (affectedMemberIds && affectedMemberIds.length > 0) {
      await bulkRecalculateAndUpdateRoles(affectedMemberIds);
    }

    revalidatePath(`/groups/gdis/${gdiIdToUpdate}/manage`);
    revalidatePath(`/groups/gdis/${gdiIdToUpdate}/admin`);
    revalidatePath('/groups');
    revalidatePath('/members');

    return { success: true, message: `GDI "${updatedGdi.name}" actualizado exitosamente. Roles actualizados.`, updatedGdi };
  } catch (error: any) {
    console.error("Error actualizando GDI y asignaciones de miembros:", error);
    return { success: false, message: `Error actualizando GDI: ${error.message}` };
  }
}

interface ManageGdiPageProps {
  params: { gdiId: string };
}

async function getData(gdiId: string): Promise<{ gdi: GDI | null; allMembers: Member[]; activeMembers: Member[]; allGdis: GDI[] }> {
  const gdi = await getGdiById(gdiId);
  const allGdisData = await getAllGdis(); 
  const allMembersData = await getAllMembersNonPaginated();
  const activeMembers = allMembersData.filter(m => m.status === 'Active');
  return { gdi, allMembers: allMembersData, activeMembers, allGdis: allGdisData };
}

export default async function ManageGdiPage({ params }: ManageGdiPageProps) {
  const { gdi, allMembers, activeMembers, allGdis } = await getData(params.gdiId);

  if (!gdi) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href="/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Grupos
          </Link>
        </Button>
        <Button asChild variant="outline">
            <Link href={`/groups/gdis/${gdi.id}/admin`}>
                <Settings className="mr-2 h-4 w-4" /> Administrar Reuniones
            </Link>
        </Button>
      </div>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Administrar GDI: {gdi.name}</h1>
        <p className="text-muted-foreground mt-2">
          Actualizar guía, asignar miembros y administrar otros detalles para este GDI.
        </p>
      </div>
      <ManageSingleGdiView
        gdi={gdi}
        allMembers={allMembers} 
        activeMembers={activeMembers}
        allGdis={allGdis} 
        updateGdiAction={updateGdiDetailsAction}
      />
    </div>
  );
}
