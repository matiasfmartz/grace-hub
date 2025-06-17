
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Edit2 } from 'lucide-react';
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
import { parseISO } from 'date-fns';

interface EditMeetingSeriesDialogProps {
  series: MeetingSeries;
  updateMeetingSeriesAction: (
    seriesId: string, 
    data: DefineMeetingSeriesFormValues
  ) => Promise<{ success: boolean; message: string; updatedSeries?: MeetingSeries }>;
}

export default function EditMeetingSeriesDialog({ series, updateMeetingSeriesAction }: EditMeetingSeriesDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  // Prepare initial form values from the series prop
  // Note: oneTimeDate needs to be a Date object if it exists, otherwise undefined
  const initialFormValues: DefineMeetingSeriesFormValues = {
    name: series.name,
    description: series.description || "",
    defaultTime: series.defaultTime,
    defaultLocation: series.defaultLocation,
    defaultImageUrl: series.defaultImageUrl || "",
    targetAttendeeGroups: series.targetAttendeeGroups,
    frequency: series.frequency,
    oneTimeDate: series.frequency === "OneTime" && series.id // Assuming series.id might store the date for one-time, check how it's structured
                   // This part is tricky as `oneTimeDate` is not directly on MeetingSeries.
                   // The form handles this. For editing, if frequency is OneTime,
                   // you might need to fetch the associated meeting instance to get its date.
                   // For simplicity now, we'll leave oneTimeDate as undefined for edit,
                   // or assume user re-selects if they change frequency TO OneTime.
                   // A better approach would be to fetch the meeting instance if series.frequency is OneTime
                   // This requires an async operation or passing the meeting instance date.
                   // For now, the DefineMeetingSeriesForm will handle if a date needs to be picked
                   // if frequency is changed to OneTime, or if it was OneTime and might need re-confirmation.
                   // The form's logic for oneTimeDate (only showing if freq is OneTime) is key.
                   ? undefined // Potentially find the linked meeting and get its date
                   : undefined,
  };
  

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Editar Serie
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Editar Serie de Reunión: {series.name}</DialogTitle>
          <DialogDescription>
            Modifique los detalles de esta serie de reuniones.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
            <DefineMeetingSeriesForm 
              defineMeetingSeriesAction={(data) => updateMeetingSeriesAction(series.id, data)} 
              onSuccess={handleSuccess}
              initialValues={initialFormValues} // Pass initial values to the form
              isEditing={true} // Indicate that this is an edit operation
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}

