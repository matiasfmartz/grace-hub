
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { DefineMeetingSeriesFormValues, MeetingTargetRoleType, MeetingFrequencyType, MeetingSeries, DayOfWeekType, MonthlyRuleType, WeekOrdinalType } from "@/lib/types";
import { DefineMeetingSeriesFormSchema, MeetingTargetRoleEnum, MeetingFrequencyEnum, DayOfWeekEnum, MonthlyRuleTypeEnum, WeekOrdinalEnum, daysOfWeek, weekOrdinals } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import React, { useTransition, useEffect, useMemo } from "react";
import { DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isValid as isValidDate, format } from 'date-fns';

interface DefineMeetingSeriesFormProps {
  defineMeetingSeriesAction: (data: DefineMeetingSeriesFormValues) => Promise<{ success: boolean; message: string; newSeries?: any, newInstance?: any, updatedSeries?: MeetingSeries }>;
  onSuccess?: () => void;
  initialValues?: DefineMeetingSeriesFormValues;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}

const baseDefaultFormValues: DefineMeetingSeriesFormValues = {
  name: "",
  description: "",
  defaultTime: "10:00",
  defaultLocation: "Santuario Principal",
  defaultImageUrl: "",
  targetAttendeeGroups: [],
  frequency: "Weekly",
  oneTimeDate: undefined,
  weeklyDays: [],
  monthlyRuleType: undefined,
  monthlyDayOfMonth: undefined,
  monthlyWeekOrdinal: undefined,
  monthlyDayOfWeek: undefined,
};

