
"use client";

import React, { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import DefineMeetingSeriesForm from '@/components/events/add-meeting-form';
import DeleteMeetingSeriesAlert from '@/components/events/delete-meeting-series-alert';
import type { DefineMeetingSeriesFormValues, MeetingSeries } from '@/lib/types';
import { Settings, Edit2, Trash2, Info, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ManageMeetingSeriesDialogProps {
  series: MeetingSeries;
  updateMeetingSeriesAction: (
    seriesId: string, 
    data: DefineMeetingSeriesFormValues
  ) => Promise<{ success: boolean; message: string; updatedSeries?: MeetingSeries }>;
  deleteMeetingSeriesAction: (seriesId: string) => Promise<{ success: boolean; message: string }>;
}

export default function ManageMeetingSeriesDialog({ 
  series, 
  updateMeetingSeriesAction,
  deleteMeetingSeriesAction
}: ManageMeetingSeriesDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleEditSuccess = () => {
    setIsEditing(false); // Return to view mode on successful edit
    // Dialog remains open, revalidation will refresh data in parent
  };

  const handleDeleteSuccess = () => {
    setIsDeleteAlertOpen(false);
    setIsDialogOpen(false); // Close the main management dialog after successful deletion
  };
  
  const initialFormValues: DefineMeetingSeriesFormValues = {
    name: series.name,
    description: series.description || "",
    defaultTime: series.defaultTime,
    defaultLocation: series.defaultLocation,
    defaultImageUrl: series.defaultImageUrl || "",
    targetAttendeeGroups: series.targetAttendeeGroups,
    frequency: series.frequency,
    oneTimeDate: series.frequency === "OneTime" && series.id 
                   ? undefined // For editing OneTime, date is not directly editable in form for now.
                   : undefined,
  };

  const handleSubmitUpdate = (data: DefineMeetingSeriesFormValues) => {
    startTransition(async () => {
      const result = await updateMeetingSeriesAction(series.id, data);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        handleEditSuccess();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1.5 h-3.5 w-3.5" /> Gestionar Serie
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-8rem)] p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>
            {isEditing ? `Editando Serie: ${series.name}` : `Gestionar Serie: ${series.name}`}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifique los detalles de esta serie de reuniones."
              : "Vea los detalles de la serie o elija editarla o eliminarla."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-6">
          {isEditing ? (
            <DefineMeetingSeriesForm 
              defineMeetingSeriesAction={handleSubmitUpdate} 
              onSuccess={handleEditSuccess} // This might not be strictly needed if form handles success internally
              initialValues={initialFormValues}
              isEditing={true}
            />
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-muted-foreground">Nombre de la Serie:</h3>
                <p>{series.name}</p>
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground">Descripción:</h3>
                <p>{series.description || "N/A"}</p>
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground">Hora Predeterminada:</h3>
                <p>{series.defaultTime}</p>
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground">Lugar Predeterminado:</h3>
                <p>{series.defaultLocation}</p>
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground">Frecuencia:</h3>
                <p>{series.frequency === "OneTime" ? "Única Vez" : "Recurrente"}</p>
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground">Grupos de Asistentes Objetivo:</h3>
                <ul className="list-disc list-inside">
                  {series.targetAttendeeGroups.map(group => {
                    let label = group;
                    if (group === "generalAttendees") label = "Asistentes Generales";
                    else if (group === "workers") label = "Obreros";
                    else if (group === "leaders") label = "Líderes";
                    return <li key={group}>{label}</li>;
                  })}
                </ul>
              </div>
              {series.defaultImageUrl && (
                <div>
                    <h3 className="font-semibold text-muted-foreground">Imagen Predeterminada:</h3>
                    <img src={series.defaultImageUrl} alt={series.name} className="mt-1 rounded-md max-h-32 object-contain" data-ai-hint="meeting event" />
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isPending}>
                <Edit2 className="mr-2 h-4 w-4" /> Editar Detalles
              </Button>
              <DeleteMeetingSeriesAlert
                seriesId={series.id}
                seriesName={series.name}
                deleteMeetingSeriesAction={deleteMeetingSeriesAction}
                onOpenChange={setIsDeleteAlertOpen} // Control alert dialog state
                onSuccess={handleDeleteSuccess} // Action to take after successful deletion
                triggerButton={
                  <Button variant="destructive" disabled={isPending}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Serie
                  </Button>
                }
              />
            </div>
          </DialogFooter>
        )}
        {/* If editing, DefineMeetingSeriesForm provides its own Cancel/Submit buttons in its footer */}
         {isEditing && (
             <DialogFooter className="p-6 pt-0 border-t flex-shrink-0"> {/* Footer for Cancel button in edit mode, form has its own submit */}
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isPending}>
                    Cancelar Edición
                </Button>
                {/* Submit is handled by the form */}
            </DialogFooter>
         )}
      </DialogContent>
    </Dialog>
  );
}
