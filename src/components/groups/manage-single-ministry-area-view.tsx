
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
import { Loader2, Save, Users, UserCheck, ArrowLeft, Edit3, Search, UserPlus, UserMinus, Badge } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';


interface ManageSingleMinistryAreaViewProps {
  ministryArea: MinistryArea;
  allMembers: Member[];
  activeMembers: Member[];
  updateMinistryAreaAction: (
    areaId: string,
    updatedData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description'>>
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
  const [selectedAvailableMembers, setSelectedAvailableMembers] = useState<string[]>([]);
  const [selectedAssignedMembers, setSelectedAssignedMembers] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setEditableArea(initialMinistryArea);
    setSelectedAvailableMembers([]);
    setSelectedAssignedMembers([]);
  }, [initialMinistryArea]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableArea(prev => ({ ...prev, [name]: value }));
  };

  const handleLeaderChange = (leaderId: string) => {
    setEditableArea(prev => {
      const newMemberIds = (prev.memberIds || []).filter(id => id !== leaderId);
      return { ...prev, leaderId, memberIds: newMemberIds };
    });
  };

  const handleAvailableMemberSelection = (memberId: string, isChecked: boolean) => {
    setSelectedAvailableMembers(prev =>
      isChecked ? [...prev, memberId] : prev.filter(id => id !== memberId)
    );
  };

  const handleAssignedMemberSelection = (memberId: string, isChecked: boolean) => {
    setSelectedAssignedMembers(prev =>
      isChecked ? [...prev, memberId] : prev.filter(id => id !== memberId)
    );
  };

  const handleAddSelectedMembersToArea = () => {
    if (selectedAvailableMembers.length === 0) return;
    setEditableArea(prevArea => ({
      ...prevArea,
      memberIds: Array.from(new Set([...(prevArea.memberIds || []), ...selectedAvailableMembers]))
                       .filter(id => id !== prevArea.leaderId)
    }));
    setSelectedAvailableMembers([]); 
  };

  const handleRemoveSelectedMembersFromArea = () => {
    if (selectedAssignedMembers.length === 0) return;
     // Prevent removing the leader via this method
    if (selectedAssignedMembers.includes(editableArea.leaderId)) {
      toast({ title: "Action Denied", description: "Cannot remove the Area Leader using this method. Change the leader first.", variant: "destructive" });
      setSelectedAssignedMembers(prev => prev.filter(id => id !== editableArea.leaderId)); // Deselect leader if accidentally selected for removal
      return;
    }
    setEditableArea(prevArea => ({
      ...prevArea,
      memberIds: (prevArea.memberIds || []).filter(id => !selectedAssignedMembers.includes(id))
    }));
    setSelectedAssignedMembers([]); 
  };


  const handleSubmit = () => {
    startTransition(async () => {
      const { id, ...dataToUpdate } = editableArea;

      const finalDataToUpdate = {
        name: dataToUpdate.name,
        description: dataToUpdate.description,
        leaderId: dataToUpdate.leaderId,
        memberIds: (dataToUpdate.memberIds || []).filter(mId => mId !== dataToUpdate.leaderId),
      };

      const result = await updateMinistryAreaAction(initialMinistryArea.id, finalDataToUpdate);
      if (result.success && result.updatedArea) {
        toast({ title: "Success", description: "Ministry Area updated successfully." });
        setEditableArea(result.updatedArea);
        setSelectedAvailableMembers([]); 
        setSelectedAssignedMembers([]); 
        if (typeof window !== "undefined" && result.updatedArea.name !== initialMinistryArea.name) {
          document.title = `Manage: ${result.updatedArea.name}`;
        }
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
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
                    <h3 className="text-lg font-semibold mb-3 flex items-center">Area Details</h3>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Area Name</Label>
                            <Input id="name" name="name" value={editableArea.name} onChange={handleInputChange} disabled={isPending} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" value={editableArea.description} onChange={handleInputChange} rows={3} disabled={isPending} className="mt-1" />
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
                    <ScrollArea className="h-48 w-full rounded-md border p-2">
                        {availableMembersForAssignment.length > 0 ? availableMembersForAssignment.map((member) => (
                        <div key={`available-${member.id}`} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                            <Checkbox
                                id={`add-member-${member.id}`}
                                checked={selectedAvailableMembers.includes(member.id)}
                                disabled={isPending}
                                onCheckedChange={(checked) => handleAvailableMemberSelection(member.id, Boolean(checked))}
                            />
                            <Label htmlFor={`add-member-${member.id}`} className="font-normal text-sm cursor-pointer flex-grow">
                                {member.firstName} {member.lastName}
                            </Label>
                        </div>
                        )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {addMemberSearchTerm ? "No members match your search." : "All available active members are already assigned or selected as leader."}
                        </p>
                        )}
                    </ScrollArea>
                    <Button 
                        onClick={handleAddSelectedMembersToArea} 
                        disabled={isPending || selectedAvailableMembers.length === 0}
                        className="w-full mt-3"
                        variant="outline"
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> Add Selected to Area ({selectedAvailableMembers.length})
                    </Button>
                </div>
                
                <div className="p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" />Currently Assigned Members</h3>
                     <p className="text-sm text-muted-foreground mb-3">
                        Total members in area (including leader): {
                            new Set([editableArea.leaderId, ...(editableArea.memberIds || [])].filter(Boolean)).size
                        }
                    </p>
                    <ScrollArea className="h-48 w-full rounded-md border p-2">
                        {leaderDetails && (
                             <div className="flex items-center justify-between p-2 rounded-md bg-primary/10">
                                <span className="font-medium text-sm text-primary">{leaderDetails.firstName} {leaderDetails.lastName}</span>
                                <Badge variant="default" className="text-xs">Leader</Badge>
                            </div>
                        )}
                        {currentlyAssignedDisplayMembers.map((member) => (
                            member.id !== editableArea.leaderId && ( 
                                <div key={`assigned-${member.id}`} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                                    <Checkbox
                                        id={`remove-member-${member.id}`}
                                        checked={selectedAssignedMembers.includes(member.id)}
                                        disabled={isPending}
                                        onCheckedChange={(checked) => handleAssignedMemberSelection(member.id, Boolean(checked))}
                                    />
                                    <Label htmlFor={`remove-member-${member.id}`} className="font-normal text-sm cursor-pointer flex-grow">
                                        {member.firstName} {member.lastName}
                                    </Label>
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
                    <Button 
                        onClick={handleRemoveSelectedMembersFromArea} 
                        disabled={isPending || selectedAssignedMembers.length === 0}
                        className="w-full mt-3"
                        variant="destructive"
                    >
                       <UserMinus className="mr-2 h-4 w-4" /> Remove Selected from Area ({selectedAssignedMembers.length})
                    </Button>
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
