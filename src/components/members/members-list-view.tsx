
"use client";

import { useState, useMemo, useCallback, useTransition } from 'react';
import type { Member, GDI, MinistryArea, AddMemberFormValues, MemberWriteData } from '@/lib/types';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpNarrowWide, ArrowDownNarrowWide, Info, UserPlus, ListPlus, Loader2 } from 'lucide-react';
import MemberDetailsDialog from './member-details-dialog';
import AddMemberForm from './add-member-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";


interface MembersListViewProps {
  initialMembers: Member[];
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  addSingleMemberAction: (newMemberData: MemberWriteData) => Promise<{ success: boolean; message: string; newMember?: Member }>;
  updateMemberAction: (memberData: Member) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
}

type SortKey = Exclude<keyof Member, 'email' | 'assignedGDIId' | 'assignedAreaIds' | 'avatarUrl' | 'attendsLifeSchool' | 'attendsBibleInstitute' | 'fromAnotherChurch' | 'baptismDate'> | 'fullName';
type SortOrder = 'asc' | 'desc';

export default function MembersListView({ 
  initialMembers, 
  allGDIs, 
  allMinistryAreas,
  addSingleMemberAction,
  updateMemberAction 
}: MembersListViewProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isProcessingMember, startMemberTransition] = useTransition();
  const { toast } = useToast();


  const getGdiGuideName = useCallback((member: Member): string => {
    if (!member.assignedGDIId) return "No asignado";
    const gdi = allGDIs.find(g => g.id === member.assignedGDIId);
    if (!gdi) return "GDI no encontrado";
    // Use allMembers (passed as prop, potentially from a broader DB context in future) for guide lookup
    const guide = initialMembers.find(m => m.id === gdi.guideId); 
    return guide ? `${guide.firstName} ${guide.lastName}` : "Guía no encontrado";
  }, [allGDIs, initialMembers]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedMembers = useMemo(() => {
    let membersToSort = [...members]; // Use current state of members for sorting/filtering
    if (searchTerm) {
      membersToSort = membersToSort.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getGdiGuideName(member).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    membersToSort.sort((a, b) => {
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
    return membersToSort;
  }, [members, searchTerm, sortKey, sortOrder, getGdiGuideName]);

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
    };

    startMemberTransition(async () => {
      const result = await addSingleMemberAction(newMemberWriteData);
      if (result.success && result.newMember) {
        setMembers(prev => [result.newMember!, ...prev]);
        toast({
          title: "Éxito",
          description: result.message,
        });
        setIsAddMemberDialogOpen(false);
      } else {
        toast({
          title: "Error al Agregar",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleMemberUpdated = (updatedMember: Member) => {
    setMembers(prevMembers => 
      prevMembers.map(m => m.id === updatedMember.id ? updatedMember : m)
    );
    // Details dialog will close itself after successful update
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownNarrowWide size={16} />;
  };

  const displayStatus = (status: Member['status']) => {
    switch (status) {
      case 'Active': return 'Activo';
      case 'Inactive': return 'Inactivo';
      case 'New': return 'Nuevo';
      default: return status;
    }
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, estado o guía GDI..."
            className="w-full md:w-1/2 lg:w-2/3 xl:w-1/3 pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-primary focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddMemberDialogOpen(true)} disabled={isProcessingMember}>
            <UserPlus className="mr-2 h-4 w-4" /> Agregar Nuevo Miembro
          </Button>
          <Button asChild variant="outline" disabled={isProcessingMember}>
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
              <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Estado <SortIcon columnKey="status" />
                </div>
              </TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => (
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
      {sortedMembers.length === 0 && (
        <p className="text-center text-muted-foreground mt-8">No se encontraron miembros.</p>
      )}
      {selectedMember && (
        <MemberDetailsDialog
          member={selectedMember}
          allMembers={members} // Pass current members list for GDI/Area lookups
          allGDIs={allGDIs}
          allMinistryAreas={allMinistryAreas}
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
              allMembers={initialMembers} // For dropdowns, use initial complete list
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
