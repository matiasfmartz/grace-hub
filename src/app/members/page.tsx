
'use server';
import type { Member, GDI, MinistryArea, MemberWriteData, Meeting, MeetingSeries, AttendanceRecord, MemberRoleType } from '@/lib/types';
import MembersListView from '@/components/members/members-list-view';
import { revalidatePath } from 'next/cache';
import { 
    getAllMembers, 
    getMemberById, 
    addMember, 
    updateMember, 
    updateMemberAssignments, 
    getAllMembersNonPaginated,
    bulkRecalculateAndUpdateRoles
} from '@/services/memberService';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';
import { getAllMeetings, getAllMeetingSeries } from '@/services/meetingService';
import { getAllAttendanceRecords } from '@/services/attendanceService';

export async function addSingleMemberAction(newMemberData: MemberWriteData): Promise<{ success: boolean; message: string; newMember?: Member }> {
  try {
    const newMember = await addMember(newMemberData);
    
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

    const memberToUpdate = await updateMember(updatedMemberData.id, updatedMemberData);
    
    const affectedIdsFromAssignments = await updateMemberAssignments(
      memberToUpdate.id,
      originalMemberData, 
      memberToUpdate 
    );

    const allAffectedIds = Array.from(new Set([memberToUpdate.id, ...affectedIdsFromAssignments]));
    if (allAffectedIds.length > 0) {
        await bulkRecalculateAndUpdateRoles(allAffectedIds);
    }
    
    revalidatePath('/members');
    revalidatePath('/groups');
    const allPotentiallyAffectedAreaIds = new Set([...(originalMemberData.assignedAreaIds || []), ...(memberToUpdate.assignedAreaIds || [])]);
    allPotentiallyAffectedAreaIds.forEach(areaId => revalidatePath(`/groups/ministry-areas/${areaId}/manage`));
    if (originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${originalMemberData.assignedGDIId}/manage`);
    if (memberToUpdate.assignedGDIId && memberToUpdate.assignedGDIId !== originalMemberData.assignedGDIId) revalidatePath(`/groups/gdis/${memberToUpdate.assignedGDIId}/manage`);
    
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
    status?: string;
    role?: string;
    guide?: string;
  };
}

async function getMembersPageData(
    page: number, 
    pageSize: number, 
    searchTerm?: string,
    statusFilter?: string,
    roleFilter?: string,
    guideIdFilter?: string
): Promise<{ 
  membersForPage: Member[], 
  allMembersForDropdowns: Member[],
  gdis: GDI[], 
  ministryAreas: MinistryArea[],
  allMeetings: Meeting[],
  allMeetingSeries: MeetingSeries[],
  allAttendanceRecords: AttendanceRecord[],
  currentPage: number,
  totalPages: number
}> {
  const { members, totalMembers, totalPages } = await getAllMembers(page, pageSize, searchTerm, statusFilter, roleFilter, guideIdFilter);
  const [
    allMembersForDropdowns, 
    gdis, 
    ministryAreas,
    allMeetings,
    allMeetingSeries,
    allAttendanceRecords
  ] = await Promise.all([
    getAllMembersNonPaginated(),
    getAllGdis(),
    getAllMinistryAreas(),
    getAllMeetings(),
    getAllMeetingSeries(),
    getAllAttendanceRecords()
  ]);
  return { 
    membersForPage: members, 
    allMembersForDropdowns, 
    gdis, 
    ministryAreas, 
    allMeetings,
    allMeetingSeries,
    allAttendanceRecords,
    currentPage: page, 
    totalPages 
  };
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 10; 
  const searchTerm = searchParams?.search || '';
  const statusFilter = searchParams?.status || '';
  const roleFilter = searchParams?.role || '';
  const guideIdFilter = searchParams?.guide || '';
  
  const { 
    membersForPage, 
    allMembersForDropdowns, 
    gdis, 
    ministryAreas, 
    allMeetings,
    allMeetingSeries,
    allAttendanceRecords,
    totalPages 
  } = await getMembersPageData(currentPage, pageSize, searchTerm, statusFilter, roleFilter, guideIdFilter);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Member Directory</h1>
        <p className="text-muted-foreground mt-2">Manage and connect with members of our church community.</p>
      </div>
      <MembersListView 
        key={`${currentPage}-${pageSize}-${searchTerm}-${statusFilter}-${roleFilter}-${guideIdFilter}`}
        initialMembers={membersForPage} 
        allMembersForDropdowns={allMembersForDropdowns}
        allGDIs={gdis}
        allMinistryAreas={ministryAreas}
        allMeetings={allMeetings}
        allMeetingSeries={allMeetingSeries}
        allAttendanceRecords={allAttendanceRecords}
        addSingleMemberAction={addSingleMemberAction}
        updateMemberAction={updateMemberAction}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        currentSearchTerm={searchTerm}
        currentStatusFilter={statusFilter}
        currentRoleFilter={roleFilter}
        currentGuideIdFilter={guideIdFilter}
      />
    </div>
  );
}

