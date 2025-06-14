
"use client";

import type { Member, GDI, MinistryArea, AddMemberFormValues } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Save } from 'lucide-react';
import AddMemberForm from './add-member-form';
import { useState, useTransition } from 'react';
import { useToast } from "@/hooks/use-toast";

interface MemberDetailsDialogProps {
  member: Member | null;
  allMembers: Member[]; // Needed for GDI/Area leader names in view & form
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated: (updatedMember: Member) => void; // Callback after successful update
  updateMemberAction: (memberData: Member) => Promise<{ success: boolean; message: string; updatedMember?: Member }>;
}

export default function MemberDetailsDialog({ 
  member, 
  allMembers, 
  allGDIs, 
  allMinistryAreas, 
  isOpen, 
  onClose,
  onMemberUpdated,
  updateMemberAction
}: MemberDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  if (!member) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString + 'T00:00:00Z');
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    } catch (e) {
      return dateString; 
    }
  };
  
  const baptismDate = member.baptismDate || 'N/A';

  const memberGDI = member.assignedGDIId ? allGDIs.find(g => g.id === member.assignedGDIId) : null;
  const gdiGuide = memberGDI ? allMembers.find(m => m.id === memberGDI.guideId) : null;

  const memberAreas = member.assignedAreaIds
    ? member.assignedAreaIds.map(areaId => allMinistryAreas.find(area => area.id === areaId)?.name).filter(Boolean)
    : [];

  const displayStatus = (status: Member['status']) => {
    switch (status) {
      case 'Active': return 'Activo';
      case 'Inactive': return 'Inactivo';
      case 'New': return 'Nuevo';
      default: return status;
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleFormSubmit = async (data: AddMemberFormValues, memberId?: string) => {
    if (!memberId) return; // Should not happen in edit mode

    const updatedMemberData: Member = {
      ...member, // Spread existing member to keep ID and any other non-form fields
      ...data,   // Spread form values
      birthDate: data.birthDate ? data.birthDate.toISOString().split('T')[0] : undefined,
      churchJoinDate: data.churchJoinDate ? data.churchJoinDate.toISOString().split('T')[0] : undefined,
      id: memberId, // Ensure ID is correctly passed
    };
    
    startTransition(async () => {
      const result = await updateMemberAction(updatedMemberData);
      if (result.success && result.updatedMember) {
        toast({
          title: "Éxito",
          description: result.message,
        });
        onMemberUpdated(result.updatedMember); // Update client-side state
        setIsEditing(false); // Switch back to view mode
        onClose(); // Close dialog
      } else {
        toast({
          title: "Error al Actualizar",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleCloseDialog = () => {
    setIsEditing(false); // Reset edit mode on close
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b sticky top-0 bg-background z-10">
           <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait" />
              <AvatarFallback>{member.firstName.substring(0, 1)}{member.lastName.substring(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl sm:text-2xl">{member.firstName} {member.lastName}</DialogTitle>
               {!isEditing && (
                <div className="mt-1">
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
                </div>
               )}
            </div>
          </div>
          {isEditing && <DialogDescription className="pt-2">Modifique los campos necesarios y guarde los cambios.</DialogDescription>}
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto">
          {isEditing ? (
            <AddMemberForm
              initialMemberData={member}
              onSubmitMember={handleFormSubmit}
              allGDIs={allGDIs}
              allMinistryAreas={allMinistryAreas}
              allMembers={allMembers}
              submitButtonText="Guardar Cambios"
              cancelButtonText="Cancelar Edición"
              onDialogClose={handleEditToggle} // To toggle isEditing off
              isSubmitting={isPending}
            />
          ) : (
            <ScrollArea className="max-h-[calc(80vh-250px)] p-6">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Email:</span>
                  <span className="col-span-2 break-all">{member.email}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Teléfono:</span>
                  <span className="col-span-2">{member.phone}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Fecha de Nacimiento:</span>
                  <span className="col-span-2">{formatDate(member.birthDate)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Ingreso a la Iglesia:</span>
                  <span className="col-span-2">{formatDate(member.churchJoinDate)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Bautismo:</span>
                  <span className="col-span-2">{baptismDate}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Escuela de Vida:</span>
                  <span className="col-span-2">{member.attendsLifeSchool ? 'Sí' : 'No'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Instituto Bíblico (IBE):</span>
                  <span className="col-span-2">{member.attendsBibleInstitute ? 'Sí' : 'No'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Vino de otra Iglesia:</span>
                  <span className="col-span-2">{member.fromAnotherChurch ? 'Sí' : 'No'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">GDI:</span>
                  <span className="col-span-2">
                    {memberGDI 
                      ? `${memberGDI.name} (Guía: ${gdiGuide ? `${gdiGuide.firstName} ${gdiGuide.lastName}` : 'N/A'})` 
                      : 'No asignado'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-muted-foreground">Áreas de Ministerio:</span>
                  <span className="col-span-2">
                    {memberAreas.length > 0 ? memberAreas.join(', ') : 'Ninguna'}
                  </span>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {!isEditing && (
          <DialogFooter className="p-6 border-t sticky bottom-0 bg-background z-10">
            <Button onClick={handleEditToggle} variant="default">
              <Pencil className="mr-2 h-4 w-4" />
              Editar Miembro
            </Button>
            <Button onClick={handleCloseDialog} variant="outline">Cerrar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
