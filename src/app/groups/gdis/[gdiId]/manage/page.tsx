
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
  gdiIdToUpdate: string,
  updatedData: Partial<Pick<GDI, 'name' | 'guideId' | 'memberIds'>>
): Promise<{ success: boolean; message: string; updatedGdi?: GDI }> {
  try {
    let allGdis = await readGdisFromDb();
    let allMembers = await readMembersFromDb();
    
    const gdiIndexToUpdate = allGdis.findIndex(gdi => gdi.id === gdiIdToUpdate);
    if (gdiIndexToUpdate === -1) {
      return { success: false, message: `GDI con ID ${gdiIdToUpdate} no encontrado.` };
    }

    const originalGdi = { ...allGdis[gdiIndexToUpdate] }; // Deep copy

    // --- Prepare new GDI state ---
    const newName = updatedData.name ?? originalGdi.name;
    const newGuideId = updatedData.guideId ?? originalGdi.guideId; // This must be a valid member ID
    const newMemberIdsFromClient = updatedData.memberIds ?? originalGdi.memberIds;
    // Ensure the new guide is not in the member list for THIS GDI
    const finalMemberIdsForThisGDI = newMemberIdsFromClient.filter(id => id !== newGuideId);


    // --- Handle Guide Change ---
    if (newGuideId && newGuideId !== originalGdi.guideId) {
      // 1. Demote Old Guide (of this GDI)
      if (originalGdi.guideId) {
        const oldGuideMemberIndex = allMembers.findIndex(m => m.id === originalGdi.guideId);
        if (oldGuideMemberIndex !== -1 && allMembers[oldGuideMemberIndex].assignedGDIId === gdiIdToUpdate) {
          allMembers[oldGuideMemberIndex].assignedGDIId = null;
        }
      }

      // 2. Promote New Guide (for this GDI)
      const newGuideMemberIndexInAllMembers = allMembers.findIndex(m => m.id === newGuideId);
      if (newGuideMemberIndexInAllMembers !== -1) {
        const newGuideObject = allMembers[newGuideMemberIndexInAllMembers];
        const previousGDIIdOfNewGuide = newGuideObject.assignedGDIId;

        // 2a. If new guide was guiding another GDI:
        const otherGdiGuidedByNewGuideIndex = allGdis.findIndex(g => g.guideId === newGuideId && g.id !== gdiIdToUpdate);
        if (otherGdiGuidedByNewGuideIndex !== -1) {
          allGdis[otherGdiGuidedByNewGuideIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allGdis[otherGdiGuidedByNewGuideIndex].id}`;
          // Also remove the new guide from the member list of the GDI they previously guided
          allGdis[otherGdiGuidedByNewGuideIndex].memberIds = allGdis[otherGdiGuidedByNewGuideIndex].memberIds.filter(id => id !== newGuideId);
        }
        
        // 2b. If new guide was a member of another GDI (and not its guide):
        if (previousGDIIdOfNewGuide && previousGDIIdOfNewGuide !== gdiIdToUpdate) {
           const previousGdiDataIndex = allGdis.findIndex(g => g.id === previousGDIIdOfNewGuide);
           if (previousGdiDataIndex !== -1 && allGdis[previousGdiDataIndex].guideId !== newGuideId) { // was not guide, just member
             allGdis[previousGdiDataIndex].memberIds = allGdis[previousGdiDataIndex].memberIds.filter(id => id !== newGuideId);
           }
        }
        
        // 2c. Update new guide's assignment in members DB
        allMembers[newGuideMemberIndexInAllMembers].assignedGDIId = gdiIdToUpdate;
      }
    } else if (!newGuideId && originalGdi.guideId) { // Guide was removed without replacement
        const oldGuideMemberIndex = allMembers.findIndex(m => m.id === originalGdi.guideId);
        if (oldGuideMemberIndex !== -1 && allMembers[oldGuideMemberIndex].assignedGDIId === gdiIdToUpdate) {
            allMembers[oldGuideMemberIndex].assignedGDIId = null;
        }
    }


    // --- Handle Member List Changes for this GDI ---
    const originalEffectiveMemberIds = originalGdi.memberIds.filter(id => id !== originalGdi.guideId);

    const membersAddedToThisGdi = finalMemberIdsForThisGDI.filter(id => !originalEffectiveMemberIds.includes(id));
    const membersRemovedFromThisGdi = originalEffectiveMemberIds.filter(id => !finalMemberIdsForThisGDI.includes(id));

    // Process newly added members to this GDI
    membersAddedToThisGdi.forEach(memberId => {
      const memberIndexInAllMembers = allMembers.findIndex(m => m.id === memberId);
      if (memberIndexInAllMembers !== -1) {
        const memberObject = allMembers[memberIndexInAllMembers];
        const previousGDIIdOfMember = memberObject.assignedGDIId;
        
        // If member was guiding another GDI:
        const otherGdiGuidedByThisMemberIndex = allGdis.findIndex(g => g.guideId === memberId && g.id !== gdiIdToUpdate);
        if (otherGdiGuidedByThisMemberIndex !== -1) {
            allGdis[otherGdiGuidedByThisMemberIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allGdis[otherGdiGuidedByThisMemberIndex].id}`;
            allGdis[otherGdiGuidedByThisMemberIndex].memberIds = allGdis[otherGdiGuidedByThisMemberIndex].memberIds.filter(id => id !== memberId);
        }

        // If member was a member of another GDI (and not its guide):
        if (previousGDIIdOfMember && previousGDIIdOfMember !== gdiIdToUpdate) {
             const previousGdiDataIndex = allGdis.findIndex(g => g.id === previousGDIIdOfMember);
             if (previousGdiDataIndex !== -1 && allGdis[previousGdiDataIndex].guideId !== memberId) {
                allGdis[previousGdiDataIndex].memberIds = allGdis[previousGdiDataIndex].memberIds.filter(id => id !== memberId);
             }
        }
        // Update member's assignment in members DB
        allMembers[memberIndexInAllMembers].assignedGDIId = gdiIdToUpdate;
      }
    });

    // Process members removed from this GDI
    membersRemovedFromThisGdi.forEach(memberId => {
      const memberIndexInAllMembers = allMembers.findIndex(m => m.id === memberId);
      if (memberIndexInAllMembers !== -1 && allMembers[memberIndexInAllMembers].assignedGDIId === gdiIdToUpdate) {
        allMembers[memberIndexInAllMembers].assignedGDIId = null;
      }
    });

    // --- Update the GDI being edited ---
    const gdiAfterServerUpdate: GDI = {
      id: gdiIdToUpdate,
      name: newName,
      guideId: newGuideId, // This must be a valid ID or ""/null if no guide
      memberIds: finalMemberIdsForThisGDI,
    };
    allGdis[gdiIndexToUpdate] = gdiAfterServerUpdate;
    
    // --- Save data ---
    await fs.writeFile(GDIS_DB_PATH, JSON.stringify(allGdis, null, 2), 'utf-8');
    await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(allMembers, null, 2), 'utf-8');

    revalidatePath(`/groups/gdis/${gdiIdToUpdate}/manage`);
    revalidatePath('/groups');
    revalidatePath('/members');

    return { success: true, message: `GDI "${gdiAfterServerUpdate.name}" actualizado exitosamente.`, updatedGdi: gdiAfterServerUpdate };
  } catch (error: any) {
    console.error("Error actualizando GDI y asignaciones de miembros:", error);
    return { success: false, message: `Error actualizando GDI: ${error.message}` };
  }
}


interface ManageGdiPageProps {
  params: { gdiId: string };
}

async function getData(gdiId: string): Promise<{ gdi: GDI | null; allMembers: Member[]; activeMembers: Member[]; allGdis: GDI[] }> {
  const gdis = await readGdisFromDb();
  const gdi = gdis.find(g => g.id === gdiId) || null;
  const allMembers = await readMembersFromDb();
  const activeMembers = allMembers.filter(m => m.status === 'Active');
  return { gdi, allMembers, activeMembers, allGdis: gdis };
}

export default async function ManageGdiPage({ params }: ManageGdiPageProps) {
  const { gdi, allMembers, activeMembers, allGdis } = await getData(params.gdiId);

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
        activeMembers={activeMembers}
        allGdis={allGdis}
        updateGdiAction={updateGdiDetailsAction}
      />
    </div>
  );
}

