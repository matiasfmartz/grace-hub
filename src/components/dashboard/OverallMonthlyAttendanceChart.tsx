
"use client";

import type { Meeting, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid, eachDayOfInterval, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
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
import React, { useMemo, useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
// import { Button } from '@/components/ui/button'; // Apply button removed for live update
import { CalendarRange, TrendingUp } from 'lucide-react';

interface OverallAttendanceChartProps {
  allMeetings: Meeting[];
  allAttendanceRecords: AttendanceRecord[];
}

interface DailyAttendanceDataPoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // Formatted for X-axis
  attendedCount: number;
}

const chartConfig = {
  attendedCount: {
    label: "Asistentes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function OverallMonthlyAttendanceChart({
  allMeetings,
  allAttendanceRecords,
}: OverallAttendanceChartProps) {

  const [startDate, setStartDate] = useState<Date | undefined>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(() => endOfMonth(new Date()));

  const meetingsForPeriod = useMemo(() => {
    if (!allMeetings) return [];
    return allMeetings.filter(meeting => {
      const meetingDateObj = parseISO(meeting.date);
      if (!isValid(meetingDateObj)) return false;

      const isAfterOrOnStartDate = startDate ? meetingDateObj >= startOfDay(startDate) : true;
      // For end date, we should include the entire day, so compare with end of selected day or start of next day.
      // For simplicity with startOfDay, we check if meetingDateObj is less than or equal to endDate.
      const isBeforeOrOnEndDate = endDate ? meetingDateObj <= startOfDay(endDate) : true;
      
      return isAfterOrOnStartDate && isBeforeOrOnEndDate;
    });
  }, [allMeetings, startDate, endDate]);


  const chartData = useMemo(() => {
    if (!meetingsForPeriod || meetingsForPeriod.length === 0) {
      return [];
    }

    // Determine the actual range from the filtered meetings
    const validMeetingsInPeriod = meetingsForPeriod.filter(m => isValid(parseISO(m.date)));
    if (validMeetingsInPeriod.length === 0) return [];

    const firstMeetingDate = parseISO(validMeetingsInPeriod.reduce((earliest, m) =>
      parseISO(m.date) < parseISO(earliest.date) ? m : earliest
    ).date);
    const lastMeetingDate = parseISO(validMeetingsInPeriod.reduce((latest, m) =>
      parseISO(m.date) > parseISO(latest.date) ? m : latest
    ).date);

    let data: DailyAttendanceDataPoint[] = [];

    if (isValid(firstMeetingDate) && isValid(lastMeetingDate) && firstMeetingDate <= lastMeetingDate) {
      const dateInterval = eachDayOfInterval({
        start: startOfDay(firstMeetingDate),
        end: startOfDay(lastMeetingDate),
      });

      data = dateInterval.map(day => {
        const formattedDay = format(day, 'yyyy-MM-dd');
        // Filter from meetingsForPeriod, not allMeetings
        const meetingsOnThisDay = meetingsForPeriod.filter(m => m.date === formattedDay);
        let dailyAttendedCount = 0;

        meetingsOnThisDay.forEach(meeting => {
          dailyAttendedCount += allAttendanceRecords.filter(
            r => r.meetingId === meeting.id && r.attended
          ).length;
        });

        return {
          date: formattedDay,
          displayDate: format(day, 'd MMM', { locale: es }), // Short format for X-axis
          attendedCount: dailyAttendedCount,
        };
      });
    }
    return data;
  }, [meetingsForPeriod, allAttendanceRecords]);

  const cardDescription = useMemo(() => {
    if (startDate && endDate) {
      return `Tendencia de asistencia general del ${format(startDate, "dd MMM yyyy", { locale: es })} al ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
    } else if (startDate) {
      return `Tendencia de asistencia general desde el ${format(startDate, "dd MMM yyyy", { locale: es })}.`;
    } else if (endDate) {
      return `Tendencia de asistencia general hasta el ${format(endDate, "dd MMM yyyy", { locale: es })}.`;
    }
    return "Tendencia de asistencia a todas las reuniones generales.";
  }, [startDate, endDate]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary" />
          Tendencia de Asistencia General
        </CardTitle>
        <CardDescription className="flex items-center text-xs pt-1">
            <CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/70"/>
            {cardDescription}
        </CardDescription>
        <div className="pt-3 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor="trendStartDateFilter" className="text-xs font-medium text-muted-foreground">Fecha Inicio</label>
                    <DatePicker date={startDate} setDate={setStartDate} placeholder="Desde" />
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor="trendEndDateFilter" className="text-xs font-medium text-muted-foreground">Fecha Fin</label>
                    <DatePicker date={endDate} setDate={setEndDate} placeholder="Hasta" />
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 40 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-30}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                cursor={true}
                content={<ChartTooltipContent indicator="line" />}
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
                name="Asistentes"
              />
            </RechartsLineChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No hay datos de asistencia para el período seleccionado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

