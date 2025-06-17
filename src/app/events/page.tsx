
'use server';
import type { Meeting, DefineMeetingSeriesFormValues, MeetingSeries, Member, GDI, MinistryArea, AttendanceRecord } from '@/lib/types';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Users, Briefcase, Award, CheckSquare, Sparkles, Building2, HandHelping, Edit, Filter } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { format, parseISO, isValid, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllMeetingSeries, addMeetingSeries, getMeetingsBySeriesId, getMeetingById, updateMeetingMinute } from '@/services/meetingService';
import { getAllMembersNonPaginated } from '@/services/memberService'; 
import PageSpecificAddMeetingDialog from '@/components/events/page-specific-add-meeting-dialog';
import { getAllGdis } from '@/services/gdiService'; 
import { getAllMinistryAreas } from '@/services/ministryAreaService'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllAttendanceRecords } from '@/services/attendanceService';
import MeetingTypeAttendanceTable from '@/components/events/meeting-type-attendance-table'; // Will be renamed or refactored
import DateRangeFilter from '@/components/events/date-range-filter';

export async function defineMeetingSeriesAction(
  newSeriesData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; newSeries?: MeetingSeries, newInstance?: Meeting }> {
  try {
    const result = await addMeetingSeries(
      {
        name: newSeriesData.name,
        description: newSeriesData.description,
        defaultTime: newSeriesData.defaultTime,
        defaultLocation: newSeriesData.defaultLocation,
        defaultImageUrl: newSeriesData.defaultImageUrl,
        targetAttendeeGroups: newSeriesData.targetAttendeeGroups,
        frequency: newSeriesData.frequency,
      },
      newSeriesData.frequency === "OneTime" ? newSeriesData.oneTimeDate : undefined
    );
    
    revalidatePath('/events');
    let message = `Serie de reuniones "${result.series.name}" agregada exitosamente.`;
    if (result.instance) {
        message += ` Instancia creada para el ${format(parseISO(result.instance.date), "d 'de' MMMM", { locale: es })}.`
    }
    return { success: true, message, newSeries: result.series, newInstance: result.instance };
  } catch (error: any) {
    console.error("Error defining meeting series:", error);
    return { success: false, message: `Error al definir serie de reuniones: ${error.message}` };
  }
}


interface MeetingInstancesBySeries {
  [seriesId: string]: Meeting[];
}

interface EventsPageData {
  allSeries: MeetingSeries[];
  meetingsBySeries: MeetingInstancesBySeries;
  allMembers: Member[];
  allGdis: GDI[];
  allMinistryAreas: MinistryArea[];
  allAttendanceRecords: AttendanceRecord[];
  appliedStartDate?: string;
  appliedEndDate?: string;
}

interface EventsPageProps {
  searchParams?: {
    series?: string; // To pre-select a tab
    startDate?: string;
    endDate?: string;
  };
}

async function getEventsPageData(startDateParam?: string, endDateParam?: string): Promise<EventsPageData> {
  const [
    allSeries, 
    allMeetingInstances, // Fetch all instances first
    allMembers, 
    allGdis, 
    allMinistryAreas, 
    allAttendanceRecords
  ] = await Promise.all([
    getAllMeetingSeries(),
    getAllMeetings(), // Fetch all instances
    getAllMembersNonPaginated(),
    getAllGdis(),
    getAllMinistryAreas(),
    getAllAttendanceRecords()
  ]);
  
  let appliedStartDate: string | undefined = startDateParam;
  let appliedEndDate: string | undefined = endDateParam;

  let filteredMeetingInstances = allMeetingInstances;

  if (startDateParam && endDateParam) {
    const parsedStartDate = parseISO(startDateParam);
    const parsedEndDate = parseISO(endDateParam);
    if (isValid(parsedStartDate) && isValid(parsedEndDate) && parsedStartDate <= parsedEndDate) {
      filteredMeetingInstances = allMeetingInstances.filter(meeting => {
        const meetingDate = parseISO(meeting.date);
        return isValid(meetingDate) && isWithinInterval(meetingDate, { start: parsedStartDate, end: parsedEndDate });
      });
    } else {
      // Invalid range, reset to show all for safety or handle error
      appliedStartDate = undefined;
      appliedEndDate = undefined;
    }
  } else {
      appliedStartDate = undefined;
      appliedEndDate = undefined;
  }


  const meetingsBySeries: MeetingInstancesBySeries = {};
  allSeries.forEach(series => {
    meetingsBySeries[series.id] = filteredMeetingInstances
      .filter(instance => instance.seriesId === series.id)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  });

  return { 
    allSeries, 
    meetingsBySeries, 
    allMembers, 
    allGdis, 
    allMinistryAreas, 
    allAttendanceRecords, 
    appliedStartDate, 
    appliedEndDate 
  };
}


