
"use client";

import { useState } from 'react';
import type { GDI, Member } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, PlusCircle, Mail, Phone } from 'lucide-react'; // Users can be generic group icon
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AddGdiForm from './add-gdi-form';

interface GdisManagerProps {
  gdis: GDI[];
  allMembers: Member[]; // For resolving guide names
  activeMembers: Member[]; // For guide selection
  onAddGDI: (newGdi: GDI) => void;
}

export default function GdisManager({ gdis, allMembers, activeMembers, onAddGDI }: GdisManagerProps) {
  const [isAddGdiDialogOpen, setIsAddGdiDialogOpen] = useState(false);

  const getGuideDetails = (guideId: string) => {
    return allMembers.find(member => member.id === guideId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">GDIs (Integration Groups)</h2>
        <Button onClick={() => setIsAddGdiDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New GDI
        </Button>
      </div>

      {gdis.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {gdis.map((gdi) => {
            const guide = getGuideDetails(gdi.guideId);
            return (
              <Card key={gdi.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl text-primary flex items-center">
                    <Users className="mr-2 h-6 w-6" /> {gdi.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center"><UserCheck className="mr-2 h-4 w-4 text-muted-foreground" /> GDI Guide:</h4>
                    <p className="text-muted-foreground text-sm">{guide ? `${guide.firstName} ${guide.lastName}` : 'N/A'}</p>
                  </div>
                  {guide && (
                     <>
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Guide Email:</h4>
                        <a href={`mailto:${guide.email}`} className="text-primary hover:underline text-sm">{guide.email}</a>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /> Guide Phone:</h4>
                        <a href={`tel:${guide.phone}`} className="text-primary hover:underline text-sm">{guide.phone}</a>
                      </div>
                    </>
                  )}
                  <CardDescription className="text-sm">
                    Members: {gdi.memberIds.length}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                   <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                    Manage GDI
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No GDIs Available</h2>
          <p className="text-muted-foreground mt-2">Add a new GDI to get started.</p>
        </div>
      )}

      <Dialog open={isAddGdiDialogOpen} onOpenChange={setIsAddGdiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New GDI</DialogTitle>
            <DialogDescription>
              Define the name for the new GDI and assign a guide.
            </DialogDescription>
          </DialogHeader>
          <AddGdiForm
            onOpenChange={setIsAddGdiDialogOpen}
            onAddGDI={onAddGDI}
            activeMembers={activeMembers}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
