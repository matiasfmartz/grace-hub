
'use server';
import type { Meeting, AddGeneralMeetingFormValues, MeetingType, MeetingWriteData, Member, GDI, MinistryArea, AttendanceRecord } from '@/lib/types';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Users, Briefcase, Award, CheckSquare, Sparkles, Building2, HandHelping, Edit } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { format, parseISO, isValid, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllMeetings, addMeeting as addMeetingSvc } from '@/services/meetingService';
import { getAllMembersNonPaginated } from '@/services/memberService'; 
import PageSpecificAddMeetingDialog from '@/components/events/page-specific-add-meeting-dialog';
import { Badge } from '@/components/ui/badge';
import { getAllGdis } from '@/services/gdiService'; 
import { getAllMinistryAreas } from '@/services/ministryAreaService'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllAttendanceRecords } from '@/services/attendanceService';
import MeetingTypeAttendanceTable from '@/components/events/meeting-type-attendance-table';

export async function addMeetingAction(
  newMeetingData: AddGeneralMeetingFormValues
): Promise<{ success: boolean; message: string; newMeeting?: Meeting }> {
  try {
    let resolvedAttendeeUids: string[] | null = null;

    if (newMeetingData.type === 'Special_Meeting' && newMeetingData.selectedRoles && newMeetingData.selectedRoles.length > 0) {
      const allMembers = await getAllMembersNonPaginated();
      const allGdis = await getAllGdis();
      const allMinistryAreas = await getAllMinistryAreas();
      const attendeeSet = new Set<string>();

      for (const role of newMeetingData.selectedRoles) {
        if (role === 'generalAttendees') {
          allMembers.forEach(member => {
            if (member.assignedGDIId) { 
              attendeeSet.add(member.id);
            }
          });
        } else if (role === 'workers') {
          allGdis.forEach(gdi => attendeeSet.add(gdi.guideId));
          allMinistryAreas.forEach(area => {
            attendeeSet.add(area.leaderId);
            area.memberIds.forEach(memberId => {
               if (memberId !== area.leaderId) attendeeSet.add(memberId);
            });
          });
        } else if (role === 'leaders') {
          allGdis.forEach(gdi => attendeeSet.add(gdi.guideId));
          allMinistryAreas.forEach(area => attendeeSet.add(area.leaderId));
        }
      }
      resolvedAttendeeUids = Array.from(attendeeSet);
    }

    const meetingToWrite: MeetingWriteData = {
      name: newMeetingData.name,
      type: newMeetingData.type,
      date: newMeetingData.date, 
      time: newMeetingData.time,
      location: newMeetingData.location,
      imageUrl: newMeetingData.imageUrl || 'https://placehold.co/600x400',
      description: newMeetingData.description || '',
      relatedGdiId: null, 
      relatedAreaId: null,
      attendeeUids: resolvedAttendeeUids,
      minute: null, 
    };

    const newMeeting = await addMeetingSvc(meetingToWrite);
    revalidatePath('/events');
    return { success: true, message: `Reunión "${newMeeting.name}" agregada exitosamente.`, newMeeting };
  } catch (error: any) {
    console.error("Error adding meeting:", error);
    return { success: false, message: `Error al agregar reunión: ${error.message}` };
  }
}

const meetingTypeTranslations: Record<string, string> = {
  General_Service: "Servicio General",
  GDI_Meeting: "Reunión de GDI",
  Obreros_Meeting: "Reunión de Obreros",
  Lideres_Meeting: "Reunión de Líderes",
  Area_Meeting: "Reunión de Área Ministerial",
  Special_Meeting: "Reunión Especial",
};

interface EventsPageData {
  meetingsByType: Record<string, Meeting[]>;
  allMembers: Member[];
  allGdis: GDI[];
  allMinistryAreas: MinistryArea[];
  allAttendanceRecords: AttendanceRecord[];
  appliedStartDate?: string;
  appliedEndDate?: string;
}

interface EventsPageProps {
  searchParams?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  };
}

