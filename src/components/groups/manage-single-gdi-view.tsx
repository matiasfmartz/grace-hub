
"use client";

import { useState, useTransition, useEffect, useMemo } from 'react';
import type { GDI, Member } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Users, UserCheck, UserPlus, UserMinus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogClose } from '@/components/ui/dialog';

interface ManageSingleGdiViewProps {
  gdi: GDI;
  allMembers: Member[];
  activeMembers: Member[];
  allGdis: GDI[];
  updateGdiAction: (
    gdiIdOrNewData: string | (Partial<Omit<GDI, 'id'>> & { name: string; guideId: string }),
    updatedData?: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
  ) => Promise<{ success: boolean; message: string; updatedGdi?: GDI; newGdi?: GDI }>;
  onSuccess?: () => void;
  isAdding?: boolean;
}

export default function ManageSingleGdiView({
  gdi: initialGdi,
  allMembers,
  activeMembers,
  allGdis,
  updateGdiAction,
  onSuccess,
  isAdding = false,
}: ManageSingleGdiViewProps) {
  const [editableGdi, setEditableGdi] = useState<GDI>(initialGdi);
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
  const [selectedAvailableMembers, setSelectedAvailableMembers] = useState<string[]>([]);
  const [selectedAssignedMembers, setSelectedAssignedMembers] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setEditableGdi(initialGdi);
    setSelectedAvailableMembers([]);
    setSelectedAssignedMembers([]);
    setAddMemberSearchTerm('');
  }, [initialGdi]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableGdi(prev => ({ ...prev, [name]: value }));
  };

  const handleGuideChange = (newGuideId: string) => {
    setEditableGdi(prev => {
      const updatedMemberIds = (prev.memberIds || []).filter(id => id !== newGuideId);
      return { ...prev, guideId: newGuideId, memberIds: updatedMemberIds };
    });
  };

  const handleAvailableMemberSelection = (memberId: string, isChecked: boolean) => {
    setSelectedAvailableMembers(prev =>
      isChecked ? [...prev, memberId] : prev.filter(id => id !== memberId)
    );
  };

  const handleAssignedMemberSelection = (memberId: string, isChecked: boolean) => {
    setSelectedAssignedMembers(prev =>
      isChecked ? [...prev, memberId] : prev.filter(id => id !== memberId)
    );
  };

  const handleAddSelectedMembersToGdi = () => {
    if (selectedAvailableMembers.length === 0) return;
    setEditableGdi(prevGdi => {
      const newFullMemberList = Array.from(new Set([...(prevGdi.memberIds || []), ...selectedAvailableMembers]));
      const finalMemberIds = newFullMemberList.filter(id => id !== prevGdi.guideId);
      return { ...prevGdi, memberIds: finalMemberIds };
    });
    setSelectedAvailableMembers([]);
  };

  const handleRemoveSelectedMembersFromGdi = () => {
    if (selectedAssignedMembers.length === 0) return;
    setEditableGdi(prevGdi => ({
      ...prevGdi,
      memberIds: (prevGdi.memberIds || []).filter(id => !selectedAssignedMembers.includes(id) && id !== prevGdi.guideId)
    }));
    setSelectedAssignedMembers([]);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const finalMemberIds = (editableGdi.memberIds || []).filter(id => id !== editableGdi.guideId);
      const dataToSend = {
        name: editableGdi.name,
        guideId: editableGdi.guideId,
        memberIds: finalMemberIds,
      };

      let result;
      if (isAdding) {
        result = await updateGdiAction(dataToSend);
      } else {
        result = await updateGdiAction(initialGdi.id, dataToSend);
      }

      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        if (result.updatedGdi) setEditableGdi(result.updatedGdi);
        setSelectedAvailableMembers([]);
        setSelectedAssignedMembers([]);
        if (onSuccess) onSuccess();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const guideDetails = useMemo(() => {
    return allMembers.find(m => m.id === editableGdi.guideId);
  }, [editableGdi.guideId, allMembers]);

  const availableMembersForAssignment = useMemo(() => {
    // For GDI members, use allMembers as source, status doesn't matter for assignment.
    return allMembers.filter(member => {
      if (member.id === editableGdi.guideId) return false; // Cannot be the guide
      if ((editableGdi.memberIds || []).includes(member.id)) return false; // Not already in this GDI

      // A member cannot be assigned to a GDI if they are already guiding another GDI.
      const isGuideOfAnotherGdi = allGdis.some(g => g.guideId === member.id && g.id !== initialGdi.id);
      if (isGuideOfAnotherGdi) return false;

      // A member cannot be assigned to a GDI if they are already a member of another GDI
      // (unless it's the GDI being edited and they are already a member of it).
      if (member.assignedGDIId && member.assignedGDIId !== "" && member.assignedGDIId !== initialGdi.id) return false;

      return (`${member.firstName} ${member.lastName}`.toLowerCase().includes(addMemberSearchTerm.toLowerCase()) ||
              member.email.toLowerCase().includes(addMemberSearchTerm.toLowerCase()));
    });
  }, [allMembers, editableGdi.guideId, editableGdi.memberIds, addMemberSearchTerm, allGdis, initialGdi.id]);

  const currentlyAssignedDisplayMembers = useMemo(() => {
    return (editableGdi.memberIds || [])
      .filter(id => id !== editableGdi.guideId)
      .map(id => allMembers.find(m => m.id === id))
      .filter(Boolean) as Member[];
  }, [editableGdi.memberIds, editableGdi.guideId, allMembers]);

  return (
    <>
      <CardContent className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-0 pt-4">
          <div className="lg:col-span-2 space-y-6">
              <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />Guía del GDI</h3>
                  <Label htmlFor="guideIdSelect">Seleccionar Guía (miembros activos)</Label>
                  <Select onValueChange={handleGuideChange} value={editableGdi.guideId} disabled={isPending}>
                      <SelectTrigger className="mt-1" id="guideIdSelect">
                          <SelectValue placeholder="Seleccionar nuevo guía" />
                      </SelectTrigger>
                      <SelectContent>
                          {activeMembers.map((member) => ( // Guide selection uses activeMembers
                          <SelectItem
                              key={member.id}
                              value={member.id}
                              disabled={allGdis.some(g => g.guideId === member.id && (isAdding || g.id !== initialGdi.id))}
                          >
                              {member.firstName} {member.lastName} ({member.email})
                              {allGdis.some(g => g.guideId === member.id && (isAdding || g.id !== initialGdi.id)) && " (Guía de otro GDI)"}
                          </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                   {editableGdi.guideId && !activeMembers.find(m=>m.id === editableGdi.guideId) && (
                      <p className="text-xs text-destructive mt-1">El guía actual no está activo o no se encuentra. Por favor, seleccione un guía activo.</p>
                  )}
              </div>

              <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3">Nombre del GDI</h3>
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" value={editableGdi.name} onChange={handleInputChange} disabled={isPending} className="mt-1" />
              </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
               <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><UserPlus className="mr-2 h-5 w-5 text-muted-foreground" />Agregar Miembros al GDI</h3>
                  <Input
                      type="search"
                      placeholder="Buscar miembros (todos los estados)..."
                      value={addMemberSearchTerm}
                      onChange={(e) => setAddMemberSearchTerm(e.target.value)}
                      className="mb-3"
                      disabled={isPending}
                  />
                  <ScrollArea className="h-48 w-full rounded-md border p-2">
                      {availableMembersForAssignment.length > 0 ? availableMembersForAssignment.map((member) => (
                      <div key={`available-${member.id}`} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                          <Checkbox
                              id={`add-member-${member.id}`}
                              checked={selectedAvailableMembers.includes(member.id)}
                              disabled={isPending}
                              onCheckedChange={(checked) => handleAvailableMemberSelection(member.id, Boolean(checked))}
                          />
                          <Label htmlFor={`add-member-${member.id}`} className="font-normal text-sm cursor-pointer flex-grow">
                              {member.firstName} {member.lastName} ({member.status})
                               {member.assignedGDIId && member.assignedGDIId !== initialGdi.id ? " (En otro GDI)" : ""}
                               {allGdis.some(g => g.guideId === member.id && g.id !== initialGdi.id) ? " (Guía de otro GDI)" : ""}
                          </Label>
                      </div>
                      )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                          {addMemberSearchTerm ? "No hay miembros que coincidan." : "No hay miembros disponibles (verifique que no estén ya en otro GDI o sean guías de otro GDI)."}
                      </p>
                      )}
                  </ScrollArea>
                  <Button
                      onClick={handleAddSelectedMembersToGdi}
                      disabled={isPending || selectedAvailableMembers.length === 0}
                      className="w-full mt-3"
                      variant="outline"
                  >
                      <UserPlus className="mr-2 h-4 w-4" /> Agregar Seleccionados al GDI ({selectedAvailableMembers.length})
                  </Button>
              </div>

              <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" />Miembros Actualmente Asignados</h3>
                   <p className="text-sm text-muted-foreground mb-1">
                      Guía: {guideDetails ? `${guideDetails.firstName} ${guideDetails.lastName}` : 'Ninguno seleccionado'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                      Total de miembros (excluyendo guía): {currentlyAssignedDisplayMembers.length}
                  </p>
                  <ScrollArea className="h-48 w-full rounded-md border p-2">
                      {currentlyAssignedDisplayMembers.map((member) => (
                          <div key={`assigned-${member.id}`} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                              <Checkbox
                                  id={`remove-member-${member.id}`}
                                  checked={selectedAssignedMembers.includes(member.id)}
                                  disabled={isPending}
                                  onCheckedChange={(checked) => handleAssignedMemberSelection(member.id, Boolean(checked))}
                              />
                              <Label htmlFor={`remove-member-${member.id}`} className="font-normal text-sm cursor-pointer flex-grow">
                                  {member.firstName} {member.lastName} ({member.status})
                              </Label>
                          </div>
                      ))}
                      {currentlyAssignedDisplayMembers.length === 0 && (
                           <p className="text-sm text-muted-foreground text-center py-4">Ningún miembro adicional asignado.</p>
                      )}
                  </ScrollArea>
                  <Button
                      onClick={handleRemoveSelectedMembersFromGdi}
                      disabled={isPending || selectedAssignedMembers.length === 0}
                      className="w-full mt-3"
                      variant="destructive"
                  >
                     <UserMinus className="mr-2 h-4 w-4" /> Quitar Seleccionados del GDI ({selectedAssignedMembers.length})
                  </Button>
              </div>
          </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-4 border-t pt-6 mt-6">
        <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
                Cancelar
            </Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={isPending || !editableGdi.guideId || !editableGdi.name.trim()}>
          {isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          {isPending ? (isAdding ? 'Creando...' : 'Guardando...') : (isAdding ? 'Crear GDI' : 'Guardar Cambios')}
        </Button>
      </CardFooter>
    </>
  );
}
