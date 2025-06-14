
"use client";

import { useState, useCallback } from 'react';
import type { MinistryArea, GDI, Member } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MinistryAreasManager from './ministry-areas-manager';
import GdisManager from './gdis-manager';

interface ManageGroupsTabsProps {
  initialMinistryAreas: MinistryArea[];
  initialGdis: GDI[];
  allMembers: Member[];
}

export default function ManageGroupsTabs({ initialMinistryAreas, initialGdis, allMembers }: ManageGroupsTabsProps) {
  const [ministryAreas, setMinistryAreas] = useState<MinistryArea[]>(initialMinistryAreas);
  const [gdis, setGdis] = useState<GDI[]>(initialGdis);

  const activeMembers = allMembers.filter(m => m.status === 'Active');

  const handleAddMinistryArea = useCallback((newArea: MinistryArea) => {
    setMinistryAreas(prev => [newArea, ...prev]);
    // API call to add area
  }, []);

  const handleAddGdi = useCallback((newGdi: GDI) => {
    setGdis(prev => [newGdi, ...prev]);
    // API call to add GDI
  }, []);

  return (
    <Tabs defaultValue="ministry-areas" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ministry-areas">Ministry Areas</TabsTrigger>
        <TabsTrigger value="gdis">GDIs (Integration Groups)</TabsTrigger>
      </TabsList>
      <TabsContent value="ministry-areas">
        <MinistryAreasManager
          ministryAreas={ministryAreas}
          allMembers={allMembers} // Pass all members for resolving leader names in display
          activeMembers={activeMembers} // Pass active members for leader selection in form
          onAddArea={handleAddMinistryArea}
        />
      </TabsContent>
      <TabsContent value="gdis">
        <GdisManager
          gdis={gdis}
          allMembers={allMembers} // Pass all members for resolving guide names in display
          activeMembers={activeMembers} // Pass active members for guide selection in form
          onAddGDI={handleAddGdi}
        />
      </TabsContent>
    </Tabs>
  );
}
