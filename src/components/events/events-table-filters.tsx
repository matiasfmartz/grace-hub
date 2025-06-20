
"use client";

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ShieldCheck, Activity, Users as UsersIcon, X } from 'lucide-react';
import type { Member } from '@/lib/types'; // For Member['status'] type

interface FilterOption {
  value: string;
  label: string;
}

interface EventsTableFiltersProps {
  roleFilterOptions: FilterOption[];
  statusFilterOptions: FilterOption[];
  gdiFilterOptions: FilterOption[];
  areaFilterOptions: FilterOption[];
  currentRoleFilters: string[];
  currentStatusFilters: Member['status'][];
  currentGdiFilters: string[];
  currentAreaFilters: string[];
}

export default function EventsTableFilters({
  roleFilterOptions,
  statusFilterOptions,
  gdiFilterOptions,
  areaFilterOptions,
  currentRoleFilters,
  currentStatusFilters,
  currentGdiFilters,
  currentAreaFilters,
}: EventsTableFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateTableFiltersURL = (newFilters: {
    tmr?: string[];
    tms?: string[];
    tmg?: string[];
    tma?: string[];
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    newFilters.tmr && newFilters.tmr.length > 0 ? params.set('tmr', newFilters.tmr.join(',')) : params.delete('tmr');
    newFilters.tms && newFilters.tms.length > 0 ? params.set('tms', newFilters.tms.join(',')) : params.delete('tms');
    newFilters.tmg && newFilters.tmg.length > 0 ? params.set('tmg', newFilters.tmg.join(',')) : params.delete('tmg');
    newFilters.tma && newFilters.tma.length > 0 ? params.set('tma', newFilters.tma.join(',')) : params.delete('tma');
    params.set('mPage', '1'); // Reset member page
    return `${pathname}?${params.toString()}`;
  };

  const handleRoleFilterChange = (checked: boolean, roleValue: string) => {
    const newRoles = checked
      ? [...currentRoleFilters, roleValue]
      : currentRoleFilters.filter(r => r !== roleValue);
    router.push(updateTableFiltersURL({ tmr: newRoles, tms: currentStatusFilters, tmg: currentGdiFilters, tma: currentAreaFilters }));
  };

  const handleStatusFilterChange = (checked: boolean, statusValue: string) => {
    const newStatuses = checked
      ? [...currentStatusFilters, statusValue as Member['status']]
      : currentStatusFilters.filter(s => s !== statusValue);
    router.push(updateTableFiltersURL({ tmr: currentRoleFilters, tms: newStatuses, tmg: currentGdiFilters, tma: currentAreaFilters }));
  };

  const handleGdiFilterChange = (checked: boolean, gdiValue: string) => {
    const newGdis = checked
      ? [...currentGdiFilters, gdiValue]
      : currentGdiFilters.filter(g => g !== gdiValue);
    router.push(updateTableFiltersURL({ tmr: currentRoleFilters, tms: currentStatusFilters, tmg: newGdis, tma: currentAreaFilters }));
  };

  const handleAreaFilterChange = (checked: boolean, areaValue: string) => {
    const newAreas = checked
      ? [...currentAreaFilters, areaValue]
      : currentAreaFilters.filter(a => a !== areaValue);
    router.push(updateTableFiltersURL({ tmr: currentRoleFilters, tms: currentStatusFilters, tmg: currentGdiFilters, tma: newAreas }));
  };
  
  const clearAllTableFilters = () => {
    router.push(updateTableFiltersURL({ tmr: [], tms: [], tmg: [], tma: [] }));
  };

  const hasActiveFilters = currentRoleFilters.length > 0 || currentStatusFilters.length > 0 || currentGdiFilters.length > 0 || currentAreaFilters.length > 0;

  return (
    <div className="my-4 p-3 border rounded-lg bg-card shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start text-xs w-full">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Rol ({currentRoleFilters.length > 0 ? currentRoleFilters.length : 'Todos'})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filtrar por Rol</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {roleFilterOptions.map(opt => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={currentRoleFilters.includes(opt.value)}
                onCheckedChange={(checked) => handleRoleFilterChange(Boolean(checked), opt.value)}
              >{opt.label}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start text-xs w-full">
              <Activity className="mr-1.5 h-3.5 w-3.5" /> Estado ({currentStatusFilters.length > 0 ? currentStatusFilters.length : 'Todos'})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusFilterOptions.map(opt => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={currentStatusFilters.includes(opt.value as Member['status'])}
                onCheckedChange={(checked) => handleStatusFilterChange(Boolean(checked), opt.value)}
              >{opt.label}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start text-xs w-full">
              <UsersIcon className="mr-1.5 h-3.5 w-3.5" /> GDI ({currentGdiFilters.length > 0 ? currentGdiFilters.length : 'Todos'})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            <DropdownMenuLabel>Filtrar por GDI</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {gdiFilterOptions.map(opt => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={currentGdiFilters.includes(opt.value)}
                onCheckedChange={(checked) => handleGdiFilterChange(Boolean(checked), opt.value)}
              >{opt.label}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start text-xs w-full">
              <Activity className="mr-1.5 h-3.5 w-3.5" /> Área ({currentAreaFilters.length > 0 ? currentAreaFilters.length : 'Todas'})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            <DropdownMenuLabel>Filtrar por Área Ministerial</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {areaFilterOptions.map(opt => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={currentAreaFilters.includes(opt.value)}
                onCheckedChange={(checked) => handleAreaFilterChange(Boolean(checked), opt.value)}
              >{opt.label}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasActiveFilters && (
        <Button
          variant="link"
          size="sm"
          className="mt-2 px-0 h-auto text-xs text-destructive hover:text-destructive/80"
          onClick={clearAllTableFilters}
        >
          <X className="mr-1 h-3 w-3" /> Limpiar filtros de miembros
        </Button>
      )}
    </div>
  );
}
