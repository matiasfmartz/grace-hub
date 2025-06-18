
"use client";

import { useState, useMemo, useCallback, useTransition } from 'react';
import type { Member, GDI, MinistryArea, AddMemberFormValues, MemberWriteData, MemberRoleType, Meeting, MeetingSeries, AttendanceRecord } from '@/lib/types';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpNarrowWide, ArrowDownNarrowWide, Info, UserPlus, ListPlus, Loader2, ChevronLeft, ChevronRight, ShieldCheck, Filter, Check, X, ChevronDown } from 'lucide-react';
import MemberDetailsDialog from './member-details-dialog';
import AddMemberForm from './add-member-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

interface MembersListViewProps {
  initialMembers: Member[];
  allMembersForDropdowns: Member[];
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  allMeetings: Meeting[];
  allMeetingSeries: MeetingSeries[];
  allAttendanceRecords: AttendanceRecord[];
  addSingleMemberAction: (newMemberData: MemberWriteData) => Promise<{ success: boolean; message: string; newMember?: Member }>;
  updateMemberAction: (memberData: Member) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  currentSearchTerm?: string;
  currentStatusFilters?: string[];
  currentRoleFilters?: string[];
  currentGuideIdFilters?: string[];
}

type SortKey = Exclude<keyof Member, 'email' | 'assignedGDIId' | 'assignedAreaIds' | 'avatarUrl' | 'attendsLifeSchool' | 'attendsBibleInstitute' | 'fromAnotherChurch' | 'baptismDate' | 'roles'> | 'fullName';
type SortOrder = 'asc' | 'desc';

const roleDisplayMap: Record<MemberRoleType, string> = {
  Leader: "Líder",
  Worker: "Obrero",
  GeneralAttendee: "Asistente General",
};
const roleFilterOptions: { value: MemberRoleType; label: string }[] = Object.entries(roleDisplayMap)
    .map(([value, label]) => ({ value: value as MemberRoleType, label }));

const statusDisplayMap: Record<Member['status'], string> = {
  Active: "Activo",
  Inactive: "Inactivo",
  New: "Nuevo"
};
const statusFilterOptions: { value: Member['status']; label: string }[] = Object.entries(statusDisplayMap)
    .map(([value, label]) => ({ value: value as Member['status'], label }));


