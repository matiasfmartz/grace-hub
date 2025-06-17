
"use client";

import React, { useState, useMemo } from 'react';
import type { Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Filter, CalendarRange, LineChart as LineChartIcon } from 'lucide-react'; // Removed Check, X, HelpCircle, Clock
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
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

interface MonthlyChartDataPoint {
  monthValue: string; // YYYY-MM for sorting
  monthDisplay: string; // Formatted month for X-axis label (e.g., "Ene 2024")
  attendedCount: number;
}

const chartConfig = {
  attendedCount: {
    label: "Asistencias/Mes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

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
      // If series targets "allMembers", this meeting is relevant
      if (series.targetAttendeeGroups.includes('allMembers')) return true;
      // Otherwise, check if member's UID is in the specific meeting's attendeeUids
      return meeting.attendeeUids && meeting.attendeeUids.includes(memberId);
    });

    // 2. Apply series filter
    if (selectedSeriesId !== 'all') {
      relevantMeetings = relevantMeetings.filter(meeting => meeting.seriesId === selectedSeriesId);
    }

    // 3. Apply date filter to individual meetings
    if (startDate || endDate) {
        relevantMeetings = relevantMeetings.filter(meeting => {
            const meetingDateObj = parseISO(meeting.date);
            if (!isValid(meetingDateObj)) return false;
            const isAfterStart = startDate ? meetingDateObj >= startOfDay(startDate) : true;
            const isBeforeEnd = endDate ? meetingDateObj <= endOfDay(endDate) : true;
            return isAfterStart && isBeforeEnd;
        });
    }
    
    // 4. Group by Month and Count Attendances
    const monthlyAttendanceMap: Record<string, number> = {};

    relevantMeetings.forEach(meeting => {
      const meetingDateObj = parseISO(meeting.date);
      if (!isValid(meetingDateObj)) return;

      const yearMonth = format(meetingDateObj, 'yyyy-MM');
      
      const attendanceRecord = allAttendanceRecords.find(
        record => record.meetingId === meeting.id && record.memberId === memberId
      );

      if (attendanceRecord?.attended) {
        monthlyAttendanceMap[yearMonth] = (monthlyAttendanceMap[yearMonth] || 0) + 1;
      } else if (!(yearMonth in monthlyAttendanceMap)) {
        // Ensure month is present even if no attendance, if there were meetings
        monthlyAttendanceMap[yearMonth] = 0;
      }
    });

    // 5. Convert to ChartDataPoint structure
    const dataPoints: MonthlyChartDataPoint[] = Object.entries(monthlyAttendanceMap)
      .map(([yearMonth, count]) => ({
        monthValue: yearMonth,
        monthDisplay: format(parseISO(`${yearMonth}-01`), 'MMM yyyy', { locale: es }),
        attendedCount: count,
      }))
      .sort((a, b) => a.monthValue.localeCompare(b.monthValue)); // Sort chronologically

    return dataPoints;

  }, [memberId, allMeetings, allMeetingSeries, allAttendanceRecords, selectedSeriesId, startDate, endDate]);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline text-lg text-primary flex items-center">
          <LineChartIcon className="mr-2 h-5 w-5" />
          Tendencia Mensual de Asistencia
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground pt-1">
          Asistencias por mes para {memberName}.
        </CardDescription>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          <div>
            <Label htmlFor="seriesFilterMonthlyChart" className="text-xs font-medium">Filtrar Serie:</Label>
            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
              <SelectTrigger id="seriesFilterMonthlyChart" className="mt-1 h-9 text-xs">
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
            <Label htmlFor="startDateFilterMonthlyChart" className="text-xs font-medium">Desde:</Label>
            <DatePicker date={startDate} setDate={setStartDate} placeholder="Fecha Inicio" />
          </div>
          <div>
            <Label htmlFor="endDateFilterMonthlyChart" className="text-xs font-medium">Hasta:</Label>
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
                dataKey="monthDisplay"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-40}
                textAnchor="end"
                height={70} 
                interval={0} // Show all month labels if space allows
                tick={{ fontSize: 9 }}
              />
              <YAxis
                dataKey="attendedCount"
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                allowDecimals={false} // Counts are integers
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                cursor={true}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlyChartDataPoint;
                    return (
                      <ChartTooltipContent
                        className="w-[150px]"
                        label={data.monthDisplay}
                        payload={[{ name: "Asistencias", value: data.attendedCount.toString(), color: "hsl(var(--primary))" }]}
                        indicator="line"
                      />
                    );
                  }
                  return null;
                }}
              />
              <Line
                dataKey="attendedCount"
                type="linear" 
                stroke="var(--color-attendedCount)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-attendedCount)",
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
                name="Asistencias por Mes"
                connectNulls={true} // Connect line even if a month has 0 attendance
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
