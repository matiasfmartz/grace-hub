
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { Member, GDI, MinistryArea } from '@/lib/types';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpNarrowWide, ArrowDownNarrowWide, Info, UserPlus } from 'lucide-react';
import MemberDetailsDialog from './member-details-dialog';
import AddMemberForm from './add-member-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface MembersListViewProps {
  initialMembers: Member[];
  allGDIs: GDI[];
  allMinistryAreas: MinistryArea[];
}

type SortKey = keyof Member | 'fullName';
type SortOrder = 'asc' | 'desc';

export default function MembersListView({ initialMembers, allGDIs, allMinistryAreas }: MembersListViewProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedMembers = useMemo(() => {
    let membersToSort = [...members];
    if (searchTerm) {
      membersToSort = membersToSort.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    membersToSort.sort((a, b) => {
      let valA, valB;
      if (sortKey === 'fullName') {
        valA = `${a.firstName} ${a.lastName}`;
        valB = `${b.firstName} ${b.lastName}`;
      } else {
        valA = a[sortKey as keyof Member];
        valB = b[sortKey as keyof Member];
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      // Fallback for date strings if not handled by direct property access
      if (sortKey === 'birthDate' || sortKey === 'churchJoinDate') {
          const dateA = valA ? new Date(valA as string).getTime() : 0;
          const dateB = valB ? new Date(valB as string).getTime() : 0;
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
    return membersToSort;
  }, [members, searchTerm, sortKey, sortOrder]);

  const handleOpenDetailsDialog = (member: Member) => {
    setSelectedMember(member);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedMember(null);
  };

  const handleAddMember = useCallback((newMember: Member) => {
    setMembers(prevMembers => [newMember, ...prevMembers]);
    // In a real app, you would also make an API call here
  }, []);
  
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownNarrowWide size={16} />;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members by name, email, or status..."
            className="w-full md:w-1/2 lg:w-1/3 pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-primary focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddMemberDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Member
        </Button>
      </div>

      <div className="overflow-x-auto bg-card rounded-lg shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead onClick={() => handleSort('fullName')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Name <SortIcon columnKey="fullName" />
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort('email')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Email <SortIcon columnKey="email" />
                </div>
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                <div className="flex items-center gap-1 hover:text-primary">
                  Status <SortIcon columnKey="status" />
                </div>
              </TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Avatar>
                    <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} data-ai-hint="person portrait" />
                    <AvatarFallback>{member.firstName.substring(0, 1)}{member.lastName.substring(0,1)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{member.firstName} {member.lastName}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>
                  <Badge variant={
                    member.status === 'Active' ? 'default' :
                    member.status === 'Inactive' ? 'secondary' :
                    'outline'
                  }
                  className={
                    member.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/50' :
                    member.status === 'Inactive' ? 'bg-red-500/20 text-red-700 border-red-500/50' :
                    'bg-yellow-500/20 text-yellow-700 border-yellow-500/50'
                  }
                  >
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="icon" onClick={() => handleOpenDetailsDialog(member)} title="View Details">
                    <Info className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {sortedMembers.length === 0 && (
        <p className="text-center text-muted-foreground mt-8">No members found.</p>
      )}
      <MemberDetailsDialog
        member={selectedMember}
        allMembers={members} 
        allGDIs={allGDIs}
        allMinistryAreas={allMinistryAreas}
        isOpen={isDetailsDialogOpen}
        onClose={handleCloseDetailsDialog}
      />
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Fill in the details for the new church member. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <AddMemberForm 
            onOpenChange={setIsAddMemberDialogOpen} 
            onAddMember={handleAddMember}
            allGDIs={allGDIs}
            allMinistryAreas={allMinistryAreas}
            allMembers={members}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
