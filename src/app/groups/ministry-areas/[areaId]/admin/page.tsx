
'use server';
import { getMinistryAreaById } from '@/services/ministryAreaService';
import { getAllMembersNonPaginated } from '@/services/memberService';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ManageSingleMinistryAreaView from '@/components/groups/manage-single-ministry-area-view';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { updateMinistryAreaDetailsAction } from './actions'; // Import the action
import type { MinistryArea, Member } from '@/lib/types';
import React from 'react'; // For Dialog state

interface MinistryAreaAdminPageProps {
  params: { areaId: string };
}

async function getData(areaId: string): Promise<{ ministryArea: MinistryArea | null; allMembers: Member[] }> {
  const ministryArea = await getMinistryAreaById(areaId);
  const allMembersData = await getAllMembersNonPaginated();
  return { ministryArea, allMembers: allMembersData };
}

export default async function MinistryAreaAdminPage({ params }: MinistryAreaAdminPageProps) {
  const { ministryArea, allMembers } = await getData(params.areaId);

  if (!ministryArea) {
    notFound();
  }
  const activeMembers = allMembers.filter(m => m.status === 'Active');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href="/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Grupos
          </Link>
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Editar Detalles del Área
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Editar Detalles: {ministryArea.name}</DialogTitle>
              <DialogDescription>
                Modifique los detalles del Área Ministerial. Los cambios se guardarán al hacer clic en "Guardar Cambios".
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto p-1 sm:p-6">
              <ManageSingleMinistryAreaView
                ministryArea={ministryArea}
                allMembers={allMembers}
                activeMembers={activeMembers}
                updateMinistryAreaAction={updateMinistryAreaDetailsAction}
                // onSuccess and onCancel will be handled by DialogClose or programmatic close after action
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
       <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary">
            Administrar Reuniones para Área: {ministryArea.name}
          </CardTitle>
          <CardDescription>
            Configure la serie de reuniones recurrentes para esta área ministerial y gestione la asistencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Funcionalidad para definir series de reuniones y ver instancias estará aquí.
          </p>
          {/* TODO: Add DefineMeetingSeriesForm for this Ministry Area */}
          {/* TODO: Add MeetingInstancesTable for this Ministry Area's series */}
        </CardContent>
      </Card>
    </div>
  );
}
