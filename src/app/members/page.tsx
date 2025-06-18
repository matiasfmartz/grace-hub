
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
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    role?: string;
    guide?: string;
  };
}

async function getMembersPageData(
  pageParam?: string,
  pageSizeParam?: string,
  searchTermParam?: string,
  statusFilterStringParam?: string,
  roleFilterStringParam?: string,
  guideIdFilterStringParam?: string
): Promise<{
  membersForPage: Member[],
  allMembersForDropdowns: Member[],
  gdis: GDI[],
  ministryAreas: MinistryArea[],
  allMeetings: Meeting[],
  allMeetingSeries: MeetingSeries[],
  allAttendanceRecords: AttendanceRecord[],
  currentPage: number,
  totalPages: number,
  pageSize: number,
  currentSearchTerm: string,
  currentStatusFiltersArray: string[],
  currentRoleFiltersArray: string[],
  currentGuideIdFiltersArray: string[]
}> {
  const page = Number(pageParam) || 1;
  const pageSize = Number(pageSizeParam) || 10;
  const searchTerm = (searchTermParam || '').trim();
  const statusFilterString = (statusFilterStringParam || '').trim();
  const roleFilterString = (roleFilterStringParam || '').trim();
  const guideIdFilterString = (guideIdFilterStringParam || '').trim();

  const statusFilters = statusFilterString ? statusFilterString.split(',').map(s => s.trim()).filter(Boolean) : [];
  const roleFilters = roleFilterString ? roleFilterString.split(',').map(s => s.trim()).filter(Boolean) : [];
  const guideIdFilters = guideIdFilterString ? guideIdFilterString.split(',').map(s => s.trim()).filter(Boolean) : [];

  const { members, totalMembers, totalPages } = await getAllMembers(page, pageSize, searchTerm, statusFilters, roleFilters, guideIdFilters);
  
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
    totalPages,
    pageSize,
    currentSearchTerm: searchTerm,
    currentStatusFiltersArray: statusFilters,
    currentRoleFiltersArray: roleFilters,
    currentGuideIdFiltersArray: guideIdFilters,
  };
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const page = searchParams?.page;
  const pageSizeParam = searchParams?.pageSize;
  const search = searchParams?.search;
  const status = searchParams?.status;
  const role = searchParams?.role;
  const guide = searchParams?.guide;

  const {
    membersForPage,
    allMembersForDropdowns,
    gdis,
    ministryAreas,
    allMeetings,
    allMeetingSeries,
    allAttendanceRecords,
    currentPage,
    totalPages,
    pageSize,
    currentSearchTerm,
    currentStatusFiltersArray,
    currentRoleFiltersArray,
    currentGuideIdFiltersArray,
  } = await getMembersPageData(
    page,
    pageSizeParam,
    search,
    status,
    role,
    guide
  );

  const key = `${currentPage}-${pageSize}-${currentSearchTerm}-${currentStatusFiltersArray.join(',')}-${currentRoleFiltersArray.join(',')}-${currentGuideIdFiltersArray.join(',')}`;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Member Directory</h1>
        <p className="text-muted-foreground mt-2">Manage and connect with members of our church community.</p>
      </div>
      <MembersListView
        key={key}
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
        currentSearchTerm={currentSearchTerm}
        currentStatusFilters={currentStatusFiltersArray}
        currentRoleFilters={currentRoleFiltersArray}
        currentGuideIdFilters={currentGuideIdFiltersArray}
      />
    </div>
  );
}
