
'use server';
import type { MinistryArea, Member, UpdateMinistryAreaLeaderFormValues } from '@/lib/types';
import { placeholderMembers } from '@/lib/placeholder-data'; // Fallback
import ManageSingleMinistryAreaView from '@/components/groups/manage-single-ministry-area-view';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const MINISTRY_AREAS_DB_PATH = path.join(process.cwd(), 'src/lib/ministry-areas-db.json');
const MEMBERS_DB_PATH = path.join(process.cwd(), 'src/lib/members-db.json');

async function readMinistryAreasFromDb(): Promise<MinistryArea[]> {
  try {
    const fileContent = await fs.readFile(MINISTRY_AREAS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Failed to read ministry-areas-db.json for manage page:", error);
    return []; // Return empty if error, notFound will handle if area isn't found
  }
}

async function readMembersFromDb(): Promise<Member[]> {
  try {
    const fileContent = await fs.readFile(MEMBERS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Failed to read members-db.json for manage area page, using placeholders:", error);
    return placeholderMembers;
  }
}

export async function updateMinistryAreaDetailsAction(
  areaId: string,
  updatedData: Partial<Pick<MinistryArea, 'leaderId' | 'memberIds' | 'name' | 'description' | 'imageUrl'>>
): Promise<{ success: boolean; message: string; updatedArea?: MinistryArea }> {
  try {
    let currentAreas = await readMinistryAreasFromDb();
    const areaIndex = currentAreas.findIndex(area => area.id === areaId);

    if (areaIndex === -1) {
      return { success: false, message: `Ministry Area with ID ${areaId} not found.` };
    }

    const updatedArea = { ...currentAreas[areaIndex], ...updatedData };
    currentAreas[areaIndex] = updatedArea;

    await fs.writeFile(MINISTRY_AREAS_DB_PATH, JSON.stringify(currentAreas, null, 2), 'utf-8');
    revalidatePath(`/groups/ministry-areas/${areaId}/manage`);
    revalidatePath('/groups'); // Also revalidate the main groups page

    return { success: true, message: `Ministry Area "${updatedArea.name}" updated successfully.`, updatedArea };
  } catch (error: any) {
    console.error("Error updating ministry area:", error);
    return { success: false, message: `Error updating ministry area: ${error.message}` };
  }
}


interface ManageMinistryAreaPageProps {
  params: { areaId: string };
}

async function getData(areaId: string): Promise<{ ministryArea: MinistryArea | null; allMembers: Member[] }> {
  const ministryAreas = await readMinistryAreasFromDb();
  const ministryArea = ministryAreas.find(area => area.id === areaId) || null;
  const allMembers = await readMembersFromDb();
  return { ministryArea, allMembers };
}

export default async function ManageMinistryAreaPage({ params }: ManageMinistryAreaPageProps) {
  const { ministryArea, allMembers } = await getData(params.areaId);

  if (!ministryArea) {
    notFound(); // Or a custom "Area not found" component
  }
  
  const activeMembers = allMembers.filter(m => m.status === 'Active');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Link>
        </Button>
      </div>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Manage: {ministryArea.name}</h1>
        <p className="text-muted-foreground mt-2">
          Update leader, assign members, and manage other details for this ministry area.
        </p>
      </div>
      <ManageSingleMinistryAreaView
        ministryArea={ministryArea}
        allMembers={allMembers} // Full list for display
        activeMembers={activeMembers} // Active list for selection
        updateMinistryAreaAction={updateMinistryAreaDetailsAction}
      />
    </div>
  );
}
