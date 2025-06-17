
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AddGeneralMeetingFormValues, MeetingType } from "@/lib/types";
import { AddGeneralMeetingFormSchema } from "@/lib/types";
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

interface AddMeetingFormProps {
  addMeetingAction: (data: AddGeneralMeetingFormValues) => Promise<{ success: boolean; message: string; newMeeting?: any }>;
}

const creatableMeetingTypes: MeetingType[] = [
  "General_Service",
  "Obreros_Meeting",
  "Lideres_Meeting",
  "Special_Meeting"
];

const meetingTypeTranslations: Record<MeetingType, string> = {
  General_Service: "Servicio General",
  GDI_Meeting: "Reunión de GDI",
  Obreros_Meeting: "Reunión de Obreros",
  Lideres_Meeting: "Reunión de Líderes",
  Area_Meeting: "Reunión de Área Ministerial",
  Special_Meeting: "Reunión Especial",
};

export default function AddMeetingForm({ addMeetingAction }: AddMeetingFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true); 

  const form = useForm<AddGeneralMeetingFormValues>({
    resolver: zodResolver(AddGeneralMeetingFormSchema),
    defaultValues: {
      name: "",
      type: "General_Service", 
      time: "10:00",
      location: "",
      description: "",
      imageUrl: "",
    },
  });

  async function onSubmit(values: AddGeneralMeetingFormValues) {
    startTransition(async () => {
      const result = await addMeetingAction(values);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        form.reset();
        setIsOpen(false); 
        setTimeout(() => {
            const closeButton = document.getElementById('add-meeting-dialog-close-button');
            if (closeButton) {
                closeButton.click();
            }
        }, 100);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }

  if (!isOpen) {
    return <DialogClose id="add-meeting-dialog-close-button-hidden" className="hidden" />;
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de reunión" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {creatableMeetingTypes.map(type => (
                    <SelectItem key={type} value={type}>{meetingTypeTranslations[type] || type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
            <Button type="button" variant="outline" id="add-meeting-dialog-close-button" disabled={isPending}>
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
