
import type { Meeting, Member, GDI, MinistryArea, AttendanceRecord } from '@/lib/types';
import { notFound } from 'next/navigation';
import { getMeetingById, updateMeetingMinute, getMeetingSeriesById } from '@/services/meetingService';
import { getAllMembersNonPaginated } from '@/services/memberService';
import { getAllGdis } from '@/services/gdiService';
import { getAllMinistryAreas } from '@/services/ministryAreaService';
import { getResolvedAttendees, getAttendanceForMeeting, saveMeetingAttendance } from '@/services/attendanceService';
import AttendanceManagerView from '@/components/events/attendance-manager-view';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MeetingAttendancePageProps {
  params: { meetingId: string };
}

async function getPageData(meetingId: string) {
  const meetingInstance = await getMeetingById(meetingId);
  if (!meetingInstance) notFound();

  const meetingSeries = await getMeetingSeriesById(meetingInstance.seriesId);
  
  const [allMembers, allGdis, allMinistryAreas, currentAttendance] = await Promise.all([
    getAllMembersNonPaginated(),
    getAllGdis(), // Still needed if getResolvedAttendees uses them as fallback or for other logic
    getAllMinistryAreas(), // Still needed
    getAttendanceForMeeting(meetingId),
  ]);

  // getResolvedAttendees now primarily uses meetingInstance.attendeeUids
  const resolvedAttendees = await getResolvedAttendees(meetingInstance, allMembers);
  return { meetingInstance, meetingSeries, resolvedAttendees, currentAttendance, allMembers };
}

async function handleSaveAttendance(
  meetingId: string,
  memberAttendances: Array<{ memberId: string; attended: boolean }>
) {
  'use server';
  try {
    await saveMeetingAttendance(meetingId, memberAttendances);
    revalidatePath(`/events/${meetingId}/attendance`);
    return { success: true, message: "Asistencia guardada exitosamente." };
  } catch (error: any) {
    return { success: false, message: `Error al guardar asistencia: ${error.message}` };
  }
}

async function handleUpdateMinuteAction(meetingId: string, minute: string) {
  'use server';
  try {
    await updateMeetingMinute(meetingId, minute.trim() === '' ? null : minute.trim());
    revalidatePath(`/events/${meetingId}/attendance`);
    return { success: true, message: "Minuta actualizada exitosamente." };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar minuta: ${error.message}` };
  }
}

const formatDateDisplay = (dateString: string) => {
  try {
    return format(parseISO(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    return dateString; 
  }
};

export default async function MeetingAttendancePage({ params }: MeetingAttendancePageProps) {
  const { meetingInstance, meetingSeries, resolvedAttendees, currentAttendance } = await getPageData(params.meetingId);

  const seriesName = meetingSeries ? meetingSeries.name : "Serie Desconocida";
  const pageTitle = `${meetingInstance.name} - ${seriesName}`;
  const meetingDateTime = `${formatDateDisplay(meetingInstance.date)} a las ${meetingInstance.time}`;
  const meetingLocation = meetingInstance.location;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Eventos
          </Link>
        </Button>
      </div>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary">{pageTitle}</CardTitle>
          <CardDescription className="text-md">
            {meetingDateTime} - {meetingLocation}
          </CardDescription>
        </CardHeader>
        {meetingInstance.description && (
          <CardContent>
            <p className="text-muted-foreground">{meetingInstance.description}</p>
          </CardContent>
        )}
      </Card>

      <AttendanceManagerView
        meetingId={meetingInstance.id}
        initialAttendees={resolvedAttendees}
        initialAttendanceRecords={currentAttendance}
        saveAttendanceAction={handleSaveAttendance}
      />

      {/* Minute taking can be enabled for any series if desired, or conditioned on series.frequency or other properties */}
      {/* For now, let's assume minute is applicable if the series allows for it (e.g., not a quick general service) */}
      {/* This logic can be refined based on series properties if needed */}
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center">
            <FileText className="mr-2 h-5 w-5" /> Minuta de la Reunión
          </CardTitle>
          <CardDescription>
            Registre los puntos tratados, decisiones y acuerdos de la reunión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData: FormData) => {
            'use server';
            const minuteContent = formData.get('minuteContent') as string;
            const result = await handleUpdateMinuteAction(meetingInstance.id, minuteContent);
            if (!result.success) {
              console.error("Error updating minute:", result.message);
              // Potentially show a toast message here for client feedback
            }
          }}>
            <Textarea
              name="minuteContent"
              defaultValue={meetingInstance.minute || ''}
              placeholder="Escriba la minuta aquí..."
              rows={8}
              className="mb-4"
            />
            <Button type="submit">Guardar Minuta</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
