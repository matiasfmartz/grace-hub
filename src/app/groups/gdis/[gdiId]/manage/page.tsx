
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
    let allMembers = await readMembersFromDb();
    
    const gdiIndex = allCurrentGdis.findIndex(gdi => gdi.id === gdiId);
    if (gdiIndex === -1) {
      return { success: false, message: `GDI con ID ${gdiId} no encontrado.` };
    }

    const originalGdi = { ...allCurrentGdis[gdiIndex] };
    let membersDbChanged = false;
    let gdisDbChanged = false; // To track if other GDIs were modified

    const newName = updatedData.name ?? originalGdi.name;
    const newGuideId = updatedData.guideId ?? originalGdi.guideId;
    // Ensure client sends memberIds that DO NOT include the newGuideId
    const newMemberIdsFromClient = (updatedData.memberIds ?? originalGdi.memberIds).filter(id => id !== newGuideId);


    // 1. Handle Guide Change
    if (newGuideId && newGuideId !== originalGdi.guideId) {
      // Demote old guide (if one existed for this GDI)
      if (originalGdi.guideId) {
        const oldGuideMemberIndex = allMembers.findIndex(m => m.id === originalGdi.guideId);
        if (oldGuideMemberIndex !== -1 && allMembers[oldGuideMemberIndex].assignedGDIId === gdiId) {
          allMembers[oldGuideMemberIndex].assignedGDIId = null;
          membersDbChanged = true;
        }
      }

      // Promote new guide
      const newGuideMemberIndex = allMembers.findIndex(m => m.id === newGuideId);
      if (newGuideMemberIndex !== -1) {
        const previousGdiIdOfNewGuide = allMembers[newGuideMemberIndex].assignedGDIId;

        // If new guide was guiding another GDI, that GDI needs a new (placeholder) guide
        const otherGdiGuidedByNewGuideIndex = allCurrentGdis.findIndex(g => g.guideId === newGuideId && g.id !== gdiId);
        if (otherGdiGuidedByNewGuideIndex !== -1) {
          allCurrentGdis[otherGdiGuidedByNewGuideIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allCurrentGdis[otherGdiGuidedByNewGuideIndex].id}`;
          // Also remove the new guide from the member list of the GDI they previously guided
          allCurrentGdis[otherGdiGuidedByNewGuideIndex].memberIds = allCurrentGdis[otherGdiGuidedByNewGuideIndex].memberIds.filter(id => id !== newGuideId);
          gdisDbChanged = true;
        }
        
        // If new guide was a member of another GDI (and not its guide), remove them from that GDI's member list
        if (previousGdiIdOfNewGuide && previousGdiIdOfNewGuide !== gdiId) {
           const previousGdiDataIndex = allCurrentGdis.findIndex(g => g.id === previousGdiIdOfNewGuide);
           if (previousGdiDataIndex !== -1 && allCurrentGdis[previousGdiDataIndex].guideId !== newGuideId) { // was not guide, just member
             allCurrentGdis[previousGdiDataIndex].memberIds = allCurrentGdis[previousGdiDataIndex].memberIds.filter(id => id !== newGuideId);
             gdisDbChanged = true;
           }
        }
        
        allMembers[newGuideMemberIndex].assignedGDIId = gdiId;
        membersDbChanged = true;
      }
    } else if (!newGuideId && originalGdi.guideId) {
        // Guide was removed without replacement (should be handled by client validation, but as a safeguard)
        // Demote old guide if their assignedGDIId was this gdiId
        const oldGuideMemberIndex = allMembers.findIndex(m => m.id === originalGdi.guideId);
        if (oldGuideMemberIndex !== -1 && allMembers[oldGuideMemberIndex].assignedGDIId === gdiId) {
            allMembers[oldGuideMemberIndex].assignedGDIId = null;
            membersDbChanged = true;
        }
    }


    // 2. Handle Member List Changes (ensure newGuideId is not in this list)
    const finalEffectiveMemberIds = newMemberIdsFromClient.filter(id => id !== newGuideId);
    const originalEffectiveMemberIds = originalGdi.memberIds.filter(id => id !== originalGdi.guideId);

    const membersAddedToGdi = finalEffectiveMemberIds.filter(id => !originalEffectiveMemberIds.includes(id));
    const membersRemovedFromGdi = originalEffectiveMemberIds.filter(id => !finalEffectiveMemberIds.includes(id));

    membersAddedToGdi.forEach(memberId => {
      const memberIndex = allMembers.findIndex(m => m.id === memberId);
      if (memberIndex !== -1) {
        const previousGdiIdOfMember = allMembers[memberIndex].assignedGDIId;
        
        // If member was guide of another GDI, that GDI needs placeholder guide
        const otherGdiGuidedByThisMemberIndex = allCurrentGdis.findIndex(g => g.guideId === memberId && g.id !== gdiId);
        if (otherGdiGuidedByThisMemberIndex !== -1) {
            allCurrentGdis[otherGdiGuidedByThisMemberIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${allCurrentGdis[otherGdiGuidedByThisMemberIndex].id}`;
            allCurrentGdis[otherGdiGuidedByThisMemberIndex].memberIds = allCurrentGdis[otherGdiGuidedByThisMemberIndex].memberIds.filter(id => id !== memberId);
            gdisDbChanged = true;
        }

        // If member was in another GDI's member list (and not its guide)
        if (previousGdiIdOfMember && previousGdiIdOfMember !== gdiId) {
             const previousGdiDataIndex = allCurrentGdis.findIndex(g => g.id === previousGdiIdOfMember);
             if (previousGdiDataIndex !== -1 && allCurrentGdis[previousGdiDataIndex].guideId !== memberId) {
                allCurrentGdis[previousGdiDataIndex].memberIds = allCurrentGdis[previousGdiDataIndex].memberIds.filter(id => id !== memberId);
                gdisDbChanged = true;
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

    // Update the current GDI being edited
    const gdiAfterServerUpdate: GDI = {
      id: gdiId,
      name: newName,
      guideId: newGuideId, // This must be a valid ID
      memberIds: finalEffectiveMemberIds,
    };
    allCurrentGdis[gdiIndex] = gdiAfterServerUpdate;
    gdisDbChanged = true; // The current GDI itself changed

    // --- Save GDI data if any GDI changed ---
    if (gdisDbChanged) {
        await fs.writeFile(GDIS_DB_PATH, JSON.stringify(allCurrentGdis, null, 2), 'utf-8');
    }

    // --- Save members data if changed ---
    if (membersDbChanged) {
      await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(allMembers, null, 2), 'utf-8');
    }

    revalidatePath(`/groups/gdis/${gdiId}/manage`);
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
