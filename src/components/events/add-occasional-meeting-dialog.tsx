
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
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { MeetingSeries, AddOccasionalMeetingFormValues, Meeting } from "@/lib/types";
import { AddOccasionalMeetingFormSchema } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, PlusSquare } from "lucide-react";
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

  const form = useForm<AddOccasionalMeetingFormValues>({
    resolver: zodResolver(AddOccasionalMeetingFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      time: "00:00",
      location: "",
      description: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: `${series.name} (Ocasional)`,
        date: new Date(),
        time: series.defaultTime,
        location: series.defaultLocation,
        description: series.description || "",
        imageUrl: series.defaultImageUrl || "",
      });
    }
  }, [open, series]); // form.reset es estable y no necesita estar en el array de dependencias

  const onSubmit = (values: AddOccasionalMeetingFormValues) => {
    startTransition(async () => {
      const result = await addOccasionalMeetingAction(series.id, values);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        setOpen(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Instancia</FormLabel>
                    <FormControl><Input {...field} disabled={isPending} /></FormControl>
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
                    <DatePicker
                      date={field.value}
                      setDate={field.onChange}
                      placeholder="Seleccionar fecha"
                      disabled={isPending}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <FormControl><Input type="time" {...field} disabled={isPending} /></FormControl>
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
                      <FormControl><Input {...field} disabled={isPending} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl><Textarea {...field} value={field.value ?? ''} disabled={isPending} /></FormControl>
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
                    <FormControl><Input type="url" {...field} value={field.value ?? ''} disabled={isPending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isPending}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                  {isPending ? "Programando..." : "Programar Instancia"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
