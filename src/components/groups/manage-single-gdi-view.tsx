
"use client";

import { useState, useTransition, useEffect, useMemo } from 'react';
import type { GDI, Member } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Users, UserCheck, ArrowLeft, Edit3, Search, UserPlus, UserMinus, Badge as UIBadge } from 'lucide-react'; // Renamed Badge to UIBadge
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManageSingleGdiViewProps {
  gdi: GDI;
  allMembers: Member[]; 
  activeMembers: Member[]; 
  allGdis: GDI[]; // All GDIs to check for existing guides/members
  updateGdiAction: (
    gdiId: string,
    updatedData: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
  ) => Promise<{ success: boolean; message: string; updatedGdi?: GDI }>;
}

export default function ManageSingleGdiView({
  gdi: initialGdi,
  allMembers,
  activeMembers,
  allGdis, // Receive all GDIs
  updateGdiAction,
}: ManageSingleGdiViewProps) {
  const [editableGdi, setEditableGdi] = useState<GDI>(initialGdi);
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
  const [selectedAvailableMembers, setSelectedAvailableMembers] = useState<string[]>([]);
  const [selectedAssignedMembers, setSelectedAssignedMembers] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setEditableGdi(initialGdi);
    setSelectedAvailableMembers([]);
    setSelectedAssignedMembers([]);
  }, [initialGdi]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableGdi(prev => ({ ...prev, [name]: value }));
  };

  const handleGuideChange = (newGuideId: string) => {
    setEditableGdi(prev => {
      // If the new guide was in memberIds, remove them
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
      // Ensure the current guide is not in the memberIds list
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
      // Ensure memberIds does not contain the guideId before sending to server
      const finalMemberIds = (editableGdi.memberIds || []).filter(id => id !== editableGdi.guideId);
      const finalDataToUpdate = {
        name: editableGdi.name,
        guideId: editableGdi.guideId,
        memberIds: finalMemberIds,
      };

      const result = await updateGdiAction(initialGdi.id, finalDataToUpdate);
      if (result.success && result.updatedGdi) {
        toast({ title: "Éxito", description: "GDI actualizado correctamente." });
        setEditableGdi(result.updatedGdi); 
        setSelectedAvailableMembers([]); 
        setSelectedAssignedMembers([]); 
        if (typeof window !== "undefined" && result.updatedGdi.name !== initialGdi.name) {
          document.title = `Administrar GDI: ${result.updatedGdi.name}`;
        }
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const guideDetails = useMemo(() => {
    return allMembers.find(m => m.id === editableGdi.guideId);
  }, [editableGdi.guideId, allMembers]);

  const availableMembersForAssignment = useMemo(() => {
    return allMembers.filter(member => {
      // Rule 1: Not the guide of THIS GDI
      if (member.id === editableGdi.guideId) return false;
      
      // Rule 2: Not already a member of THIS GDI
      if ((editableGdi.memberIds || []).includes(member.id)) return false;
      
      // Rule 3: Member's assignedGDIId in members-db.json must be null or empty
      // (Indicates they are not part of any GDI)
      if (member.assignedGDIId && member.assignedGDIId !== "") return false;
      
      // Rule 4: Member is NOT a guide of ANY OTHER GDI
      const isGuideOfAnotherGdi = allGdis.some(gdi => gdi.id !== initialGdi.id && gdi.guideId === member.id);
      if (isGuideOfAnotherGdi) return false;

      // Pass search term
      return (`${member.firstName} ${member.lastName}`.toLowerCase().includes(addMemberSearchTerm.toLowerCase()) ||
              member.email.toLowerCase().includes(addMemberSearchTerm.toLowerCase()));
    });
  }, [allMembers, editableGdi.guideId, editableGdi.memberIds, addMemberSearchTerm, allGdis, initialGdi.id]);

  const currentlyAssignedDisplayMembers = useMemo(() => {
    return (editableGdi.memberIds || [])
      .filter(id => id !== editableGdi.guideId) // Ensure guide is not in this list for display
      .map(id => allMembers.find(m => m.id === id))
      .filter(Boolean) as Member[];
  }, [editableGdi.memberIds, editableGdi.guideId, allMembers]);


  return (
    <Card className="w-full">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <CardTitle className="flex items-center text-2xl">
                        <Edit3 className="mr-3 h-7 w-7 text-primary" /> Administrar: {initialGdi.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                        Modifique detalles, guía y miembros. Haga clic en "Guardar Cambios" cuando termine.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />Guía del GDI</h3>
                    <Label htmlFor="guideIdSelect">Seleccionar Guía (miembros activos)</Label>
                    <Select onValueChange={handleGuideChange} value={editableGdi.guideId} disabled={isPending}>
                        <SelectTrigger className="mt-1" id="guideIdSelect">
                            <SelectValue placeholder="Seleccionar nuevo guía" />
                        </SelectTrigger>
                        <SelectContent>
                            {activeMembers.map((member) => (
                            <SelectItem 
                                key={member.id} 
                                value={member.id} 
                                // Disable if member is already a guide of another GDI (unless it's the current GDI's original guide)
                                disabled={member.id === editableGdi.guideId || allGdis.some(g => g.guideId === member.id && g.id !== initialGdi.id)}
                            >
                                {member.firstName} {member.lastName} ({member.email})
                                {allGdis.some(g => g.guideId === member.id && g.id !== initialGdi.id) && " (Guía de otro GDI)"}
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
                        placeholder="Buscar miembros disponibles para agregar..."
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
                            </Label>
                        </div>
                        )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {addMemberSearchTerm ? "No hay miembros que coincidan." : "No hay miembros disponibles para agregar (verifique que no estén asignados a otro GDI o sean guías)."}
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
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6 mt-6">
           <Button variant="outline" onClick={() => router.push('/groups')} disabled={isPending} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Grupos
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !editableGdi.guideId} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} 
            {isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </CardFooter>
    </Card>
  );
}
