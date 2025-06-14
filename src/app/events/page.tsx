
'use server';
import type { Meeting, AddMeetingFormValues, MeetingType, MeetingWriteData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { CalendarDays, Clock, MapPin, Users, Briefcase, Award, PlusCircle, CheckSquare } from 'lucide-react';
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

export async function addMeetingAction(
  newMeetingData: AddMeetingFormValues
): Promise<{ success: boolean; message: string; newMeeting?: Meeting }> {
  try {
    // Convert AddMeetingFormValues to MeetingWriteData
    const meetingToWrite: MeetingWriteData = {
      ...newMeetingData,
      // The service will handle date formatting if it's a Date object
      // For now, assuming AddMeetingFormValues `date` is already a Date object
      date: newMeetingData.date, // The service will format this to string
      imageUrl: newMeetingData.imageUrl || 'https://placehold.co/600x400',
      description: newMeetingData.description || '',
      relatedAreaId: newMeetingData.type === "AreaSpecific" ? newMeetingData.relatedAreaId : null,
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
    case 'General':
      return <Users className="mr-2 h-5 w-5 text-primary" />;
    case 'GDI Focus':
      return <Users className="mr-2 h-5 w-5 text-blue-500" />;
    case 'Obreros':
      return <Briefcase className="mr-2 h-5 w-5 text-green-500" />;
    case 'Lideres':
      return <Award className="mr-2 h-5 w-5 text-yellow-500" />;
    case 'AreaSpecific':
      return <Users className="mr-2 h-5 w-5 text-purple-500" />;
    default:
      return <CalendarDays className="mr-2 h-5 w-5 text-primary" />;
  }
};

const formatDateDisplay = (dateString: string) => {
  try {
    return format(parseISO(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    return dateString; 
  }
};

export default async function EventsPage() {
  const meetings = await getAllMeetings(); // Already sorted by service

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-wrap justify-between items-center mb-10">
        <div className="mb-4 sm:mb-0">
          <h1 className="font-headline text-4xl font-bold text-primary">Próximas Reuniones</h1>
          <p className="text-muted-foreground mt-2">Administre y manténgase informado sobre todas las actividades.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Agregar Nueva Reunión
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Reunión</DialogTitle>
              <DialogDescription>
                Complete los detalles para la nueva reunión.
              </DialogDescription>
            </DialogHeader>
            <AddMeetingForm addMeetingAction={addMeetingAction} />
          </DialogContent>
        </Dialog>
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
                    <Badge variant="secondary">{meeting.type}</Badge>
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
