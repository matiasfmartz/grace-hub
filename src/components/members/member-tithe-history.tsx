
"use client";

import React, { useMemo } from 'react';
import type { TitheRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { HandCoins, CalendarOff, CheckCircle2, XCircle, PieChart, Info } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, isValid, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface MemberTitheHistoryProps {
  memberId: string;
  allTitheRecords: TitheRecord[];
  startDate?: Date;
  endDate?: Date;
}

export default function MemberTitheHistory({ memberId, allTitheRecords, startDate, endDate }: MemberTitheHistoryProps) {
  
  const summaryStats = useMemo(() => {
    if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate) || startDate > endDate) {
        return null; // Don't show stats if no valid range
    }

    const totalMonthsInRange = eachMonthOfInterval({ start: startDate, end: endDate }).length;
    
    const tithedRecordsInDateRange = allTitheRecords.filter(record => {
      if (record.memberId !== memberId) return false;
      try {
        const recordDate = new Date(record.year, record.month - 1);
        if (!isValid(recordDate)) return false;
        return isWithinInterval(recordDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
      } catch {
        return false;
      }
    }).length;

    const tithedMonthsCount = tithedRecordsInDateRange;
    const untithedMonthsCount = totalMonthsInRange - tithedMonthsCount;
    const percentage = totalMonthsInRange > 0 ? (tithedMonthsCount / totalMonthsInRange) * 100 : 0;
    
    return {
        tithedMonthsCount,
        untithedMonthsCount,
        percentage,
    };
  }, [startDate, endDate, allTitheRecords, memberId]);

  const tithedMonths = useMemo(() => {
    const memberRecords = allTitheRecords.filter(r => r.memberId === memberId);

    const dateFilteredRecords = (startDate && endDate && isValid(startDate) && isValid(endDate) && startDate <= endDate)
      ? memberRecords.filter(record => {
          try {
            const recordDate = new Date(record.year, record.month - 1);
            return isValid(recordDate) && isWithinInterval(recordDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
          } catch {
            return false;
          }
        })
      : memberRecords;

    return dateFilteredRecords
      .map(record => new Date(record.year, record.month - 1))
      .filter((date): date is Date => isValid(date))
      .sort((a, b) => b.getTime() - a.getTime());
  }, [memberId, allTitheRecords, startDate, endDate]);

  return (
    <Card className="shadow-sm mt-6">
      <CardHeader>
        <CardTitle className="font-headline text-lg text-primary flex items-center">
          <HandCoins className="mr-2 h-5 w-5" />
          Historial de Diezmos
        </CardTitle>
        <CardDescription>
          Meses en los que se registró un diezmo para este miembro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summaryStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Card className="bg-green-500/5">
                  <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />Registrados (en rango)</CardDescription>
                      <CardTitle className="text-2xl text-green-700">{summaryStats.tithedMonthsCount}</CardTitle>
                  </CardHeader>
              </Card>
              <Card className="bg-red-500/5">
                  <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium flex items-center"><XCircle className="mr-2 h-4 w-4 text-red-600" />No Registrados (en rango)</CardDescription>
                      <CardTitle className="text-2xl text-red-700">{summaryStats.untithedMonthsCount}</CardTitle>
                  </CardHeader>
              </Card>
              <Card className="bg-blue-500/5">
                  <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium flex items-center"><PieChart className="mr-2 h-4 w-4 text-blue-600" />% Registro (en rango)</CardDescription>
                      <CardTitle className="text-2xl text-blue-700">{summaryStats.percentage.toFixed(0)}%</CardTitle>
                  </CardHeader>
              </Card>
          </div>
        ) : (
          <div className="flex items-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mb-4">
              <Info className="mr-2 h-4 w-4 shrink-0" />
              Seleccione un rango de fechas para ver el resumen estadístico de diezmos.
          </div>
        )}
        
        <h4 className="text-sm font-semibold mb-2">Meses con Diezmo Registrado (filtrados):</h4>
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
