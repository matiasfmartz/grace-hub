
"use client";

import { useState, useCallback, useTransition, useMemo } from 'react';
import type { MinistryArea, GDI, Member } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MinistryAreasManager from './ministry-areas-manager';
import GdisManager from './gdis-manager';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ManageSingleGdiView from './manage-single-gdi-view';
import ManageSingleMinistryAreaView from './manage-single-ministry-area-view';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';

interface ManageGroupsTabsProps {
  initialMinistryAreas: MinistryArea[];
  initialGdis: GDI[];
  allMembers: Member[];
  addMinistryAreaAction: (data: Partial<Omit<MinistryArea, 'id'>> & { name: string; leaderId: string }) => Promise<{ success: boolean; message: string; newArea?: MinistryArea }>;
  addGdiAction: (data: Partial<Omit<GDI, 'id'>> & { name: string; guideId: string }) => Promise<{ success: boolean; message: string; newGdi?: GDI }>;
}

const newGdiTemplate: GDI = { id: 'new', name: '', guideId: '', memberIds: [] };
const newAreaTemplate: MinistryArea = { id: 'new', name: '', description: '', leaderId: '', memberIds: [] };

export default function ManageGroupsTabs({ 
  initialMinistryAreas, 
  initialGdis, 
  allMembers,
  addMinistryAreaAction,
  addGdiAction
}: ManageGroupsTabsProps) {
  const [ministryAreas, setMinistryAreas] = useState<MinistryArea[]>(initialMinistryAreas);
  const [gdis, setGdis] = useState<GDI[]>(initialGdis);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [isAddGdiDialogOpen, setIsAddGdiDialogOpen] = useState(false);
  const [isAddAreaDialogOpen, setIsAddAreaDialogOpen] = useState(false);

  const activeMembers = useMemo(() => allMembers.filter(m => m.status === 'Active'), [allMembers]);

  const handleAddMinistryAreaSubmit = useCallback(async (areaData: Partial<Omit<MinistryArea, 'id'>> & { name: string; leaderId: string }) => {
    startTransition(async () => {
      const result = await addMinistryAreaAction(areaData);
      if (result.success && result.newArea) {
        setMinistryAreas(prev => [result.newArea!, ...prev]);
        toast({ title: "Success", description: result.message });
        setIsAddAreaDialogOpen(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }, [addMinistryAreaAction, toast]);

  const handleAddGdiSubmit = useCallback(async (gdiData: Partial<Omit<GDI, 'id'>> & { name: string; guideId: string }) => {
    startTransition(async () => {
      const result = await addGdiAction(gdiData);
      if (result.success && result.newGdi) {
        setGdis(prev => [result.newGdi!, ...prev]);
        toast({ title: "Success", description: result.message });
        setIsAddGdiDialogOpen(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }, [addGdiAction, toast]);

  return (
    <>
      <Tabs defaultValue="ministry-areas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="ministry-areas">Ministry Areas</TabsTrigger>
          <TabsTrigger value="gdis">GDIs (Integration Groups)</TabsTrigger>
        </TabsList>
        <TabsContent value="ministry-areas">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Áreas Ministeriales</h2>
            <Button onClick={() => setIsAddAreaDialogOpen(true)} disabled={isPending}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Area
            </Button>
          </div>
          <MinistryAreasManager
            ministryAreas={ministryAreas}
            allMembers={allMembers}
            activeMembers={activeMembers}
          />
        </TabsContent>
        <TabsContent value="gdis">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">GDIs (Grupos de Integración)</h2>
            <Button onClick={() => setIsAddGdiDialogOpen(true)} disabled={isPending}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New GDI
            </Button>
          </div>
          <GdisManager
            gdis={gdis}
            allMembers={allMembers}
            activeMembers={activeMembers}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isAddAreaDialogOpen} onOpenChange={setIsAddAreaDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Add New Ministry Area</DialogTitle>
            <DialogDescription>
              Define the details for the new ministry area, assign a leader, and add members.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-1 sm:p-6">
            <ManageSingleMinistryAreaView
              ministryArea={newAreaTemplate}
              allMembers={allMembers}
              activeMembers={activeMembers}
              updateMinistryAreaAction={handleAddMinistryAreaSubmit as any} // Cast as it expects update action type
              isAdding={true}
              onSuccess={() => setIsAddAreaDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddGdiDialogOpen} onOpenChange={setIsAddGdiDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Add New GDI</DialogTitle>
            <DialogDescription>
              Define the name for the new GDI, assign a guide, and add members.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-1 sm:p-6">
            <ManageSingleGdiView
              gdi={newGdiTemplate}
              allMembers={allMembers}
              activeMembers={activeMembers}
              allGdis={gdis} // Pass current GDIs for validation if needed
              updateGdiAction={handleAddGdiSubmit as any} // Cast as it expects update action type
              isAdding={true}
              onSuccess={() => setIsAddGdiDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
