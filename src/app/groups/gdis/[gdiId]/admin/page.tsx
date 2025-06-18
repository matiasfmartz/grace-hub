
'use server';
import { getGdiById, getAllGdis } from '@/services/gdiService';
import { getAllMembersNonPaginated } from '@/services/memberService';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ManageSingleGdiView from '@/components/groups/manage-single-gdi-view';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { updateGdiDetailsAction } from './actions'; // Import the action
import type { GDI, Member } from '@/lib/types';
import React from 'react'; // For Dialog state

interface GdiAdminPageProps {
  params: { gdiId: string };
}

async function getData(gdiId: string): Promise<{ gdi: GDI | null; allMembers: Member[]; allGdis: GDI[] }> {
  const gdi = await getGdiById(gdiId);
  const allMembersData = await getAllMembersNonPaginated();
  const allGdisData = await getAllGdis();
  return { gdi, allMembers: allMembersData, allGdis: allGdisData };
}

export default async function GdiAdminPage({ params }: GdiAdminPageProps) {
  const { gdi, allMembers, allGdis } = await getData(params.gdiId);

  if (!gdi) {
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
              Editar Detalles del GDI
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Editar Detalles: {gdi.name}</DialogTitle>
              <DialogDescription>
                Modifique los detalles del GDI. Los cambios se guardarán al hacer clic en "Guardar Cambios".
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto p-1 sm:p-6">
              <ManageSingleGdiView
                gdi={gdi}
                allMembers={allMembers}
                activeMembers={activeMembers}
                allGdis={allGdis}
                updateGdiAction={updateGdiDetailsAction}
                // onSuccess and onCancel will be handled by DialogClose or programmatic close after action
              />
            </div>
            {/* Footer can be part of ManageSingleGdiView or here if common (like just a close button) */}
            {/* For now, ManageSingleGdiView's own save/cancel logic will be used. */}
            {/* We might need a DialogClose for the cancel button inside ManageSingleGdiView later */}
          </DialogContent>
        </Dialog>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary">
            Administrar Reuniones para GDI: {gdi.name}
          </CardTitle>
          <CardDescription>
            Configure la serie de reuniones recurrentes para este GDI y gestione la asistencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Funcionalidad para definir series de reuniones y ver instancias estará aquí.
          </p>
          {/* TODO: Add DefineMeetingSeriesForm for this GDI */}
          {/* TODO: Add MeetingInstancesTable for this GDI's series */}
        </CardContent>
      </Card>
    </div>
  );
}
