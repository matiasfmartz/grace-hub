
'use server';
import type { Meeting, Member, GDI, MinistryArea, AttendanceRecord } from '@/lib/types';
import { notFound, redirect } from 'next/navigation';
import { getMeetingById, updateMeetingMinute } from '@/services/meetingService';
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
  const meeting = await getMeetingById(meetingId);
  if (!meeting) notFound();

  const [allMembers, allGdis, allMinistryAreas, currentAttendance] = await Promise.all([
    getAllMembersNonPaginated(),
    getAllGdis(),
    getAllMinistryAreas(),
    getAttendanceForMeeting(meetingId),
  ]);

  const resolvedAttendees = getResolvedAttendees(meeting, allMembers, allGdis, allMinistryAreas);
  return { meeting, resolvedAttendees, currentAttendance, allMembers };
}

export async function handleSaveAttendance(
  meetingId: string,
  memberAttendances: Array<{ memberId: string; attended: boolean }>
) {
  try {
    await saveMeetingAttendance(meetingId, memberAttendances);
    revalidatePath(`/events/${meetingId}/attendance`);
    return { success: true, message: "Asistencia guardada exitosamente." };
  } catch (error: any) {
    return { success: false, message: `Error al guardar asistencia: ${error.message}` };
  }
}

export async function handleUpdateMinute(meetingId: string, minute: string) {
  try {
    await updateMeetingMinute(meetingId, minute.trim() === '' ? null : minute.trim());
    revalidatePath(`/events/${meetingId}/attendance`);
    return { success: true, message: "Minuta actualizada exitosamente." };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar minuta: ${error.message}` };
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

const formatDateDisplay = (dateString: string) => {
  try {
    return format(parseISO(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    return dateString; 
  }
};

export default async function MeetingAttendancePage({ params }: MeetingAttendancePageProps) {
  const { meeting, resolvedAttendees, currentAttendance } = await getPageData(params.meetingId);

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
          <CardTitle className="font-headline text-3xl text-primary">{meeting.name}</CardTitle>
          <CardDescription className="text-md">
            {meetingTypeTranslations[meeting.type]} - {formatDateDisplay(meeting.date)} a las {meeting.time} - {meeting.location}
          </CardDescription>
        </CardHeader>
        {meeting.description && (
          <CardContent>
            <p className="text-muted-foreground">{meeting.description}</p>
          </CardContent>
        )}
      </Card>

      <AttendanceManagerView
        meetingId={meeting.id}
        initialAttendees={resolvedAttendees}
        initialAttendanceRecords={currentAttendance}
        saveAttendanceAction={handleSaveAttendance}
      />

      {meeting.type === 'Area_Meeting' && (
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
              const result = await handleUpdateMinute(meeting.id, minuteContent);
              if (!result.success) {
                // Consider showing toast on client side if form was client component
                console.error("Error updating minute:", result.message);
              }
            }}>
              <Textarea
                name="minuteContent"
                defaultValue={meeting.minute || ''}
                placeholder="Escriba la minuta aquí..."
                rows={8}
                className="mb-4"
              />
              <Button type="submit">Guardar Minuta</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
