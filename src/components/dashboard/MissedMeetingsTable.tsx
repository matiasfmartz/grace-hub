
"use client";

import type { Meeting, Member, AttendanceRecord, MeetingSeries } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getResolvedAttendees } from '@/services/attendanceService'; // Careful with client-side usage
import { Button } from '@/components/ui/button';

interface MissedMeetingsTableProps {
  generalMeetingsSorted: Meeting[]; // Already sorted, most recent first
  allMembers: Member[];
  allAttendanceRecords: AttendanceRecord[];
  allMeetingSeries: MeetingSeries[];
}

interface AbsentMemberInfo {
  member: Member;
  missedMeetingName: string;
  missedMeetingDate: string;
}

export default function MissedMeetingsTable({
  generalMeetingsSorted,
  allMembers,
  allAttendanceRecords,
  allMeetingSeries,
}: MissedMeetingsTableProps) {
  const [numberOfMeetingsToShow, setNumberOfMeetingsToShow] = useState(1); // Show 1 by default

  const absentMembersData = useMemo(() => {
    const data: AbsentMemberInfo[] = [];
    if (generalMeetingsSorted.length === 0) return data;

    const meetingsToConsider = generalMeetingsSorted.slice(0, numberOfMeetingsToShow);

    meetingsToConsider.forEach(meeting => {
      // Simulate getResolvedAttendees client-side for this specific context
      // This should ideally be done server-side or with caution on client
      let expectedAttendeeIds: string[] = meeting.attendeeUids || [];
      const parentSeries = allMeetingSeries.find(s => s.id === meeting.seriesId);
      if (parentSeries?.seriesType === 'general' && parentSeries.targetAttendeeGroups.includes('allMembers')) {
          expectedAttendeeIds = allMembers.map(m => m.id);
      }

      const attendedMemberIdsInThisMeeting = new Set(
        allAttendanceRecords
          .filter(r => r.meetingId === meeting.id && r.attended)
          .map(r => r.memberId)
      );

      expectedAttendeeIds.forEach(memberId => {
        if (!attendedMemberIdsInThisMeeting.has(memberId)) {
          const member = allMembers.find(m => m.id === memberId);
          if (member) {
            // Avoid adding duplicate entries if member missed multiple displayed meetings
            if (!data.some(entry => entry.member.id === member.id && entry.missedMeetingName === meeting.name)) {
                 data.push({
                    member,
                    missedMeetingName: meeting.name,
                    missedMeetingDate: format(parseISO(meeting.date), 'dd MMM yyyy', { locale: es }),
                });
            }
          }
        }
      });
    });
    // Sort by member name then by date
    return data.sort((a, b) => {
      const nameA = `${a.member.firstName} ${a.member.lastName}`;
      const nameB = `${b.member.firstName} ${b.member.lastName}`;
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return parseISO(b.missedMeetingDate).getTime() - parseISO(a.missedMeetingDate).getTime();
    });
  }, [generalMeetingsSorted, allMembers, allAttendanceRecords, allMeetingSeries, numberOfMeetingsToShow]);

  const meetingOptions = [
    { value: 1, label: "Última Reunión General" },
    { value: 2, label: "Últimas 2 Reuniones Generales" },
    // { value: 5, label: "Últimas 5 Reuniones Generales" }, // Can be extended
  ];


  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Mostrar ausentes de:</span>
        {meetingOptions.map(opt => (
          <Button
            key={opt.value}
            variant={numberOfMeetingsToShow === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setNumberOfMeetingsToShow(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {generalMeetingsSorted.length === 0 && <p className="text-muted-foreground">No hay reuniones generales registradas.</p>}
      {generalMeetingsSorted.length > 0 && absentMembersData.length === 0 && <p className="text-muted-foreground">¡Excelente! Todos los miembros esperados asistieron a las reuniones generales seleccionadas.</p>}
      
      {absentMembersData.length > 0 && (
        <ScrollArea className="h-[300px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Miembro</TableHead>
                <TableHead>Reunión Ausente</TableHead>
                <TableHead>Fecha Reunión</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absentMembersData.map(({ member, missedMeetingName, missedMeetingDate }, index) => (
                <TableRow key={`${member.id}-${missedMeetingName}-${index}`}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait" />
                        <AvatarFallback>{member.firstName.charAt(0)}{member.lastName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{member.firstName} {member.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{missedMeetingName}</TableCell>
                  <TableCell>{missedMeetingDate}</TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'Active' ? 'default' : member.status === 'Inactive' ? 'destructive' : 'secondary'}>
                      {member.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
