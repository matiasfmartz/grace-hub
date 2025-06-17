
'use server';
import type { Member, GDI, MinistryArea, MemberWriteData } from '@/lib/types';
import MembersListView from '@/components/members/members-list-view';
import { revalidatePath } from 'next/cache';
import { 
    getAllMembers, 
    getMemberById, 
    addMember, 
    updateMember, 
    updateMemberAssignments, 
    // addMemberToAssignments, // This is now called within addMember
    getAllMembersNonPaginated,
    bulkRecalculateAndUpdateRoles // Added for role updates
} from '@/services/memberService';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';

export async function addSingleMemberAction(newMemberData: MemberWriteData): Promise<{ success: boolean; message: string; newMember?: Member }> {
  try {
    // addMember now handles initial role calculation and calls addMemberToAssignments internally.
    const newMember = await addMember(newMemberData);
    
    revalidatePath('/members');
    revalidatePath('/groups'); // Groups page might show leader/guide names
    if (newMember.assignedAreaIds) {
      newMember.assignedAreaIds.forEach(areaId => {
        revalidatePath(`/groups/ministry-areas/${areaId}/manage`);
      });
    }
    if (newMember.assignedGDIId) {
        revalidatePath(`/groups/gdis/${newMember.assignedGDIId}/manage`);
    }
    
    return { success: true, message: `Miembro ${newMember.firstName} ${newMember.lastName} agregado exitosamente. Roles calculados.`, newMember };
  } catch (error: any) {
    console.error("Error saving single member:", error);
    return { success: false, message: `Error al guardar miembro: ${error.message}` };
  }
}

export async function updateMemberAction(updatedMemberData: Member): Promise<{ success: boolean; message: string; updatedMember?: Member }> {
  if (!updatedMemberData.id) {
    return { success: false, message: "Error: ID de miembro es requerido para actualizar." };
  }
  try {
    const originalMemberData = await getMemberById(updatedMemberData.id);
    if (!originalMemberData) {
      return { success: false, message: `Error: Miembro con ID ${updatedMemberData.id} no encontrado.` };
    }

    // updateMember will apply basic updates AND recalculate roles based on submitted assignedGDIId/assignedAreaIds
    const memberToUpdate = await updateMember(updatedMemberData.id, updatedMemberData);
    
    // updateMemberAssignments updates GDI/Area lists and returns IDs of members whose roles might change due to those list changes
    // (e.g., if an old guide was replaced, that old guide's roles need re-check)
    const affectedIdsFromAssignments = await updateMemberAssignments(
      memberToUpdate.id,
      originalMemberData, 
      memberToUpdate // Pass the already updated member from updateMember
    );

    // Recalculate roles for the main member and any indirectly affected members.
    // Using a Set to ensure unique IDs.
    const allAffectedIds = Array.from(new Set([memberToUpdate.id, ...affectedIdsFromAssignments]));
    if (allAffectedIds.length > 0) {
        await bulkRecalculateAndUpdateRoles(allAffectedIds);
    }
    
    // Revalidate paths
    revalidatePath('/members');
    revalidatePath('/groups');
    const allPotentiallyAffectedAreaIds = new Set([...(originalMemberData.assignedAreaIds || []), ...(memberToUpdate.assignedAreaIds || [])]);
    allPotentiallyAffectedAreaIds.forEach(areaId => revalidatePath(`/groups/ministry-areas/${areaId}/manage`));
    if (originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${originalMemberData.assignedGDIId}/manage`);
    if (memberToUpdate.assignedGDIId && memberToUpdate.assignedGDIId !== originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${memberToUpdate.assignedGDIId}/manage`);
    
    // Fetch the member again to return the fully updated version with potentially re-recalculated roles
    const finalUpdatedMember = await getMemberById(memberToUpdate.id);

    return { success: true, message: `Miembro ${memberToUpdate.firstName} ${memberToUpdate.lastName} actualizado exitosamente. Roles actualizados.`, updatedMember: finalUpdatedMember };
  } catch (error: any) {
    console.error("Error updating member:", error);
    return { success: false, message: `Error al actualizar miembro: ${error.message}` };
  }
}

interface MembersPageProps {
  searchParams?: {
    page?: string;
    pageSize?: string;
    search?: string;
  };
}

async function getMembersPageData(page: number, pageSize: number, searchTerm?: string): Promise<{ 
  membersForPage: Member[], 
  allMembersForDropdowns: Member[],
  gdis: GDI[], 
  ministryAreas: MinistryArea[],
  currentPage: number,
  totalPages: number
}> {
  const { members, totalMembers, totalPages } = await getAllMembers(page, pageSize, searchTerm);
  const allMembersForDropdowns = await getAllMembersNonPaginated(); 
  const gdis = await getAllGdis();
  const ministryAreas = await getAllMinistryAreas();
  return { membersForPage: members, allMembersForDropdowns, gdis, ministryAreas, currentPage: page, totalPages };
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 10; 
  const searchTerm = searchParams?.search || '';
  
  const { membersForPage, allMembersForDropdowns, gdis, ministryAreas, totalPages } = await getMembersPageData(currentPage, pageSize, searchTerm);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Member Directory</h1>
        <p className="text-muted-foreground mt-2">Manage and connect with members of our church community.</p>
      </div>
      <MembersListView 
        initialMembers={membersForPage} 
        allMembersForDropdowns={allMembersForDropdowns}
        allGDIs={gdis}
        allMinistryAreas={ministryAreas}
        addSingleMemberAction={addSingleMemberAction}
        updateMemberAction={updateMemberAction}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        currentSearchTerm={searchTerm}
      />
    </div>
  );
}
