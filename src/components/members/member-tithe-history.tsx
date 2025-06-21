
"use client";

import React, { useMemo } from 'react';
import type { TitheRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { HandCoins, CalendarOff } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface MemberTitheHistoryProps {
  memberId: string;
  allTitheRecords: TitheRecord[];
  startDate?: Date;
  endDate?: Date;
}

export default function MemberTitheHistory({ memberId, allTitheRecords, startDate, endDate }: MemberTitheHistoryProps) {
  const tithedMonths = useMemo(() => {
    const memberRecords = allTitheRecords.filter(r => r.memberId === memberId);

    const dateFilteredRecords = memberRecords.filter(record => {
      if (!startDate || !endDate) return true; // No date filter, show all
      try {
        const recordDate = new Date(record.year, record.month - 1);
        if (!isValid(recordDate)) return false;
        return isWithinInterval(recordDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
      } catch {
        return false;
      }
    });

    return dateFilteredRecords
      .map(record => {
        try {
          return new Date(record.year, record.month - 1);
        } catch {
          return null;
        }
      })
      .filter((date): date is Date => date !== null && isValid(date))
      .sort((a, b) => b.getTime() - a.getTime()); // Most recent first
  }, [memberId, allTitheRecords, startDate, endDate]);

  return (
    <Card className="shadow-sm mt-6">
      <CardHeader>
        <CardTitle className="font-headline text-lg text-primary flex items-center">
          <HandCoins className="mr-2 h-5 w-5" />
          Historial de Diezmos
        </CardTitle>
        <CardDescription>
          Meses en los que se registró un diezmo para este miembro, dentro del rango de fechas filtrado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[150px] border rounded-md p-2">
          {tithedMonths.length > 0 ? (
            <ul className="space-y-1">
              {tithedMonths.map(date => (
                <li key={date.toISOString()} className="text-sm p-1 capitalize">
                  - {format(date, 'MMMM yyyy', { locale: es })}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CalendarOff className="h-8 w-8 mb-2" />
              <p>No se encontraron registros de diezmos para el período seleccionado.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
