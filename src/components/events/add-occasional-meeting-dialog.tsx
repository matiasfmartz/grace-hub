
"use client";

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MeetingSeries, AddOccasionalMeetingFormValues, Meeting } from "@/lib/types";
import MeetingInstanceForm from './add-occasional-meeting-form'; 
import { PlusSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface AddOccasionalMeetingDialogProps {
  series: MeetingSeries;
  addOccasionalMeetingAction: (
    seriesId: string,
    formData: AddOccasionalMeetingFormValues
  ) => Promise<{ success: boolean; message: string; newInstance?: Meeting }>;
}

export default function AddOccasionalMeetingDialog({ series, addOccasionalMeetingAction }: AddOccasionalMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const initialFormValues = useMemo(() => {
    let time = "00:00"; 
    if (series.defaultTime && /^[0-2][0-9]:[0-5][0-9]$/.test(series.defaultTime)) {
      time = series.defaultTime;
    }

    return {
      name: `${series.name} (Ocasional)`,
      date: new Date(),
      time: time,
      location: series.defaultLocation,
      description: series.description || "",
    };
  }, [series]);


  const handleSubmit = async (values: AddOccasionalMeetingFormValues) => {
    let result: { success: boolean; message: string; newInstance?: Meeting} = { success: false, message: "Error desconocido" };
    startTransition(async () => {
      result = await addOccasionalMeetingAction(series.id, values);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        setOpen(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
    return result;
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusSquare className="mr-1.5 h-3.5 w-3.5" /> Programar Instancia Adicional
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Programar Instancia Adicional para: {series.name}</DialogTitle>
          <DialogDescription>
            Complete los detalles para esta instancia específica de la reunión.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
          <MeetingInstanceForm
            onSubmitAction={handleSubmit}
            initialValues={initialFormValues}
            isEditing={false}
            isPending={isPending}
            onCancel={() => setOpen(false)}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
