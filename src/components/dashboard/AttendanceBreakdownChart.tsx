
"use client";

import type { Meeting, AttendanceRecord, Member, MeetingSeries } from '@/lib/types';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useMemo } from 'react';
import { getResolvedAttendees } from '@/services/attendanceService'; // Assuming this can be used client-side with pre-fetched data

interface AttendanceBreakdownChartProps {
  meetingsLastMonth: Meeting[];
  allAttendanceRecords: AttendanceRecord[];
  allMembers: Member[];
  allMeetingSeries: MeetingSeries[]; // Needed for getResolvedAttendees
}

interface BreakdownDataPoint {
  name: string;
  Asistentes: number;
  Ausentes: number;
  Pendientes: number;
}

export default function AttendanceBreakdownChart({
  meetingsLastMonth,
  allAttendanceRecords,
  allMembers,
  allMeetingSeries,
}: AttendanceBreakdownChartProps) {

  const chartData = useMemo(() => {
    let totalAttended = 0;
    let totalExpected = 0;
    let totalReported = 0; // Count of members for whom attendance was explicitly marked (attended or not)

    // This needs to be async or pre-resolved. For client component, we assume pre-resolution is hard
    // So, we'll iterate and sum based on available records.
    // For a more accurate "expected", we'd need to run getResolvedAttendees for each meeting,
    // which is too heavy for client-side here.
    // Simplified approach: Sum up actual attendance records.

    const memberMeetingAttendance: Record<string, Set<string>> = {}; // memberId -> Set<meetingId_attended>
    const memberMeetingAbsence: Record<string, Set<string>> = {};   // memberId -> Set<meetingId_absent>
    const memberMeetingExpected: Record<string, Set<string>> = {}; // memberId -> Set<meetingId_expected>


    meetingsLastMonth.forEach(meeting => {
        // This is an approximation of expected. A true "expected" would require getResolvedAttendees per meeting.
        // Using attendeeUids if available, otherwise all members (for "allMembers" general meetings)
        const parentSeries = allMeetingSeries.find(s => s.id === meeting.seriesId);
        let expectedForThisMeeting: string[] = meeting.attendeeUids || [];
        if (parentSeries?.seriesType === 'general' && parentSeries.targetAttendeeGroups.includes('allMembers')) {
             expectedForThisMeeting = allMembers.map(m => m.id);
        }
        
        expectedForThisMeeting.forEach(memberId => {
            if (!memberMeetingExpected[memberId]) memberMeetingExpected[memberId] = new Set();
            memberMeetingExpected[memberId].add(meeting.id);
        });

        const recordsForMeeting = allAttendanceRecords.filter(r => r.meetingId === meeting.id);
        recordsForMeeting.forEach(record => {
            totalReported++;
            if (record.attended) {
                totalAttended++;
                if (!memberMeetingAttendance[record.memberId]) memberMeetingAttendance[record.memberId] = new Set();
                memberMeetingAttendance[record.memberId].add(meeting.id);
            } else {
                if (!memberMeetingAbsence[record.memberId]) memberMeetingAbsence[record.memberId] = new Set();
                memberMeetingAbsence[record.memberId].add(meeting.id);
            }
        });
    });
    
    const uniqueExpectedMembers = new Set<string>();
    meetingsLastMonth.forEach(meeting => {
        const parentSeries = allMeetingSeries.find(s => s.id === meeting.seriesId);
        let expectedUids: string[] = meeting.attendeeUids || [];
         if (parentSeries?.seriesType === 'general' && parentSeries.targetAttendeeGroups.includes('allMembers')) {
             expectedUids = allMembers.map(m => m.id);
        }
        expectedUids.forEach(uid => uniqueExpectedMembers.add(uid));
        totalExpected += expectedUids.length;
    });


    const reportedAttended = allAttendanceRecords.filter(r => 
        meetingsLastMonth.some(m => m.id === r.meetingId) && r.attended
    ).length;

    const reportedAbsent = allAttendanceRecords.filter(r => 
        meetingsLastMonth.some(m => m.id === r.meetingId) && !r.attended
    ).length;
    
    // Total "slots" for attendance based on resolved attendees for each meeting.
    // This is computationally expensive if not pre-calculated.
    // For simplicity, we'll use `totalExpected` based on `attendeeUids` sum.
    // If `attendeeUids` is empty for general meetings, it assumes all members.

    const pending = totalExpected - (reportedAttended + reportedAbsent);


    const data: BreakdownDataPoint[] = [
      { name: 'Estado', Asistentes: reportedAttended, Ausentes: reportedAbsent, Pendientes: Math.max(0, pending) },
    ];
    return data;

  }, [meetingsLastMonth, allAttendanceRecords, allMembers, allMeetingSeries]);

  if (!meetingsLastMonth || meetingsLastMonth.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No hay datos de reuniones del último mes para mostrar.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip />
        <Legend />
        <Bar dataKey="Asistentes" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={35} />
        <Bar dataKey="Ausentes" stackId="a" fill="hsl(var(--destructive))" barSize={35} />
        <Bar dataKey="Pendientes" stackId="a" fill="hsl(var(--muted-foreground))" radius={[0, 0, 4, 4]} barSize={35} />
      </BarChart>
    </ResponsiveContainer>
  );
}
