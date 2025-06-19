
"use client";

import type { Meeting, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid, eachDayOfInterval, startOfDay } from 'date-fns';
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

interface OverallMonthlyAttendanceChartProps {
  meetingsLastMonth: Meeting[];
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
  meetingsLastMonth,
  allAttendanceRecords,
}: OverallMonthlyAttendanceChartProps) {
  if (!meetingsLastMonth || meetingsLastMonth.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No hay datos de reuniones del último mes para mostrar.</p>
      </div>
    );
  }

  const firstMeetingDate = parseISO(meetingsLastMonth.reduce((earliest, m) => 
    parseISO(m.date) < parseISO(earliest.date) ? m : earliest
  ).date);
  const lastMeetingDate = parseISO(meetingsLastMonth.reduce((latest, m) => 
    parseISO(m.date) > parseISO(latest.date) ? m : latest
  ).date);
  
  let chartData: DailyAttendanceDataPoint[] = [];

  if (isValid(firstMeetingDate) && isValid(lastMeetingDate) && firstMeetingDate <= lastMeetingDate) {
    const dateInterval = eachDayOfInterval({
      start: startOfDay(firstMeetingDate),
      end: startOfDay(lastMeetingDate),
    });

    chartData = dateInterval.map(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const meetingsOnThisDay = meetingsLastMonth.filter(m => m.date === formattedDay);
      let dailyAttendedCount = 0;

      meetingsOnThisDay.forEach(meeting => {
        dailyAttendedCount += allAttendanceRecords.filter(
          r => r.meetingId === meeting.id && r.attended
        ).length;
      });
      
      return {
        date: formattedDay,
        displayDate: format(day, 'd MMM', { locale: es }),
        attendedCount: dailyAttendedCount,
      };
    });
  }


  if (chartData.length === 0) {
     return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No hay datos de asistencia procesados para mostrar.</p>
      </div>
    );
  }

  return (
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
          interval="preserveStartEnd" // Show more ticks if space allows
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
  );
}
