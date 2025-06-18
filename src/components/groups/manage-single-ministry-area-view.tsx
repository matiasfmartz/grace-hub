
"use client";

import { useState, useTransition, useEffect, useMemo } from 'react';
import type { MinistryArea, Member } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
// useRouter is not needed if navigation is handled by parent/dialog
import { Loader2, Save, Users, UserCheck, Edit3, Search, UserPlus, UserMinus, Badge } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogClose } from '@/components/ui/dialog';


interface ManageSingleMinistryAreaViewProps {
  ministryArea: MinistryArea;
  allMembers: Member[];
  activeMembers: Member[];
  updateMinistryAreaAction: (
    areaId: string,
    updatedData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description'>>
  ) => Promise<{ success: boolean; message: string; updatedArea?: MinistryArea }>;
  onSuccess?: () => void; // To close dialog
  // onCancel?: () => void;
}

export default function ManageSingleMinistryAreaView({
  ministryArea: initialMinistryArea,
  allMembers,
  activeMembers,
  updateMinistryAreaAction,
  onSuccess,
  // onCancel
}: ManageSingleMinistryAreaViewProps) {
  const [editableArea, setEditableArea] = useState<MinistryArea>(initialMinistryArea);
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
  const [selectedAvailableMembers, setSelectedAvailableMembers] = useState<string[]>([]);
  const [selectedAssignedMembers, setSelectedAssignedMembers] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setEditableArea(initialMinistryArea);
    setSelectedAvailableMembers([]);
    setSelectedAssignedMembers([]);
  }, [initialMinistryArea]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableArea(prev => ({ ...prev, [name]: value }));
  };

  const handleLeaderChange = (leaderId: string) => {
    setEditableArea(prev => {
      const newMemberIds = (prev.memberIds || []).filter(id => id !== leaderId);
      return { ...prev, leaderId, memberIds: newMemberIds };
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

  const handleAddSelectedMembersToArea = () => {
    if (selectedAvailableMembers.length === 0) return;
    setEditableArea(prevArea => ({
      ...prevArea,
      memberIds: Array.from(new Set([...(prevArea.memberIds || []), ...selectedAvailableMembers]))
                       .filter(id => id !== prevArea.leaderId)
    }));
    setSelectedAvailableMembers([]); 
  };

  const handleRemoveSelectedMembersFromArea = () => {
    if (selectedAssignedMembers.length === 0) return;
    if (selectedAssignedMembers.includes(editableArea.leaderId)) {
      toast({ title: "Acción Denegada", description: "No se puede quitar al Líder del Área usando este método. Cambie primero el líder.", variant: "destructive" });
      setSelectedAssignedMembers(prev => prev.filter(id => id !== editableArea.leaderId));
      return;
    }
    setEditableArea(prevArea => ({
      ...prevArea,
      memberIds: (prevArea.memberIds || []).filter(id => !selectedAssignedMembers.includes(id))
    }));
    setSelectedAssignedMembers([]); 
  };


  const handleSubmit = () => {
    startTransition(async () => {
      const { id, ...dataToUpdate } = editableArea;

      const finalDataToUpdate = {
        name: dataToUpdate.name,
        description: dataToUpdate.description,
        leaderId: dataToUpdate.leaderId,
        memberIds: (dataToUpdate.memberIds || []).filter(mId => mId !== dataToUpdate.leaderId),
      };

      const result = await updateMinistryAreaAction(initialMinistryArea.id, finalDataToUpdate);
      if (result.success && result.updatedArea) {
        toast({ title: "Éxito", description: "Área Ministerial actualizada correctamente." });
        setEditableArea(result.updatedArea);
        setSelectedAvailableMembers([]); 
        setSelectedAssignedMembers([]); 
        if (onSuccess) onSuccess(); // Close dialog on success
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const leaderDetails = useMemo(() => {
    return allMembers.find(m => m.id === editableArea.leaderId);
  }, [editableArea.leaderId, allMembers]);

  const availableMembersForAssignment = useMemo(() => {
    return activeMembers.filter(member =>
      member.id !== editableArea.leaderId &&
      !(editableArea.memberIds || []).includes(member.id) &&
      (`${member.firstName} ${member.lastName}`.toLowerCase().includes(addMemberSearchTerm.toLowerCase()) ||
       member.email.toLowerCase().includes(addMemberSearchTerm.toLowerCase()))
    );
  }, [activeMembers, editableArea.leaderId, editableArea.memberIds, addMemberSearchTerm]);

  const currentlyAssignedDisplayMembers = useMemo(() => {
    return (editableArea.memberIds || []).map(id => allMembers.find(m => m.id === id)).filter(Boolean) as Member[];
  }, [editableArea.memberIds, allMembers]);


  return (
    <>
      <CardContent className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-0 pt-4">
          <div className="lg:col-span-2 space-y-6">
              <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />Líder del Área</h3>
                  <Label htmlFor="leaderIdSelect">Seleccionar Líder</Label>
                  <Select onValueChange={handleLeaderChange} value={editableArea.leaderId} disabled={isPending}>
                      <SelectTrigger className="mt-1" id="leaderIdSelect">
                          <SelectValue placeholder="Seleccionar nuevo líder" />
                      </SelectTrigger>
                      <SelectContent>
                          {activeMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.email})
                          </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">Detalles del Área</h3>
                  <div className="space-y-4">
                      <div>
                          <Label htmlFor="name">Nombre del Área</Label>
                          <Input id="name" name="name" value={editableArea.name} onChange={handleInputChange} disabled={isPending} className="mt-1" />
                      </div>
                      <div>
                          <Label htmlFor="description">Descripción</Label>
                          <Textarea id="description" name="description" value={editableArea.description} onChange={handleInputChange} rows={3} disabled={isPending} className="mt-1" />
                      </div>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
               <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><UserPlus className="mr-2 h-5 w-5 text-muted-foreground" />Agregar Miembros</h3>
                  <Input
                      type="search"
                      placeholder="Buscar miembros activos para agregar..."
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
                              {member.firstName} {member.lastName}
                          </Label>
                      </div>
                      )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                          {addMemberSearchTerm ? "No hay miembros que coincidan." : "Todos los miembros activos disponibles ya están asignados o seleccionados como líder."}
                      </p>
                      )}
                  </ScrollArea>
                  <Button 
                      onClick={handleAddSelectedMembersToArea} 
                      disabled={isPending || selectedAvailableMembers.length === 0}
                      className="w-full mt-3"
                      variant="outline"
                  >
                      <UserPlus className="mr-2 h-4 w-4" /> Agregar Seleccionados al Área ({selectedAvailableMembers.length})
                  </Button>
              </div>
              
              <div className="p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" />Miembros Actualmente Asignados</h3>
                   <p className="text-sm text-muted-foreground mb-3">
                      Total de miembros en el área (incluyendo líder): {
                          new Set([editableArea.leaderId, ...(editableArea.memberIds || [])].filter(Boolean)).size
                      }
                  </p>
                  <ScrollArea className="h-48 w-full rounded-md border p-2">
                      {leaderDetails && (
                           <div className="flex items-center justify-between p-2 rounded-md bg-primary/10">
                              <span className="font-medium text-sm text-primary">{leaderDetails.firstName} {leaderDetails.lastName}</span>
                              <Badge variant="default" className="text-xs">Líder</Badge>
                          </div>
                      )}
                      {currentlyAssignedDisplayMembers.map((member) => (
                          member.id !== editableArea.leaderId && ( 
                              <div key={`assigned-${member.id}`} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                                  <Checkbox
                                      id={`remove-member-${member.id}`}
                                      checked={selectedAssignedMembers.includes(member.id)}
                                      disabled={isPending}
                                      onCheckedChange={(checked) => handleAssignedMemberSelection(member.id, Boolean(checked))}
                                  />
                                  <Label htmlFor={`remove-member-${member.id}`} className="font-normal text-sm cursor-pointer flex-grow">
                                      {member.firstName} {member.lastName}
                                  </Label>
                              </div>
                          )
                      ))}
                      {(!leaderDetails && currentlyAssignedDisplayMembers.length === 0) && (
                           <p className="text-sm text-muted-foreground text-center py-4">No hay miembros asignados (excluyendo líder).</p>
                      )}
                       {(leaderDetails && currentlyAssignedDisplayMembers.length === 0) && (
                           <p className="text-sm text-muted-foreground text-center py-4 mt-2">No hay miembros adicionales asignados.</p>
                      )}
                  </ScrollArea>
                  <Button 
                      onClick={handleRemoveSelectedMembersFromArea} 
                      disabled={isPending || selectedAssignedMembers.length === 0}
                      className="w-full mt-3"
                      variant="destructive"
                  >
                     <UserMinus className="mr-2 h-4 w-4" /> Quitar Seleccionados del Área ({selectedAssignedMembers.length})
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
        <Button onClick={handleSubmit} disabled={isPending || !editableArea.leaderId}>
          {isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} 
          {isPending ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </CardFooter>
    </>
  );
}
