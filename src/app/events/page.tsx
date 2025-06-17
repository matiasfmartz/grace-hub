
'use server';
import type { Meeting, AddGeneralMeetingFormValues, MeetingType, MeetingWriteData, Member, GDI, MinistryArea } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Users, Briefcase, Award, CheckSquare, Sparkles, Building2, HandHelping, Edit } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllMeetings, addMeeting as addMeetingSvc } from '@/services/meetingService';
import { getAllMembersNonPaginated } from '@/services/memberService'; 
import PageSpecificAddMeetingDialog from '@/components/events/page-specific-add-meeting-dialog';
import { Badge } from '@/components/ui/badge';
import { getAllGdis } from '@/services/gdiService'; 
import { getAllMinistryAreas } from '@/services/ministryAreaService'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const MeetingTypeIcon = ({ type }: { type: MeetingType }) => {
  switch (type) {
    case 'General_Service':
      return <Users className="mr-2 h-5 w-5 text-primary" />;
    case 'GDI_Meeting':
      return <HandHelping className="mr-2 h-5 w-5 text-teal-500" />;
    case 'Obreros_Meeting':
      return <Briefcase className="mr-2 h-5 w-5 text-green-500" />;
    case 'Lideres_Meeting':
      return <Award className="mr-2 h-5 w-5 text-yellow-500" />;
    case 'Area_Meeting':
      return <Building2 className="mr-2 h-5 w-5 text-indigo-500" />;
    case 'Special_Meeting':
      return <Sparkles className="mr-2 h-5 w-5 text-pink-500" />;
    default:
      return <CalendarDays className="mr-2 h-5 w-5 text-primary" />;
  }
};

const meetingTypeTranslations: Record<string, string> = {
  General_Service: "Servicio General",
  GDI_Meeting: "Reunión de GDI",
  Obreros_Meeting: "Reunión de Obreros",
  Lideres_Meeting: "Reunión de Líderes",
  Area_Meeting: "Reunión de Área Ministerial",
  Special_Meeting: "Reunión Especial",
};


