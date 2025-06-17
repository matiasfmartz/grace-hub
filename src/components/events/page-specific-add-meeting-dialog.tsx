
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddMeetingForm from '@/components/events/add-meeting-form';
import type { AddGeneralMeetingFormValues, Meeting } from '@/lib/types';

interface PageSpecificAddMeetingDialogProps {
  addMeetingAction: (data: AddGeneralMeetingFormValues) => Promise<{ success: boolean; message: string; newMeeting?: Meeting }>;
}

export default function PageSpecificAddMeetingDialog({ addMeetingAction }: PageSpecificAddMeetingDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Agregar Nueva Reunión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Reunión</DialogTitle>
          <DialogDescription>
            Complete los detalles para la nueva reunión. Reuniones de GDI y Área se gestionan desde sus respectivas secciones.
          </DialogDescription>
        </DialogHeader>
        <AddMeetingForm addMeetingAction={addMeetingAction} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
