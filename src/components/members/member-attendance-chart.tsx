
"use client";

import React, { useState, useMemo } from 'react';
import type { Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, CalendarRange, Users, CheckCircle2, XCircle, ListChecks, UserX, HelpCircle, Clock, PieChart } from 'lucide-react';
import { format, parseISO, isValid, isWithinInterval, startOfDay, endOfDay, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface MemberAttendanceSummaryProps {
  memberId: string;
  memberName: string;
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
}

type AttendanceStatus = 'attended' | 'absent' | 'pending_past' | 'pending_future';

interface FilteredMeetingInfo {
  meetingId: string;
  meetingName: string;
  meetingDate: string;
  seriesName: string;
  status: AttendanceStatus;
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

  const relevantSeriesForDropdown = useMemo(() => {
    const memberMeetings = allMeetings.filter(meeting => {
      const series = allMeetingSeries.find(s => s.id === meeting.seriesId);
      if (!series) return false;
      if (series.targetAttendeeGroups.includes('allMembers')) return true;
      return meeting.attendeeUids && meeting.attendeeUids.includes(memberId);
    });
    const uniqueSeriesIds = Array.from(new Set(memberMeetings.map(m => m.seriesId)));
    return allMeetingSeries.filter(series => uniqueSeriesIds.includes(series.id));
  }, [allMeetings, allMeetingSeries, memberId]);

  const processedMeetingData = useMemo(() => {
    // Start with meetings the member was expected to attend
    const memberExpectedMeetings = allMeetings.filter(meeting => {
      const series = allMeetingSeries.find(s => s.id === meeting.seriesId);
      if (!series) return false;
      if (series.targetAttendeeGroups.includes('allMembers')) return true;
      return meeting.attendeeUids && meeting.attendeeUids.includes(memberId);
    });

    let meetingsFilteredBySeries = selectedSeriesId === 'all'
      ? memberExpectedMeetings
      : memberExpectedMeetings.filter(meeting => meeting.seriesId === selectedSeriesId);

    let meetingsFilteredByDate = meetingsFilteredBySeries;
    if (startDate && endDate && startDate <= endDate) {
      meetingsFilteredByDate = meetingsFilteredBySeries.filter(meeting => {
        const meetingDateObj = parseISO(meeting.date);
        return isValid(meetingDateObj) &&
               isWithinInterval(meetingDateObj, { start: startOfDay(startDate), end: endOfDay(endDate) });
      });
    } else if (startDate) {
        meetingsFilteredByDate = meetingsFilteredBySeries.filter(meeting => {
            const meetingDateObj = parseISO(meeting.date);
            return isValid(meetingDateObj) && meetingDateObj >= startOfDay(startDate);
        });
    } else if (endDate) {
        meetingsFilteredByDate = meetingsFilteredBySeries.filter(meeting => {
            const meetingDateObj = parseISO(meeting.date);
            return isValid(meetingDateObj) && meetingDateObj <= endOfDay(endDate);
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
      const meetingDateObj = parseISO(meeting.date);
      let currentStatus: AttendanceStatus;

      if (isPast(meetingDateObj) && !isToday(meetingDateObj)) {
        if (attendanceRecord) {
          currentStatus = attendanceRecord.attended ? 'attended' : 'absent';
        } else {
          currentStatus = 'pending_past';
        }
      } else { 
        if (attendanceRecord) {
            currentStatus = attendanceRecord.attended ? 'attended' : 'absent';
        } else {
            currentStatus = 'pending_future';
        }
      }

      return {
        meetingId: meeting.id,
        meetingName: meeting.name,
        meetingDate: meeting.date,
        seriesName: series?.name || 'Serie Desconocida',
        status: currentStatus,
      };
    });

    const totalConvocations = detailedInfo.length;
    const totalAttendances = detailedInfo.filter(info => info.status === 'attended').length;
    const totalReportedAbsences = detailedInfo.filter(info => info.status === 'absent').length;

    const reportedMeetingsCount = totalAttendances + totalReportedAbsences;
    const reportedAbsenceRate = reportedMeetingsCount > 0 ? (totalReportedAbsences / reportedMeetingsCount) * 100 : 0;


    return {
      detailedInfo,
      totalConvocations,
      totalAttendances,
      totalReportedAbsences,
      reportedAbsenceRate,
    };

  }, [memberId, allMeetings, allMeetingSeries, allAttendanceRecords, selectedSeriesId, startDate, endDate]);


  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatDateDisplay = (dateString: string) => {
    try {
      const dateObj = parseISO(dateString);
      if (!isValid(dateObj)) return dateString;
      return format(dateObj, "dd/MM/yyyy", { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  const renderAttendanceStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'attended':
        return <TooltipTrigger asChild><CheckCircle2 className="h-5 w-5 text-green-600 inline-block" /></TooltipTrigger>;
      case 'absent':
        return <TooltipTrigger asChild><XCircle className="h-5 w-5 text-red-600 inline-block" /></TooltipTrigger>;
      case 'pending_past':
        return <TooltipTrigger asChild><HelpCircle className="h-5 w-5 text-muted-foreground inline-block" /></TooltipTrigger>;
      case 'pending_future':
        return <TooltipTrigger asChild><Clock className="h-5 w-5 text-primary inline-block" /></TooltipTrigger>;
      default:
        return null;
    }
  };

  const getAttendanceStatusTooltip = (status: AttendanceStatus) => {
     switch (status) {
      case 'attended':
        return "Asistió";
      case 'absent':
        return "Ausente (Reportado)";
      case 'pending_past':
        return "Pendiente (Pasada - No informado)";
      case 'pending_future':
        return "Pendiente (Futura/Hoy)";
      default:
        return "";
    }
  }


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
            <Label htmlFor="seriesFilterSummaryChart" className="text-xs font-medium">Filtrar por Serie:</Label>
            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
              <SelectTrigger id="seriesFilterSummaryChart" className="mt-1">
                <SelectValue placeholder="Seleccionar serie..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Series Relevantes</SelectItem>
                {relevantSeriesForDropdown.map(series => (
                  <SelectItem key={series.id} value={series.id}>
                    {series.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="startDateFilterSummaryChart" className="text-xs font-medium">Fecha de Inicio:</Label>
            <DatePicker date={startDate} setDate={setStartDate} placeholder="Desde" />
          </div>
          <div>
            <Label htmlFor="endDateFilterSummaryChart" className="text-xs font-medium">Fecha de Fin:</Label>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium flex items-center"><CalendarRange className="mr-2 h-4 w-4 text-primary" />Convocatorias (Filtradas)</CardDescription>
              <CardTitle className="text-3xl">{processedMeetingData.totalConvocations}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-green-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium flex items-center"><Users className="mr-2 h-4 w-4 text-green-600" />Asistencias (Reportadas)</CardDescription>
              <CardTitle className="text-3xl text-green-700">{processedMeetingData.totalAttendances}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-red-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium flex items-center"><UserX className="mr-2 h-4 w-4 text-red-600" />Inasistencias (Reportadas)</CardDescription>
              <CardTitle className="text-3xl text-red-700">{processedMeetingData.totalReportedAbsences}</CardTitle>
            </CardHeader>
          </Card>
           <Card className="bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium flex items-center"><PieChart className="mr-2 h-4 w-4 text-yellow-700" />Tasa Inasistencia (Reportadas)</CardDescription>
              <CardTitle className="text-3xl text-yellow-700">{processedMeetingData.reportedAbsenceRate.toFixed(0)}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <h3 className="text-md font-semibold mb-2">Detalle de Reuniones Convocadas:</h3>
        <ScrollArea className="h-[250px] border rounded-md">
          {processedMeetingData.detailedInfo.length > 0 ? (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reunión</TableHead>
                    <TableHead>Serie</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Estado Asistencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedMeetingData.detailedInfo.map(info => (
                    <TableRow key={info.meetingId}>
                      <TableCell className="font-medium">{info.meetingName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{info.seriesName}</TableCell>
                      <TableCell>{formatDateDisplay(info.meetingDate)}</TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          {renderAttendanceStatusIcon(info.status)}
                          <TooltipContent>
                            <p>{getAttendanceStatusTooltip(info.status)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
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