const getResolvedDefaultValues = (
  currentInitialValues?: DefineMeetingSeriesFormValues,
): DefineMeetingSeriesFormValues => {
  
  let oneTimeDateToSet: Date | undefined = undefined;
  if (currentInitialValues?.oneTimeDate) {
    // Ensure it's a Date object and valid before assigning
    if (currentInitialValues.oneTimeDate instanceof Date && isValidDate(currentInitialValues.oneTimeDate)) {
      oneTimeDateToSet = currentInitialValues.oneTimeDate;
    }
    // If it's a string (from older data or direct JSON), try to parse it
    else if (typeof currentInitialValues.oneTimeDate === 'string') {
      const parsedDate = new Date(currentInitialValues.oneTimeDate); // More lenient parsing
      if (isValidDate(parsedDate)) {
        oneTimeDateToSet = parsedDate;
      }
    }
  }
  
  const resolved: DefineMeetingSeriesFormValues = {
    ...baseDefaultFormValues, // Start with base defaults
    name: currentInitialValues?.name ?? baseDefaultFormValues.name,
    description: currentInitialValues?.description ?? baseDefaultFormValues.description,
    defaultTime: currentInitialValues?.defaultTime ?? baseDefaultFormValues.defaultTime,
    defaultLocation: currentInitialValues?.defaultLocation ?? baseDefaultFormValues.defaultLocation,
    defaultImageUrl: currentInitialValues?.defaultImageUrl ?? baseDefaultFormValues.defaultImageUrl,
    targetAttendeeGroups: currentInitialValues?.targetAttendeeGroups ?? baseDefaultFormValues.targetAttendeeGroups,
    frequency: currentInitialValues?.frequency ?? baseDefaultFormValues.frequency,
    oneTimeDate: oneTimeDateToSet,
    weeklyDays: currentInitialValues?.weeklyDays ?? baseDefaultFormValues.weeklyDays,
    monthlyRuleType: currentInitialValues?.monthlyRuleType ?? baseDefaultFormValues.monthlyRuleType,
    monthlyDayOfMonth: currentInitialValues?.monthlyDayOfMonth ?? baseDefaultFormValues.monthlyDayOfMonth,
    monthlyWeekOrdinal: currentInitialValues?.monthlyWeekOrdinal ?? baseDefaultFormValues.monthlyWeekOrdinal,
    monthlyDayOfWeek: currentInitialValues?.monthlyDayOfWeek ?? baseDefaultFormValues.monthlyDayOfWeek,
  };

  // Ensure all string fields are indeed strings to prevent uncontrolled -> controlled warning
  resolved.name = resolved.name || "";
  resolved.description = resolved.description || "";
  resolved.defaultImageUrl = resolved.defaultImageUrl || "";
  resolved.defaultTime = resolved.defaultTime || "00:00";
  resolved.defaultLocation = resolved.defaultLocation || "";
  
  return resolved;
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

  const resolvedDefaultValues = useMemo(() => getResolvedDefaultValues(initialValues), [initialValues]);

  const form = useForm<DefineMeetingSeriesFormValues>({
    resolver: zodResolver(DefineMeetingSeriesFormSchema),
    defaultValues: resolvedDefaultValues,
  });

  useEffect(() => {
    form.reset(getResolvedDefaultValues(initialValues));
  }, [initialValues, form.reset]);


  const watchedFrequency = form.watch("frequency");
  const watchedMonthlyRuleType = form.watch("monthlyRuleType");

  useEffect(() => {
    if (watchedFrequency !== 'OneTime') form.setValue('oneTimeDate', undefined, { shouldValidate: true });
    if (watchedFrequency !== 'Weekly') form.setValue('weeklyDays', [], { shouldValidate: true });
    if (watchedFrequency !== 'Monthly') {
      form.setValue('monthlyRuleType', undefined, { shouldValidate: true });
      form.setValue('monthlyDayOfMonth', undefined, { shouldValidate: true });
      form.setValue('monthlyWeekOrdinal', undefined, { shouldValidate: true });
      form.setValue('monthlyDayOfWeek', undefined, { shouldValidate: true });
    }
  }, [watchedFrequency, form.setValue]);

  useEffect(() => {
    if (watchedFrequency === 'Monthly' && watchedMonthlyRuleType === 'DayOfWeekOfMonth') {
      form.setValue('monthlyDayOfMonth', undefined, { shouldValidate: true });
    }
    if (watchedFrequency === 'Monthly' && watchedMonthlyRuleType === 'DayOfMonth') {
      form.setValue('monthlyWeekOrdinal', undefined, { shouldValidate: true });
      form.setValue('monthlyDayOfWeek', undefined, { shouldValidate: true });
    }
  }, [watchedMonthlyRuleType, watchedFrequency, form.setValue]);


  async function onSubmit(values: DefineMeetingSeriesFormValues) {
    startTransition(async () => {
      // Prepare data for server action, ensuring date is correctly formatted if present
      const dataToSend = { 
        ...values,
        oneTimeDate: values.oneTimeDate instanceof Date && isValidDate(values.oneTimeDate) 
                     ? values.oneTimeDate // Pass as Date object, server action will format
                     : undefined,
      };
      
      if (dataToSend.frequency !== 'OneTime') delete dataToSend.oneTimeDate;
      if (dataToSend.frequency !== 'Weekly') delete dataToSend.weeklyDays;
      if (dataToSend.frequency !== 'Monthly') {
        delete dataToSend.monthlyRuleType;
        delete dataToSend.monthlyDayOfMonth;
        delete dataToSend.monthlyWeekOrdinal;
        delete dataToSend.monthlyDayOfWeek;
      } else {
        if (dataToSend.monthlyRuleType !== 'DayOfMonth') delete dataToSend.monthlyDayOfMonth;
        if (dataToSend.monthlyRuleType !== 'DayOfWeekOfMonth') {
            delete dataToSend.monthlyWeekOrdinal;
            delete dataToSend.monthlyDayOfWeek;
        }
      }

      const result = await defineMeetingSeriesAction(dataToSend);
      if (result.success) {
        toast({ title: "Éxito", description: result.message });
        if (onSuccess) {
          onSuccess();
        }
        if (!isEditing) { 
            form.reset(getResolvedDefaultValues(undefined));
        }
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }

  const handleCancel = () => {
    if (isEditing && onCancelEdit) {
      onCancelEdit(); 
    }
    // Reset to initial (if editing) or base defaults (if adding)
    form.reset(getResolvedDefaultValues(isEditing ? initialValues : undefined));
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
                <Textarea placeholder="Breve descripción de esta serie de reuniones." {...field} value={field.value ?? ''} disabled={isPending} />
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
                  {[{ id: "generalAttendees", label: "Asistentes Generales (Miembros de GDI)" }, { id: "workers", label: "Obreros (Guías, Líderes de Área, Miembros de Área)" }, { id: "leaders", label: "Líderes (Guías de GDI, Líderes de Área)" }].map((group) => (
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
                                checked={field.value?.includes(group.id as MeetingTargetRoleType)}
                                onCheckedChange={(checked) => {
                                  const currentGroups = field.value || [];
                                  return checked
                                    ? field.onChange([...currentGroups, group.id as MeetingTargetRoleType])
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
                onValueChange={(value: MeetingFrequencyType) => field.onChange(value)}
                value={field.value}
                disabled={isPending || (isEditing && initialValues?.frequency === "OneTime")}
               >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[{ value: "OneTime", label: "Única Vez"}, { value: "Weekly", label: "Semanal"}, { value: "Monthly", label: "Mensual"}].map(opt => (
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
                <FormDescription className="text-xs">La frecuencia de una reunión 'Única Vez' no se puede cambiar después de su creación.</FormDescription>
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
                    <FormDescription className="text-xs mt-1">La fecha de la instancia única no es editable aquí.</FormDescription>
                 }
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        {watchedFrequency === "Weekly" && (
          <FormField
            control={form.control}
            name="weeklyDays"
            render={() => (
              <FormItem className="space-y-3">
                <FormLabel>Días de la Semana (para Semanal)</FormLabel>
                 <FormDescription>Seleccione los días en que se repetirá la reunión.</FormDescription>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 border rounded-md">
                  {daysOfWeek.map((day) => (
                    <FormField
                      key={day.id}
                      control={form.control}
                      name="weeklyDays"
                      render={({ field }) => (
                        <FormItem key={day.id} className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(day.id)}
                              onCheckedChange={(checked) => {
                                const currentDays = field.value || [];
                                return checked
                                  ? field.onChange([...currentDays, day.id])
                                  : field.onChange(currentDays.filter(value => value !== day.id));
                              }}
                              disabled={isPending}
                            />
                          </FormControl>
                          <Label className="font-normal cursor-pointer text-sm">{day.label}</Label>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchedFrequency === "Monthly" && (
          <div className="space-y-4 p-4 border rounded-md">
            <FormField
              control={form.control}
              name="monthlyRuleType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Regla Mensual</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange as (value: string) => void}
                      value={field.value}
                      className="flex flex-col space-y-1"
                      disabled={isPending}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="DayOfMonth" />
                        </FormControl>
                        <FormLabel className="font-normal">Un día específico del mes (ej: el 15)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="DayOfWeekOfMonth" />
                        </FormControl>
                        <FormLabel className="font-normal">Un día específico de la semana en el mes (ej: el tercer Martes)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedMonthlyRuleType === "DayOfMonth" && (
              <FormField
                control={form.control}
                name="monthlyDayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Día del Mes (1-31)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1" max="31"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value,10))}
                        disabled={isPending}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedMonthlyRuleType === "DayOfWeekOfMonth" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyWeekOrdinal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semana Ordinal</FormLabel>
                      <Select onValueChange={field.onChange as (value: WeekOrdinalType) => void} value={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar semana" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {weekOrdinals.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyDayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Día de la Semana</FormLabel>
                      <Select onValueChange={field.onChange as (value: DayOfWeekType) => void} value={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar día" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {daysOfWeek.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
           {(!isEditing || (isEditing && !onCancelEdit)) && ( 
             <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                    Cancelar
                </Button>
            </DialogClose>
           )}
           {isEditing && onCancelEdit && ( 
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                    Cancelar Edición
                </Button>
           )}
          <Button type="submit" disabled={isPending}>
             {isPending ? <Loader2 className="animate-spin mr-2" /> : (isEditing ? "Guardar Cambios" : "Definir Serie")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
