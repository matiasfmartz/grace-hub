
"use client";

import type { Meeting, AttendanceRecord } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, CalendarRange, Users } from 'lucide-react';

interface AttendanceFrequencySummaryTableProps {
  meetingsForSeries: Meeting[];
  allAttendanceRecords: AttendanceRecord[];
  seriesName: string;
  filterStartDate?: string;
  filterEndDate?: string;
}

interface MeetingAttendanceSummary {
  meetingId: string;
  meetingName: string;
  meetingDate: string;
  meetingTime: string;
  attendedCount: number;
  expectedCount: number; // Total UIDs associated with the meeting
}

const formatMeetingDisplay = (dateString: string, timeString: string, name: string, isDuplicateDate: boolean): string => {
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
        return isDuplicateDate ? `${name} (${dateString} ${timeString})` : `${name} (${dateString})`;
    }
    const datePart = format(parsedDate, "d MMM yy", { locale: es });
    if (isDuplicateDate) {
      return `${name} (${datePart} ${timeString})`;
    }
    return `${name} (${datePart})`;
  } catch (error) {
    return isDuplicateDate ? `${name} (${dateString} ${timeString})` : `${name} (${dateString})`;
  }
};

const formatDateRangeText = (startDate?: string, endDate?: string): string => {
  if (startDate && endDate) {
    try {
      const parsedStart = parseISO(startDate);
      const parsedEnd = parseISO(endDate);
       if (!isValid(parsedStart) || !isValid(parsedEnd)) return "Rango de fechas inválido";
      const formattedStart = format(parsedStart, "dd/MM/yy", { locale: es });
      const formattedEnd = format(parsedEnd, "dd/MM/yy", { locale: es });
      return `Resumen para instancias entre ${formattedStart} y ${formattedEnd}`;
    } catch (e) {
        return "Rango de fechas inválido";
    }
  }
  return `Resumen para todas las instancias visibles de la serie.`;
};


export default function AttendanceFrequencySummaryTable({
  meetingsForSeries,
  allAttendanceRecords,
  seriesName,
  filterStartDate,
  filterEndDate,
}: AttendanceFrequencySummaryTableProps) {

  if (!meetingsForSeries || meetingsForSeries.length === 0) {
    return null; // Don't render if no meetings for the series/filter
  }

  const dateCounts = new Map<string, number>();
  meetingsForSeries.forEach(meeting => {
      dateCounts.set(meeting.date, (dateCounts.get(meeting.date) || 0) + 1);
  });

  const summaryData = meetingsForSeries.map(meeting => {
    const attendedRecords = allAttendanceRecords.filter(
      record => record.meetingId === meeting.id && record.attended
    );
    const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;
    return {
      meetingId: meeting.id,
      meetingDisplay: formatMeetingDisplay(meeting.date, meeting.time, meeting.name, isDuplicateDate),
      attendedCount: attendedRecords.length,
      expectedCount: meeting.attendeeUids?.length || 0,
    };
  });

  const captionDateRangeText = formatDateRangeText(filterStartDate, filterEndDate);

  return (
    <Card className="mb-6 shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <BarChart3 className="mr-2 h-5 w-5" />
          Resumen de Asistencia para: {seriesName}
        </CardTitle>
        <CardDescription>
          Total de asistentes presentes por cada instancia de reunión.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
                {captionDateRangeText && (
                    <TableCaption className="text-left pb-2 mt-0 pt-0">
                        <div className="flex items-center text-xs text-muted-foreground">
                            <CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/80" />
                            {captionDateRangeText}
                        </div>
                    </TableCaption>
                )}
            <TableHeader>
                <TableRow>
                <TableHead className="min-w-[200px]">Reunión (Instancia)</TableHead>
                <TableHead className="text-right">Asistentes Presentes</TableHead>
                <TableHead className="text-right">Esperados</TableHead>
                <TableHead className="text-right">% Asistencia</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summaryData.map(item => (
                <TableRow key={item.meetingId}>
                    <TableCell className="font-medium">{item.meetingDisplay}</TableCell>
                    <TableCell className="text-right">{item.attendedCount}</TableCell>
                    <TableCell className="text-right">{item.expectedCount}</TableCell>
                    <TableCell className="text-right">
                        {item.expectedCount > 0 
                        ? `${((item.attendedCount / item.expectedCount) * 100).toFixed(0)}%`
                        : 'N/A'}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
        {summaryData.length === 0 && (
             <p className="text-sm text-muted-foreground text-center py-4">
                No hay datos de asistencia para resumir para las instancias visibles.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
