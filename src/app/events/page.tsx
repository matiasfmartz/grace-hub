
'use server';
import type { Meeting, DefineMeetingSeriesFormValues, MeetingSeries, Member, GDI, MinistryArea, AttendanceRecord, AddOccasionalMeetingFormValues } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { CalendarDays, Filter, Settings, PlusSquare } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { format, parseISO, isValid, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    getAllMeetingSeries,
    addMeetingSeries,
    updateMeetingSeries,
    deleteMeetingSeries,
    getAllMeetings,
    addMeetingInstance // Added for occasional meetings
} from '@/services/meetingService';
import { getAllMembersNonPaginated } from '@/services/memberService';
import PageSpecificAddMeetingDialog from '@/components/events/page-specific-add-meeting-dialog';
import ManageMeetingSeriesDialog from '@/components/events/manage-meeting-series-dialog';
import AddOccasionalMeetingDialog from '@/components/events/add-occasional-meeting-dialog'; // New Dialog
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllAttendanceRecords } from '@/services/attendanceService';
import MeetingTypeAttendanceTable from '@/components/events/meeting-type-attendance-table';
import DateRangeFilter from '@/components/events/date-range-filter';

export async function defineMeetingSeriesAction(
  newSeriesData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; newSeries?: MeetingSeries, newInstances?: Meeting[] }> {
  try {
    // Prepare data for the service, ensuring oneTimeDate is a string if present
    const dataForService: DefineMeetingSeriesFormValues = {
      ...newSeriesData,
      oneTimeDate: newSeriesData.oneTimeDate instanceof Date && isValid(newSeriesData.oneTimeDate)
        ? format(newSeriesData.oneTimeDate, 'yyyy-MM-dd')
        : undefined,
    };

    const result = await addMeetingSeries(dataForService as any); // Cast as any because service expects string date

    revalidatePath('/events');
    let message = `Serie de reuniones "${result.series.name}" agregada exitosamente.`;
    if (result.newInstances && result.newInstances.length > 0) {
        message += ` ${result.newInstances.length} instancia(s) inicial(es) creada(s).`
    } else if (result.series.frequency === "OneTime" && result.newInstances && result.newInstances.length === 1) {
        // Ensure newInstances[0].date is a string for formatting
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
): Promise<{ success: boolean; message: string; updatedSeries?: MeetingSeries }> {
  try {
    const seriesToWrite = {
        name: updatedData.name,
        description: updatedData.description,
        defaultTime: updatedData.defaultTime,
        defaultLocation: updatedData.defaultLocation,
        defaultImageUrl: updatedData.defaultImageUrl,
        targetAttendeeGroups: updatedData.targetAttendeeGroups,
        frequency: updatedData.frequency,
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
    return { success: true, message, updatedSeries: result.updatedSeries };
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
      imageUrl: formData.imageUrl,
    });
    revalidatePath('/events');
    return { success: true, message: `Instancia ocasional "${newInstance.name}" agregada exitosamente.`, newInstance };
  } catch (error: any) {
    console.error("Error adding occasional meeting instance:", error);
    return { success: false, message: `Error al agregar instancia de reunión: ${error.message}` };
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
    series?: string;
    startDate?: string;
    endDate?: string;
  };
}

async function getEventsPageData(startDateParam?: string, endDateParam?: string): Promise<EventsPageData> {
  const [
    allSeries,
    allMeetingInstancesList,
    allMembers,
    allGdis,
    allMinistryAreas,
    allAttendanceRecords
  ] = await Promise.all([
    getAllMeetingSeries(),
    getAllMeetings(),
    getAllMembersNonPaginated(),
    getAllGdis(),
    getAllMinistryAreas(),
    getAllAttendanceRecords()
  ]);

  let appliedStartDate: string | undefined = startDateParam;
  let appliedEndDate: string | undefined = endDateParam;
  let filteredMeetingInstances = allMeetingInstancesList;

  if (startDateParam && endDateParam) {
    const parsedStartDate = parseISO(startDateParam);
    const parsedEndDate = parseISO(endDateParam);
    if (isValid(parsedStartDate) && isValid(parsedEndDate) && parsedStartDate <= parsedEndDate) {
      filteredMeetingInstances = allMeetingInstancesList.filter(meeting => {
        const meetingDate = parseISO(meeting.date);
        return isValid(meetingDate) && isWithinInterval(meetingDate, { start: parsedStartDate, end: parsedEndDate });
      });
    } else {
      appliedStartDate = undefined;
      appliedEndDate = undefined;
    }
  } else if (startDateParam || endDateParam) { // Only one is provided or one is invalid
      appliedStartDate = undefined;
      appliedEndDate = undefined;
  }
  // If no valid date filter, allMeetingInstancesList is used as is (all meetings)


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

  const seriesPresentInFilter = allSeries.filter(series =>
    meetingsBySeries[series.id]?.length > 0 || series.frequency === "Weekly" || series.frequency === "Monthly" || series.frequency === "OneTime"
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
          <p className="text-muted-foreground mt-1">Defina series de reuniones, programe instancias y vea el historial de asistencia.</p>
        </div>
        <PageSpecificAddMeetingDialog
          defineMeetingSeriesAction={defineMeetingSeriesAction}
        />
      </div>

      {seriesPresentInFilter.length > 0 ? (
        <Tabs defaultValue={defaultTabValue} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mb-6 pb-2 overflow-x-auto h-auto">
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
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h2 className="text-xl font-semibold text-primary">{series.name}</h2>
                        {series.description && <p className="text-sm text-muted-foreground mt-1 max-w-prose">{series.description}</p>}
                        <div className="text-xs text-muted-foreground mt-2">
                        <span>Hora Pred.: {series.defaultTime} | </span>
                        <span>Lugar Pred.: {series.defaultLocation} | </span>
                        <span>Frecuencia: {series.frequency === "OneTime" ? "Única Vez" : series.frequency === "Weekly" ? "Semanal" : "Mensual"}</span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                         <AddOccasionalMeetingDialog
                            series={series}
                            addOccasionalMeetingAction={addOccasionalMeetingAction}
                         />
                        <ManageMeetingSeriesDialog
                            series={series}
                            updateMeetingSeriesAction={updateMeetingSeriesAction}
                            deleteMeetingSeriesAction={deleteMeetingSeriesAction}
                         />
                    </div>
                </div>
              </div>

              {meetingsBySeries[series.id] && meetingsBySeries[series.id].length > 0 ? (
                <MeetingTypeAttendanceTable
                  meetingsForSeries={meetingsBySeries[series.id]}
                  allMembers={allMembers}
                  allGdis={allGdis}
                  allMinistryAreas={allMinistryAreas}
                  allAttendanceRecords={allAttendanceRecords}
                  seriesName={series.name}
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
                      : "Agregue una instancia para esta serie o ajuste los filtros de fecha."}
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
         <div className="text-center py-10">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">
            {appliedStartDate && appliedEndDate
              ? `No hay reuniones para el rango de fechas seleccionado`
              : "No Hay Series de Reuniones Definidas"}
          </h2>
           <p className="text-muted-foreground mt-2">
            {appliedStartDate && appliedEndDate
              ? `(${format(parseISO(appliedStartDate), 'dd/MM/yy', { locale: es })} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', { locale: es })})`
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
