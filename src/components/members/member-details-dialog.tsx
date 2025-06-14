
"use client";

import type { Member, GDI, MinistryArea } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemberDetailsDialogProps {
  member: Member | null;
  allMembers: Member[];
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberDetailsDialog({ member, allMembers, allGDIs, allMinistryAreas, isOpen, onClose }: MemberDetailsDialogProps) {
  if (!member) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString; // if already formatted like "Month Year"
    }
  };
  
  const baptismDate = member.baptismDate || 'N/A';

  const memberGDI = member.assignedGDIId ? allGDIs.find(g => g.id === member.assignedGDIId) : null;
  const gdiGuide = memberGDI ? allMembers.find(m => m.id === memberGDI.guideId) : null;

  const memberAreas = member.assignedAreaIds
    ? member.assignedAreaIds.map(areaId => allMinistryAreas.find(area => area.id === areaId)?.name).filter(Boolean)
    : [];

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
              <DialogDescription>
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
                  {member.status}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-200px)] pr-6">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-muted-foreground">Email:</span>
              <span className="col-span-2">{member.email}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-muted-foreground">Phone:</span>
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
              <span className="font-semibold text-muted-foreground">Instituto Bíblico:</span>
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
              <span className="font-semibold text-muted-foreground">Áreas:</span>
              <span className="col-span-2">
                {memberAreas.length > 0 ? memberAreas.join(', ') : 'Ninguna'}
              </span>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button onClick={onClose} variant="outline">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
