
'use server';
import type { Meeting, DefineMeetingSeriesFormValues, MeetingSeries, Member, GDI, MinistryArea, AttendanceRecord, AddOccasionalMeetingFormValues, MemberRoleType } from '@/lib/types';
import { NO_ROLE_FILTER_VALUE, NO_GDI_FILTER_VALUE, NO_AREA_FILTER_VALUE } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { CalendarDays, Filter, Settings, PlusSquare, LayoutGrid, ListFilter, ShieldCheck, Users as UsersIcon, Activity, X } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { format, parseISO, isValid, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    getAllMeetingSeries,
    addMeetingSeries,
    updateMeetingSeries,
    deleteMeetingSeries,
    addMeetingInstance,
    getFilteredMeetingInstances
} from '@/services/meetingService';
import { getAllMembersNonPaginated } from '@/services/memberService';
import PageSpecificAddMeetingDialog from '@/components/events/page-specific-add-meeting-dialog';
import ManageMeetingSeriesDialog from '@/components/events/manage-meeting-series-dialog';
import AddOccasionalMeetingDialog from '@/components/events/add-occasional-meeting-dialog';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';
import { getAllAttendanceRecords, getResolvedAttendees } from '@/services/attendanceService';
import MeetingTypeAttendanceTable from '@/components/events/meeting-type-attendance-table';
import AttendanceLineChart from '@/components/events/AttendanceFrequencySummaryTable';
import DateRangeFilter from '@/components/events/date-range-filter';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MemberRoleEnum } from '@/lib/types';

export async function defineMeetingSeriesAction(
  newSeriesData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; newSeries?: MeetingSeries, newInstances?: Meeting[] }> {
  try {
    const dataForService: DefineMeetingSeriesFormValues = {
      ...newSeriesData,
      seriesType: 'general',
      ownerGroupId: null,
      oneTimeDate: newSeriesData.oneTimeDate instanceof Date && isValid(newSeriesData.oneTimeDate)
        ? newSeriesData.oneTimeDate
        : undefined,
    };
    if (newSeriesData.oneTimeDate instanceof Date && isValid(newSeriesData.oneTimeDate)) {
        (dataForService as any).oneTimeDate = format(newSeriesData.oneTimeDate, 'yyyy-MM-dd');
    }


    const result = await addMeetingSeries(dataForService as any);

    revalidatePath('/events');
    let message = `Serie de reuniones "${result.series.name}" agregada exitosamente.`;
    if (result.newInstances && result.newInstances.length > 0) {
        message += ` ${result.newInstances.length} instancia(s) inicial(es) creada(s).`
    } else if (result.series.frequency === "OneTime" && result.newInstances && result.newInstances.length === 1) {
        const instanceDateStr = result.newInstances[0].date;
        const parsedInstanceDate = parseISO(instanceDateStr);
        if (isValid(parsedInstanceDate)) {
             message += ` Instancia creada para el ${format(parsedInstanceDate, "d 'de' MMMM", { locale: es })}.`
        } else {
            message += ` Instancia creada (fecha: ${instanceDateStr}).`
        }
    }
    return { success: true, message, newSeries: result.series, newInstances: result.newInstances };
  } catch (error: any) {
    console.error("Error defining meeting series:", error);
    return { success: false, message: `Error al definir serie de reuniones: ${error.message}` };
  }
}

export async function updateMeetingSeriesAction(
  seriesId: string,
  updatedData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; updatedSeries?: MeetingSeries, newlyGeneratedInstances?: Meeting[] }> {
  try {
    const seriesToWrite = {
        name: updatedData.name,
        description: updatedData.description,
        defaultTime: updatedData.defaultTime,
        defaultLocation: updatedData.defaultLocation,
        targetAttendeeGroups: updatedData.targetAttendeeGroups,
        frequency: updatedData.frequency,
        seriesType: 'general' as const,
        ownerGroupId: null,
        oneTimeDate: updatedData.oneTimeDate instanceof Date && isValid(updatedData.oneTimeDate) ? format(updatedData.oneTimeDate, 'yyyy-MM-dd') : undefined,
        weeklyDays: updatedData.weeklyDays,
        monthlyRuleType: updatedData.monthlyRuleType,
        monthlyDayOfMonth: updatedData.monthlyDayOfMonth,
        monthlyWeekOrdinal: updatedData.monthlyWeekOrdinal,
        monthlyDayOfWeek: updatedData.monthlyDayOfWeek,
    };
    const result = await updateMeetingSeries(seriesId, seriesToWrite);
    revalidatePath('/events');
    let message = `Serie de reuniones "${result.updatedSeries.name}" actualizada exitosamente.`;
    if (result.newlyGeneratedInstances && result.newlyGeneratedInstances.length > 0) {
        message += ` ${result.newlyGeneratedInstances.length} nueva(s) instancia(s) futura(s) generada(s).`;
    }
    return { success: true, message, updatedSeries: result.updatedSeries, newlyGeneratedInstances: result.newlyGeneratedInstances };
  } catch (error: any) {
    console.error("Error updating meeting series:", error);
    return { success: false, message: `Error al actualizar serie de reuniones: ${error.message}` };
  }
}

