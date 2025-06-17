
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { DefineMeetingSeriesFormValues, MeetingTargetRoleType, MeetingFrequencyType } from "@/lib/types";
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
import { useTransition } from "react";
import { DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DefineMeetingSeriesFormProps {
  defineMeetingSeriesAction: (data: DefineMeetingSeriesFormValues) => Promise<{ success: boolean; message: string; newSeries?: any, newInstance?: any }>;
  onSuccess?: () => void;
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

export default function DefineMeetingSeriesForm({ defineMeetingSeriesAction, onSuccess }: DefineMeetingSeriesFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<DefineMeetingSeriesFormValues>({
    resolver: zodResolver(DefineMeetingSeriesFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultTime: "10:00",
      defaultLocation: "Santuario Principal",
      defaultImageUrl: "",
      targetAttendeeGroups: [],
      frequency: "Recurring",
      oneTimeDate: undefined,
    },
  });

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
        form.reset({
          name: "", description: "", defaultTime: "10:00", defaultLocation: "Santuario Principal",
          defaultImageUrl: "", targetAttendeeGroups: [], frequency: "Recurring", oneTimeDate: undefined,
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
                <Input type="url" placeholder="https://example.com/image.png" {...field} value={field.value ?? ''} disabled={isPending} />
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
                disabled={isPending}
               >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frequencyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <DatePicker date={field.value} setDate={field.onChange} placeholder="Seleccionar fecha" />
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
           <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => { 
                form.reset({
                    name: "", description: "", defaultTime: "10:00", defaultLocation: "Santuario Principal",
                    defaultImageUrl: "", targetAttendeeGroups: [], frequency: "Recurring", oneTimeDate: undefined,
                });
            }} disabled={isPending}>
                Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isPending}>
             {isPending ? <Loader2 className="animate-spin mr-2" /> : "Definir Serie de Reunión"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
