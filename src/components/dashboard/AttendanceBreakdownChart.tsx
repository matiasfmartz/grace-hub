
"use client";

import type { Meeting, AttendanceRecord, Member, MeetingSeries } from '@/lib/types';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useMemo } from 'react';

interface AttendanceBreakdownChartProps {
  meetingsForPeriod: Meeting[];
  allAttendanceRecords: AttendanceRecord[];
  allMembers: Member[];
  allMeetingSeries: MeetingSeries[];
  selectedPeriodLabel?: string;
}

interface BreakdownDataPoint {
  name: string;
  Asistentes: number;
  Ausentes: number;
  Pendientes: number;
}

export default function AttendanceBreakdownChart({
  meetingsForPeriod = [],
  allAttendanceRecords = [],
  allMembers = [],
  allMeetingSeries = [],
  selectedPeriodLabel
}: AttendanceBreakdownChartProps) {

  const chartData = useMemo(() => {
    let totalAttended = 0;
    let totalExpected = 0;
    
    meetingsForPeriod.forEach(meeting => {
        const parentSeries = allMeetingSeries.find(s => s.id === meeting.seriesId);
        let expectedUidsForThisMeeting: string[] = [];

        if (parentSeries?.seriesType === 'general' && parentSeries.targetAttendeeGroups.includes('allMembers')) {
            expectedUidsForThisMeeting = allMembers.map(m => m.id);
        } else if (meeting.attendeeUids && meeting.attendeeUids.length > 0) {
            expectedUidsForThisMeeting = meeting.attendeeUids;
        }
        totalExpected += expectedUidsForThisMeeting.length;
    });
    
    const reportedAttended = allAttendanceRecords.filter(r => 
        meetingsForPeriod.some(m => m.id === r.meetingId) && r.attended
    ).length;

    const reportedAbsent = allAttendanceRecords.filter(r => 
        meetingsForPeriod.some(m => m.id === r.meetingId) && !r.attended
    ).length;
    
    const pending = totalExpected - (reportedAttended + reportedAbsent);

    const data: BreakdownDataPoint[] = [
      { name: selectedPeriodLabel || 'Periodo', Asistentes: reportedAttended, Ausentes: reportedAbsent, Pendientes: Math.max(0, pending) },
    ];
    return data;

  }, [meetingsForPeriod, allAttendanceRecords, allMembers, allMeetingSeries, selectedPeriodLabel]);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis type="category" dataKey="name" tick={{fontSize: 12}} interval={0} />
        <YAxis type="number" allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{fontSize: "12px"}}/>
        <Bar dataKey="Asistentes" stackId="a" fill="hsl(var(--primary))" barSize={35} />
        <Bar dataKey="Ausentes" stackId="a" fill="hsl(var(--destructive))" barSize={35} />
        <Bar dataKey="Pendientes" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} barSize={35} />
      </BarChart>
    </ResponsiveContainer>
  );
}