export async function deleteMeetingSeriesAction(
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await deleteMeetingSeries(seriesId);
    revalidatePath('/events');
    return { success: true, message: "Serie de reuniones eliminada exitosamente, junto con sus instancias y registros de asistencia." };
  } catch (error: any) {
    console.error("Error deleting meeting series:", error);
    return { success: false, message: `Error al eliminar serie de reuniones: ${error.message}` };
  }
}

export async function addOccasionalMeetingAction(
  seriesId: string,
  formData: AddOccasionalMeetingFormValues
): Promise<{ success: boolean; message: string; newInstance?: Meeting }> {
  try {
    const newInstance = await addMeetingInstance(seriesId, {
      name: formData.name,
      date: format(formData.date, 'yyyy-MM-dd'),
      time: formData.time,
      location: formData.location,
      description: formData.description,
    });
    revalidatePath('/events');
    return { success: true, message: `Instancia ocasional "${newInstance.name}" agregada exitosamente.`, newInstance };
  } catch (error: any) {
    console.error("Error adding occasional meeting instance:", error);
    return { success: false, message: `Error al agregar instancia de reunión: ${error.message}` };
  }
}

interface EventsPageData {
  allSeries: MeetingSeries[];
  meetingsForPage: Meeting[];
  totalMeetingInstances: number;
  meetingInstancesTotalPages: number;
  meetingInstancesCurrentPage: number;
  allMembers: Member[];
  allGdis: GDI[];
  allMinistryAreas: MinistryArea[];
  allAttendanceRecords: AttendanceRecord[];
  initialRowMembers: Member[];
  expectedAttendeesMap: Record<string, Set<string>>;
  memberCurrentPage: number;
  memberPageSize: number;
  appliedStartDate?: string;
  appliedEndDate?: string;
  selectedSeriesId?: string;
  // Filters for table members
  tableMemberRoleFilters: string[];
  tableMemberStatusFilters: Member['status'][];
  tableMemberGdiFilters: string[];
  tableMemberAreaFilters: string[];
}

interface EventsPageProps {
  searchParams?: {
    series?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    pageSize?: string;
    mPage?: string;
    mPSize?: string;
    // New search params for table filters
    tmr?: string; // table member roles
    tms?: string; // table member status
    tmg?: string; // table member gdi
    tma?: string; // table member area
  };
}

