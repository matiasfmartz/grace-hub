
"use client";

import { useState, useTransition, useEffect, useMemo } from 'react';
import type { MinistryArea, Member } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Image as ImageIcon, Users, UserCheck, ArrowLeft, Edit3, Search, UserPlus, UserX, XCircle } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';

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
  const [editableArea, setEditableArea] = useState<MinistryArea>(initialMinistryArea);
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setEditableArea(initialMinistryArea);
  }, [initialMinistryArea]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableArea(prev => ({ ...prev, [name]: value }));
  };

  const handleLeaderChange = (leaderId: string) => {
    setEditableArea(prev => {
      // If the new leader was previously in memberIds, remove them from there
      const newMemberIds = (prev.memberIds || []).filter(id => id !== leaderId);
      return { ...prev, leaderId, memberIds: newMemberIds };
    });
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableArea(prev => ({ ...prev, imageUrl: e.target.value || undefined }));
  }

  const handleMemberSelectionChange = (memberIdToToggle: string, isChecked: boolean) => {
    setEditableArea(prevArea => {
      const currentMemberIds = prevArea.memberIds || [];
      let newMemberIds;

      if (isChecked) {
        // Add member if not already present and not the leader
        if (!currentMemberIds.includes(memberIdToToggle) && memberIdToToggle !== prevArea.leaderId) {
          newMemberIds = [...currentMemberIds, memberIdToToggle];
        } else {
          newMemberIds = currentMemberIds;
        }
      } else {
        // Remove member if present (this case primarily for unchecking from "Add Members" list, actual removal from "Assigned" is via button)
         newMemberIds = currentMemberIds.filter(id => id !== memberIdToToggle);
      }
      return { ...prevArea, memberIds: newMemberIds };
    });
  };

  const removeAssignedMember = (memberIdToRemove: string) => {
    if (memberIdToRemove === editableArea.leaderId) {
        toast({ title: "Action Denied", description: "Cannot remove the Area Leader. Change the leader first.", variant: "destructive" });
        return;
    }
    setEditableArea(prevArea => ({
        ...prevArea,
        memberIds: (prevArea.memberIds || []).filter(id => id !== memberIdToRemove)
    }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const { id, ...dataToUpdate } = editableArea;

      const finalDataToUpdate = {
        name: dataToUpdate.name,
        description: dataToUpdate.description,
        leaderId: dataToUpdate.leaderId,
        memberIds: (dataToUpdate.memberIds || []).filter(mId => mId !== dataToUpdate.leaderId), // Ensure leader is not in memberIds
        imageUrl: dataToUpdate.imageUrl || 'https://placehold.co/600x400',
      };

      const result = await updateMinistryAreaAction(initialMinistryArea.id, finalDataToUpdate);
      if (result.success && result.updatedArea) {
        toast({ title: "Success", description: "Ministry Area updated successfully." });
        setEditableArea(result.updatedArea);

        if (typeof window !== "undefined" && result.updatedArea.name !== initialMinistryArea.name) {
          document.title = `Manage: ${result.updatedArea.name}`;
        }
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const getMemberName = (memberId: string | undefined | null): string => {
    if (!memberId) return 'N/A';
    const member = allMembers.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'N/A (Unknown Member)';
  };
  
  const leaderDetails = useMemo(() => {
    return allMembers.find(m => m.id === editableArea.leaderId);
  }, [editableArea.leaderId, allMembers]);

  const availableMembersForAssignment = useMemo(() => {
    return activeMembers.filter(member =>
      member.id !== editableArea.leaderId &&
      !(editableArea.memberIds || []).includes(member.id) &&
      (`${member.firstName} ${member.lastName}`.toLowerCase().includes(addMemberSearchTerm.toLowerCase()) ||
       member.email.toLowerCase().includes(addMemberSearchTerm.toLowerCase()))
    );
  }, [activeMembers, editableArea.leaderId, editableArea.memberIds, addMemberSearchTerm]);

  const currentlyAssignedDisplayMembers = useMemo(() => {
    return (editableArea.memberIds || []).map(id => allMembers.find(m => m.id === id)).filter(Boolean) as Member[];
  }, [editableArea.memberIds, allMembers]);


  return (
    <Card className="w-full">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <CardTitle className="flex items-center text-2xl">
                        <Edit3 className="mr-3 h-7 w-7 text-primary" /> Manage: {initialMinistryArea.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                        Modify details, leader, and members. Click "Save All Changes" when done.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Pane */}
            <div className="lg:col-span-2 space-y-6">
                <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />Area Leader</h3>
                    <Label htmlFor="leaderIdSelect">Select Leader</Label>
                    <Select onValueChange={handleLeaderChange} value={editableArea.leaderId} disabled={isPending}>
                        <SelectTrigger className="mt-1" id="leaderIdSelect">
                            <SelectValue placeholder="Select a new leader" />
                        </SelectTrigger>
                        <SelectContent>
                            {activeMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                                {member.firstName} {member.lastName} ({member.email})
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-muted-foreground" />Area Details</h3>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Area Name</Label>
                            <Input id="name" name="name" value={editableArea.name} onChange={handleInputChange} disabled={isPending} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" value={editableArea.description} onChange={handleInputChange} rows={3} disabled={isPending} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="imageUrl">Image URL</Label>
                            <Input id="imageUrl" name="imageUrl" type="url" value={editableArea.imageUrl || ''} placeholder="https://placehold.co/600x400" onChange={handleImageUrlChange} disabled={isPending} className="mt-1" />
                            {(editableArea.imageUrl || initialMinistryArea.imageUrl) && (
                            <div className="mt-2 relative w-full h-32 rounded overflow-hidden border">
                                <Image src={editableArea.imageUrl || initialMinistryArea.imageUrl || 'https://placehold.co/600x400'} alt="Area image preview" layout="fill" objectFit="cover" data-ai-hint="ministry team group" />
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Pane */}
            <div className="lg:col-span-3 space-y-6">
                 <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><UserPlus className="mr-2 h-5 w-5 text-muted-foreground" />Add Members</h3>
                    <Input
                        type="search"
                        placeholder="Search active members to add..."
                        value={addMemberSearchTerm}
                        onChange={(e) => setAddMemberSearchTerm(e.target.value)}
                        className="mb-3"
                        disabled={isPending}
                    />
                    <ScrollArea className="h-60 w-full rounded-md border p-2">
                        {availableMembersForAssignment.length > 0 ? availableMembersForAssignment.map((member) => (
                        <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                            <Checkbox
                            id={`add-member-${member.id}`}
                            checked={(editableArea.memberIds || []).includes(member.id)}
                            disabled={isPending}
                            onCheckedChange={(checked) => handleMemberSelectionChange(member.id, Boolean(checked))}
                            />
                            <Label htmlFor={`add-member-${member.id}`} className="font-normal text-sm cursor-pointer flex-grow">
                            {member.firstName} {member.lastName}
                            </Label>
                        </div>
                        )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {addMemberSearchTerm ? "No members match your search." : "All active members are already assigned or selected as leader."}
                        </p>
                        )}
                    </ScrollArea>
                </div>
                
                <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" />Currently Assigned Members</h3>
                     <p className="text-sm text-muted-foreground mb-3">
                        Total members in area (including leader): {
                            new Set([editableArea.leaderId, ...(editableArea.memberIds || [])].filter(Boolean)).size
                        }
                    </p>
                    <ScrollArea className="h-60 w-full rounded-md border p-2">
                        {leaderDetails && (
                             <div className="flex items-center justify-between p-2 rounded-md bg-primary/10">
                                <span className="font-medium text-sm text-primary">{leaderDetails.firstName} {leaderDetails.lastName}</span>
                                <Badge variant="default" className="text-xs">Leader</Badge>
                            </div>
                        )}
                        {currentlyAssignedDisplayMembers.map((member) => (
                            member.id !== editableArea.leaderId && ( // Leader is displayed separately
                                <div key={member.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                    <span className="text-sm">{member.firstName} {member.lastName}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeAssignedMember(member.id)} 
                                        disabled={isPending}
                                        aria-label={`Remove ${member.firstName} ${member.lastName}`}
                                        className="h-7 w-7"
                                    >
                                        <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            )
                        ))}
                        {(!leaderDetails && currentlyAssignedDisplayMembers.length === 0) && (
                             <p className="text-sm text-muted-foreground text-center py-4">No members assigned yet (excluding leader).</p>
                        )}
                         {(leaderDetails && currentlyAssignedDisplayMembers.length === 0) && (
                             <p className="text-sm text-muted-foreground text-center py-4 mt-2">No additional members assigned.</p>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6 mt-6">
           <Button variant="outline" onClick={() => router.push('/groups')} disabled={isPending} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !editableArea.leaderId} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} 
            {isPending ? 'Saving...' : 'Save All Changes'}
          </Button>
        </CardFooter>
    </Card>
  );
}
