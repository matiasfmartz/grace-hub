
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, CalendarRange, Users, CheckCircle2, XCircle, Percent, ListChecks } from 'lucide-react';
import { format, parseISO, isValid, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface MemberAttendanceSummaryProps {
  memberId: string;
  memberName: string;
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
}

interface FilteredMeetingInfo {
  meetingId: string;
  meetingName: string;
  meetingDate: string;
  seriesName: string;
  attended: boolean;
}

export default function MemberAttendanceSummary({
  memberId,
  memberName,
  allMeetings,
  allMeetingSeries,
  allAttendanceRecords,
}: MemberAttendanceSummaryProps) {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const processedMeetingData = useMemo(() => {
    const memberExpectedMeetings = allMeetings.filter(meeting =>
      meeting.attendeeUids && meeting.attendeeUids.includes(memberId)
    );

    let meetingsFilteredBySeries = selectedSeriesId === 'all'
      ? memberExpectedMeetings
      : memberExpectedMeetings.filter(meeting => meeting.seriesId === selectedSeriesId);

    let meetingsFilteredByDate = meetingsFilteredBySeries;
    if (startDate && endDate && startDate <= endDate) {
      meetingsFilteredByDate = meetingsFilteredBySeries.filter(meeting => {
        const meetingDate = parseISO(meeting.date);
        return isValid(meetingDate) && 
               isWithinInterval(meetingDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
      });
    } else if (startDate) {
        meetingsFilteredByDate = meetingsFilteredBySeries.filter(meeting => {
            const meetingDate = parseISO(meeting.date);
            return isValid(meetingDate) && meetingDate >= startOfDay(startDate);
        });
    } else if (endDate) {
        meetingsFilteredByDate = meetingsFilteredBySeries.filter(meeting => {
            const meetingDate = parseISO(meeting.date);
            return isValid(meetingDate) && meetingDate <= endOfDay(endDate);
        });
    }
    
    const sortedMeetings = meetingsFilteredByDate.sort((a, b) => 
      parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );

    const detailedInfo: FilteredMeetingInfo[] = sortedMeetings.map(meeting => {
      const attendanceRecord = allAttendanceRecords.find(
        record => record.meetingId === meeting.id && record.memberId === memberId
      );
      const series = allMeetingSeries.find(s => s.id === meeting.seriesId);
      return {
        meetingId: meeting.id,
        meetingName: meeting.name,
        meetingDate: meeting.date,
        seriesName: series?.name || 'Serie Desconocida',
        attended: attendanceRecord?.attended || false,
      };
    });

    const totalConvocations = detailedInfo.length;
    const totalAttendances = detailedInfo.filter(info => info.attended).length;
    const attendanceRate = totalConvocations > 0 ? (totalAttendances / totalConvocations) * 100 : 0;

    return {
      detailedInfo,
      totalConvocations,
      totalAttendances,
      attendanceRate,
    };

  }, [memberId, allMeetings, allMeetingSeries, allAttendanceRecords, selectedSeriesId, startDate, endDate]);


  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  const formatDateDisplay = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <ListChecks className="mr-2 h-5 w-5" />
          Resumen de Asistencia: {memberName}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground pt-1">
          Filtre y vea el historial de participación del miembro.
        </CardDescription>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div>
            <Label htmlFor="seriesFilterSummary" className="text-xs font-medium">Filtrar por Serie:</Label>
            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
              <SelectTrigger id="seriesFilterSummary" className="mt-1">
                <SelectValue placeholder="Seleccionar serie..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Series</SelectItem>
                {allMeetingSeries.map(series => (
                  <SelectItem key={series.id} value={series.id}>
                    {series.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="startDateFilterSummary" className="text-xs font-medium">Fecha de Inicio:</Label>
            <DatePicker date={startDate} setDate={setStartDate} placeholder="Desde" />
          </div>
          <div>
            <Label htmlFor="endDateFilterSummary" className="text-xs font-medium">Fecha de Fin:</Label>
            <DatePicker date={endDate} setDate={setEndDate} placeholder="Hasta" />
          </div>
        </div>
        {(startDate || endDate) && (
            <Button onClick={clearDateFilters} variant="link" size="sm" className="px-0 text-xs h-auto mt-1">
                <Filter className="mr-1 h-3 w-3"/> Limpiar filtro de fechas
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium flex items-center"><CalendarRange className="mr-2 h-4 w-4 text-primary" />Convocatorias</CardDescription>
              <CardTitle className="text-3xl">{processedMeetingData.totalConvocations}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-green-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium flex items-center"><Users className="mr-2 h-4 w-4 text-green-600" />Asistencias</CardDescription>
              <CardTitle className="text-3xl text-green-700">{processedMeetingData.totalAttendances}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-accent/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium flex items-center"><Percent className="mr-2 h-4 w-4 text-amber-600" />Tasa de Asistencia</CardDescription>
              <CardTitle className="text-3xl text-amber-700">{processedMeetingData.attendanceRate.toFixed(0)}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <h3 className="text-md font-semibold mb-2">Detalle de Reuniones Convocadas:</h3>
        <ScrollArea className="h-[250px] border rounded-md">
          {processedMeetingData.detailedInfo.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reunión</TableHead>
                  <TableHead>Serie</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Asistió</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedMeetingData.detailedInfo.map(info => (
                  <TableRow key={info.meetingId}>
                    <TableCell className="font-medium">{info.meetingName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{info.seriesName}</TableCell>
                    <TableCell>{formatDateDisplay(info.meetingDate)}</TableCell>
                    <TableCell className="text-center">
                      {info.attended ? 
                        <CheckCircle2 className="h-5 w-5 text-green-600 inline-block" title="Asistió" /> : 
                        <XCircle className="h-5 w-5 text-red-600 inline-block" title="No Asistió / Sin Registro" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <CalendarRange className="mx-auto h-12 w-12 mb-4" />
              <p>No hay reuniones convocadas para {memberName} con los filtros actuales.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
