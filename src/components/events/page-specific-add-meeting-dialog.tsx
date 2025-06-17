
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
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Agregar Nueva Reunión</DialogTitle>
          <DialogDescription>
            Complete los detalles para la nueva reunión. Reuniones de GDI y Área se gestionan desde sus respectivas secciones.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
            <AddMeetingForm addMeetingAction={addMeetingAction} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

