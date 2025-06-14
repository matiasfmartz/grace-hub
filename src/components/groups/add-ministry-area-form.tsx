
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { MinistryArea, Member, AddMinistryAreaFormValues } from "@/lib/types";
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

interface AddMinistryAreaFormProps {
  onOpenChange: (open: boolean) => void;
  onAddArea: (newArea: MinistryArea) => void;
  activeMembers: Member[];
}

export default function AddMinistryAreaForm({ onOpenChange, onAddArea, activeMembers }: AddMinistryAreaFormProps) {
  const form = useForm<AddMinistryAreaFormValues>({
    resolver: zodResolver(AddMinistryAreaFormSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      leaderId: "",
    },
  });

  function onSubmit(values: AddMinistryAreaFormValues) {
    const newArea: MinistryArea = {
      id: Date.now().toString(), // Temporary ID
      memberIds: [], // Initially no members except the leader implicitly
      ...values,
    };
    onAddArea(newArea);
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
                <Input placeholder="e.g., Youth Ministry" {...field} />
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
                <Textarea placeholder="Describe the purpose of this area." {...field} />
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
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/image.png" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          }}>
            Cancel
          </Button>
          <Button type="submit">Add Ministry Area</Button>
        </div>
      </form>
    </Form>
  );
}
