
"use client";

import type { Member, GDI, MinistryArea } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from 'lucide-react';

interface MemberDetailsDialogProps {
  member: Member | null;
  allMembers: Member[];
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (member: Member) => void; // Placeholder for edit action
}

export default function MemberDetailsDialog({ member, allMembers, allGDIs, allMinistryAreas, isOpen, onClose, onEdit }: MemberDetailsDialogProps) {
  if (!member) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      // Ensure dateString is treated as UTC to avoid off-by-one day errors due to timezone
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

  const handleEdit = () => {
    if (onEdit && member) {
      onEdit(member);
    } else {
      console.log(`Edit button clicked for member: ${member?.firstName} ${member?.lastName} (ID: ${member?.id}) - Full edit functionality to be implemented.`);
      // alert(`Edit functionality for ${member?.firstName} ${member?.lastName} will be implemented soon.`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait" />
              <AvatarFallback>{member.firstName.substring(0, 1)}{member.lastName.substring(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{member.firstName} {member.lastName}</DialogTitle>
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
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-250px)] pr-6">
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

        <DialogFooter className="mt-6 pt-4 border-t">
          <Button onClick={handleEdit} variant="default">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button onClick={onClose} variant="outline">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
