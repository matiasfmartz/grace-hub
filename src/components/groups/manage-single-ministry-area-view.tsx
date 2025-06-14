
"use client";

import { useState, useTransition, useEffect } from 'react';
import type { MinistryArea, Member, UpdateMinistryAreaLeaderFormValues, AssignMinistryAreaMembersFormValues } from '@/lib/types';
import { UpdateMinistryAreaLeaderFormSchema, AssignMinistryAreaMembersFormSchema } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Users, UserCheck, ListChecks, Save, Image as ImageIcon, Edit3 } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManageSingleMinistryAreaViewProps {
  ministryArea: MinistryArea;
  allMembers: Member[];
  activeMembers: Member[];
  updateMinistryAreaAction: (
    areaId: string,
    updatedData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description' | 'imageUrl'>>
  ) => Promise<{ success: boolean; message: string; updatedArea?: MinistryArea }>;
}

export default function ManageSingleMinistryAreaView({
  ministryArea: initialMinistryArea,
  allMembers,
  activeMembers,
  updateMinistryAreaAction,
}: ManageSingleMinistryAreaViewProps) {
  const [ministryArea, setMinistryArea] = useState<MinistryArea>(initialMinistryArea);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const leaderForm = useForm<UpdateMinistryAreaLeaderFormValues>({
    resolver: zodResolver(UpdateMinistryAreaLeaderFormSchema),
    defaultValues: {
      leaderId: ministryArea.leaderId || '',
    },
  });

  const membersForm = useForm<AssignMinistryAreaMembersFormValues>({
    resolver: zodResolver(AssignMinistryAreaMembersFormSchema),
    defaultValues: {
      memberIds: ministryArea.memberIds || [],
    },
  });
  
  const detailsForm = useForm<Pick<MinistryArea, 'name' | 'description' | 'imageUrl'>>({
    defaultValues: {
      name: ministryArea.name,
      description: ministryArea.description,
      imageUrl: ministryArea.imageUrl || '',
    }
  })

  useEffect(() => {
    leaderForm.reset({ leaderId: ministryArea.leaderId || '' });
    membersForm.reset({ memberIds: ministryArea.memberIds || [] });
    detailsForm.reset({
      name: ministryArea.name,
      description: ministryArea.description,
      imageUrl: ministryArea.imageUrl || '',
    });
  }, [ministryArea, leaderForm, membersForm, detailsForm]);

  const currentLeader = allMembers.find(m => m.id === ministryArea.leaderId);

  const handleUpdateLeader = (values: UpdateMinistryAreaLeaderFormValues) => {
    startTransition(async () => {
      const result = await updateMinistryAreaAction(ministryArea.id, { leaderId: values.leaderId });
      if (result.success && result.updatedArea) {
        setMinistryArea(result.updatedArea);
        toast({ title: "Success", description: "Leader updated successfully." });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleUpdateMembers = (values: AssignMinistryAreaMembersFormValues) => {
    startTransition(async () => {
      const result = await updateMinistryAreaAction(ministryArea.id, { memberIds: values.memberIds });
      if (result.success && result.updatedArea) {
        setMinistryArea(result.updatedArea);
        toast({ title: "Success", description: "Members updated successfully." });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleUpdateDetails = (values: Pick<MinistryArea, 'name' | 'description' | 'imageUrl'>) => {
    startTransition(async () => {
      const result = await updateMinistryAreaAction(ministryArea.id, { 
        name: values.name, 
        description: values.description,
        imageUrl: values.imageUrl || 'https://placehold.co/600x400' 
      });
      if (result.success && result.updatedArea) {
        setMinistryArea(result.updatedArea);
        toast({ title: "Success", description: "Area details updated successfully." });
        // Update the page title potentially, though this is client side
        if (typeof window !== "undefined") {
            document.title = `Manage: ${result.updatedArea.name}`;
        }
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Edit3 className="mr-2 h-6 w-6 text-primary" /> Edit Area Details</CardTitle>
          <CardDescription>Update the name, description, and image for this ministry area.</CardDescription>
        </CardHeader>
        <Form {...detailsForm}>
          <form onSubmit={detailsForm.handleSubmit(handleUpdateDetails)}>
            <CardContent className="space-y-4">
              <FormField
                control={detailsForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={detailsForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={detailsForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                       <Input type="url" {...field} value={field.value ?? ''} placeholder="https://placehold.co/600x400" disabled={isPending} />
                    </FormControl>
                    {field.value && (
                      <div className="mt-2 relative w-full h-40 rounded overflow-hidden border">
                        <Image src={field.value} alt="Area image preview" layout="fill" objectFit="cover" data-ai-hint="ministry event" />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Details
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserCheck className="mr-2 h-6 w-6 text-primary" /> Change Leader</CardTitle>
          <CardDescription>
            Current Leader: {currentLeader ? `${currentLeader.firstName} ${currentLeader.lastName}` : 'N/A'}
          </CardDescription>
        </CardHeader>
        <Form {...leaderForm}>
          <form onSubmit={leaderForm.handleSubmit(handleUpdateLeader)}>
            <CardContent>
              <FormField
                control={leaderForm.control}
                name="leaderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Leader</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a new leader" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Update Leader
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-primary" /> Assign Members</CardTitle>
          <CardDescription>Select members to assign to this ministry area. Currently {ministryArea.memberIds.length} members assigned.</CardDescription>
        </CardHeader>
        <Form {...membersForm}>
          <form onSubmit={membersForm.handleSubmit(handleUpdateMembers)}>
            <CardContent>
              <FormField
                control={membersForm.control}
                name="memberIds"
                render={() => (
                  <FormItem>
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                      <div className="space-y-2">
                        {allMembers.map((member) => (
                          <FormField
                            key={member.id}
                            control={membersForm.control}
                            name="memberIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={member.id}
                                  className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-muted/50 rounded-md"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(member.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), member.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== member.id
                                              )
                                            );
                                      }}
                                      disabled={isPending || member.id === ministryArea.leaderId} // Disable checkbox for current leader
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal flex-grow cursor-pointer">
                                    {member.firstName} {member.lastName}
                                    {member.id === ministryArea.leaderId && <span className="text-xs text-primary ml-2">(Leader)</span>}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />} Update Member Assignments
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
