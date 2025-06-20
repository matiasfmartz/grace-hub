
"use client";

import type { Meeting, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, CalendarRange, Users } from 'lucide-react';
import {
  Line,
  LineChart as RechartsLineChart, // Renamed to avoid conflict if any
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

interface AttendanceLineChartProps {
  meetingsForSeries: Meeting[];
  allAttendanceRecords: AttendanceRecord[];
  seriesName: string;
  filterStartDate?: string;
  filterEndDate?: string;
}

interface ChartDataPoint {
  meetingDisplay: string;
  attendedCount: number;
  expectedCount: number;
}

const formatMeetingDisplay = (dateString: string, timeString: string, name: string, isDuplicateDate: boolean): string => {
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
        return isDuplicateDate ? `${name.substring(0,15)}... (${dateString} ${timeString})` : `${name.substring(0,15)}... (${dateString})`;
    }
    const datePart = format(parsedDate, "d MMM yy", { locale: es });
    if (isDuplicateDate) {
      return `${name.substring(0,15)}... (${datePart} ${timeString})`;
    }
    return `${name.substring(0,15)}... (${datePart})`;
  } catch (error) {
    return isDuplicateDate ? `${name.substring(0,15)}... (${dateString} ${timeString})` : `${name.substring(0,15)}... (${dateString})`;
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
      return `Progresión de asistencia para instancias entre ${formattedStart} y ${formattedEnd}`;
    } catch (e) {
        return "Rango de fechas inválido";
    }
  }
  return `Progresión de asistencia para todas las instancias visibles de la serie.`;
};

const chartConfig = {
  attendedCount: {
    label: "Asistentes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function AttendanceLineChart({
  meetingsForSeries,
  allAttendanceRecords,
  seriesName,
  filterStartDate,
  filterEndDate,
}: AttendanceLineChartProps) {

  if (!meetingsForSeries || meetingsForSeries.length === 0) {
    return null;
  }

  const dateCounts = new Map<string, number>();
  meetingsForSeries.forEach(meeting => {
      dateCounts.set(meeting.date, (dateCounts.get(meeting.date) || 0) + 1);
  });

  // Sort meetings by date ascending for correct line chart progression
  const sortedMeetings = [...meetingsForSeries].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  const chartData: ChartDataPoint[] = sortedMeetings.map(meeting => {
    const attendedRecords = allAttendanceRecords.filter(
      record => record.meetingId === meeting.id && record.attended
    );
    const isDuplicateDate = (dateCounts.get(meeting.date) || 0) > 1;
    return {
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
          <BarChart3 className="mr-2 h-5 w-5" /> {/* Icon can be LineChart from lucide-react */}
          Progresión de Asistencia: {seriesName}
        </CardTitle>
        {captionDateRangeText && (
            <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
                <CalendarRange className="mr-1.5 h-3.5 w-3.5 text-primary/80" />
                {captionDateRangeText}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 40 }}> {/* Increased bottom margin for XAxis labels */}
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="meetingDisplay"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-30} // Angle labels to prevent overlap
                textAnchor="end"
                height={60} // Adjust height to accommodate angled labels
                interval={0} // Show all labels
                tick={{ fontSize: 10 }}
              />
              <YAxis
                dataKey="attendedCount"
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
                type="linear"
                stroke="var(--color-attendedCount)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-attendedCount)",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
                name="Asistentes"
              />
            </RechartsLineChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay suficientes datos de asistencia para mostrar el gráfico para las instancias visibles.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
