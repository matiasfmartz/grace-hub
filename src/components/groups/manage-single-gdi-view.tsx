
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
import { Loader2, Save, Users, UserCheck, ArrowLeft, Edit3, Search, UserPlus, UserMinus, Badge } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManageSingleGdiViewProps {
  gdi: GDI;
  allMembers: Member[]; // All members for assignment (any status)
  activeMembers: Member[]; // Active members for guide selection
  updateGdiAction: (
    gdiId: string,
    updatedData: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
  ) => Promise<{ success: boolean; message: string; updatedGdi?: GDI }>;
}

export default function ManageSingleGdiView({
  gdi: initialGdi,
  allMembers,
  activeMembers,
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

  const handleGuideChange = (guideId: string) => {
    setEditableGdi(prev => {
      // Ensure new guide is not in the memberIds list for this GDI
      const newMemberIds = (prev.memberIds || []).filter(id => id !== guideId);
      return { ...prev, guideId, memberIds: newMemberIds };
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
    setEditableGdi(prevGdi => ({
      ...prevGdi,
      memberIds: Array.from(new Set([...(prevGdi.memberIds || []), ...selectedAvailableMembers]))
                       .filter(id => id !== prevGdi.guideId) // Ensure guide is not in memberIds
    }));
    setSelectedAvailableMembers([]); 
  };

  const handleRemoveSelectedMembersFromGdi = () => {
    if (selectedAssignedMembers.length === 0) return;
    // Prevent removing the guide via this method is not strictly necessary as guide is handled separately,
    // but it's good practice to keep memberIds distinct from guideId for clarity if that's the model.
    // However, current logic allows guide to be in memberIds, then filters out.
    setEditableGdi(prevGdi => ({
      ...prevGdi,
      memberIds: (prevGdi.memberIds || []).filter(id => !selectedAssignedMembers.includes(id))
    }));
    setSelectedAssignedMembers([]); 
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const finalDataToUpdate = {
        name: editableGdi.name,
        guideId: editableGdi.guideId,
        memberIds: (editableGdi.memberIds || []).filter(mId => mId !== editableGdi.guideId), // Ensure guide is not double-counted
      };

      const result = await updateGdiAction(initialGdi.id, finalDataToUpdate);
      if (result.success && result.updatedGdi) {
        toast({ title: "Éxito", description: "GDI actualizado correctamente." });
        setEditableGdi(result.updatedGdi); // Reflect server-side changes, e.g., if server modified memberIds
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
    // Members of any status can be assigned to a GDI
    return allMembers.filter(member =>
      member.id !== editableGdi.guideId && // Cannot assign current guide as a regular member here
      !(editableGdi.memberIds || []).includes(member.id) && // Not already in this GDI's member list
      (`${member.firstName} ${member.lastName}`.toLowerCase().includes(addMemberSearchTerm.toLowerCase()) ||
       member.email.toLowerCase().includes(addMemberSearchTerm.toLowerCase()))
    );
  }, [allMembers, editableGdi.guideId, editableGdi.memberIds, addMemberSearchTerm]);

  const currentlyAssignedDisplayMembers = useMemo(() => {
    return (editableGdi.memberIds || []).map(id => allMembers.find(m => m.id === id)).filter(Boolean) as Member[];
  }, [editableGdi.memberIds, allMembers]);


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
            {/* Left Pane: Guide and Name */}
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
                            <SelectItem key={member.id} value={member.id} disabled={member.id === editableGdi.guideId}>
                                {member.firstName} {member.lastName} ({member.email})
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3">Nombre del GDI</h3>
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" name="name" value={editableGdi.name} onChange={handleInputChange} disabled={isPending} className="mt-1" />
                </div>
            </div>

            {/* Right Pane: Member Management */}
            <div className="lg:col-span-3 space-y-6">
                 <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><UserPlus className="mr-2 h-5 w-5 text-muted-foreground" />Agregar Miembros al GDI</h3>
                    <Input
                        type="search"
                        placeholder="Buscar miembros para agregar..."
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
                            {addMemberSearchTerm ? "No hay miembros que coincidan con su búsqueda." : "Todos los miembros disponibles ya están asignados o seleccionados como guía."}
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
                     <p className="text-sm text-muted-foreground mb-3">
                        Total de miembros en GDI (incluyendo guía): {
                            new Set([editableGdi.guideId, ...(editableGdi.memberIds || [])].filter(Boolean)).size
                        }
                    </p>
                    <ScrollArea className="h-48 w-full rounded-md border p-2">
                        {guideDetails && (
                             <div className="flex items-center justify-between p-2 rounded-md bg-primary/10">
                                <span className="font-medium text-sm text-primary">{guideDetails.firstName} {guideDetails.lastName}</span>
                                <Badge variant="default" className="text-xs">Guía</Badge>
                            </div>
                        )}
                        {currentlyAssignedDisplayMembers.map((member) => (
                            member.id !== editableGdi.guideId && ( 
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
                            )
                        ))}
                        {(!guideDetails && currentlyAssignedDisplayMembers.length === 0) && (
                             <p className="text-sm text-muted-foreground text-center py-4">Ningún miembro asignado (excluyendo guía).</p>
                        )}
                         {(guideDetails && currentlyAssignedDisplayMembers.length === 0) && (
                             <p className="text-sm text-muted-foreground text-center py-4 mt-2">Ningún miembro adicional asignado.</p>
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
