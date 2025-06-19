
"use client";

import type { Member } from '@/lib/types';
import { PieChart as RechartsPieChart, Pie, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { useMemo } from 'react';

interface MemberRoleDistributionChartProps {
  allMembers: Member[];
}

interface RoleDataPoint {
  name: string;
  value: number;
}

const COLORS = {
  Líderes: "hsl(var(--chart-1))", // Example color
  Obreros: "hsl(var(--chart-2))", // Example color
  "Asistentes/Otros": "hsl(var(--chart-3))", // Example color
};

export default function MemberRoleDistributionChart({ allMembers }: MemberRoleDistributionChartProps) {
  const chartData = useMemo(() => {
    let leaderCount = 0;
    let workerCount = 0; // Workers who are NOT leaders
    let otherCount = 0;

    allMembers.forEach(member => {
      const roles = member.roles || [];
      if (roles.includes('Leader')) {
        leaderCount++;
      } else if (roles.includes('Worker')) {
        workerCount++;
      } else {
        otherCount++;
      }
    });
    
    // If a member is both leader and worker, they are counted as leader.
    // "Otros" includes GeneralAttendees and those with no roles explicitly, or those only with GeneralAttendee.
    // The logic above needs adjustment if a Leader is implicitly a Worker for this chart.
    // Assuming distinct counts:

    const distinctLeaderCount = allMembers.filter(m => (m.roles || []).includes('Leader')).length;
    const distinctWorkerNotLeaderCount = allMembers.filter(m => (m.roles || []).includes('Worker') && !(m.roles || []).includes('Leader')).length;
    const generalAndNoRoleCount = allMembers.length - distinctLeaderCount - distinctWorkerNotLeaderCount;


    const data: RoleDataPoint[] = [];
    if (distinctLeaderCount > 0) data.push({ name: 'Líderes', value: distinctLeaderCount });
    if (distinctWorkerNotLeaderCount > 0) data.push({ name: 'Obreros', value: distinctWorkerNotLeaderCount });
    if (generalAndNoRoleCount > 0) data.push({ name: 'Asistentes/Otros', value: generalAndNoRoleCount });
    
    return data;
  }, [allMembers]);

  if (chartData.length === 0 || allMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No hay datos de miembros para mostrar distribución.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#82ca9d'} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number, name: string) => [`${value} miembro(s)`, name]} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
