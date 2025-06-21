"use client";

import React, { useMemo } from 'react';
import type { TitheRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { HandCoins, CalendarOff, CheckCircle2, XCircle, PieChart, Info } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, isValid, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


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

  const monthlyStatuses = useMemo(() => {
    if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate) || startDate > endDate) {
        return [];
    }
    const allMonthsInRange = eachMonthOfInterval({ start: startDate, end: endDate });
    const memberTitheSet = new Set(
        allTitheRecords
            .filter(r => r.memberId === memberId)
            .map(r => `${r.year}-${r.month}`)
    );
    return allMonthsInRange.map(monthDate => {
        const year = monthDate.getFullYear();
        const monthNum = monthDate.getMonth() + 1;
        const monthKey = `${year}-${monthNum}`;
        return {
            date: monthDate,
            tithed: memberTitheSet.has(monthKey)
        };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort descending
  }, [startDate, endDate, allTitheRecords, memberId]);

  return (
    <Card className="shadow-sm mt-6">
      <CardHeader>
        <CardTitle className="font-headline text-lg text-primary flex items-center">
          <HandCoins className="mr-2 h-5 w-5" />
          Historial de Diezmos
        </CardTitle>
        <CardDescription>
          Resumen de diezmos para el miembro en el período seleccionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summaryStats ? (
          <>
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
            <h4 className="text-sm font-semibold mb-2">Detalle Mensual (en rango):</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              {monthlyStatuses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyStatuses.map(({ date, tithed }) => (
                      <TableRow key={date.toISOString()}>
                        <TableCell className="capitalize font-medium">{format(date, 'MMMM yyyy', { locale: es })}</TableCell>
                        <TableCell className="text-right">
                          {tithed ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-200">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Registrado
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-200">
                               <XCircle className="mr-1 h-3 w-3" />
                              No Registrado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <CalendarOff className="h-8 w-8 mb-2" />
                    <p>No hay meses para mostrar en el período seleccionado.</p>
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <Info className="mr-2 h-4 w-4 shrink-0" />
              Seleccione un rango de fechas para ver el historial detallado de diezmos.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
