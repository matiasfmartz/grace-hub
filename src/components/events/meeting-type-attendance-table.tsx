
"use client";

import type { Meeting, Member, AttendanceRecord, MeetingSeries } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { CheckCircle2, XCircle, HelpCircle, MinusCircle, CalendarRange, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useMemo } from 'react';

interface MeetingTypeAttendanceTableProps {
  displayedInstances: Meeting[]; // Paginated meeting instances (columns)
  allMeetingSeries: MeetingSeries[];
  initialRowMembers: Member[]; // Full list of members relevant to displayedInstances (rows to be paginated)
  expectedAttendeesMap: Record<string, Set<string>>; // Map of meetingId to Set of expected memberIds
  allAttendanceRecords: AttendanceRecord[];
  seriesName: string;
  filterStartDate?: string;
  filterEndDate?: string;
  memberCurrentPage: number;
  memberPageSize: number;
}

const formatMeetingHeader = (dateString: string, timeString: string, isDuplicateDate: boolean): string => {
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) return isDuplicateDate ? `${dateString} ${timeString}` : dateString;

    const datePart = format(parsedDate, "d MMM yy", { locale: es });
    if (isDuplicateDate) {
      const timeParts = timeString.split(':');
      if (timeParts.length === 2 && parseInt(timeParts[0]) >= 0 && parseInt(timeParts[0]) <= 23 && parseInt(timeParts[1]) >= 0 && parseInt(timeParts[1]) <= 59) {
        return `${datePart} ${timeString}`; 
      }
      return `${datePart} (Hora: ${timeString})`; 
    }
    return datePart;
  } catch (error) {
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

export default function MeetingTypeAttendanceTable({
  displayedInstances,
  allMeetingSeries, 
  initialRowMembers,
  expectedAttendeesMap,
  allAttendanceRecords,
  seriesName,
  filterStartDate,
  filterEndDate,
  memberCurrentPage,
  memberPageSize,
}: MeetingTypeAttendanceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Member Pagination Logic
  const totalMembers = initialRowMembers.length;
  const totalMemberPages = Math.ceil(totalMembers / memberPageSize);
  const memberStartIndex = (memberCurrentPage - 1) * memberPageSize;
  const memberEndIndex = memberStartIndex + memberPageSize;
  const paginatedRowMembers = initialRowMembers.slice(memberStartIndex, memberEndIndex);

  const handleMemberPageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mPage', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleMemberPageSizeChange = (newSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mPSize', newSize);
    params.set('mPage', '1'); // Reset to first page when size changes
    router.push(`${pathname}?${params.toString()}`);
  };


  if (!displayedInstances || displayedInstances.length === 0) {
     const dateRangeInfo = filterStartDate && filterEndDate ? 
      ` para el rango de ${format(parseISO(filterStartDate), 'dd/MM/yy', {locale: es})} a ${format(parseISO(filterEndDate), 'dd/MM/yy', {locale: es})}` :
      "";
    return <p className="text-muted-foreground py-4 text-center">No hay instancias de reunión para la serie "{seriesName}"{dateRangeInfo}.</p>;
  }
  
  // Sort meeting instances by date ascending (oldest first) for column display
  const columnMeetings = [...displayedInstances].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  const dateCounts = new Map<string, number>();
  columnMeetings.forEach(meeting => {
      dateCounts.set(meeting.date, (dateCounts.get(meeting.date) || 0) + 1);
  });

  const captionDateRangeText = formatDateRangeText(filterStartDate, filterEndDate);

  return (
    <div className="border rounded-lg shadow-md">
      {totalMembers > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b gap-2">
          <div className="text-sm text-muted-foreground">
            Mostrando {paginatedRowMembers.length} de {totalMembers} miembros convocados.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Mostrar:</span>
            <Select
              value={memberPageSize.toString()}
              onValueChange={handleMemberPageSizeChange}
            >
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue placeholder={memberPageSize} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
             {totalMemberPages > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleMemberPageChange(memberCurrentPage - 1)}
                    disabled={memberCurrentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Pág. {memberCurrentPage} de {totalMemberPages} (Miembros)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleMemberPageChange(memberCurrentPage + 1)}
                    disabled={memberCurrentPage >= totalMemberPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
            )}
          </div>
        </div>
      )}
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
            {paginatedRowMembers.map(member => (
              <TableRow key={member.id}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium w-[200px] min-w-[200px] border-r p-2">
                  {member.firstName} {member.lastName}
                </TableCell
                >
                {columnMeetings.map(meeting => {
                  const isExpected = expectedAttendeesMap[meeting.id]?.has(member.id);
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
            {paginatedRowMembers.length === 0 && totalMembers > 0 && (
               <TableRow>
                <TableCell colSpan={columnMeetings.length + 1} className="text-center text-muted-foreground py-8">
                    No hay miembros para mostrar en esta página.
                </TableCell>
              </TableRow>
            )}
             {totalMembers === 0 && (
              <TableRow>
                <TableCell colSpan={columnMeetings.length + 1} className="text-center text-muted-foreground py-8">
                  No hay miembros convocados para las instancias visibles de esta serie
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

