
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Member, GDI, MinistryArea, AddMemberFormValues } from "@/lib/types";
import { AddMemberFormSchema } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface AddMemberFormProps {
  onOpenChange: (open: boolean) => void;
  onAddMember: (newMember: Member) => void;
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
  allMembers: Member[]; // For populating leader/guide names
}

const NONE_GDI_OPTION_VALUE = "__NONE_GDI__";

export default function AddMemberForm({
  onOpenChange,
  onAddMember,
  allGDIs,
  allMinistryAreas,
  allMembers,
}: AddMemberFormProps) {
  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(AddMemberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: undefined,
      churchJoinDate: undefined,
      baptismDate: "",
      attendsLifeSchool: false,
      attendsBibleInstitute: false,
      fromAnotherChurch: false,
      status: "New",
      avatarUrl: "",
      assignedGDIId: null,
      assignedAreaIds: [],
    },
  });

  function onSubmit(values: AddMemberFormValues) {
    const newMember: Member = {
      id: Date.now().toString(), // Temporary ID
      ...values,
      birthDate: values.birthDate ? values.birthDate.toISOString().split('T')[0] : undefined,
      churchJoinDate: values.churchJoinDate ? values.churchJoinDate.toISOString().split('T')[0] : undefined,
      assignedGDIId: values.assignedGDIId === NONE_GDI_OPTION_VALUE ? null : values.assignedGDIId,
    };
    onAddMember(newMember);
    onOpenChange(false); // Close dialog on submit
    form.reset();
  }

  const getMemberName = (memberId: string | undefined | null) => {
    if (!memberId) return "N/A";
    const member = allMembers.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : "N/A";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="max-h-[calc(80vh-220px)] pr-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="555-1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Birth Date</FormLabel>
                <DatePicker date={field.value} setDate={field.onChange} placeholder="Select birth date" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="churchJoinDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Church Join Date</FormLabel>
                <DatePicker date={field.value} setDate={field.onChange} placeholder="Select join date" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="baptismDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baptism Date (Month Year)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., June 2023 or 2023-06-15" {...field} />
                </FormControl>
                <FormDescription>Enter month and year, or full date.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Avatar URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/avatar.png" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center space-x-2 md:col-span-1">
            <FormField
              control={form.control}
              name="attendsLifeSchool"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Attends Life School?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
           <div className="flex items-center space-x-2 md:col-span-1">
            <FormField
              control={form.control}
              name="attendsBibleInstitute"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Attends Bible Institute?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
           <div className="flex items-center space-x-2 md:col-span-2">
            <FormField
              control={form.control}
              name="fromAnotherChurch"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Came from another church?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="assignedGDIId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Assign to GDI</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value === null ? NONE_GDI_OPTION_VALUE : field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a GDI" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_GDI_OPTION_VALUE}>None</SelectItem>
                    {allGDIs.map((gdi) => (
                      <SelectItem key={gdi.id} value={gdi.id}>
                        {gdi.name} (Guide: {getMemberName(gdi.guideId)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="md:col-span-2 space-y-2">
            <Label>Assign to Ministry Areas</Label>
            <FormField
              control={form.control}
              name="assignedAreaIds"
              render={() => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-md max-h-48 overflow-y-auto">
                  {allMinistryAreas.map((area) => (
                    <FormField
                      key={area.id}
                      control={form.control}
                      name="assignedAreaIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={area.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(area.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), area.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== area.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {area.name} (Leader: {getMemberName(area.leaderId)})
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
              )}
            />
            <FormMessage>{form.formState.errors.assignedAreaIds?.message}</FormMessage>
          </div>
        </div>
        </ScrollArea>
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => {
            onOpenChange(false);
            form.reset();
            }}>
            Cancel
          </Button>
          <Button type="submit">Add Member</Button>
        </div>
      </form>
    </Form>
  );
}
