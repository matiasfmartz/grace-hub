
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
    addMemberToAssignments,
    getAllMembersNonPaginated // Added for dropdowns needing all members
} from '@/services/memberService';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';

export async function addSingleMemberAction(newMemberData: MemberWriteData): Promise<{ success: boolean; message: string; newMember?: Member }> {
  try {
    const newMember = await addMember(newMemberData);
    await addMemberToAssignments(newMember);
    
    revalidatePath('/members');
    revalidatePath('/groups');
    if (newMember.assignedAreaIds) {
      newMember.assignedAreaIds.forEach(areaId => {
        revalidatePath(`/groups/ministry-areas/${areaId}/manage`);
      });
    }
    if (newMember.assignedGDIId) {
        revalidatePath(`/groups/gdis/${newMember.assignedGDIId}/manage`);
    }
    
    return { success: true, message: `Miembro ${newMember.firstName} ${newMember.lastName} agregado exitosamente.`, newMember };
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

    const memberToUpdate = await updateMember(updatedMemberData.id, updatedMemberData);
    
    await updateMemberAssignments(
      memberToUpdate.id,
      originalMemberData, 
      memberToUpdate
    );

    revalidatePath('/members');
    revalidatePath('/groups');
    const allAffectedAreaIds = new Set([...(originalMemberData.assignedAreaIds || []), ...(memberToUpdate.assignedAreaIds || [])]);
    allAffectedAreaIds.forEach(areaId => revalidatePath(`/groups/ministry-areas/${areaId}/manage`));
    if (originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${originalMemberData.assignedGDIId}/manage`);
    if (memberToUpdate.assignedGDIId && memberToUpdate.assignedGDIId !== originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${memberToUpdate.assignedGDIId}/manage`);
    
    return { success: true, message: `Miembro ${memberToUpdate.firstName} ${memberToUpdate.lastName} actualizado exitosamente.`, updatedMember: memberToUpdate };
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
