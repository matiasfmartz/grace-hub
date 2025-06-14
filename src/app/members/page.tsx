
'use server';
import { placeholderMembers as initialMembersForDb, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import type { Member, GDI, MinistryArea, MemberWriteData } from '@/lib/types';
import MembersListView from '@/components/members/members-list-view';
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
      console.log('members-db.json not found, using initial placeholder data and creating file.');
      // Create the file with initial data if it doesn't exist
      await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(initialMembersForDb, null, 2), 'utf-8');
      return initialMembersForDb;
    }
    console.error("Failed to read members-db.json for Member Directory:", error);
    return initialMembersForDb; // Fallback on other errors
  }
}

export async function addSingleMemberAction(newMemberData: MemberWriteData): Promise<{ success: boolean; message: string; newMember?: Member }> {
  try {
    let currentMembers = await readMembersFromDb();
    
    const newMemberWithId: Member = {
      ...newMemberData,
      id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
      avatarUrl: newMemberData.avatarUrl || 'https://placehold.co/100x100',
    };

    const updatedMembers = [...currentMembers, newMemberWithId];
    await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(updatedMembers, null, 2), 'utf-8');

    revalidatePath('/members');
    
    return { success: true, message: `Miembro ${newMemberWithId.firstName} ${newMemberWithId.lastName} agregado exitosamente.`, newMember: newMemberWithId };
  } catch (error: any) {
    console.error("Error saving single member:", error);
    return { success: false, message: `Error al guardar miembro: ${error.message}` };
  }
}

export async function updateMemberAction(updatedMemberData: Member): Promise<{ success: boolean; message: string; updatedMember?: Member }> {
  if (!updatedMemberData.id) {
    return { success: false, message: "Error: ID de miembro es requerido para actualizar." };
  }
  try {
    let currentMembers = await readMembersFromDb();
    
    const memberIndex = currentMembers.findIndex(m => m.id === updatedMemberData.id);

    if (memberIndex === -1) {
      return { success: false, message: `Error: Miembro con ID ${updatedMemberData.id} no encontrado.` };
    }

    // Ensure avatarUrl has a default if empty string was passed
    const memberToUpdate = {
      ...updatedMemberData,
      avatarUrl: updatedMemberData.avatarUrl || 'https://placehold.co/100x100',
    };
    
    currentMembers[memberIndex] = memberToUpdate;
    await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(currentMembers, null, 2), 'utf-8');

    revalidatePath('/members');
    
    return { success: true, message: `Miembro ${memberToUpdate.firstName} ${memberToUpdate.lastName} actualizado exitosamente.`, updatedMember: memberToUpdate };
  } catch (error: any) {
    console.error("Error updating member:", error);
    return { success: false, message: `Error al actualizar miembro: ${error.message}` };
  }
}


async function getMembersData(): Promise<{ members: Member[], gdis: GDI[], ministryAreas: MinistryArea[] }> {
  const members = await readMembersFromDb();
  return {
    members,
    gdis: placeholderGDIs, // Still using placeholders for these
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
        addSingleMemberAction={addSingleMemberAction}
        updateMemberAction={updateMemberAction}
      />
    </div>
  );
}
