
"use client";

import { useState, useTransition, useEffect } from 'react';
import type { MinistryArea, Member } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label'; // Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Image as ImageIcon, Edit3, Users, UserCheck, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge";

interface ManageSingleMinistryAreaViewProps {
  ministryArea: MinistryArea;
  allMembers: Member[]; // Full list for display consistency
  activeMembers: Member[]; // Active list for selection (leaders, assignable members)
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
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
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
    setEditableArea(prev => ({ ...prev, leaderId }));
  };
  
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableArea(prev => ({ ...prev, imageUrl: e.target.value || undefined }));
  }

  const handleMemberSelectionChange = (memberIdToToggle: string, isChecked: boolean) => {
    setEditableArea(prevArea => {
      const currentMemberIds = prevArea.memberIds || [];
      let newMemberIds;

      if (isChecked) {
        if (!currentMemberIds.includes(memberIdToToggle) && memberIdToToggle !== prevArea.leaderId) {
          newMemberIds = [...currentMemberIds, memberIdToToggle];
        } else {
          newMemberIds = currentMemberIds; 
        }
      } else {
        if (memberIdToToggle !== prevArea.leaderId) {
          newMemberIds = currentMemberIds.filter(id => id !== memberIdToToggle);
        } else {
          newMemberIds = currentMemberIds; 
        }
      }
      return { ...prevArea, memberIds: newMemberIds };
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const { id, ...dataToUpdate } = editableArea; 
      
      const finalDataToUpdate = {
        ...dataToUpdate,
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

  const filteredAssignableMembers = activeMembers.filter(member =>
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );
  
  const getMemberName = (memberId: string | undefined | null): string => {
    if (!memberId) return 'N/A';
    const member = allMembers.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'N/A';
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Edit3 className="mr-2 h-6 w-6 text-primary" /> Manage Ministry Area: {initialMinistryArea.name}</CardTitle>
          <CardDescription>Modify the details, leader, and members for this area. Click "Save All Changes" when done.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-md space-y-4">
            <h3 className="text-lg font-semibold flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-muted-foreground" />Area Details</h3>
            <div className="space-y-1">
              <Label htmlFor="name">Area Name</Label>
              <Input
                id="name"
                name="name"
                value={editableArea.name}
                onChange={handleInputChange}
                disabled={isPending}
                className="mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={editableArea.description}
                onChange={handleInputChange}
                rows={3}
                disabled={isPending}
                className="mt-1"
              />
            </div>
            <div className="space-y-1">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    value={editableArea.imageUrl || ''}
                    placeholder="https://placehold.co/600x400"
                    onChange={handleImageUrlChange}
                    disabled={isPending}
                    className="mt-1"
                />
                {(editableArea.imageUrl || initialMinistryArea.imageUrl) && (
                  <div className="mt-2 relative w-full h-32 rounded overflow-hidden border">
                    <Image 
                        src={editableArea.imageUrl || initialMinistryArea.imageUrl || 'https://placehold.co/600x400'} 
                        alt="Area image preview" 
                        layout="fill" 
                        objectFit="cover" 
                        data-ai-hint="ministry team group"
                    />
                  </div>
                )}
            </div>
          </div>

          <div className="p-4 border rounded-md space-y-4">
             <h3 className="text-lg font-semibold flex items-center"><UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />Area Leader</h3>
            <div className="space-y-1">
                <Label>Current Leader: {getMemberName(editableArea.leaderId)}</Label>
                <Select onValueChange={handleLeaderChange} value={editableArea.leaderId} disabled={isPending}>
                    <SelectTrigger className="mt-1" id="leaderId">
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
          </div>
          
          <div className="p-4 border rounded-md space-y-4">
            <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" />Assign Members</h3>
            <CardDescription className="mb-2 text-sm">
              Select members to include in this ministry area. The Area Leader is automatically part of the area.
            </CardDescription>
            <Input
              type="search"
              id="memberSearch"
              placeholder="Search members by name or email..."
              value={memberSearchTerm}
              onChange={(e) => setMemberSearchTerm(e.target.value)}
              className="mb-4"
              disabled={isPending}
            />
            <ScrollArea className="h-60 w-full rounded-md border p-4">
              <div className="space-y-1">
                {filteredAssignableMembers.length > 0 ? filteredAssignableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-row items-center space-x-3 p-2 hover:bg-muted/50 rounded-md"
                  >
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={member.id === editableArea.leaderId || (editableArea.memberIds || []).includes(member.id)}
                      disabled={isPending || member.id === editableArea.leaderId} 
                      onCheckedChange={(checked) => {
                        handleMemberSelectionChange(member.id, Boolean(checked));
                      }}
                      aria-label={`Assign ${member.firstName} ${member.lastName}`}
                    />
                    <Label
                      htmlFor={`member-${member.id}`}
                      className="font-normal flex-grow cursor-pointer text-sm"
                    >
                      {member.firstName} {member.lastName}
                      {member.id === editableArea.leaderId && <Badge variant="outline" className="ml-2 text-primary border-primary">Leader</Badge>}
                    </Label>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No members match your search.</p>
                )}
              </div>
            </ScrollArea>
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>
                    Additional members selected: {(editableArea.memberIds || []).filter(id => id !== editableArea.leaderId).length}
                </p>
                <p>
                    Total members in area (including leader): {
                        new Set([editableArea.leaderId, ...(editableArea.memberIds || [])].filter(Boolean)).size
                    }
                </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6">
           <Button variant="outline" onClick={() => router.push('/groups')} disabled={isPending} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save All Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

