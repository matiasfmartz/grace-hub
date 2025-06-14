
"use client";

import { useState, useCallback } from 'react';
import type { Member, GDI, MinistryArea } from '@/lib/types';
import AddMemberForm from './add-member-form';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, Users, Save, ListChecks, Undo2, Home } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BulkAddMembersViewProps {
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  allMembers: Member[]; // Used by AddMemberForm for GDI guide/Area leader names
}

export default function BulkAddMembersView({ allGDIs, allMinistryAreas, allMembers }: BulkAddMembersViewProps) {
  const [stagedMembers, setStagedMembers] = useState<Member[]>([]);
  const [recentlyProcessedMembers, setRecentlyProcessedMembers] = useState<Member[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const handleStageMember = useCallback((newMember: Member) => {
    setStagedMembers(prev => [...prev, { ...newMember, id: `staged-${Date.now()}-${prev.length}` }]);
    toast({
      title: "Miembro Preparado",
      description: `${newMember.firstName} ${newMember.lastName} ha sido agregado a la lista de preparación.`,
    });
  }, [toast]);

  const handleRemoveStagedMember = (memberId: string) => {
    setStagedMembers(prev => prev.filter(member => member.id !== memberId));
    toast({
      title: "Miembro Removido",
      description: "El miembro ha sido removido de la lista de preparación.",
      variant: "destructive"
    });
  };

  const handleSaveAllStagedMembers = () => {
    if (stagedMembers.length === 0) {
      toast({
        title: "Lista Vacía",
        description: "No hay miembros en la lista para guardar.",
        variant: "destructive",
      });
      return;
    }

    // Simulate saving to backend
    console.log("Simulando guardado de los siguientes miembros:", stagedMembers.map(m => ({...m, id: `final-${m.id.replace('staged-','')}`})));
    
    setRecentlyProcessedMembers([...stagedMembers]);
    setStagedMembers([]);
    
    toast({
      title: "Éxito",
      description: `${stagedMembers.length} miembro(s) han sido procesados. Revísalos en la sección 'Miembros Recientemente Procesados'.`,
    });
    // No redirect here, user stays on page
  };
  
  const getGdiGuideNameFromList = (member: Member): string => {
    if (!member.assignedGDIId) return "No asignado";
    const gdi = allGDIs.find(g => g.id === member.assignedGDIId);
    if (!gdi) return "GDI no encontrado";
    const guide = allMembers.find(m => m.id === gdi.guideId);
    return guide ? `${guide.firstName} ${guide.lastName}` : "Guía no encontrado";
  };

  const displayStatus = (status: Member['status']) => {
    switch (status) {
      case 'Active': return 'Activo';
      case 'Inactive': return 'Inactivo';
      case 'New': return 'Nuevo';
      default: return status;
    }
  };

  const handleStartNewBatch = () => {
    setRecentlyProcessedMembers([]);
    setStagedMembers([]); // Also clear staged members if any
    toast({
      title: "Nuevo Lote Iniciado",
      description: "Puedes comenzar a agregar nuevos miembros.",
    });
  };

  const handleReturnToDirectory = () => {
    router.push('/members');
  };

  const renderMembersTable = (membersToList: Member[], isStagedTable: boolean) => (
    <div className="overflow-x-auto max-h-[calc(100vh-300px)]"> {/* Adjusted max-height */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Avatar</TableHead>
            <TableHead>Nombre Completo</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Guía GDI</TableHead>
            <TableHead>Estado</TableHead>
            {isStagedTable && <TableHead className="text-right">Acción</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {membersToList.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait" />
                  <AvatarFallback>{member.firstName.substring(0, 1)}{member.lastName.substring(0,1)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>{member.firstName} {member.lastName}</TableCell>
              <TableCell>{member.phone}</TableCell>
              <TableCell>{getGdiGuideNameFromList(member)}</TableCell>
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
              {isStagedTable && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveStagedMember(member.id)} title="Remover de la lista">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="sticky top-4"> {/* Make form sticky */}
            <CardHeader>
              <CardTitle>Formulario de Nuevo Miembro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                  <AddMemberForm
                      onAddMember={handleStageMember}
                      onOpenChange={() => {}}
                      allGDIs={allGDIs}
                      allMinistryAreas={allMinistryAreas}
                      allMembers={allMembers}
                  />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6" /> Miembros Preparados ({stagedMembers.length})</CardTitle>
                <Button 
                  onClick={handleSaveAllStagedMembers} 
                  disabled={stagedMembers.length === 0}
                  size="lg"
                >
                  <Save className="mr-2 h-5 w-5" />
                  Guardar Todos los Preparados
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stagedMembers.length > 0 ? (
                renderMembersTable(stagedMembers, true)
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4" />
                  <p>No hay miembros en la lista de preparación.</p>
                  <p>Use el formulario de la izquierda para agregar miembros.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {recentlyProcessedMembers.length > 0 && (
            <Card>
              <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center">
                        <ListChecks className="mr-2 h-6 w-6 text-green-600" /> Miembros Recientemente Procesados ({recentlyProcessedMembers.length})
                    </CardTitle>
                     <div className="flex gap-2">
                        <Button onClick={handleStartNewBatch} variant="outline">
                            <Undo2 className="mr-2 h-4 w-4" /> Iniciar Nuevo Lote
                        </Button>
                        <Button onClick={handleReturnToDirectory}>
                            <Home className="mr-2 h-4 w-4" /> Volver al Directorio
                        </Button>
                    </div>
                 </div>
                 <p className="text-sm text-muted-foreground pt-2">
                    Estos miembros han sido "guardados" en esta sesión. Para persistencia real, se requiere integración con base de datos.
                 </p>
              </CardHeader>
              <CardContent>
                {renderMembersTable(recentlyProcessedMembers, false)}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {recentlyProcessedMembers.length === 0 && stagedMembers.length > 0 && (
         <div className="text-center mt-8 lg:col-span-3">
            <Button onClick={handleReturnToDirectory} variant="outline" size="lg">
                <Home className="mr-2 h-4 w-4" /> Volver al Directorio sin guardar
            </Button>
        </div>
      )}
       {recentlyProcessedMembers.length === 0 && stagedMembers.length === 0 && (
         <div className="text-center mt-8 lg:col-span-3">
            <Button onClick={handleReturnToDirectory} variant="outline" size="lg">
                <Home className="mr-2 h-4 w-4" /> Volver al Directorio
            </Button>
        </div>
      )}
    </div>
  );
}

    