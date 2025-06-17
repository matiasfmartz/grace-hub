
"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface DateRangeFilterProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function DateRangeFilter({ initialStartDate, initialEndDate }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate && isValid(parseISO(initialStartDate)) ? parseISO(initialStartDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDate && isValid(parseISO(initialEndDate)) ? parseISO(initialEndDate) : undefined
  );

  useEffect(() => {
    setStartDate(initialStartDate && isValid(parseISO(initialStartDate)) ? parseISO(initialStartDate) : undefined);
    setEndDate(initialEndDate && isValid(parseISO(initialEndDate)) ? parseISO(initialEndDate) : undefined);
  }, [initialStartDate, initialEndDate]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (startDate) {
      params.set('startDate', format(startDate, 'yyyy-MM-dd'));
    } else {
      params.delete('startDate');
    }
    if (endDate) {
      params.set('endDate', format(endDate, 'yyyy-MM-dd'));
    } else {
      params.delete('endDate');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('startDate');
    params.delete('endDate');
    setStartDate(undefined);
    setEndDate(undefined);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="startDate">Fecha de Inicio</Label>
          <DatePicker date={startDate} setDate={setStartDate} placeholder="Desde" />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="endDate">Fecha de Fin</Label>
          <DatePicker date={endDate} setDate={setEndDate} placeholder="Hasta" />
        </div>
      </div>
      <div className="flex gap-2 mt-4 sm:mt-0">
        <Button onClick={handleApplyFilters} disabled={!startDate || !endDate}>
          Aplicar Filtro
        </Button>
        <Button onClick={handleClearFilters} variant="outline" disabled={!initialStartDate && !initialEndDate && !startDate && !endDate}>
          <X className="mr-2 h-4 w-4" /> Limpiar
        </Button>
      </div>
    </div>
  );
}
