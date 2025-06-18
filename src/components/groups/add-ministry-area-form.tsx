
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Member, AddMinistryAreaFormValues } from "@/lib/types";
import { AddMinistryAreaFormSchema } from "@/lib/types";
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
import { Loader2 } from "lucide-react";

interface AddMinistryAreaFormProps {
  onOpenChange: (open: boolean) => void;
  onAddArea: (newAreaData: AddMinistryAreaFormValues) => void; // Changed to accept form values
  activeMembers: Member[];
  isSubmitting?: boolean;
}

export default function AddMinistryAreaForm({ onOpenChange, onAddArea, activeMembers, isSubmitting = false }: AddMinistryAreaFormProps) {
  const form = useForm<AddMinistryAreaFormValues>({
    resolver: zodResolver(AddMinistryAreaFormSchema),
    defaultValues: {
      name: "",
      description: "",
      leaderId: "",
    },
  });

  function onSubmit(values: AddMinistryAreaFormValues) {
    onAddArea(values);
    // Dialog closing and form reset might be handled by parent after successful submission
    // For now, we'll close and reset here, assuming the parent will show a toast.
    // This behavior might need adjustment based on how `onAddArea` is handled.
    // If `onAddArea` is async and the parent handles closing, these might not be needed here.
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
              <FormLabel>Area Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Youth Ministry" {...field} disabled={isSubmitting} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the purpose of this area." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="leaderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Leader</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an active member as leader" />
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
          }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Add Ministry Area"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
