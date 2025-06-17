
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AddGeneralMeetingFormValues, MeetingType, Member } from "@/lib/types";
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
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition, useMemo } from "react";
import { DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddMeetingFormProps {
  addMeetingAction: (data: AddGeneralMeetingFormValues) => Promise<{ success: boolean; message: string; newMeeting?: any }>;
  onSuccess?: () => void;
  allMembers: Member[]; // Added prop for member selection
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

export default function AddMeetingForm({ addMeetingAction, onSuccess, allMembers }: AddMeetingFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [attendeeSearchTerm, setAttendeeSearchTerm] = useState('');

  const form = useForm<AddGeneralMeetingFormValues>({
    resolver: zodResolver(AddGeneralMeetingFormSchema),
    defaultValues: {
      name: "",
      type: "General_Service", 
      time: "10:00",
      location: "",
      description: "",
      imageUrl: "",
      attendeeUids: [],
    },
  });

  const watchedMeetingType = form.watch("type");

  const filteredMembersForSelection = useMemo(() => {
    if (!allMembers) return [];
    if (!attendeeSearchTerm) return allMembers.filter(m => m.status === 'Active'); // Show active by default
    return allMembers.filter(member =>
      member.status === 'Active' &&
      (`${member.firstName} ${member.lastName}`.toLowerCase().includes(attendeeSearchTerm.toLowerCase()) ||
       member.email.toLowerCase().includes(attendeeSearchTerm.toLowerCase()))
    );
  }, [allMembers, attendeeSearchTerm]);

  async function onSubmit(values: AddGeneralMeetingFormValues) {
    startTransition(async () => {
      const dataToSend = { ...values };
      if (dataToSend.type !== 'Special_Meeting') {
        // Ensure attendeeUids is empty or not sent if not a special meeting
        delete dataToSend.attendeeUids; 
      }
      
      const result = await addMeetingAction(dataToSend);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        form.reset({
          name: "", type: "General_Service", time: "10:00", location: "",
          description: "", imageUrl: "", attendeeUids: [],
        });
        setAttendeeSearchTerm('');
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
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
            name="attendeeUids"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Seleccionar Asistentes (para Reunión Especial)</FormLabel>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar miembros activos..."
                        value={attendeeSearchTerm}
                        onChange={(e) => setAttendeeSearchTerm(e.target.value)}
                        className="pl-8 mb-2"
                        disabled={isPending}
                    />
                </div>
                <ScrollArea className="h-48 w-full rounded-md border p-2">
                  {filteredMembersForSelection.length > 0 ? filteredMembersForSelection.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-1.5 hover:bg-muted/50 rounded-md">
                      <Checkbox
                        id={`attendee-${member.id}`}
                        checked={field.value?.includes(member.id)}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          return checked
                            ? field.onChange([...currentValue, member.id])
                            : field.onChange(currentValue.filter(id => id !== member.id));
                        }}
                        disabled={isPending}
                      />
                      <Label htmlFor={`attendee-${member.id}`} className="font-normal text-sm cursor-pointer flex-grow">
                        {member.firstName} {member.lastName} ({member.email})
                      </Label>
                    </div>
                  )) : (
                     <p className="text-sm text-muted-foreground text-center py-4">
                        {attendeeSearchTerm ? "No hay miembros que coincidan." : "No hay miembros activos."}
                    </p>
                  )}
                </ScrollArea>
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
            <Button type="button" variant="outline" onClick={() => { form.reset(); setAttendeeSearchTerm(''); }} disabled={isPending}>
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
