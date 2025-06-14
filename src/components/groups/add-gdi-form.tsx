
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { GDI, Member, AddGdiFormValues } from "@/lib/types";
import { AddGdiFormSchema } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddGdiFormProps {
  onOpenChange: (open: boolean) => void;
  onAddGDI: (newGdi: GDI) => void;
  activeMembers: Member[];
}

export default function AddGdiForm({ onOpenChange, onAddGDI, activeMembers }: AddGdiFormProps) {
  const form = useForm<AddGdiFormValues>({
    resolver: zodResolver(AddGdiFormSchema),
    defaultValues: {
      name: "",
      guideId: "",
    },
  });

  function onSubmit(values: AddGdiFormValues) {
    const newGdi: GDI = {
      id: Date.now().toString(), // Temporary ID
      memberIds: [], // Initially no members except the guide implicitly
      ...values,
    };
    onAddGDI(newGdi);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GDI Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., GDI Alpha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="guideId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Guide</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an active member as guide" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => {
            onOpenChange(false);
            form.reset();
          }}>
            Cancel
          </Button>
          <Button type="submit">Add GDI</Button>
        </div>
      </form>
    </Form>
  );
}
