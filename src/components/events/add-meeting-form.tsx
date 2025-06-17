
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AddGeneralMeetingFormValues, MeetingType, Member, MeetingRoleType } from "@/lib/types";
import { AddGeneralMeetingFormSchema, MeetingRoleEnum } from "@/lib/types";
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
import { useState, useTransition } from "react";
import { DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
// Removed Search and ScrollArea as individual member selection is removed for roles

interface AddMeetingFormProps {
  addMeetingAction: (data: AddGeneralMeetingFormValues) => Promise<{ success: boolean; message: string; newMeeting?: any }>;
  onSuccess?: () => void;
  allMembers: Member[]; // Still needed if other parts of the form use it, but not for role selection logic here.
}

const creatableMeetingTypes: MeetingType[] = [
  "General_Service",
  "Obreros_Meeting",
  "Lideres_Meeting",
  "Special_Meeting"
];

const meetingTypeTranslations: Record<string, string> = {
  General_Service: "Servicio General",
  GDI_Meeting: "Reunión de GDI",
  Obreros_Meeting: "Reunión de Obreros",
  Lideres_Meeting: "Reunión de Líderes",
  Area_Meeting: "Reunión de Área Ministerial",
  Special_Meeting: "Reunión Especial",
};

const meetingRoles: { id: MeetingRoleType; label: string }[] = [
  { id: "generalAttendees", label: "Asistentes Generales (Miembros de GDI)" },
  { id: "workers", label: "Obreros (Guías, Líderes de Área, Miembros de Área)" },
  { id: "leaders", label: "Líderes (Guías de GDI, Líderes de Área)" },
];


export default function AddMeetingForm({ addMeetingAction, onSuccess, allMembers }: AddMeetingFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<AddGeneralMeetingFormValues>({
    resolver: zodResolver(AddGeneralMeetingFormSchema),
    defaultValues: {
      name: "",
      type: "General_Service", 
      time: "10:00",
      location: "",
      description: "",
      imageUrl: "",
      selectedRoles: [],
    },
  });

  const watchedMeetingType = form.watch("type");

  async function onSubmit(values: AddGeneralMeetingFormValues) {
    startTransition(async () => {
      const dataToSend = { ...values };
      if (dataToSend.type !== 'Special_Meeting') {
        delete dataToSend.selectedRoles; 
      }
      
      const result = await addMeetingAction(dataToSend);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        form.reset({
          name: "", type: "General_Service", time: "10:00", location: "",
          description: "", imageUrl: "", selectedRoles: [],
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Reunión</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Servicio Dominical" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Reunión</FormLabel>
              <Select 
                onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== 'Special_Meeting') {
                        form.setValue('selectedRoles', []); // Clear roles if not special meeting
                    }
                }} 
                defaultValue={field.value} 
                disabled={isPending}
               >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de reunión" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {creatableMeetingTypes.map(type => (
                    <SelectItem key={type} value={type}>{(meetingTypeTranslations[type as MeetingType]) || type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedMeetingType === "Special_Meeting" && (
          <FormField
            control={form.control}
            name="selectedRoles"
            render={() => ( // Outer render for FormItem structure
              <FormItem className="space-y-3">
                <FormLabel>Seleccionar Grupos de Asistentes (para Reunión Especial)</FormLabel>
                <div className="space-y-2 p-2 border rounded-md">
                  {meetingRoles.map((role) => (
                    <FormField
                      key={role.id}
                      control={form.control}
                      name="selectedRoles"
                      render={({ field }) => { // Inner render for each checkbox field
                        return (
                          <FormItem
                            key={role.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role.id)}
                                onCheckedChange={(checked) => {
                                  const currentRoles = field.value || [];
                                  return checked
                                    ? field.onChange([...currentRoles, role.id])
                                    : field.onChange(
                                        currentRoles.filter(
                                          (value) => value !== role.id
                                        )
                                      );
                                }}
                                disabled={isPending}
                              />
                            </FormControl>
                            <Label className="font-normal cursor-pointer">
                              {role.label}
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
        )}


        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              <DatePicker date={field.value} setDate={field.onChange} placeholder="Seleccionar fecha" />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hora (HH:MM)</FormLabel>
              <FormControl>
                <Input type="time" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicación</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Santuario Principal" {...field} disabled={isPending} />
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
                <Textarea placeholder="Breve descripción de la reunión." {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Imagen (Opcional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/image.png" {...field} value={field.value ?? ''} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
           <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => { 
                form.reset({
                    name: "", type: "General_Service", time: "10:00", location: "",
                    description: "", imageUrl: "", selectedRoles: [],
                });
            }} disabled={isPending}>
                Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isPending}>
             {isPending ? <Loader2 className="animate-spin mr-2" /> : "Agregar Reunión"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
