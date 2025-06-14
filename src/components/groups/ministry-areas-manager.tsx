
"use client";

import { useState } from 'react';
import type { MinistryArea, Member, AddMinistryAreaFormValues } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, UserCircle, UsersRound, PlusCircle, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AddMinistryAreaForm from './add-ministry-area-form';

interface MinistryAreasManagerProps {
  ministryAreas: MinistryArea[];
  allMembers: Member[];
  activeMembers: Member[]; 
  onAddArea: (newArea: AddMinistryAreaFormValues) => void;
  isSubmitting?: boolean;
}

export default function MinistryAreasManager({ ministryAreas, allMembers, activeMembers, onAddArea, isSubmitting = false }: MinistryAreasManagerProps) {
  const [isAddAreaDialogOpen, setIsAddAreaDialogOpen] = useState(false);

  const getLeaderDetails = (leaderId: string) => {
    return allMembers.find(member => member.id === leaderId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Ministry Areas</h2>
        <Button onClick={() => setIsAddAreaDialogOpen(true)} disabled={isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Area
        </Button>
      </div>

      {ministryAreas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ministryAreas.map((area) => {
            const leader = getLeaderDetails(area.leaderId);
            return (
              <Card key={area.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                {area.imageUrl && (
                  <div className="relative h-48 w-full">
                    <Image 
                      src={area.imageUrl} 
                      alt={area.name} 
                      layout="fill" 
                      objectFit="cover" 
                      data-ai-hint="team meeting"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="font-headline text-2xl text-primary flex items-center">
                    <UsersRound className="mr-2 h-6 w-6" /> {area.name}
                  </CardTitle>
                  <CardDescription className="text-sm h-20 overflow-y-auto">{area.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Area Leader:</h4>
                    <p className="text-muted-foreground text-sm">{leader ? `${leader.firstName} ${leader.lastName}` : 'N/A'}</p>
                  </div>
                  {leader && (
                    <>
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Leader Email:</h4>
                        <a href={`mailto:${leader.email}`} className="text-primary hover:underline text-sm">{leader.email}</a>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /> Leader Phone:</h4>
                        <a href={`tel:${leader.phone}`} className="text-primary hover:underline text-sm">{leader.phone}</a>
                      </div>
                    </>
                  )}
                   <CardDescription className="text-sm pt-2">
                    Members: {area.memberIds.length}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                    <Link href={`/groups/ministry-areas/${area.id}/manage`}>
                      <Edit className="mr-2 h-4 w-4" /> Manage Area
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <UsersRound className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Ministry Areas Available</h2>
          <p className="text-muted-foreground mt-2">Add a new ministry area to get started.</p>
        </div>
      )}

      <Dialog open={isAddAreaDialogOpen} onOpenChange={setIsAddAreaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Ministry Area</DialogTitle>
            <DialogDescription>
              Define the details for the new ministry area and assign a leader.
            </DialogDescription>
          </DialogHeader>
          <AddMinistryAreaForm
            onOpenChange={setIsAddAreaDialogOpen}
            onAddArea={onAddArea}
            activeMembers={activeMembers}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
