
'use server';
import type { Meeting, AddMeetingFormValues, MeetingType } from '@/lib/types';
import { placeholderMeetings } from '@/lib/placeholder-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { CalendarDays, Clock, MapPin, Users, Briefcase, Award, PlusCircle, CheckSquare } from 'lucide-react';
import { promises as fs } from 'node:fs';
import path from 'node:path';
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


const MEETINGS_DB_PATH = path.join(process.cwd(), 'src/lib/meetings-db.json');

async function getMeetings(): Promise<Meeting[]> {
  try {
    const fileContent = await fs.readFile(MEETINGS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(MEETINGS_DB_PATH, JSON.stringify(placeholderMeetings, null, 2), 'utf-8');
      return placeholderMeetings;
    }
    console.error("Failed to read meetings-db.json:", error);
    return placeholderMeetings;
  }
}

export async function addMeetingAction(
  newMeetingData: AddMeetingFormValues
): Promise<{ success: boolean; message: string; newMeeting?: Meeting }> {
  try {
    let currentMeetings = await getMeetings();
    
    // Convert date object to YYYY-MM-DD string
    const formattedDate = format(newMeetingData.date, 'yyyy-MM-dd');

    const newMeeting: Meeting = {
      ...newMeetingData,
      id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
      date: formattedDate, // Use formatted date string
      imageUrl: newMeetingData.imageUrl || 'https://placehold.co/600x400',
      description: newMeetingData.description || '',
      relatedAreaId: newMeetingData.type === "AreaSpecific" ? newMeetingData.relatedAreaId : null,
    };
    
    const updatedMeetings = [...currentMeetings, newMeeting];
    await fs.writeFile(MEETINGS_DB_PATH, JSON.stringify(updatedMeetings, null, 2), 'utf-8');
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
      return <Users className="mr-2 h-5 w-5 text-blue-500" />; // Different color for GDI
    case 'Obreros':
      return <Briefcase className="mr-2 h-5 w-5 text-green-500" />;
    case 'Lideres':
      return <Award className="mr-2 h-5 w-5 text-yellow-500" />;
    case 'AreaSpecific':
      return <Users className="mr-2 h-5 w-5 text-purple-500" />; // Placeholder, might need specific icon
    default:
      return <CalendarDays className="mr-2 h-5 w-5 text-primary" />;
  }
};

const formatDateDisplay = (dateString: string) => {
  try {
    return format(parseISO(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    return dateString; // Fallback for invalid dates
  }
};


export default async function EventsPage() {
  const meetings = await getMeetings();
  // Sort meetings by date, most recent first
  const sortedMeetings = meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


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

      {sortedMeetings.length > 0 ? (
        <div className="space-y-8">
          {sortedMeetings.map((meeting) => (
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
