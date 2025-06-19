
'use server';
import type { Member, GDI, MinistryArea, Meeting, MeetingSeries, AttendanceRecord, MemberWriteData } from '@/lib/types';
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


export async function addSingleMemberAction(newMemberData: Omit<Member, 'id' | 'roles'>): Promise<{ success: boolean; message: string; newMember?: Member }> {
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
    console.error("Error actualizando miembro:", error);
    return { success: false, message: `Error al actualizar miembro: ${error.message}` };
  }
}

async function getMembersPageData(
  currentPageParam: number,
  pageSizeParam: number,
  searchTermParam?: string,
  memberStatusFiltersParam?: string[],
  roleFiltersParam?: string[],
  guideFiltersParam?: string[]
) {
  const { members, totalMembers, totalPages } = await getAllMembers(
    currentPageParam,
    pageSizeParam,
    searchTermParam,
    memberStatusFiltersParam,
    roleFiltersParam,
    guideFiltersParam
  );
  const allMembersForDropdowns = await getAllMembersNonPaginated();
  const allGDIsData = await getAllGdis();
  const allMinistryAreasData = await getAllMinistryAreas();
  const allMeetingsData = await getAllMeetings();
  const allMeetingSeriesData = await getAllMeetingSeries();
  const allAttendanceRecordsData = await getAllAttendanceRecords();
  const absoluteTotalMembers = allMembersForDropdowns.length;

  return {
    members,
    totalMembers, // This is the count AFTER filters
    totalPages,
    allMembersForDropdowns,
    allGDIs: allGDIsData,
    allMinistryAreas: allMinistryAreasData,
    allMeetings: allMeetingsData,
    allMeetingSeries: allMeetingSeriesData,
    allAttendanceRecords: allAttendanceRecordsData,
    absoluteTotalMembers, // New prop: absolute total
  };
}

interface MembersPageProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    memberStatus?: string;
    role?: string;
    guide?: string;
  };
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const currentPage = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;
  const searchTerm = searchParams.search || '';
  const memberStatusFilterString = searchParams.memberStatus || '';
  const roleFilterString = searchParams.role || '';
  const guideFilterString = searchParams.guide || '';
  
  const currentMemberStatusFiltersArray = memberStatusFilterString ? memberStatusFilterString.split(',') : [];
  const currentRoleFiltersArray = roleFilterString ? roleFilterString.split(',') : [];
  const currentGuideFiltersArray = guideFilterString ? guideFilterString.split(',') : [];

  const {
    members,
    totalMembers,
    totalPages,
    allMembersForDropdowns,
    allGDIs,
    allMinistryAreas,
    allMeetings,
    allMeetingSeries,
    allAttendanceRecords,
    absoluteTotalMembers
  } = await getMembersPageData(
    currentPage,
    pageSize,
    searchTerm,
    currentMemberStatusFiltersArray,
    currentRoleFiltersArray,
    currentGuideFiltersArray
  );

  const viewKey = `${currentPage}-${pageSize}-${searchTerm}-${memberStatusFilterString}-${roleFilterString}-${guideFilterString}`;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Directorio de Miembros</h1>
        <p className="text-muted-foreground mt-2">
          Visualice, busque, filtre y administre la información de los miembros.
        </p>
      </div>
      <MembersListView
        key={viewKey}
        initialMembers={members}
        allMembersForDropdowns={allMembersForDropdowns}
        allGDIs={allGDIs}
        allMinistryAreas={allMinistryAreas}
        allMeetings={allMeetings}
        allMeetingSeries={allMeetingSeries}
        allAttendanceRecords={allAttendanceRecords}
        addSingleMemberAction={addSingleMemberAction}
        updateMemberAction={updateMemberAction}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        currentSearchTerm={searchTerm}
        currentMemberStatusFilters={currentMemberStatusFiltersArray}
        currentRoleFilters={currentRoleFiltersArray}
        currentGuideIdFilters={currentGuideFiltersArray}
        totalMembers={totalMembers}
        absoluteTotalMembers={absoluteTotalMembers}
      />
    </div>
  );
}
