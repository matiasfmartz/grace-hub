
import type { Meeting, Member, GDI, MinistryArea, AttendanceRecord } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { getResolvedAttendees } from '@/services/attendanceService';
import Link from 'next/link';
import { CheckCircle2, XCircle, HelpCircle, MinusCircle, ArrowRight, CalendarRange } from 'lucide-react';
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
  filterStartDate?: string;
  filterEndDate?: string;
}

const formatDateDisplay = (dateString: string) => {
  try {
    return format(parseISO(dateString), "d MMM yy", { locale: es });
  } catch (error) {
    return dateString; 
  }
};

const formatDateRange = (startDate?: string, endDate?: string): string => {
  if (startDate && endDate) {
    return `Mostrando reuniones entre ${format(parseISO(startDate), "dd/MM/yyyy", { locale: es })} y ${format(parseISO(endDate), "dd/MM/yyyy", { locale: es })}`;
  } else if (startDate) {
    return `Mostrando reuniones desde ${format(parseISO(startDate), "dd/MM/yyyy", { locale: es })}`;
  } else if (endDate) {
    return `Mostrando reuniones hasta ${format(parseISO(endDate), "dd/MM/yyyy", { locale: es })}`;
  }
  return "Mostrando todas las reuniones disponibles para este tipo.";
};

export default async function MeetingTypeAttendanceTable({
  meetingsForType,
  allMembers,
  allGdis,
  allMinistryAreas,
  allAttendanceRecords,
  meetingTypeLabel,
  filterStartDate,
  filterEndDate,
}: MeetingTypeAttendanceTableProps) {

  if (!meetingsForType || meetingsForType.length === 0) {
     const dateRangeText = filterStartDate && filterEndDate ? 
      ` para el rango de ${format(parseISO(filterStartDate), 'dd/MM/yy', {locale: es})} a ${format(parseISO(filterEndDate), 'dd/MM/yy', {locale: es})}` :
      "";
    return <p className="text-muted-foreground py-4 text-center">No hay reuniones de {meetingTypeLabel.toLowerCase()}{dateRangeText}.</p>;
  }

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

  const columnMeetings = meetingsForType; 

  const tableCaptionText = formatDateRange(filterStartDate, filterEndDate);

  return (
    <div className="border rounded-lg shadow-md">
      <ScrollArea className="w-full whitespace-nowrap">
        <Table className="min-w-full">
          <TableCaption className="my-4 text-lg font-semibold flex items-center justify-center">
            <CalendarRange className="mr-2 h-5 w-5 text-primary" />
            {meetingTypeLabel} - {tableCaptionText}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 w-[200px] min-w-[200px] border-r">Miembro</TableHead>
              {columnMeetings.map(meeting => (
                <TableHead key={meeting.id} className="text-center min-w-[100px] p-2">
                  <Link href={`/events/${meeting.id}/attendance`} className="hover:underline text-primary font-medium block">
                    {formatDateDisplay(meeting.date)}
                  </Link>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowMembers.map(member => (
              <TableRow key={member.id}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium w-[200px] min-w-[200px] border-r p-2">
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
                    <TableCell key={`${member.id}-${meeting.id}`} className="text-center p-0">
                      <Link href={`/events/${meeting.id}/attendance`} className="flex justify-center items-center h-full w-full p-2 hover:bg-muted/50">
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
                  No hay miembros esperados para las reuniones de este tipo o no se pudieron determinar los asistentes para el rango seleccionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {/* Removing the "Ver Todas las Reuniones" button as the filter controls will handle this */}
    </div>
  );
}
