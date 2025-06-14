
"use client";

import { useState, useCallback, useTransition } from 'react';
import type { MinistryArea, GDI, Member, AddMinistryAreaFormValues, AddGdiFormValues } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MinistryAreasManager from './ministry-areas-manager';
import GdisManager from './gdis-manager';
import { useToast } from '@/hooks/use-toast';

interface ManageGroupsTabsProps {
  initialMinistryAreas: MinistryArea[];
  initialGdis: GDI[];
  allMembers: Member[];
  addMinistryAreaAction: (data: AddMinistryAreaFormValues) => Promise<{ success: boolean; message: string; newArea?: MinistryArea }>;
  addGdiAction: (data: AddGdiFormValues) => Promise<{ success: boolean; message: string; newGdi?: GDI }>;
}

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

  const activeMembers = allMembers.filter(m => m.status === 'Active');

  const handleAddMinistryArea = useCallback(async (newAreaData: AddMinistryAreaFormValues) => {
    startTransition(async () => {
      const result = await addMinistryAreaAction(newAreaData);
      if (result.success && result.newArea) {
        setMinistryAreas(prev => [result.newArea!, ...prev]);
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }, [addMinistryAreaAction, toast]);

  const handleAddGdi = useCallback(async (newGdiData: AddGdiFormValues) => {
    startTransition(async () => {
      const result = await addGdiAction(newGdiData);
      if (result.success && result.newGdi) {
        setGdis(prev => [result.newGdi!, ...prev]);
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  }, [addGdiAction, toast]);

  return (
    <Tabs defaultValue="ministry-areas" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ministry-areas">Ministry Areas</TabsTrigger>
        <TabsTrigger value="gdis">GDIs (Integration Groups)</TabsTrigger>
      </TabsList>
      <TabsContent value="ministry-areas">
        <MinistryAreasManager
          ministryAreas={ministryAreas}
          allMembers={allMembers}
          activeMembers={activeMembers}
          onAddArea={handleAddMinistryArea}
          isSubmitting={isPending}
        />
      </TabsContent>
      <TabsContent value="gdis">
        <GdisManager
          gdis={gdis}
          allMembers={allMembers}
          activeMembers={activeMembers}
          onAddGDI={handleAddGdi}
          isSubmitting={isPending}
        />
      </TabsContent>
    </Tabs>
  );
}
