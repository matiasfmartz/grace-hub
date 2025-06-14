
import type { MinistryArea, Member, GDI } from '@/lib/types';
import { placeholderMinistryAreas, placeholderMembers, placeholderGDIs } from '@/lib/placeholder-data';
import ManageGroupsTabs from '@/components/groups/manage-groups-tabs';

async function getGroupsData(): Promise<{ ministryAreas: MinistryArea[], gdis: GDI[], members: Member[] }> {
  await new Promise(resolve => setTimeout(resolve, 100)); 
  return { 
    ministryAreas: placeholderMinistryAreas,
    gdis: placeholderGDIs,
    members: placeholderMembers 
  };
}

export default async function GroupsPage() { // Renamed from MinistryAreasPage for clarity
  const { ministryAreas, gdis, members } = await getGroupsData();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-10 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Manage Groups</h1>
        <p className="text-muted-foreground mt-2">Oversee Ministry Areas and GDIs within the church community.</p>
      </div>
      <ManageGroupsTabs
        initialMinistryAreas={ministryAreas}
        initialGdis={gdis}
        allMembers={members}
      />
    </div>
  );
}
