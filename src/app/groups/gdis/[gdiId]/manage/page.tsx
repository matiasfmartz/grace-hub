
'use server';
import type { GDI, Member } from '@/lib/types';
import { placeholderMembers } from '@/lib/placeholder-data'; // Fallback for members
import ManageSingleGdiView from '@/components/groups/manage-single-gdi-view';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const GDIS_DB_PATH = path.join(process.cwd(), 'src/lib/gdis-db.json');
const MEMBERS_DB_PATH = path.join(process.cwd(), 'src/lib/members-db.json');

async function readGdisFromDb(): Promise<GDI[]> {
  try {
    const fileContent = await fs.readFile(GDIS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Failed to read gdis-db.json for manage page:", error);
    return [];
  }
}

async function readMembersFromDb(): Promise<Member[]> {
  try {
    const fileContent = await fs.readFile(MEMBERS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Failed to read members-db.json for manage GDI page, using placeholders:", error);
    return placeholderMembers;
  }
}

export async function updateGdiDetailsAction(
  gdiId: string,
  updatedData: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
): Promise<{ success: boolean; message: string; updatedGdi?: GDI }> {
  try {
    let allCurrentGdis = await readGdisFromDb();
    const gdiIndex = allCurrentGdis.findIndex(gdi => gdi.id === gdiId);

    if (gdiIndex === -1) {
      return { success: false, message: `GDI con ID ${gdiId} no encontrado.` };
    }

    const originalGdi = { ...allCurrentGdis[gdiIndex] }; // For comparison

    // Prepare the GDI data to be saved
    const gdiAfterClientUpdate: GDI = {
      id: originalGdi.id,
      name: updatedData.name ?? originalGdi.name,
      guideId: updatedData.guideId ?? originalGdi.guideId,
      memberIds: updatedData.memberIds ?? originalGdi.memberIds,
    };

    // --- Synchronize with members-db.json ---
    let allMembers = await readMembersFromDb();
    let membersDbChanged = false;

    // 1. Handle the new guide
    const newGuideId = gdiAfterClientUpdate.guideId;
    const oldGuideId = originalGdi.guideId;

    if (newGuideId !== oldGuideId) {
      // Demote old guide if they were specifically guiding this GDI
      if (oldGuideId) {
        const oldGuideMemberIndex = allMembers.findIndex(m => m.id === oldGuideId);
        if (oldGuideMemberIndex !== -1 && allMembers[oldGuideMemberIndex].assignedGDIId === gdiId) {
          allMembers[oldGuideMemberIndex].assignedGDIId = null; // No longer guide of this GDI
          membersDbChanged = true;
        }
      }
      // Promote new guide
      const newGuideMemberIndex = allMembers.findIndex(m => m.id === newGuideId);
      if (newGuideMemberIndex !== -1) {
        const previousGdiOfNewGuide = allMembers[newGuideMemberIndex].assignedGDIId;
        if (previousGdiOfNewGuide && previousGdiOfNewGuide !== gdiId) {
          // New guide was in another GDI, remove them from there
          const previousGdiIndex = allCurrentGdis.findIndex(g => g.id === previousGdiOfNewGuide);
          if (previousGdiIndex !== -1) {
            allCurrentGdis[previousGdiIndex].memberIds = allCurrentGdis[previousGdiIndex].memberIds.filter(id => id !== newGuideId);
            if (allCurrentGdis[previousGdiIndex].guideId === newGuideId) { // Was also guide of old GDI
                allCurrentGdis[previousGdiIndex].guideId = placeholderMembers[0].id; // Assign a placeholder, admin should fix
                 // Ideally, throw error or handle "GDI X now has no guide"
            }
          }
        }
        allMembers[newGuideMemberIndex].assignedGDIId = gdiId;
        membersDbChanged = true;
      }
    }
    
    // 2. Handle member list changes
    const originalMemberSet = new Set(originalGdi.memberIds || []);
    const newMemberSet = new Set(gdiAfterClientUpdate.memberIds || []);

    const membersAddedToGdi = Array.from(newMemberSet).filter(id => !originalMemberSet.has(id));
    const membersRemovedFromGdi = Array.from(originalMemberSet).filter(id => !newMemberSet.has(id));

    membersAddedToGdi.forEach(memberId => {
      const memberIndex = allMembers.findIndex(m => m.id === memberId);
      if (memberIndex !== -1) {
        const previousGdiOfMember = allMembers[memberIndex].assignedGDIId;
        if (previousGdiOfMember && previousGdiOfMember !== gdiId) {
          // Member was in another GDI, remove them
          const previousGdiIndex = allCurrentGdis.findIndex(g => g.id === previousGdiOfMember);
          if (previousGdiIndex !== -1) {
            allCurrentGdis[previousGdiIndex].memberIds = allCurrentGdis[previousGdiIndex].memberIds.filter(id => id !== memberId);
             if (allCurrentGdis[previousGdiIndex].guideId === memberId) { // Was guide of old GDI
                allCurrentGdis[previousGdiIndex].guideId = placeholderMembers[0].id; 
            }
          }
        }
        allMembers[memberIndex].assignedGDIId = gdiId;
        membersDbChanged = true;
      }
    });

    membersRemovedFromGdi.forEach(memberId => {
      const memberIndex = allMembers.findIndex(m => m.id === memberId);
      if (memberIndex !== -1 && allMembers[memberIndex].assignedGDIId === gdiId) {
        allMembers[memberIndex].assignedGDIId = null;
        membersDbChanged = true;
      }
    });

    // --- Save GDI data ---
    allCurrentGdis[gdiIndex] = gdiAfterClientUpdate;
    await fs.writeFile(GDIS_DB_PATH, JSON.stringify(allCurrentGdis, null, 2), 'utf-8');

    // --- Save members data if changed ---
    if (membersDbChanged) {
      await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(allMembers, null, 2), 'utf-8');
    }

    revalidatePath(`/groups/gdis/${gdiId}/manage`);
    revalidatePath('/groups');
    revalidatePath('/members');

    return { success: true, message: `GDI "${gdiAfterClientUpdate.name}" actualizado exitosamente.`, updatedGdi: gdiAfterClientUpdate };
  } catch (error: any) {
    console.error("Error actualizando GDI y asignaciones de miembros:", error);
    return { success: false, message: `Error actualizando GDI: ${error.message}` };
  }
}


interface ManageGdiPageProps {
  params: { gdiId: string };
}

async function getData(gdiId: string): Promise<{ gdi: GDI | null; allMembers: Member[]; activeMembers: Member[]; }> {
  const gdis = await readGdisFromDb();
  const gdi = gdis.find(g => g.id === gdiId) || null;
  const allMembers = await readMembersFromDb();
  const activeMembers = allMembers.filter(m => m.status === 'Active');
  return { gdi, allMembers, activeMembers };
}

export default async function ManageGdiPage({ params }: ManageGdiPageProps) {
  const { gdi, allMembers, activeMembers } = await getData(params.gdiId);

  if (!gdi) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Grupos
          </Link>
        </Button>
      </div>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Administrar GDI: {gdi.name}</h1>
        <p className="text-muted-foreground mt-2">
          Actualizar guía, asignar miembros y administrar otros detalles para este GDI.
        </p>
      </div>
      <ManageSingleGdiView
        gdi={gdi}
        allMembers={allMembers} 
        activeMembers={activeMembers} // For guide selection
        updateGdiAction={updateGdiDetailsAction}
      />
    </div>
  );
}
