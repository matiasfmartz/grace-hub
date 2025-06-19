
"use client";

import type { Meeting, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid, startOfMonth } from 'date-fns';
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
import { useMemo } from 'react';

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

  const chartData = useMemo(() => {
    if (!gdiMeetings || gdiMeetings.length === 0) {
      return [];
    }

    const monthlyAggregation: Record<string, { attended: number; meetings: number }> = {};

    gdiMeetings.forEach(meeting => {
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
  }, [gdiMeetings, allAttendanceRecords]);


  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No hay datos de asistencia a GDIs para mostrar.</p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 40 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="monthDisplay"
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
  );
}
