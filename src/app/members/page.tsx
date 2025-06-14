
import { placeholderMembers, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import type { Member, GDI, MinistryArea } from '@/lib/types';
import MembersListView from '@/components/members/members-list-view';

async function getMembersData(): Promise<{ members: Member[], gdis: GDI[], ministryAreas: MinistryArea[] }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100)); 
  return {
    members: placeholderMembers,
    gdis: placeholderGDIs,
    ministryAreas: placeholderMinistryAreas,
  };
}

export default async function MembersPage() {
  const { members, gdis, ministryAreas } = await getMembersData();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Member Directory</h1>
        <p className="text-muted-foreground mt-2">Manage and connect with members of our church community.</p>
      </div>
      <MembersListView 
        initialMembers={members} 
        allGDIs={gdis}
        allMinistryAreas={ministryAreas}
      />
    </div>
  );
}
