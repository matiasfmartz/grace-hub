
'use server';
import { placeholderMembers as initialMembersForDb, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import type { Member, GDI, MinistryArea } from '@/lib/types';
import MembersListView from '@/components/members/members-list-view';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MEMBERS_DB_PATH = path.join(process.cwd(), 'src/lib/members-db.json');

async function getMembersData(): Promise<{ members: Member[], gdis: GDI[], ministryAreas: MinistryArea[] }> {
  let members: Member[];
  try {
    const fileContent = await fs.readFile(MEMBERS_DB_PATH, 'utf-8');
    members = JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, use initial data
      // In a real app, the bulk add action would create this file.
      // For now, if it's missing on the members page, we fall back.
      console.log('members-db.json not found on members page, using initial placeholder data.');
      members = initialMembersForDb;
    } else {
      console.error("Failed to read members-db.json for Member Directory:", error);
      members = initialMembersForDb; // Fallback on other errors
    }
  }
  
  // For GDIs and MinistryAreas, we'll still use placeholders for simplicity.
  // In a real app, these would also come from a persistent source.
  return {
    members,
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
