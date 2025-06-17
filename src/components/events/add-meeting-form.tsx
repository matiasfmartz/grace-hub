
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { DefineMeetingSeriesFormValues, MeetingTargetRoleType, MeetingFrequencyType, MeetingSeries } from "@/lib/types";
import { DefineMeetingSeriesFormSchema, MeetingTargetRoleEnum, MeetingFrequencyEnum } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker"; 
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransition, useEffect } from "react";
import { DialogClose } from "@/components/ui/dialog"; // Keep for potential direct use, but ManageDialog might control close
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DefineMeetingSeriesFormProps {
  defineMeetingSeriesAction: (data: DefineMeetingSeriesFormValues) => Promise<{ success: boolean; message: string; newSeries?: any, newInstance?: any, updatedSeries?: MeetingSeries }>;
  onSuccess?: () => void; // Called after successful action, parent can close dialog or switch view
  initialValues?: DefineMeetingSeriesFormValues; 
  isEditing?: boolean;
  onCancelEdit?: () => void; // Specific callback for cancelling edit mode
}

const targetAttendeeGroupOptions: { id: MeetingTargetRoleType; label: string }[] = [
  { id: "generalAttendees", label: "Asistentes Generales (Miembros de GDI)" },
  { id: "workers", label: "Obreros (Guías, Líderes de Área, Miembros de Área)" },
  { id: "leaders", label: "Líderes (Guías de GDI, Líderes de Área)" },
];

const frequencyOptions: { value: MeetingFrequencyType; label: string }[] = [
    { value: "Recurring", label: "Recurrente (Instancias manuales)"},
    { value: "OneTime", label: "Única Vez"},
];

const defaultFormValues: DefineMeetingSeriesFormValues = {
  name: "",
  description: "",
  defaultTime: "10:00",
  defaultLocation: "Santuario Principal",
  defaultImageUrl: "",
  targetAttendeeGroups: [],
  frequency: "Recurring",
  oneTimeDate: undefined,
};

export default function DefineMeetingSeriesForm({ 
  defineMeetingSeriesAction, 
  onSuccess,
  initialValues,
  isEditing = false,
  onCancelEdit 
}: DefineMeetingSeriesFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<DefineMeetingSeriesFormValues>({
    resolver: zodResolver(DefineMeetingSeriesFormSchema),
    defaultValues: initialValues || defaultFormValues,
  });

  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);
    } else {
      form.reset(defaultFormValues); // Ensure reset to defaults if not editing
    }
  }, [initialValues, form]);

  const watchedFrequency = form.watch("frequency");

  async function onSubmit(values: DefineMeetingSeriesFormValues) {
    startTransition(async () => {
      const dataToSend = { ...values };
      if (dataToSend.frequency !== 'OneTime') {
        delete dataToSend.oneTimeDate; 
      }
      
      const result = await defineMeetingSeriesAction(dataToSend);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        if (onSuccess) {
          onSuccess();
        }
        if (!isEditing) { 
            form.reset(defaultFormValues);
        }
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }
  
  const handleCancel = () => {
    if (isEditing && onCancelEdit) {
      onCancelEdit(); // Call specific cancel for edit mode (e.g., switch view in parent dialog)
      form.reset(initialValues || defaultFormValues); // Reset to initial or default
    } else if (!isEditing && onSuccess) {
      // If adding and onSuccess is typically for closing dialog, let parent handle.
      // This form's DialogClose might be for simple cases.
      // For now, let's assume parent dialog (like ManageMeetingSeriesDialog or PageSpecificAdd...) handles its own closure.
      form.reset(defaultFormValues);
    } else {
      form.reset(defaultFormValues);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Serie/Tipo de Reunión</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Servicio Dominical, Estudio Bíblico" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Breve descripción de esta serie de reuniones." {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="defaultTime"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hora Predeterminada</FormLabel>
                <FormControl>
                    <Input type="time" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="defaultLocation"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Ubicación Predeterminada</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Santuario Principal" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="defaultImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Imagen Predeterminada (Opcional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://placehold.co/image.png" {...field} value={field.value ?? ''} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="targetAttendeeGroups"
            render={() => (
              <FormItem className="space-y-3">
                <FormLabel>Grupos de Asistentes Objetivo</FormLabel>
                <div className="space-y-2 p-2 border rounded-md">
                  {targetAttendeeGroupOptions.map((group) => (
                    <FormField
                      key={group.id}
                      control={form.control}
                      name="targetAttendeeGroups"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={group.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(group.id)}
                                onCheckedChange={(checked) => {
                                  const currentGroups = field.value || [];
                                  return checked
                                    ? field.onChange([...currentGroups, group.id])
                                    : field.onChange(
                                        currentGroups.filter(
                                          (value) => value !== group.id
                                        )
                                      );
                                }}
                                disabled={isPending}
                              />
                            </FormControl>
                            <Label className="font-normal cursor-pointer">
                              {group.label}
                            </Label>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia</FormLabel>
              <Select 
                onValueChange={(value: MeetingFrequencyType) => {
                    field.onChange(value);
                    if (value !== 'OneTime') {
                        form.setValue('oneTimeDate', undefined); 
                    }
                }} 
                value={field.value} 
                // When editing a "OneTime" series, its frequency and date should not be changed via this form
                // as it's tied to a specific instance. This needs more complex handling if such edits are desired.
                disabled={isPending || (isEditing && initialValues?.frequency === "OneTime")} 
               >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frequencyOptions.map(opt => (
                    <SelectItem 
                        key={opt.value} 
                        value={opt.value} 
                        disabled={isEditing && initialValues?.frequency === "OneTime" && opt.value !== "OneTime"}>
                        {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && initialValues?.frequency === "OneTime" && 
                <FormMessage className="text-xs">La frecuencia y fecha de una reunión de 'Única Vez' no se pueden modificar directamente después de su creación. Para cambiarla, elimine esta serie y cree una nueva.</FormMessage>
              }
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchedFrequency === "OneTime" && (
            <FormField
            control={form.control}
            name="oneTimeDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Fecha de Reunión (para Única Vez)</FormLabel>
                <DatePicker 
                    date={field.value} 
                    setDate={field.onChange} 
                    placeholder="Seleccionar fecha" 
                    disabled={isPending || (isEditing && initialValues?.frequency === "OneTime")} 
                />
                 {isEditing && initialValues?.frequency === "OneTime" && 
                    <FormMessage className="text-xs mt-1">La fecha de la instancia única no es editable aquí.</FormMessage>
                 }
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        
        {/* Footer buttons are now usually handled by the parent Dialog (e.g. ManageMeetingSeriesDialog or PageSpecificAddMeetingDialog) */}
        {/* However, if this form is used standalone or for simple dialogs, these can be useful. */}
        {/* For ManageMeetingSeriesDialog, the "Cancel Edit" button is separate, and "Save" is part of this form's submit. */}
        {/* For PageSpecificAddMeetingDialog, DialogClose wraps the Cancel button. */}
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
           {!isEditing && ( // Only show DialogClose for "Add New" scenario if not nested in a complex dialog
             <DialogClose asChild> 
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                    Cancelar
                </Button>
            </DialogClose>
           )}
           {/* The "Cancel Edit" button is handled by ManageMeetingSeriesDialog externally now */}
           {/* This submit button is for both Add and Edit scenarios */}
          <Button type="submit" disabled={isPending}>
             {isPending ? <Loader2 className="animate-spin mr-2" /> : (isEditing ? "Guardar Cambios" : "Definir Serie")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
