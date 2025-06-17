
"use client";

import { useState } from 'react';
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
// Important: Server actions can be imported and used in client components if they are defined in a server component
// or a file marked with 'use server';
import { addMeetingAction } from '@/app/events/page'; 
import type { AddGeneralMeetingFormValues, Meeting } from '@/lib/types';


export default function GlobalAddMeetingTrigger() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // The `addMeetingAction` is imported. It's a server action.
  // It's okay to pass server actions to client components.
  const handleFormSuccess = () => {
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="whitespace-nowrap">
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Reunión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Reunión Globalmente</DialogTitle>
          <DialogDescription>
            Complete los detalles para la nueva reunión.
          </DialogDescription>
        </DialogHeader>
        <AddMeetingForm 
          addMeetingAction={addMeetingAction as (data: AddGeneralMeetingFormValues) => Promise<{ success: boolean; message: string; newMeeting?: Meeting }>} 
          onSuccess={handleFormSuccess} 
        />
      </DialogContent>
    </Dialog>
  );
}