async function getEventsPageData(
    selectedSeriesIdParam?: string,
    startDateParam?: string,
    endDateParam?: string,
    meetingPageParam?: string,
    meetingPageSizeParam?: string,
    memberPageParam?: string,
    memberPageSizeParam?: string,
    tableMemberRolesParam?: string,
    tableMemberStatusParam?: string,
    tableMemberGdiParam?: string,
    tableMemberAreaParam?: string
): Promise<EventsPageData> {
  const meetingCurrentPage = Number(meetingPageParam) || 1;
  let meetingPageSize = Number(meetingPageSizeParam) || 10;
  if (isNaN(meetingPageSize) || meetingPageSize < 1) meetingPageSize = 10;

  const memberCurrentPage = Number(memberPageParam) || 1;
  let memberPageSize = Number(memberPageSizeParam) || 10;
  if (isNaN(memberPageSize) || memberPageSize < 1) memberPageSize = 10;

  const [
    allSeriesData,
    allMembersData,
    allGdisData,
    allMinistryAreasData,
    allAttendanceRecordsData
  ] = await Promise.all([
    getAllMeetingSeries(),
    getAllMembersNonPaginated(),
    getAllGdis(),
    getAllMinistryAreas(),
    getAllAttendanceRecords()
  ]);

  const generalSeriesOnly = allSeriesData.filter(s => s.seriesType === 'general');
  const seriesPresentInFilter = generalSeriesOnly.sort((a,b) => a.name.localeCompare(b.name));

  const actualSelectedSeriesId = selectedSeriesIdParam && seriesPresentInFilter.some(s => s.id === selectedSeriesIdParam)
    ? selectedSeriesIdParam
    : seriesPresentInFilter.length > 0
      ? seriesPresentInFilter[0].id
      : undefined;

  let meetingsForPage: Meeting[] = [];
  let totalMeetingInstances = 0;
  let meetingInstancesTotalPages = 1;

  if (actualSelectedSeriesId) {
    const result = await getFilteredMeetingInstances(
      actualSelectedSeriesId,
      startDateParam,
      endDateParam,
      meetingCurrentPage,
      meetingPageSize
    );
    meetingsForPage = result.instances;
    totalMeetingInstances = result.totalCount;
    meetingInstancesTotalPages = result.totalPages;
  }

  const rowMemberIds = new Set<string>();
  const expectedAttendeesMap: Record<string, Set<string>> = {};

  for (const meeting of meetingsForPage) {
    const resolvedForThisInstance = await getResolvedAttendees(meeting, allMembersData, allSeriesData);
    expectedAttendeesMap[meeting.id] = new Set(resolvedForThisInstance.map(m => m.id));
    resolvedForThisInstance.forEach(member => rowMemberIds.add(member.id));
  }

  const initialRowMembers = allMembersData
    .filter(member => rowMemberIds.has(member.id))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  return {
    allSeries: seriesPresentInFilter,
    meetingsForPage,
    totalMeetingInstances,
    meetingInstancesTotalPages,
    meetingInstancesCurrentPage: meetingCurrentPage,
    allMembers: allMembersData,
    allGdis: allGdisData,
    allMinistryAreas: allMinistryAreasData,
    allAttendanceRecords: allAttendanceRecordsData,
    initialRowMembers,
    expectedAttendeesMap,
    memberCurrentPage,
    memberPageSize,
    appliedStartDate: startDateParam,
    appliedEndDate: endDateParam,
    selectedSeriesId: actualSelectedSeriesId,
    tableMemberRoleFilters: tableMemberRolesParam ? tableMemberRolesParam.split(',') : [],
    tableMemberStatusFilters: tableMemberStatusParam ? tableMemberStatusParam.split(',') as Member['status'][] : [],
    tableMemberGdiFilters: tableMemberGdiParam ? tableMemberGdiParam.split(',') : [],
    tableMemberAreaFilters: tableMemberAreaParam ? tableMemberAreaParam.split(',') : [],
  };
}

const roleDisplayMap: Record<MemberRoleType, string> = {
  Leader: "Líder",
  Worker: "Obrero",
  GeneralAttendee: "Asistente General",
};
const roleFilterOptions: { value: MemberRoleType | typeof NO_ROLE_FILTER_VALUE; label: string }[] = [
    ...(Object.keys(MemberRoleEnum.Values) as MemberRoleType[]).map(role => ({
        value: role,
        label: roleDisplayMap[role] || role,
    })),
    { value: NO_ROLE_FILTER_VALUE, label: "Sin Rol Asignado" }
];

const statusDisplayMap: Record<Member['status'], string> = {
  Active: "Activo",
  Inactive: "Inactivo",
  New: "Nuevo"
};
const statusFilterOptions: { value: Member['status']; label: string }[] = Object.entries(statusDisplayMap)
    .map(([value, label]) => ({ value: value as Member['status'], label }));


