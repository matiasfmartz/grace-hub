
"use client";

import React, { useState, useMemo } from 'react';
import type { Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { BarChart3, CalendarRange, Filter } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MemberAttendanceChartProps {
  memberId: string;
  memberName: string;
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
}

interface ChartDataPoint {
  meetingDisplay: string; // e.g., "Serie Name (15 Jun)"
  attended: number; // 1 for attended, 0 for not attended/no record for an expected meeting
  meetingDate: Date; // For sorting
}

const chartConfig = {
  attended: {
    label: "Asistió",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const formatMeetingDisplayForChart = (meetingName: string, dateString: string): string => {
  try {
    const parsedDate = parseISO(dateString);
    const datePart = isValid(parsedDate) ? format(parsedDate, "d MMM yy", { locale: es }) : dateString;
    // Truncate meeting name if too long for X-axis display
    const shortName = meetingName.length > 20 ? `${meetingName.substring(0, 18)}...` : meetingName;
    return `${shortName} (${datePart})`;
  } catch (error) {
    return `${meetingName} (${dateString})`;
  }
};

export default function MemberAttendanceChart({
  memberId,
  memberName,
  allMeetings,
  allMeetingSeries,
  allAttendanceRecords,
}: MemberAttendanceChartProps) {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');

  const chartData = useMemo(() => {
    const memberExpectedMeetings = allMeetings.filter(meeting =>
      meeting.attendeeUids && meeting.attendeeUids.includes(memberId)
    );

    const filteredBySeries = selectedSeriesId === 'all'
      ? memberExpectedMeetings
      : memberExpectedMeetings.filter(meeting => meeting.seriesId === selectedSeriesId);

    const sortedMeetings = filteredBySeries.sort((a, b) => 
      parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );

    return sortedMeetings.map(meeting => {
      const attendanceRecord = allAttendanceRecords.find(
        record => record.meetingId === meeting.id && record.memberId === memberId
      );
      const seriesName = allMeetingSeries.find(s => s.id === meeting.seriesId)?.name || 'Serie desc.';
      return {
        meetingDisplay: formatMeetingDisplayForChart(meeting.name, meeting.date),
        attended: attendanceRecord?.attended ? 1 : 0,
        meetingDate: parseISO(meeting.date), 
      };
    });
  }, [memberId, allMeetings, allMeetingSeries, allAttendanceRecords, selectedSeriesId]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="font-headline text-xl text-primary flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Progresión de Asistencia: {memberName}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground pt-1">
                    Visualice la asistencia a reuniones donde se esperaba su participación.
                </CardDescription>
            </div>
            <div className="w-full sm:w-auto min-w-[200px]">
                <Label htmlFor="seriesFilterChart" className="text-xs font-medium">Filtrar por Serie de Reunión:</Label>
                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
                    <SelectTrigger id="seriesFilterChart" className="mt-1">
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
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 60 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="meetingDisplay"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-40} 
                textAnchor="end"
                height={80} 
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                dataKey="attended"
                tickFormatter={(value) => (value === 1 ? 'Asistió' : 'No Asistió')}
                domain={[0, 1]}
                ticks={[0, 1]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                cursor={true}
                content={<ChartTooltipContent 
                            indicator="line" 
                            formatter={(value, name, props) => {
                                const label = props.payload.attended === 1 ? "Asistió" : "No Asistió / Sin Registro";
                                return [label, "Estado"];
                            }}
                         />}
              />
              <Line
                dataKey="attended"
                type="step" // Changed from "monotone" to "step"
                stroke="var(--color-attended)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-attended)",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
                name="Asistencia"
              />
            </RechartsLineChart>
          </ChartContainer>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <CalendarRange className="mx-auto h-12 w-12 mb-4" />
            <p>No hay datos de asistencia para mostrar para {memberName}
            {selectedSeriesId !== 'all' ? ` en la serie seleccionada` : ''}.</p>
            <p className="text-xs mt-1">
                Esto puede significar que no se esperaba su asistencia a ninguna reunión (según filtros),
                o no hay reuniones en la serie/periodo seleccionado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