const formatDateDisplay = (dateString: string) => {
  try {
    return format(parseISO(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    return dateString; 
  }
};

interface EventsPageData {
  meetingsByType: Record<string, Meeting[]>;
  allMembers: Member[];
  allGdis: GDI[];
  allMinistryAreas: MinistryArea[];
}

async function getEventsPageData(): Promise<EventsPageData> {
  const allMeetingsList = await getAllMeetings();
  const allMembers = await getAllMembersNonPaginated();
  const allGdis = await getAllGdis();
  const allMinistryAreas = await getAllMinistryAreas();

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

  return { meetingsByType, allMembers, allGdis, allMinistryAreas };
}


export default async function EventsPage() {
  const { meetingsByType, allMembers, allGdis, allMinistryAreas } = await getEventsPageData();
  const meetingTypesPresent = Object.keys(meetingsByType).filter(type => meetingsByType[type] && meetingsByType[type].length > 0);
  
  const orderedMeetingTypes = [
    "General_Service", "GDI_Meeting", "Area_Meeting", 
    "Obreros_Meeting", "Lideres_Meeting", "Special_Meeting"
  ];

  const sortedMeetingTypesPresent = orderedMeetingTypes.filter(type => meetingTypesPresent.includes(type))
    .concat(meetingTypesPresent.filter(type => !orderedMeetingTypes.includes(type)));


  const defaultTabValue = 
    sortedMeetingTypesPresent.includes('General_Service') ? 'General_Service' : 
    sortedMeetingTypesPresent.length > 0 ? sortedMeetingTypesPresent[0] : '';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-wrap justify-between items-center mb-10">
        <div className="mb-4 sm:mb-0">
          <h1 className="font-headline text-4xl font-bold text-primary">Administración de Reuniones</h1>
          <p className="text-muted-foreground mt-2">Organice y vea reuniones por tipo.</p>
        </div>
        <PageSpecificAddMeetingDialog 
          addMeetingAction={addMeetingAction} 
          allMembers={allMembers} 
        />
      </div>

      {sortedMeetingTypesPresent.length > 0 ? (
        <Tabs defaultValue={defaultTabValue} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6 overflow-x-auto pb-2">
            {sortedMeetingTypesPresent.map((type) => (
              <TabsTrigger key={type} value={type} className="whitespace-normal text-xs sm:text-sm h-auto py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {meetingTypeTranslations[type as MeetingType] || type} ({meetingsByType[type].length})
              </TabsTrigger>
            ))}
          </TabsList>

          {sortedMeetingTypesPresent.map((type) => (
            <TabsContent key={type} value={type}>
              <h2 className="font-headline text-2xl font-semibold text-primary mb-6 border-b pb-2">
                {meetingTypeTranslations[type as MeetingType] || type}
              </h2>
              {meetingsByType[type] && meetingsByType[type].length > 0 ? (
                <div className="space-y-8">
                  {meetingsByType[type].map((meeting) => (
                    <Card key={meeting.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 md:flex">
                      {meeting.imageUrl && (
                        <div className="md:w-1/3 relative h-48 md:h-auto">
                          <Image 
                            src={meeting.imageUrl} 
                            alt={meeting.name} 
                            layout="fill" 
                            objectFit="cover"
                            className="md:rounded-l-lg md:rounded-t-none rounded-t-lg"
                            data-ai-hint="church meeting"
                          />
                        </div>
                      )}
                      <div className={`flex flex-col ${meeting.imageUrl ? 'md:w-2/3' : 'w-full'}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start mb-2">
                            <CardTitle className="font-headline text-2xl text-primary flex items-center">
                               <MeetingTypeIcon type={meeting.type} />
                               {meeting.name}
                            </CardTitle>
                            {/* Optional: Badge for type, could be removed as it's implied by tab */}
                            {/* <Badge variant="secondary">{meetingTypeTranslations[meeting.type as MeetingType] || meeting.type}</Badge> */}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                            <span>{formatDateDisplay(meeting.date)}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-2 h-5 w-5 text-primary" />
                            <span>{meeting.time}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-2 h-5 w-5 text-primary" />
                            <span>{meeting.location}</span>
                          </div>
                          {meeting.description && <CardDescription className="text-sm pt-2 leading-relaxed">{meeting.description}</CardDescription>}
                          {meeting.type === 'Area_Meeting' && meeting.relatedAreaId && (
                             <p className="text-xs text-muted-foreground pt-1">Área: {allMinistryAreas.find(a => a.id === meeting.relatedAreaId)?.name || meeting.relatedAreaId}</p> 
                          )}
                          {meeting.type === 'GDI_Meeting' && meeting.relatedGdiId && (
                             <p className="text-xs text-muted-foreground pt-1">GDI: {allGdis.find(g => g.id === meeting.relatedGdiId)?.name || meeting.relatedGdiId}</p> 
                          )}
                          {meeting.type === 'Special_Meeting' && meeting.attendeeUids && meeting.attendeeUids.length > 0 && (
                            <p className="text-xs text-muted-foreground pt-1">Asistentes Específicos: {meeting.attendeeUids.length}</p>
                          )}
                        </CardContent>
                        <CardFooter className="gap-2">
                          <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
                            <Link href={`/events/${meeting.id}/attendance`}>
                              <CheckSquare className="mr-2 h-4 w-4" />
                              Gestionar Asistencia
                            </Link>
                          </Button>
                           <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10">
                             <Link href={`/events/${meeting.id}/attendance`}> 
                               <Edit className="mr-2 h-4 w-4" />
                               Ver/Editar Minuta
                             </Link>
                           </Button>
                        </CardFooter>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-muted-foreground">No Hay Reuniones Programadas para este Tipo</h2>
                  <p className="text-muted-foreground mt-2">Agregue una nueva reunión de este tipo para comenzar.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
         <div className="text-center py-10">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Hay Reuniones Programadas</h2>
          <p className="text-muted-foreground mt-2">Agregue una nueva reunión para comenzar.</p>
        </div>
      )}
    </div>
  );
}
