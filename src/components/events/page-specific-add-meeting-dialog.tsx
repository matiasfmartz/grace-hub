
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
import DefineMeetingSeriesForm from '@/components/events/add-meeting-form';
import type { DefineMeetingSeriesFormValues, MeetingSeries, Meeting } from '@/lib/types';

interface PageSpecificAddMeetingDialogProps {
  defineMeetingSeriesAction: (data: DefineMeetingSeriesFormValues) => Promise<{ success: boolean; message: string; newSeries?: MeetingSeries, newInstances?: Meeting[] }>;
}

export default function PageSpecificAddMeetingDialog({ defineMeetingSeriesAction }: PageSpecificAddMeetingDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full"> {/* Added w-full for better display in sidebar */}
          <PlusCircle className="mr-2 h-4 w-4" /> Definir Nueva Serie de Reunión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Definir Nueva Serie de Reunión</DialogTitle>
          <DialogDescription>
            Complete los detalles para la nueva serie (o tipo) de reunión. 
            Si la frecuencia es "Única Vez", también se creará la instancia de reunión.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
            <DefineMeetingSeriesForm 
              defineMeetingSeriesAction={defineMeetingSeriesAction} 
              onSuccess={handleSuccess}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
