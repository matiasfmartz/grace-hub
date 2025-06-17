
'use server';
import type { Meeting, AddGeneralMeetingFormValues, MeetingType, MeetingWriteData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { CalendarDays, Clock, MapPin, Users, Briefcase, Award, PlusCircle, CheckSquare, BookOpen, Sparkles, Building2, HandHelping } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddMeetingForm from '@/components/events/add-meeting-form';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllMeetings, addMeeting as addMeetingSvc } from '@/services/meetingService';

// For stateful dialog on server component page, we need a client component wrapper
// Or, make this EventsPage itself a client component if state is simple enough.
// For now, we can move the Dialog and its trigger into a client component,
// or acknowledge this page might need to be client for the dialog state.
// The simplest way to handle the dialog state in the page itself is to use client component features
// Let's make a small client component for the Dialog part.

// Client component for the Add Meeting Dialog Trigger and Content
// This is not ideal for a server component page. A better approach for server components
// is often to navigate or use query params to show modals if state is complex.
// However, for a simple dialog toggle, making the whole page client or a wrapper is common.

// To keep this page as a server component for data fetching,
// the stateful Dialog logic will be encapsulated.
// For this specific task, I'll make this page a client component to manage dialog state.
// This is not always the "best" pattern for Next.js App Router (prefer Server Components),
// but it's the most direct change for now.

// Let's stick to the plan: EventsPage remains a server component,
// the button/dialog part on this page will be a new client component.

import PageSpecificAddMeetingDialog from '@/components/events/page-specific-add-meeting-dialog';


export async function addMeetingAction(
  newMeetingData: AddGeneralMeetingFormValues
): Promise<{ success: boolean; message: string; newMeeting?: Meeting }> {
  try {
    const meetingToWrite: MeetingWriteData = {
      ...newMeetingData,
      date: newMeetingData.date, 
      imageUrl: newMeetingData.imageUrl || 'https://placehold.co/600x400',
      description: newMeetingData.description || '',
      relatedGdiId: null, 
      relatedAreaId: null,
      attendeeUids: null,
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

export default async function EventsPage() {
  const meetings = await getAllMeetings(); 

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-wrap justify-between items-center mb-10">
        <div className="mb-4 sm:mb-0">
          <h1 className="font-headline text-4xl font-bold text-primary">Próximas Reuniones</h1>
          <p className="text-muted-foreground mt-2">Administre y manténgase informado sobre todas las actividades.</p>
        </div>
        <PageSpecificAddMeetingDialog addMeetingAction={addMeetingAction} />
      </div>

      {meetings.length > 0 ? (
        <div className="space-y-8">
          {meetings.map((meeting) => (
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
                    <Badge variant="secondary">{(meetingTypeTranslations[meeting.type as MeetingType]) || meeting.type}</Badge>
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
                     <p className="text-xs text-muted-foreground pt-1">Área: {meeting.relatedAreaId}</p> 
                  )}
                  {meeting.type === 'GDI_Meeting' && meeting.relatedGdiId && (
                     <p className="text-xs text-muted-foreground pt-1">GDI: {meeting.relatedGdiId}</p> 
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Gestionar Asistencia
                  </Button>
                </CardFooter>
              </div>
            </Card>
          ))}
        </div>
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

