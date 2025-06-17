
import type { Meeting, Member, GDI, MinistryArea, AttendanceRecord } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getResolvedAttendees } from '@/services/attendanceService';
import Link from 'next/link';
import { CheckCircle2, XCircle, HelpCircle, MinusCircle, CalendarRange } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface MeetingTypeAttendanceTableProps {
  meetingsForSeries: Meeting[];
  allMembers: Member[];
  allGdis: GDI[];
  allMinistryAreas: MinistryArea[];
  allAttendanceRecords: AttendanceRecord[];
  seriesName: string;
  filterStartDate?: string;
  filterEndDate?: string;
}

const formatMeetingHeader = (dateString: string, timeString: string, isDuplicateDate: boolean): string => {
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) return isDuplicateDate ? `${dateString} ${timeString}` : dateString;

    const datePart = format(parsedDate, "d MMM yy", { locale: es });
    if (isDuplicateDate) {
      // Ensure timeString is valid HH:MM before trying to format, or use as is.
      const timeParts = timeString.split(':');
      if (timeParts.length === 2 && parseInt(timeParts[0]) >= 0 && parseInt(timeParts[0]) <= 23 && parseInt(timeParts[1]) >= 0 && parseInt(timeParts[1]) <= 59) {
        return `${datePart} ${timeString}`; // Example: 15 Jun 24 10:00
      }
      return `${datePart} (Hora: ${timeString})`; // Fallback if time format is unexpected
    }
    return datePart;
  } catch (error) {
    // Fallback for any parsing/formatting error
    return isDuplicateDate ? `${dateString} ${timeString}` : dateString;
  }
};


const formatDateRangeText = (startDate?: string, endDate?: string): string => {
  if (startDate && endDate) {
    try {
      const parsedStart = parseISO(startDate);
      const parsedEnd = parseISO(endDate);
       if (!isValid(parsedStart) || !isValid(parsedEnd)) return "Rango de fechas inválido";
      const formattedStart = format(parsedStart, "dd/MM/yyyy", { locale: es });
      const formattedEnd = format(parsedEnd, "dd/MM/yyyy", { locale: es });
      return `Mostrando instancias entre ${formattedStart} y ${formattedEnd}`;
    } catch (e) {
        return "Rango de fechas inválido";
    }
  }
  return `Mostrando todas las instancias para esta serie.`;
};

export default async function MeetingTypeAttendanceTable({
  meetingsForSeries,
  allMembers,
  allGdis,
  allMinistryAreas,
  allAttendanceRecords,
  seriesName,
  filterStartDate,
  filterEndDate,
}: MeetingTypeAttendanceTableProps) {

  if (!meetingsForSeries || meetingsForSeries.length === 0) {
     const dateRangeInfo = filterStartDate && endDate ? 
      ` para el rango de ${format(parseISO(filterStartDate), 'dd/MM/yy', {locale: es})} a ${format(parseISO(filterEndDate), 'dd/MM/yy', {locale: es})}` :
      "";
    return <p className="text-muted-foreground py-4 text-center">No hay instancias de reunión para la serie "{seriesName}"{dateRangeInfo}.</p>;
  }

  // Determine unique members expected across all meetings in this series
  const rowMemberIds = new Set<string>();
  const expectedAttendeesByMeetingId: Record<string, Set<string>> = {}; 

  for (const meeting of meetingsForSeries) {
    const expectedForThisInstance = await getResolvedAttendees(meeting, allMembers);
    expectedAttendeesByMeetingId[meeting.id] = new Set(expectedForThisInstance.map(m => m.id));
    expectedForThisInstance.forEach(member => rowMemberIds.add(member.id));
  }
  
  const rowMembers = allMembers
    .filter(member => rowMemberIds.has(member.id))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  // columnMeetings are already sorted ascendingly by date by the parent (EventsPage)
  const columnMeetings = meetingsForSeries; 

  // Check for duplicate dates to decide if time should be shown in header
  const dateCounts = new Map<string, number>();
  columnMeetings.forEach(meeting => {
      dateCounts.set(meeting.date, (dateCounts.get(meeting.date) || 0) + 1);
  });

  const captionDateRangeText = formatDateRangeText(filterStartDate, filterEndDate);

  return (
    <div className="border rounded-lg shadow-md">
      <ScrollArea className="w-full whitespace-nowrap">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 w-[200px] min-w-[200px] border-r p-2">Miembro</TableHead>
              {columnMeetings.map(meeting => {
                const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;
                return (
                  <TableHead key={meeting.id} className="text-center min-w-[100px] p-2 whitespace-normal">
                    <Link href={`/events/${meeting.id}/attendance`} className="hover:underline text-primary font-medium block" title={meeting.name}>
                      {formatMeetingHeader(meeting.date, meeting.time, isDuplicateDate)}
                    </Link>
                  </TableHead>
                );
              })}
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
                  No hay miembros esperados para las instancias de esta serie
                  {filterStartDate && filterEndDate ? ` en el rango de fechas seleccionado` : ""}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {(filterStartDate || filterEndDate) && (
        <div className="mt-3 px-4 pb-2 text-left text-sm text-muted-foreground flex items-center">
          <CalendarRange className="mr-2 h-4 w-4 text-primary/80" />
          {captionDateRangeText}
        </div>
      )}
    </div>
  );
}