async function getEventsPageData(startDateParam?: string, endDateParam?: string): Promise<EventsPageData> {
  let [allMeetingsList, allMembers, allGdis, allMinistryAreas, allAttendanceRecords] = await Promise.all([
    getAllMeetings(),
    getAllMembersNonPaginated(),
    getAllGdis(),
    getAllMinistryAreas(),
    getAllAttendanceRecords()
  ]);
  
  let appliedStartDate: string | undefined = undefined;
  let appliedEndDate: string | undefined = undefined;

  if (startDateParam && endDateParam) {
    const parsedStartDate = parseISO(startDateParam);
    const parsedEndDate = parseISO(endDateParam);
    if (isValid(parsedStartDate) && isValid(parsedEndDate) && parsedStartDate <= parsedEndDate) {
      allMeetingsList = allMeetingsList.filter(meeting => {
        const meetingDate = parseISO(meeting.date);
        return isValid(meetingDate) && isWithinInterval(meetingDate, { start: parsedStartDate, end: parsedEndDate });
      });
      appliedStartDate = startDateParam;
      appliedEndDate = endDateParam;
    }
  } else if (!startDateParam && !endDateParam) {
    // Default to current month if no params are provided
    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);
    allMeetingsList = allMeetingsList.filter(meeting => {
      const meetingDate = parseISO(meeting.date);
      return isValid(meetingDate) && isWithinInterval(meetingDate, { start: firstDayOfMonth, end: lastDayOfMonth });
    });
    appliedStartDate = format(firstDayOfMonth, 'yyyy-MM-dd');
    appliedEndDate = format(lastDayOfMonth, 'yyyy-MM-dd');
  }
  // If only one param is provided, or params are invalid, we might show all or handle error - for now, showing filtered or default.

  const meetingsByType: Record<string, Meeting[]> = {};
  allMeetingsList.forEach(meeting => {
    if (!meetingsByType[meeting.type]) {
      meetingsByType[meeting.type] = [];
    }
    meetingsByType[meeting.type].push(meeting);
  });

  for (const type in meetingsByType) {
    meetingsByType[type].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  return { meetingsByType, allMembers, allGdis, allMinistryAreas, allAttendanceRecords, appliedStartDate, appliedEndDate };
}


export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { meetingsByType, allMembers, allGdis, allMinistryAreas, allAttendanceRecords, appliedStartDate, appliedEndDate } = await getEventsPageData(searchParams?.startDate, searchParams?.endDate);
  const meetingTypesPresent = Object.keys(meetingsByType).filter(type => meetingsByType[type] && meetingsByType[type].length > 0);
  
  const orderedMeetingTypes = [
    "General_Service", "GDI_Meeting", "Area_Meeting", 
    "Obreros_Meeting", "Lideres_Meeting", "Special_Meeting"
  ];

  const sortedMeetingTypesPresent = orderedMeetingTypes.filter(type => meetingTypesPresent.includes(type))
    .concat(meetingTypesPresent.filter(type => !orderedMeetingTypes.includes(type)));

  const defaultTabValue = 
    searchParams?.type && sortedMeetingTypesPresent.includes(searchParams.type) ? searchParams.type :
    sortedMeetingTypesPresent.includes('General_Service') ? 'General_Service' : 
    sortedMeetingTypesPresent.length > 0 ? sortedMeetingTypesPresent[0] : '';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-wrap justify-between items-center mb-10">
        <div className="mb-4 sm:mb-0">
          <h1 className="font-headline text-4xl font-bold text-primary">Administración de Reuniones</h1>
          <p className="text-muted-foreground mt-2">Organice y vea el historial de asistencia a reuniones por tipo.</p>
          {/* TODO: Add UI for date range selection here */}
        </div>
        <PageSpecificAddMeetingDialog 
          addMeetingAction={addMeetingAction} 
          allMembers={allMembers} 
        />
      </div>

      {sortedMeetingTypesPresent.length > 0 ? (
        <Tabs defaultValue={defaultTabValue} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6 pb-2">
            {sortedMeetingTypesPresent.map((type) => (
              <TabsTrigger key={type} value={type} className="whitespace-normal text-xs sm:text-sm h-auto py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {meetingTypeTranslations[type as MeetingType] || type} ({meetingsByType[type].length})
              </TabsTrigger>
            ))}
          </TabsList>

          {sortedMeetingTypesPresent.map((type) => (
            <TabsContent key={type} value={type}>
              {meetingsByType[type] && meetingsByType[type].length > 0 ? (
                <MeetingTypeAttendanceTable
                  meetingsForType={meetingsByType[type]}
                  allMembers={allMembers}
                  allGdis={allGdis}
                  allMinistryAreas={allMinistryAreas}
                  allAttendanceRecords={allAttendanceRecords}
                  meetingTypeLabel={meetingTypeTranslations[type as MeetingType] || type}
                  filterStartDate={appliedStartDate}
                  filterEndDate={appliedEndDate}
                />
              ) : (
                <div className="text-center py-10">
                  <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-muted-foreground">No Hay Reuniones Programadas para este Tipo</h2>
                  <p className="text-muted-foreground mt-2">
                    {appliedStartDate && appliedEndDate 
                      ? `No hay reuniones para el rango de fechas seleccionado (${format(parseISO(appliedStartDate), 'dd/MM/yy', {locale: es})} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', {locale: es})}).`
                      : "Agregue una nueva reunión de este tipo para comenzar."}
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
         <div className="text-center py-10">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Hay Reuniones Programadas</h2>
           <p className="text-muted-foreground mt-2">
            {appliedStartDate && appliedEndDate 
              ? `No hay reuniones para el rango de fechas seleccionado (${format(parseISO(appliedStartDate), 'dd/MM/yy', {locale: es})} - ${format(parseISO(appliedEndDate), 'dd/MM/yy', {locale: es})}).`
              : "Agregue una nueva reunión para comenzar."}
          </p>
        </div>
      )}
    </div>
  );
}
