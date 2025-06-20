
"use client";

import type { Meeting, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay as dateFnsEndOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart as RechartsLineChart,
  Line,
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
import React, { useMemo, useState } from 'react'; // Added React and useState
import { DatePicker } from '@/components/ui/date-picker'; // Added DatePicker
import { UsersRound, CalendarRange } from 'lucide-react'; // Added CalendarRange

interface GdiOverallAttendanceChartProps {
  gdiMeetings: Meeting[];
  allAttendanceRecords: AttendanceRecord[];
}

interface MonthlyGdiAttendanceDataPoint {
  monthValue: string; // YYYY-MM
  monthDisplay: string; // Formatted for X-axis (e.g., "Ene 2023")
  attendedCount: number;
  totalMeetings: number;
}

const chartConfig = {
  attendedCount: {
    label: "Asistentes a GDIs",
    color: "hsl(var(--accent))", // Using accent color for GDI chart
  },
} satisfies ChartConfig;

export default function GdiOverallAttendanceChart({
  gdiMeetings,
  allAttendanceRecords,
}: GdiOverallAttendanceChartProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(() => endOfMonth(new Date()));

  const meetingsForPeriod = useMemo(() => {
    if (!gdiMeetings) return [];
    return gdiMeetings.filter(meeting => {
      const meetingDateObj = parseISO(meeting.date);
      if (!isValid(meetingDateObj)) return false;

      const isAfterOrOnStartDate = startDate ? meetingDateObj >= startOfDay(startDate) : true;
      const isBeforeOrOnEndDate = endDate ? meetingDateObj <= dateFnsEndOfDay(endDate) : true;
      
      return isAfterOrOnStartDate && isBeforeOrOnEndDate;
    });
  }, [gdiMeetings, startDate, endDate]);

  const chartData = useMemo(() => {
    if (!meetingsForPeriod || meetingsForPeriod.length === 0) {
      return [];
    }

    const monthlyAggregation: Record<string, { attended: number; meetings: number }> = {};

    meetingsForPeriod.forEach(meeting => {
      const meetingDateObj = parseISO(meeting.date);
      if (!isValid(meetingDateObj)) return;
      const yearMonth = format(startOfMonth(meetingDateObj), 'yyyy-MM');

      if (!monthlyAggregation[yearMonth]) {
        monthlyAggregation[yearMonth] = { attended: 0, meetings: 0 };
      }
      monthlyAggregation[yearMonth].meetings += 1;

      const attendanceForThisMeeting = allAttendanceRecords.filter(
        r => r.meetingId === meeting.id && r.attended
      ).length;
      monthlyAggregation[yearMonth].attended += attendanceForThisMeeting;
    });

    return Object.entries(monthlyAggregation)
      .map(([yearMonth, counts]) => ({
        monthValue: yearMonth,
        monthDisplay: format(parseISO(`${yearMonth}-01`), 'MMM yyyy', { locale: es }),
        attendedCount: counts.attended,
        totalMeetings: counts.meetings,
      }))
      .sort((a, b) => a.monthValue.localeCompare(b.monthValue));
  }, [meetingsForPeriod, allAttendanceRecords]);

  const cardDescription = useMemo(() => {
    if (startDate && endDate) {
      return `Tendencia de asistencia a GDIs del ${format(startDate, "dd MMM yyyy", { locale: es })} al ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
    } else if (startDate) {
      return `Tendencia de asistencia a GDIs desde el ${format(startDate, "dd MMM yyyy", { locale: es })}.`;
    } else if (endDate) {
      return `Tendencia de asistencia a GDIs hasta el ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
    }
    return "Tendencia general de asistencia a reuniones de GDI.";
  }, [startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UsersRound className="mr-2 h-5 w-5 text-primary" />
          Asistencia a GDIs (Tendencia Mensual)
        </CardTitle>
         <CardDescription className="flex items-center text-xs pt-1">
            <CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/70"/>
            {cardDescription}
        </CardDescription>
        <div className="pt-3">
            <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor="gdiTrendStartDateFilter" className="text-xs font-medium text-muted-foreground">Fecha Inicio</label>
                    <DatePicker date={startDate} setDate={setStartDate} placeholder="Desde" />
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor="gdiTrendEndDateFilter" className="text-xs font-medium text-muted-foreground">Fecha Fin</label>
                    <DatePicker date={endDate} setDate={setEndDate} placeholder="Hasta" />
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="monthDisplay"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-40}
                textAnchor="end"
                height={70}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                tick={{ fontSize: 10 }}
                label={{ value: 'Total Asistentes/Mes', angle: -90, position: 'insideLeft', offset: 10, style: {fontSize: '10px', fill: 'hsl(var(--muted-foreground))'} }}
              />
              <Tooltip
                cursor={true}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlyGdiAttendanceDataPoint;
                    return (
                      <ChartTooltipContent
                        className="w-[200px]"
                        label={data.monthDisplay}
                        payload={[{
                            name: "Total Asistentes en GDIs",
                            value: `${data.attendedCount} (en ${data.totalMeetings} reun.)`,
                            color: "hsl(var(--accent))"
                        }]}
                        indicator="line"
                      />
                    );
                  }
                  return null;
                }}
              />
              <Line
                dataKey="attendedCount"
                type="monotone"
                stroke="var(--color-attendedCount)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-attendedCount)",
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
                name="Asistentes a GDIs"
              />
            </RechartsLineChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No hay datos de asistencia a GDIs para el período seleccionado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
