
'use server';
import type { Meeting, DefineMeetingSeriesFormValues, MeetingSeries, Member, GDI, MinistryArea, AttendanceRecord, AddOccasionalMeetingFormValues } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { CalendarDays, Filter, Settings, PlusSquare, LayoutGrid, ListFilter } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { format, parseISO, isValid, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    getAllMeetingSeries,
    addMeetingSeries,
    updateMeetingSeries,
    deleteMeetingSeries,
    getAllMeetings,
    addMeetingInstance
} from '@/services/meetingService';
import { getAllMembersNonPaginated } from '@/services/memberService';
import PageSpecificAddMeetingDialog from '@/components/events/page-specific-add-meeting-dialog';
import ManageMeetingSeriesDialog from '@/components/events/manage-meeting-series-dialog';
import AddOccasionalMeetingDialog from '@/components/events/add-occasional-meeting-dialog';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';
import { getAllAttendanceRecords } from '@/services/attendanceService';
import MeetingTypeAttendanceTable from '@/components/events/meeting-type-attendance-table';
import DateRangeFilter from '@/components/events/date-range-filter';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export async function defineMeetingSeriesAction(
  newSeriesData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; newSeries?: MeetingSeries, newInstances?: Meeting[] }> {
  try {
    // Ensure oneTimeDate is formatted correctly if it exists
    const dataForService: DefineMeetingSeriesFormValues = {
      ...newSeriesData,
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
  } else if (startDateParam || endDateParam) { 
      appliedStartDate = undefined;
      appliedEndDate = undefined;
  }

  const meetingsBySeries: MeetingInstancesBySeries = {};
  allSeries.forEach(series => {
    meetingsBySeries[series.id] = filteredMeetingInstances
      .filter(instance => instance.seriesId === series.id)
      // Sort ascending: oldest first on the left, newest on the right
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
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

  const selectedSeriesId = searchParams?.series && seriesPresentInFilter.some(s => s.id === searchParams.series)
    ? searchParams.series
    : seriesPresentInFilter.length > 0
      ? seriesPresentInFilter[0].id
      : undefined;

  const selectedSeriesObject = selectedSeriesId ? seriesPresentInFilter.find(s => s.id === selectedSeriesId) : undefined;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="font-headline text-4xl font-bold text-primary">Administración de Reuniones</h1>
        <p className="text-muted-foreground mt-1">Defina series, programe instancias y vea el historial de asistencia.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Left Panel */}
        <aside className="md:w-72 lg:w-80 flex-shrink-0 space-y-6">
          <PageSpecificAddMeetingDialog
            defineMeetingSeriesAction={defineMeetingSeriesAction}
          />
          <div className="p-4 border rounded-lg shadow-sm bg-card">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <LayoutGrid className="mr-2 h-5 w-5 text-primary" />
              Series de Reuniones
            </h2>
            {seriesPresentInFilter.length > 0 ? (
              <ScrollArea className="max-h-60 md:max-h-72 lg:max-h-80 pr-3">
                <div className="space-y-1">
                  {seriesPresentInFilter.map((series) => (
                    <Button
                      key={series.id}
                      variant={selectedSeriesId === series.id ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start text-left h-auto py-2 px-3 text-sm",
                        selectedSeriesId === series.id && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      asChild
                    >
                      <Link href={`/events?series=${series.id}${appliedStartDate ? `&startDate=${appliedStartDate}` : ''}${appliedEndDate ? `&endDate=${appliedEndDate}` : ''}`}>
                        {series.name} ({meetingsBySeries[series.id]?.length || 0})
                      </Link>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No hay series definidas.</p>
            )}
          </div>

          <div className="p-4 border rounded-lg shadow-sm bg-card">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <ListFilter className="mr-2 h-5 w-5 text-primary" />
              Filtrar Instancias
            </h2>
            <DateRangeFilter
              initialStartDate={appliedStartDate}
              initialEndDate={appliedEndDate}
            />
          </div>
        </aside>

        {/* Right Panel (Main Content) */}
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
                         />
                    </div>
                </div>
              </div>

              {meetingsBySeries[selectedSeriesObject.id] && meetingsBySeries[selectedSeriesObject.id].length > 0 ? (
                <MeetingTypeAttendanceTable
                  meetingsForSeries={meetingsBySeries[selectedSeriesObject.id]}
                  allMembers={allMembers}
                  allGdis={allGdis}
                  allMinistryAreas={allMinistryAreas}
                  allAttendanceRecords={allAttendanceRecords}
                  seriesName={selectedSeriesObject.name}
                  filterStartDate={appliedStartDate}
                  filterEndDate={appliedEndDate}
                />
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
            </>
          ) : (
             <div className="text-center py-10 flex flex-col items-center justify-center"> {/* Removed h-full */}
              <CalendarDays className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h2 className="text-2xl font-semibold text-muted-foreground">
                {seriesPresentInFilter.length > 0 ? "Seleccione una Serie" : 
                  (appliedStartDate && appliedEndDate ? "No hay reuniones para el rango seleccionado" : "No hay Series de Reuniones Definidas")
                }
              </h2>
               <p className="text-muted-foreground mt-3 max-w-md">
                {seriesPresentInFilter.length > 0 ? "Elija una serie de la lista de la izquierda para ver sus instancias y gestionar la asistencia." :
                  (appliedStartDate && appliedEndDate ? `(${format(parseISO(appliedStartDate), 'dd/MM/yy', { locale: es })} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', { locale: es })})` : "Defina una nueva serie de reuniones o ajuste los filtros de fecha para comenzar.")
                }
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

