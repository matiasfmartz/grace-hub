
'use server';
import type { MinistryArea, Member, GDI, AddMinistryAreaFormValues, AddGdiFormValues } from '@/lib/types';
import { placeholderMinistryAreas, placeholderMembers, placeholderGDIs } from '@/lib/placeholder-data';
import ManageGroupsTabs from '@/components/groups/manage-groups-tabs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';

const MINISTRY_AREAS_DB_PATH = path.join(process.cwd(), 'src/lib/ministry-areas-db.json');
const GDIS_DB_PATH = path.join(process.cwd(), 'src/lib/gdis-db.json');
const MEMBERS_DB_PATH = path.join(process.cwd(), 'src/lib/members-db.json'); // For member names

async function readMinistryAreasFromDb(): Promise<MinistryArea[]> {
  try {
    const fileContent = await fs.readFile(MINISTRY_AREAS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(MINISTRY_AREAS_DB_PATH, JSON.stringify(placeholderMinistryAreas, null, 2), 'utf-8');
      return placeholderMinistryAreas;
    }
    console.error("Failed to read ministry-areas-db.json:", error);
    return placeholderMinistryAreas;
  }
}

async function readGdisFromDb(): Promise<GDI[]> {
  try {
    const fileContent = await fs.readFile(GDIS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(GDIS_DB_PATH, JSON.stringify(placeholderGDIs, null, 2), 'utf-8');
      return placeholderGDIs;
    }
    console.error("Failed to read gdis-db.json:", error);
    return placeholderGDIs;
  }
}

async function readMembersFromDb(): Promise<Member[]> {
  try {
    const fileContent = await fs.readFile(MEMBERS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    // Assuming members-db.json is created by members page, fallback to placeholders if not found
    console.error("Failed to read members-db.json for groups page, using placeholders:", error);
    return placeholderMembers;
  }
}

export async function addMinistryAreaAction(newAreaData: AddMinistryAreaFormValues): Promise<{ success: boolean; message: string; newArea?: MinistryArea }> {
  try {
    let currentAreas = await readMinistryAreasFromDb();
    const newArea: MinistryArea = {
      ...newAreaData,
      id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
      memberIds: [], // Initially no members except the leader implicitly
      imageUrl: newAreaData.imageUrl || 'https://placehold.co/600x400',
    };
    const updatedAreas = [...currentAreas, newArea];
    await fs.writeFile(MINISTRY_AREAS_DB_PATH, JSON.stringify(updatedAreas, null, 2), 'utf-8');
    revalidatePath('/groups');
    return { success: true, message: `Ministry Area "${newArea.name}" added successfully.`, newArea };
  } catch (error: any) {
    console.error("Error adding ministry area:", error);
    return { success: false, message: `Error adding ministry area: ${error.message}` };
  }
}

export async function addGdiAction(newGdiData: AddGdiFormValues): Promise<{ success: boolean; message: string; newGdi?: GDI }> {
  try {
    let currentGdis = await readGdisFromDb();
    const newGdi: GDI = {
      ...newGdiData,
      id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
      memberIds: [], // Initially no members except the guide implicitly
    };
    const updatedGdis = [...currentGdis, newGdi];
    await fs.writeFile(GDIS_DB_PATH, JSON.stringify(updatedGdis, null, 2), 'utf-8');
    revalidatePath('/groups');
    return { success: true, message: `GDI "${newGdi.name}" added successfully.`, newGdi };
  } catch (error: any) {
    console.error("Error adding GDI:", error);
    return { success: false, message: `Error adding GDI: ${error.message}` };
  }
}

async function getGroupsData(): Promise<{ ministryAreas: MinistryArea[], gdis: GDI[], members: Member[] }> {
  const ministryAreas = await readMinistryAreasFromDb();
  const gdis = await readGdisFromDb();
  const members = await readMembersFromDb();
  return { ministryAreas, gdis, members };
}

export default async function GroupsPage() {
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
        addMinistryAreaAction={addMinistryAreaAction}
        addGdiAction={addGdiAction}
      />
    </div>
  );
}
