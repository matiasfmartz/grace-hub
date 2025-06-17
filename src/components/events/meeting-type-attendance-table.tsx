
import type { Meeting, Member, GDI, MinistryArea, AttendanceRecord } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { getResolvedAttendees } from '@/services/attendanceService';
import Link from 'next/link';
import { CheckCircle2, XCircle, HelpCircle, MinusCircle, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface MeetingTypeAttendanceTableProps {
  meetingsForType: Meeting[];
  allMembers: Member[];
  allGdis: GDI[];
  allMinistryAreas: MinistryArea[];
  allAttendanceRecords: AttendanceRecord[];
  meetingTypeLabel: string;
}

const formatDateDisplay = (dateString: string) => {
  try {
    return format(parseISO(dateString), "d MMM yy", { locale: es });
  } catch (error) {
    return dateString; 
  }
};

export default async function MeetingTypeAttendanceTable({
  meetingsForType,
  allMembers,
  allGdis,
  allMinistryAreas,
  allAttendanceRecords,
  meetingTypeLabel
}: MeetingTypeAttendanceTableProps) {

  if (!meetingsForType || meetingsForType.length === 0) {
    return <p className="text-muted-foreground">No hay reuniones para mostrar en esta categoría.</p>;
  }

  // Determine unique row members based on who was expected for any meeting of this type
  const rowMemberIds = new Set<string>();
  const expectedAttendeesByMeetingId: Record<string, Set<string>> = {};

  for (const meeting of meetingsForType) {
    const expectedForThisMeeting = await getResolvedAttendees(meeting, allMembers, allGdis, allMinistryAreas);
    expectedForThisMeeting.forEach(member => rowMemberIds.add(member.id));
    expectedAttendeesByMeetingId[meeting.id] = new Set(expectedForThisMeeting.map(m => m.id));
  }
  
  const rowMembers = allMembers
    .filter(member => rowMemberIds.has(member.id))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  // Columns are the meetings, sorted by date (most recent first by default from page.tsx)
  const columnMeetings = meetingsForType; 

  return (
    <div className="border rounded-lg shadow-md">
      <ScrollArea className="w-full whitespace-nowrap">
        <Table className="min-w-full">
          <TableCaption className="mt-4 text-lg font-semibold">{meetingTypeLabel} - Historial de Asistencia</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 w-[200px] min-w-[200px] border-r">Miembro</TableHead>
              {columnMeetings.map(meeting => (
                <TableHead key={meeting.id} className="text-center min-w-[150px]">
                  <Link href={`/events/${meeting.id}/attendance`} className="hover:underline text-primary font-medium block">
                    {meeting.name}
                    <span className="block text-xs text-muted-foreground">{formatDateDisplay(meeting.date)}</span>
                  </Link>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowMembers.map(member => (
              <TableRow key={member.id}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium w-[200px] min-w-[200px] border-r">
                  {member.firstName} {member.lastName}
                </TableCell
                >
                {columnMeetings.map(meeting => {
                  const isExpected = expectedAttendeesByMeetingId[meeting.id]?.has(member.id);
                  let cellContent;

                  if (isExpected) {
                    const record = allAttendanceRecords.find(r => r.memberId === member.id && r.meetingId === meeting.id);
                    if (record && record.attended) {
                      cellContent = <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" title="Asistió" />;
                    } else if (record && !record.attended) {
                      cellContent = <XCircle className="h-5 w-5 text-red-600 mx-auto" title="No Asistió" />;
                    } else {
                      cellContent = <HelpCircle className="h-5 w-5 text-muted-foreground mx-auto" title="Pendiente" />;
                    }
                  } else {
                    cellContent = <MinusCircle className="h-5 w-5 text-gray-300 mx-auto" title="No Aplicable" />;
                  }
                  
                  return (
                    <TableCell key={`${member.id}-${meeting.id}`} className="text-center">
                      <Link href={`/events/${meeting.id}/attendance`} className="flex justify-center items-center h-full w-full p-2">
                        {cellContent}
                      </Link>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {rowMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnMeetings.length + 1} className="text-center text-muted-foreground py-8">
                  No hay miembros esperados para las reuniones de este tipo o no se pudieron determinar los asistentes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {meetingsForType.length > 0 && (
        <div className="p-4 border-t text-center">
           <Button asChild variant="outline">
              {/* This link could eventually include date range parameters if implemented */}
              <Link href={`/events?type=${meetingsForType[0].type}`}> 
                Ver Todas las Reuniones de {meetingTypeLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
        </div>
      )}
    </div>
  );
}
