
"use client";

import React, { useState, useMemo } from 'react';
import type { Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Filter, CalendarRange, LineChart as LineChartIcon, Check, X, HelpCircle, Clock } from 'lucide-react';
import { format, parseISO, isValid, isWithinInterval, startOfDay, endOfDay, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MemberAttendanceLineChartProps {
  memberId: string;
  memberName: string;
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
}

type AttendanceStatusForChart = 'attended' | 'absent' | 'pending_past' | 'pending_future';

interface ChartDataPoint {
  meetingDisplay: string; // For X-axis label
  date: Date; // For sorting
  attendanceValue: number | null; // 1 for attended, 0 for absent, null for pending
  statusTooltip: string;
}

const chartConfig = {
  attendanceValue: {
    label: "Estado Asistencia",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

// Moved function definition before its use in useMemo
const formatMeetingDisplayForChart = (dateString: string, timeString: string, name: string, isDuplicateDate: boolean): string => {
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
        return isDuplicateDate ? `${name.substring(0,10)}..(${dateString} ${timeString})` : `${name.substring(0,10)}..(${dateString})`;
    }
    const datePart = format(parsedDate, "d MMM yy", { locale: es });
    if (isDuplicateDate) {
      return `${name.substring(0,10)}..(${datePart} ${timeString})`;
    }
    return `${name.substring(0,10)}..(${datePart})`;
  } catch (error) {
    return isDuplicateDate ? `${name.substring(0,10)}..(${dateString} ${timeString})` : `${name.substring(0,10)}..(${dateString})`;
  }
};

export default function MemberAttendanceLineChart({
  memberId,
  memberName,
  allMeetings,
  allMeetingSeries,
  allAttendanceRecords,
}: MemberAttendanceLineChartProps) {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const chartData = useMemo(() => {
    // 1. Filter meetings relevant to the member
    let relevantMeetings = allMeetings.filter(meeting => {
      const series = allMeetingSeries.find(s => s.id === meeting.seriesId);
      if (!series) return false;
      if (series.targetAttendeeGroups.includes('allMembers')) return true;
      return meeting.attendeeUids && meeting.attendeeUids.includes(memberId);
    });

    // 2. Apply series filter
    if (selectedSeriesId !== 'all') {
      relevantMeetings = relevantMeetings.filter(meeting => meeting.seriesId === selectedSeriesId);
    }

    // 3. Apply date filter
    if (startDate || endDate) {
        relevantMeetings = relevantMeetings.filter(meeting => {
            const meetingDateObj = parseISO(meeting.date);
            if (!isValid(meetingDateObj)) return false;
            const isAfterStart = startDate ? meetingDateObj >= startOfDay(startDate) : true;
            const isBeforeEnd = endDate ? meetingDateObj <= endOfDay(endDate) : true;
            return isAfterStart && isBeforeEnd;
        });
    }
    
    // 4. Sort meetings by date ascending for correct line chart progression
    relevantMeetings.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    // 5. Map to ChartDataPoint structure
    return relevantMeetings.map(meeting => {
      const attendanceRecord = allAttendanceRecords.find(
        record => record.meetingId === meeting.id && record.memberId === memberId
      );
      const meetingDateObj = parseISO(meeting.date);
      let attendanceStatus: AttendanceStatusForChart;
      let attendanceValue: number | null;
      let statusTooltip: string;

      if (isPast(meetingDateObj) && !isToday(meetingDateObj)) {
        if (attendanceRecord) {
          attendanceStatus = attendanceRecord.attended ? 'attended' : 'absent';
          attendanceValue = attendanceRecord.attended ? 1 : 0;
          statusTooltip = attendanceRecord.attended ? "Asistió" : "Ausente";
        } else {
          attendanceStatus = 'pending_past';
          attendanceValue = null; // Gap in line for pending past
          statusTooltip = "Pendiente (Pasada)";
        }
      } else { // Meeting is today or in the future
        if (attendanceRecord) {
          attendanceStatus = attendanceRecord.attended ? 'attended' : 'absent';
          attendanceValue = attendanceRecord.attended ? 1 : 0;
          statusTooltip = attendanceRecord.attended ? "Asistió (Pre-marcado)" : "Ausente (Pre-marcado)";
        } else {
          attendanceStatus = 'pending_future';
          attendanceValue = null; // Gap in line for pending future
          statusTooltip = "Pendiente (Futura/Hoy)";
        }
      }
      
      const dateCounts = new Map<string, number>();
        relevantMeetings.forEach(m => {
            dateCounts.set(m.date, (dateCounts.get(m.date) || 0) + 1);
        });
      const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;


      return {
        meetingDisplay: formatMeetingDisplayForChart(meeting.date, meeting.time, meeting.name, isDuplicateDate),
        date: meetingDateObj,
        attendanceValue,
        statusTooltip,
      };
    });
  }, [memberId, allMeetings, allMeetingSeries, allAttendanceRecords, selectedSeriesId, startDate, endDate]);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const yAxisTickFormatter = (value: number) => {
    if (value === 1) return 'Sí';
    if (value === 0) return 'No';
    return '';
  };


  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline text-lg text-primary flex items-center">
          <LineChartIcon className="mr-2 h-5 w-5" />
          Progresión de Asistencia Individual
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground pt-1">
          Visualice la tendencia de asistencia de {memberName}.
        </CardDescription>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          <div>
            <Label htmlFor="seriesFilterChart" className="text-xs font-medium">Filtrar Serie:</Label>
            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
              <SelectTrigger id="seriesFilterChart" className="mt-1 h-9 text-xs">
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
            <Label htmlFor="startDateFilterChart" className="text-xs font-medium">Desde:</Label>
            <DatePicker date={startDate} setDate={setStartDate} placeholder="Fecha Inicio" />
          </div>
          <div>
            <Label htmlFor="endDateFilterChart" className="text-xs font-medium">Hasta:</Label>
            <DatePicker date={endDate} setDate={setEndDate} placeholder="Fecha Fin" />
          </div>
        </div>
        {(startDate || endDate) && (
            <Button onClick={clearDateFilters} variant="link" size="sm" className="px-0 text-xs h-auto mt-1 text-primary hover:text-primary/80">
                <Filter className="mr-1 h-3 w-3"/> Limpiar filtro de fechas
            </Button>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -15, bottom: 50 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="meetingDisplay"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-40}
                textAnchor="end"
                height={70} 
                interval={chartData.length > 10 ? Math.floor(chartData.length / 10) : 0} // Show fewer labels if many points
                tick={{ fontSize: 9 }}
              />
              <YAxis
                dataKey="attendanceValue"
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={yAxisTickFormatter}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                cursor={true}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartDataPoint;
                    return (
                      <ChartTooltipContent
                        className="w-[200px]"
                        label={data.meetingDisplay}
                        payload={[{ name: "Estado", value: data.statusTooltip, color: "hsl(var(--primary))" }]}
                        indicator="line"
                      />
                    );
                  }
                  return null;
                }}
              />
              <Line
                dataKey="attendanceValue"
                type="linear"
                stroke="var(--color-attendanceValue)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-attendanceValue)",
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
                name="Asistencia"
                connectNulls={false} // Create gaps for null values (pending)
              />
            </RechartsLineChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay datos de asistencia para mostrar el gráfico con los filtros actuales.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