export default function MembersListView({
  initialMembers,
  allMembersForDropdowns,
  allGDIs,
  allMinistryAreas,
  allMeetings,
  allMeetingSeries,
  allAttendanceRecords,
  addSingleMemberAction,
  updateMemberAction,
  currentPage,
  totalPages,
  pageSize,
  currentSearchTerm = '',
  currentStatusFilters = [],
  currentRoleFilters = [],
  currentGuideIdFilters = []
}: MembersListViewProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchInput, setSearchInput] = useState(currentSearchTerm);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(currentStatusFilters || []);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(currentRoleFilters || []);
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>(currentGuideIdFilters || []);

  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isProcessingMember, startMemberTransition] = useTransition();
  const { toast } = useToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParamsHook = useSearchParams();


  const gdiGuides = useMemo(() => {
    const guideIds = new Set(allGDIs.map(gdi => gdi.guideId).filter(Boolean));
    return allMembersForDropdowns
        .filter(member => guideIds.has(member.id))
        .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [allGDIs, allMembersForDropdowns]);

  const getGdiGuideName = useCallback((member: Member): string => {
    if (!member.assignedGDIId) return "No asignado";
    const gdi = allGDIs.find(g => g.id === member.assignedGDIId);
    if (!gdi) return "GDI no encontrado";
    const guide = allMembersForDropdowns.find(m => m.id === gdi.guideId);
    return guide ? `${guide.firstName} ${guide.lastName}` : "Guía no encontrado";
  }, [allGDIs, allMembersForDropdowns]);


  const toggleFilterItem = (
    itemValue: string,
    currentSelectedArray: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const newArray = currentSelectedArray.includes(itemValue)
      ? currentSelectedArray.filter(i => i !== itemValue)
      : [...currentSelectedArray, itemValue];
    setter(newArray);
  };

 const handleFilterOrSearch = () => {
    console.log("[MembersListView] handleFilterOrSearch - selectedStatuses:", selectedStatuses); // DEBUG LOG
    const params = new URLSearchParams(); 
    params.set('page', '1'); 

    const currentHookParams = new URLSearchParams(searchParamsHook.toString());
    if (currentHookParams.has('pageSize')) {
        params.set('pageSize', currentHookParams.get('pageSize')!);
    } else {
        params.set('pageSize', pageSize.toString());
    }

    if (searchInput.trim()) params.set('search', searchInput.trim());
    if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','));
    if (selectedRoles.length > 0) params.set('role', selectedRoles.join(','));
    if (selectedGuideIds.length > 0) params.set('guide', selectedGuideIds.join(','));

    router.push(`${pathname}?${params.toString()}`);
    router.refresh(); 
  };
  
  const handleClearAllFilters = () => {
    setSearchInput('');
    setSelectedStatuses([]);
    setSelectedRoles([]);
    setSelectedGuideIds([]);
    
    const params = new URLSearchParams();
    params.set('page', '1');
    const currentHookParams = new URLSearchParams(searchParamsHook.toString());
    if (currentHookParams.has('pageSize')) {
        params.set('pageSize', currentHookParams.get('pageSize')!);
    } else {
        params.set('pageSize', pageSize.toString());
    }
    router.push(`${pathname}?${params.toString()}`);
    router.refresh(); 
  };


  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const processedMembers = useMemo(() => {
    let membersToProcess = [...members]; 
    membersToProcess.sort((a, b) => {
      let valA, valB;
      if (sortKey === 'fullName') {
        valA = `${a.firstName} ${a.lastName}`;
        valB = `${b.firstName} ${b.lastName}`;
      } else {
        valA = a[sortKey as keyof Member];
        valB = b[sortKey as keyof Member];
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortKey === 'birthDate' || sortKey === 'churchJoinDate') {
          const dateA = valA ? new Date(valA as string).getTime() : 0;
          const dateB = valB ? new Date(valB as string).getTime() : 0;
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
    return membersToProcess;
  }, [members, sortKey, sortOrder]);

  const handleOpenDetailsDialog = (member: Member) => {
    setSelectedMember(member);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedMember(null);
  };

  const handleAddSingleMemberSubmit = async (data: AddMemberFormValues) => {
    const newMemberWriteData: MemberWriteData = {
      ...data,
      birthDate: data.birthDate ? data.birthDate.toISOString().split('T')[0] : undefined,
      churchJoinDate: data.churchJoinDate ? data.churchJoinDate.toISOString().split('T')[0] : undefined,
      roles: [],
    };

    startMemberTransition(async () => {
      const result = await addSingleMemberAction(newMemberWriteData);
      if (result.success && result.newMember) {
        toast({ title: "Éxito", description: result.message });
        setIsAddMemberDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Error al Agregar", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleMemberUpdated = (updatedMember: Member) => {
    setMembers(prevMembers =>
      prevMembers.map(m => m.id === updatedMember.id ? updatedMember : m)
    );
    router.refresh();
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownNarrowWide size={16} />;
  };

  const displayStatus = (status: Member['status']) => statusDisplayMap[status] || status;

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParamsHook.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageSizeChange = (newSize: string) => {
    const params = new URLSearchParams(searchParamsHook.toString());
    params.set('pageSize', newSize);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    router.refresh(); 
  };
  
  const hasActiveFilters = searchInput.trim() !== '' || selectedStatuses.length > 0 || selectedRoles.length > 0 || selectedGuideIds.length > 0;


  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <form onSubmit={(e) => { e.preventDefault(); handleFilterOrSearch(); }} className="relative lg:col-span-1">
            <Label htmlFor="memberSearchInput" className="text-sm font-medium">Buscar Miembro</Label>
            <Search className="absolute left-3 top-[calc(50%+7px)] transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="memberSearchInput"
              type="search"
              placeholder="Nombre, email, etc."
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-primary focus:border-primary mt-1"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="hidden" />
          </form>

          <div>
            <Label className="text-sm font-medium">Estado</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between mt-1">
                  <span>{selectedStatuses.length > 0 ? `Estado (${selectedStatuses.length})` : "Todos los Estados"}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusFilterOptions.map(opt => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={selectedStatuses.includes(opt.value)}
                    onCheckedChange={() => toggleFilterItem(opt.value, selectedStatuses, setSelectedStatuses)}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <Label className="text-sm font-medium">Rol</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between mt-1">
                  <span>{selectedRoles.length > 0 ? `Rol (${selectedRoles.length})` : "Todos los Roles"}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filtrar por Rol</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roleFilterOptions.map(opt => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={selectedRoles.includes(opt.value)}
                    onCheckedChange={() => toggleFilterItem(opt.value, selectedRoles, setSelectedRoles)}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <Label className="text-sm font-medium">Guía de GDI</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between mt-1">
                  <span>{selectedGuideIds.length > 0 ? `Guía (${selectedGuideIds.length})` : "Todos los Guías"}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-72 overflow-y-auto">
                <DropdownMenuLabel>Filtrar por Guía de GDI</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {gdiGuides.map(guide => (
                  <DropdownMenuCheckboxItem
                    key={guide.id}
                    checked={selectedGuideIds.includes(guide.id)}
                    onCheckedChange={() => toggleFilterItem(guide.id, selectedGuideIds, setSelectedGuideIds)}
                  >
                    {guide.firstName} {guide.lastName}
                  </DropdownMenuCheckboxItem>
                ))}
                {gdiGuides.length === 0 && <DropdownMenuItem disabled>No hay guías para mostrar</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleFilterOrSearch} className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" /> Aplicar Filtros y Búsqueda
            </Button>
             {hasActiveFilters && (
              <Button onClick={handleClearAllFilters} variant="outline" className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" /> Limpiar Filtros
              </Button>
            )}
            <Button onClick={() => setIsAddMemberDialogOpen(true)} disabled={isProcessingMember} className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" /> Agregar Nuevo Miembro
            </Button>
            <Button asChild variant="outline" disabled={isProcessingMember} className="w-full sm:w-auto">
              <Link href="/members/bulk-add">
                <ListPlus className="mr-2 h-4 w-4" /> Agregar Múltiples Miembros
              </Link>
            </Button>
        </div>
      </div>

      <div className="overflow-x-auto bg-card rounded-lg shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead onClick={() => handleSort('fullName')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Nombre Completo <SortIcon columnKey="fullName" />
                </div>
              </TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Guía GDI</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Estado <SortIcon columnKey="status" />
                </div>
              </TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedMembers.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Avatar>
                    <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait"/>
                    <AvatarFallback>{member.firstName.substring(0, 1)}{member.lastName.substring(0,1)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{member.firstName} {member.lastName}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>{getGdiGuideName(member)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.roles && member.roles.length > 0 ? (
                      member.roles.map(role => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {roleDisplayMap[role] || role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    member.status === 'Active' ? 'default' :
                    member.status === 'Inactive' ? 'secondary' :
                    'outline'
                  }
                  className={
                    member.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/50' :
                    member.status === 'Inactive' ? 'bg-red-500/20 text-red-700 border-red-500/50' :
                    'bg-yellow-500/20 text-yellow-700 border-yellow-500/50'
                  }
                  >
                    {displayStatus(member.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="icon" onClick={() => handleOpenDetailsDialog(member)} title="Ver Detalles" disabled={isProcessingMember}>
                    <Info className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {processedMembers.length === 0 && hasActiveFilters && (
        <p className="text-center text-muted-foreground mt-8">No se encontraron miembros con los filtros aplicados.</p>
      )}
      {initialMembers.length === 0 && !hasActiveFilters && (
         <p className="text-center text-muted-foreground mt-8">No hay miembros para mostrar.</p>
      )}

    {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground">Mostrar:</span>
                <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                >
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                        <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(createPageURL(currentPage - 1))}
              disabled={currentPage <= 1 || isProcessingMember}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(createPageURL(currentPage + 1))}
              disabled={currentPage >= totalPages || isProcessingMember}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedMember && (
        <MemberDetailsDialog
          member={selectedMember}
          allMembers={allMembersForDropdowns}
          allGDIs={allGDIs}
          allMinistryAreas={allMinistryAreas}
          allMeetings={allMeetings}
          allMeetingSeries={allMeetingSeries}
          allAttendanceRecords={allAttendanceRecords}
          isOpen={isDetailsDialogOpen}
          onClose={handleCloseDetailsDialog}
          onMemberUpdated={handleMemberUpdated}
          updateMemberAction={updateMemberAction}
        />
      )}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b sticky top-0 bg-background z-10">
            <DialogTitle>Agregar Nuevo Miembro</DialogTitle>
            <DialogDescription>
              Complete los detalles del nuevo miembro de la iglesia. Haga clic en "Agregar Miembro" cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto">
            <AddMemberForm
              onSubmitMember={handleAddSingleMemberSubmit}
              allGDIs={allGDIs}
              allMinistryAreas={allMinistryAreas}
              allMembers={allMembersForDropdowns}
              submitButtonText="Agregar Miembro"
              cancelButtonText="Cancelar"
              onDialogClose={() => setIsAddMemberDialogOpen(false)}
              isSubmitting={isProcessingMember}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

