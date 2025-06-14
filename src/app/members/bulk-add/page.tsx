
'use server';
import { placeholderMembers as initialMembersForDb, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import type { Member, GDI, MinistryArea, MemberWriteData } from '@/lib/types';
import BulkAddMembersView from '@/components/members/bulk-add-members-view';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';

const MEMBERS_DB_PATH = path.join(process.cwd(), 'src/lib/members-db.json');

async function readMembersFromDb(): Promise<Member[]> {
  try {
    const fileContent = await fs.readFile(MEMBERS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return initial data (it will be created on first write)
      return initialMembersForDb;
    }
    console.error("Failed to read members-db.json:", error);
    return initialMembersForDb; // Fallback to initial data on other errors
  }
}

export async function addBulkMembersAction(stagedMembersData: MemberWriteData[]): Promise<{ success: boolean; message: string }> {
  try {
    let currentMembers: Member[] = [];
    try {
      const fileContent = await fs.readFile(MEMBERS_DB_PATH, 'utf-8');
      currentMembers = JSON.parse(fileContent);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, use initial data as the base
        currentMembers = [...initialMembersForDb]; 
        console.log('members-db.json not found, initializing with placeholder data.');
      } else {
        throw error; // Re-throw other read errors
      }
    }

    const newMembersWithIds: Member[] = stagedMembersData.map(memberData => ({
      ...memberData,
      id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
      avatarUrl: memberData.avatarUrl || 'https://placehold.co/100x100', // Ensure avatarUrl
    }));

    const updatedMembers = [...currentMembers, ...newMembersWithIds];
    await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(updatedMembers, null, 2), 'utf-8');

    revalidatePath('/members');
    revalidatePath('/members/bulk-add'); // Revalidate this page too if it reads member data
    
    return { success: true, message: `${newMembersWithIds.length} miembro(s) guardado(s) exitosamente.` };
  } catch (error: any) {
    console.error("Error saving bulk members:", error);
    return { success: false, message: `Error al guardar miembros: ${error.message}` };
  }
}


async function getData(): Promise<{ members: Member[], gdis: GDI[], ministryAreas: MinistryArea[] }> {
  const members = await readMembersFromDb();
  // For GDIs and MinistryAreas, we'll still use placeholders for simplicity in this example.
  // In a real app, these would also come from a persistent source.
  return {
    members, // Used for guide/leader name lookups in the form
    gdis: placeholderGDIs,
    ministryAreas: placeholderMinistryAreas,
  };
}

export default async function BulkAddMembersPage() {
  const { members, gdis, ministryAreas } = await getData();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Agregar Múltiples Miembros</h1>
        <p className="text-muted-foreground mt-2">
          Utilice el formulario para agregar miembros a la lista de preparación. Luego, guarde todos los miembros a la vez.
        </p>
      </div>
      <BulkAddMembersView 
        allGDIs={gdis}
        allMinistryAreas={ministryAreas}
        allMembers={members} // Pass all members (potentially from DB) for the form select options
        addBulkMembersAction={addBulkMembersAction}
      />
    </div>
  );
}