export default async function EventsPage({ searchParams }: EventsPageProps) {
  const {
    allSeries,
    meetingsForPage,
    totalMeetingInstances,
    meetingInstancesTotalPages,
    meetingInstancesCurrentPage,
    allMembers,
    allGdis,
    allMinistryAreas,
    allAttendanceRecords,
    initialRowMembers,
    expectedAttendeesMap,
    memberCurrentPage,
    memberPageSize,
    appliedStartDate,
    appliedEndDate,
    selectedSeriesId,
    tableMemberRoleFilters,
    tableMemberStatusFilters,
    tableMemberGdiFilters,
    tableMemberAreaFilters,
  } = await getEventsPageData(
      searchParams?.series,
      searchParams?.startDate,
      searchParams?.endDate,
      searchParams?.page,
      searchParams?.pageSize,
      searchParams?.mPage,
      searchParams?.mPSize,
      searchParams?.tmr,
      searchParams?.tms,
      searchParams?.tmg,
      searchParams?.tma
  );

  const selectedSeriesObject = selectedSeriesId ? allSeries.find(s => s.id === selectedSeriesId) : undefined;

  const createPageURL = (newPageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    if (newPageNumber > 1) {
      params.set('page', newPageNumber.toString());
    } else {
      params.delete('page');
    }
    return `/events?${params.toString()}`;
  };

  const createSeriesLink = (seriesIdToLink: string) => {
      const params = new URLSearchParams();
      params.set('series', seriesIdToLink);
      if (appliedStartDate) params.set('startDate', appliedStartDate);
      if (appliedEndDate) params.set('endDate', appliedEndDate);
      if (searchParams?.pageSize) params.set('pageSize', searchParams.pageSize);
      if (searchParams?.mPSize) params.set('mPSize', searchParams.mPSize);
      // Preserve table member filters
      if (searchParams?.tmr) params.set('tmr', searchParams.tmr);
      if (searchParams?.tms) params.set('tms', searchParams.tms);
      if (searchParams?.tmg) params.set('tmg', searchParams.tmg);
      if (searchParams?.tma) params.set('tma', searchParams.tma);
      return `/events?${params.toString()}`;
  }

  // Functions to update table filters via URL
  const updateTableFiltersURL = (newFilters: {
    tmr?: string[];
    tms?: string[];
    tmg?: string[];
    tma?: string[];
  }) => {
    const params = new URLSearchParams(searchParams);
    newFilters.tmr ? params.set('tmr', newFilters.tmr.join(',')) : params.delete('tmr');
    newFilters.tms ? params.set('tms', newFilters.tms.join(',')) : params.delete('tms');
    newFilters.tmg ? params.set('tmg', newFilters.tmg.join(',')) : params.delete('tmg');
    newFilters.tma ? params.set('tma', newFilters.tma.join(',')) : params.delete('tma');
    params.set('mPage', '1'); // Reset member page
    return `/events?${params.toString()}`;
  };

  const gdiFilterOptions = [
    { value: NO_GDI_FILTER_VALUE, label: "Miembros Sin GDI Asignado" },
    ...allGdis.map(gdi => ({
        value: gdi.id,
        label: `${gdi.name} (Guía: ${allMembers.find(m => m.id === gdi.guideId)?.firstName || ''} ${allMembers.find(m => m.id === gdi.guideId)?.lastName || 'N/A'})`
    }))
  ];

  const areaFilterOptions = [
    { value: NO_AREA_FILTER_VALUE, label: "Miembros Sin Área Asignada" },
    ...allMinistryAreas.map(area => ({
        value: area.id,
        label: `${area.name} (Líder: ${allMembers.find(m => m.id === area.leaderId)?.firstName || ''} ${allMembers.find(m => m.id === area.leaderId)?.lastName || 'N/A'})`
    }))
  ];


  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="font-headline text-4xl font-bold text-primary">Administración de Reuniones Generales</h1>
        <p className="text-muted-foreground mt-1">Defina series, programe instancias y vea el historial de asistencia para eventos generales de la iglesia.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        <aside className="md:w-72 lg:w-80 flex-shrink-0 space-y-6">
          <PageSpecificAddMeetingDialog
            defineMeetingSeriesAction={defineMeetingSeriesAction}
            seriesTypeContext="general"
          />
          <div className="p-4 border rounded-lg shadow-sm bg-card">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <LayoutGrid className="mr-2 h-5 w-5 text-primary" />
              Series de Reuniones Generales
            </h2>
            {allSeries.length > 0 ? (
              <ScrollArea className="max-h-60 md:max-h-72 lg:max-h-80 pr-3">
                <div className="space-y-1">
                  {allSeries.map((series) => (
                    <Button
                      key={series.id}
                      variant={selectedSeriesId === series.id ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start text-left h-auto py-2 px-3 text-sm",
                        selectedSeriesId === series.id && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      asChild
                    >
                      <Link href={createSeriesLink(series.id)}>
                        {series.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No hay series generales definidas.</p>
            )}
          </div>

          <div className="p-4 border rounded-lg shadow-sm bg-card">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <ListFilter className="mr-2 h-5 w-5 text-primary" />
              Filtrar Instancias (Columnas)
            </h2>
            <DateRangeFilter
              initialStartDate={appliedStartDate}
              initialEndDate={appliedEndDate}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {selectedSeriesObject ? (
            <>
              <div className="mb-6 p-4 border rounded-lg bg-card shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h2 className="text-2xl font-semibold text-primary">{selectedSeriesObject.name}</h2>
                        {selectedSeriesObject.description && <p className="text-sm text-muted-foreground mt-1 max-w-prose">{selectedSeriesObject.description}</p>}
                        <div className="text-xs text-muted-foreground mt-2">
                        <span>Hora Pred.: {selectedSeriesObject.defaultTime} | </span>
                        <span>Lugar Pred.: {selectedSeriesObject.defaultLocation} | </span>
                        <span>Frecuencia: {selectedSeriesObject.frequency === "OneTime" ? "Única Vez" : selectedSeriesObject.frequency === "Weekly" ? "Semanal" : "Mensual"}</span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 mt-2 sm:mt-0">
                         <AddOccasionalMeetingDialog
                            series={selectedSeriesObject}
                            addOccasionalMeetingAction={addOccasionalMeetingAction}
                         />
                        <ManageMeetingSeriesDialog
                            series={selectedSeriesObject}
                            updateMeetingSeriesAction={updateMeetingSeriesAction}
                            deleteMeetingSeriesAction={deleteMeetingSeriesAction}
                            seriesTypeContext="general"
                         />
                    </div>
                </div>
              </div>

              {meetingsForPage.length > 0 && (
                <AttendanceLineChart
                  meetingsForSeries={meetingsForPage}
                  allAttendanceRecords={allAttendanceRecords}
                  seriesName={selectedSeriesObject.name}
                  filterStartDate={appliedStartDate}
                  filterEndDate={appliedEndDate}
                />
              )}

              {totalMeetingInstances > 0 ? (
                <>
                <div className="my-4 p-3 border rounded-lg bg-card shadow-sm">
                  <h3 className="text-md font-semibold mb-2 flex items-center"><ListFilter className="mr-2 h-4 w-4 text-primary" />Filtrar Miembros en Tabla (Filas):</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start text-xs w-full">
                                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Rol ({tableMemberRoleFilters.length > 0 ? tableMemberRoleFilters.length : 'Todos'})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {roleFilterOptions.map(opt => (
                                <DropdownMenuCheckboxItem
                                    key={opt.value}
                                    checked={tableMemberRoleFilters.includes(opt.value)}
                                    onCheckedChange={(checked) => {
                                        const newRoles = checked
                                            ? [...tableMemberRoleFilters, opt.value]
                                            : tableMemberRoleFilters.filter(r => r !== opt.value);
                                        router.push(updateTableFiltersURL({ tmr: newRoles }));
                                    }}
                                >{opt.label}</DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm" className="justify-start text-xs w-full">
                                <Activity className="mr-1.5 h-3.5 w-3.5" /> Estado ({tableMemberStatusFilters.length > 0 ? tableMemberStatusFilters.length : 'Todos'})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {statusFilterOptions.map(opt => (
                                <DropdownMenuCheckboxItem
                                    key={opt.value}
                                    checked={tableMemberStatusFilters.includes(opt.value)}
                                    onCheckedChange={(checked) => {
                                        const newStatuses = checked
                                            ? [...tableMemberStatusFilters, opt.value]
                                            : tableMemberStatusFilters.filter(s => s !== opt.value);
                                        router.push(updateTableFiltersURL({ tms: newStatuses as string[] }));
                                    }}
                                >{opt.label}</DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start text-xs w-full">
                                <UsersIcon className="mr-1.5 h-3.5 w-3.5" /> GDI ({tableMemberGdiFilters.length > 0 ? tableMemberGdiFilters.length : 'Todos'})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                           {gdiFilterOptions.map(opt => (
                                <DropdownMenuCheckboxItem
                                    key={opt.value}
                                    checked={tableMemberGdiFilters.includes(opt.value)}
                                     onCheckedChange={(checked) => {
                                        const newGdis = checked
                                            ? [...tableMemberGdiFilters, opt.value]
                                            : tableMemberGdiFilters.filter(g => g !== opt.value);
                                        router.push(updateTableFiltersURL({ tmg: newGdis }));
                                    }}
                                >{opt.label}</DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="outline" size="sm" className="justify-start text-xs w-full">
                                <Activity className="mr-1.5 h-3.5 w-3.5" /> Área ({tableMemberAreaFilters.length > 0 ? tableMemberAreaFilters.length : 'Todas'})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                            {areaFilterOptions.map(opt => (
                                <DropdownMenuCheckboxItem
                                    key={opt.value}
                                    checked={tableMemberAreaFilters.includes(opt.value)}
                                    onCheckedChange={(checked) => {
                                        const newAreas = checked
                                            ? [...tableMemberAreaFilters, opt.value]
                                            : tableMemberAreaFilters.filter(a => a !== opt.value);
                                        router.push(updateTableFiltersURL({ tma: newAreas }));
                                    }}
                                >{opt.label}</DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                   {(tableMemberRoleFilters.length > 0 || tableMemberStatusFilters.length > 0 || tableMemberGdiFilters.length > 0 || tableMemberAreaFilters.length > 0) && (
                    <Button
                        variant="link"
                        size="sm"
                        className="mt-2 px-0 h-auto text-xs text-destructive hover:text-destructive/80"
                        onClick={() => router.push(updateTableFiltersURL({ tmr:[], tms:[], tmg:[], tma:[] }))}
                    >
                        <X className="mr-1 h-3 w-3" /> Limpiar filtros de miembros
                    </Button>
                  )}
                </div>

                <MeetingTypeAttendanceTable
                  displayedInstances={meetingsForPage}
                  allMeetingSeries={allSeries}
                  initialRowMembers={initialRowMembers}
                  expectedAttendeesMap={expectedAttendeesMap}
                  allAttendanceRecords={allAttendanceRecords}
                  seriesName={selectedSeriesObject.name}
                  filterStartDate={appliedStartDate}
                  filterEndDate={appliedEndDate}
                  memberCurrentPage={memberCurrentPage}
                  memberPageSize={memberPageSize}
                  memberRoleFilters={tableMemberRoleFilters}
                  memberStatusFilters={tableMemberStatusFilters}
                  memberGdiFilters={tableMemberGdiFilters}
                  memberAreaFilters={tableMemberAreaFilters}
                  allMembers={allMembers}
                  allGdis={allGdis}
                  allAreas={allMinistryAreas}
                />
                </>
              ) : (
                <div className="text-center py-10">
                  <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-muted-foreground">
                    {appliedStartDate && appliedEndDate
                      ? `No hay instancias para "${selectedSeriesObject.name}" en el rango seleccionado`
                      : `No hay instancias programadas para "${selectedSeriesObject.name}"`}
                  </h2>
                   <p className="text-muted-foreground mt-2">
                    {appliedStartDate && appliedEndDate
                      ? `(${format(parseISO(appliedStartDate), 'dd/MM/yy', { locale: es })} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', { locale: es })})`
                      : "Agregue una instancia para esta serie o ajuste los filtros de fecha."}
                  </p>
                </div>
              )}
              {meetingInstancesTotalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={meetingInstancesCurrentPage <= 1}
                  >
                    <Link href={createPageURL(meetingInstancesCurrentPage - 1)}>
                      Anterior (Instancias)
                    </Link>
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {meetingInstancesCurrentPage} de {meetingInstancesTotalPages} (Instancias)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={meetingInstancesCurrentPage >= meetingInstancesTotalPages}
                  >
                     <Link href={createPageURL(meetingInstancesCurrentPage + 1)}>
                       Siguiente (Instancias)
                     </Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
             <div className="text-center py-10 flex flex-col items-center justify-center">
              <CalendarDays className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h2 className="text-2xl font-semibold text-muted-foreground">
                {allSeries.length > 0 ? "Seleccione una Serie" :
                  (appliedStartDate && appliedEndDate ? "No hay reuniones para el rango seleccionado" : "No hay Series de Reuniones Generales Definidas")
                }
              </h2>
               <p className="text-muted-foreground mt-3 max-w-md">
                {allSeries.length > 0 ? "Elija una serie de la lista de la izquierda para ver sus instancias y gestionar la asistencia." :
                  (appliedStartDate && appliedEndDate && appliedStartDate === appliedEndDate ? `(${format(parseISO(appliedStartDate), 'dd/MM/yy', { locale: es })})` :
                   appliedStartDate && appliedEndDate ? `(${format(parseISO(appliedStartDate), 'dd/MM/yy', { locale: es })} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', { locale: es })})` :
                  "Defina una nueva serie de reuniones generales o ajuste los filtros de fecha para comenzar.")
                }
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