export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { 
    allSeries, 
    meetingsBySeries, 
    allMembers, 
    allGdis, 
    allMinistryAreas, 
    allAttendanceRecords, 
    appliedStartDate, 
    appliedEndDate 
  } = await getEventsPageData(searchParams?.startDate, searchParams?.endDate);
  
  // Filter series that have meetings within the date range or are "Recurring" (always show tab for recurring)
  const seriesPresentInFilter = allSeries.filter(series => 
    meetingsBySeries[series.id]?.length > 0 || series.frequency === "Recurring"
  ).sort((a,b) => a.name.localeCompare(b.name));


  const defaultTabValue = 
    searchParams?.series && seriesPresentInFilter.some(s => s.id === searchParams.series) 
      ? searchParams.series 
      : seriesPresentInFilter.length > 0 
        ? seriesPresentInFilter[0].id 
        : '';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex-grow">
          <h1 className="font-headline text-4xl font-bold text-primary">Administración de Reuniones</h1>
          <p className="text-muted-foreground mt-1">Defina series de reuniones y vea el historial de asistencia.</p>
        </div>
        <PageSpecificAddMeetingDialog 
          defineMeetingSeriesAction={defineMeetingSeriesAction}
        />
      </div>

      {seriesPresentInFilter.length > 0 ? (
        <Tabs defaultValue={defaultTabValue} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mb-6 pb-2 overflow-x-auto">
            {seriesPresentInFilter.map((series) => (
              <TabsTrigger 
                key={series.id} 
                value={series.id} 
                className="whitespace-normal text-xs sm:text-sm h-auto py-2 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {series.name} ({meetingsBySeries[series.id]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          {seriesPresentInFilter.map((series) => (
            <TabsContent key={series.id} value={series.id}>
              <div className="mb-4 p-4 border rounded-lg bg-card shadow">
                <h2 className="text-xl font-semibold text-primary">{series.name}</h2>
                {series.description && <p className="text-sm text-muted-foreground mt-1">{series.description}</p>}
                <div className="text-xs text-muted-foreground mt-2">
                  <span>Hora Pred.: {series.defaultTime} | </span>
                  <span>Lugar Pred.: {series.defaultLocation} | </span>
                  <span>Frecuencia: {series.frequency === "OneTime" ? "Única Vez" : "Recurrente (Instancias Manuales)"}</span>
                </div>
                {/* TODO: Button "Schedule New Instance for this Series" to be added here later */}
              </div>

              {meetingsBySeries[series.id] && meetingsBySeries[series.id].length > 0 ? (
                <MeetingTypeAttendanceTable
                  meetingsForSeries={meetingsBySeries[series.id]}
                  allMembers={allMembers} // Pass all members for resolving names and potential future use
                  // GDI/Area data no longer directly used by table, but passed for getResolvedAttendees if needed later
                  allGdis={allGdis} 
                  allMinistryAreas={allMinistryAreas}
                  allAttendanceRecords={allAttendanceRecords}
                  seriesName={series.name} // Pass series name instead of type label
                  filterStartDate={appliedStartDate}
                  filterEndDate={appliedEndDate}
                />
              ) : (
                <div className="text-center py-10">
                  <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-muted-foreground">
                    {appliedStartDate && appliedEndDate 
                      ? `No hay instancias para "${series.name}" en el rango seleccionado`
                      : `No hay instancias programadas para "${series.name}"`}
                  </h2>
                   <p className="text-muted-foreground mt-2">
                    {appliedStartDate && appliedEndDate 
                      ? `(${format(parseISO(appliedStartDate), 'dd/MM/yy', { locale: es })} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', { locale: es })})`
                      : "Agregue una nueva instancia para esta serie o ajuste los filtros de fecha."}
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
         <div className="text-center py-10">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Hay Series de Reuniones Definidas</h2>
           <p className="text-muted-foreground mt-2">
            {appliedStartDate && appliedEndDate 
              ? `No hay reuniones para el rango de fechas seleccionado (${format(parseISO(appliedStartDate), 'dd/MM/yy', { locale: es })} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', { locale: es })})`
              : "Defina una nueva serie de reuniones o ajuste los filtros de fecha para comenzar."}
          </p>
        </div>
      )}

      <div className="mt-8 mb-8 p-4 border rounded-lg shadow-sm bg-card">
        <h2 className="text-lg font-semibold mb-3 flex items-center">
          <Filter className="mr-2 h-5 w-5 text-primary" />
          Filtrar Instancias de Reunión por Fecha
        </h2>
        <DateRangeFilter 
          initialStartDate={appliedStartDate} 
          initialEndDate={appliedEndDate} 
        />
      </div>
    </div>
  );
}
