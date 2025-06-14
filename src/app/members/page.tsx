
'use server';
import { placeholderMembers as initialMembersForDb, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import type { Member, GDI, MinistryArea, MemberWriteData } from '@/lib/types';
import MembersListView from '@/components/members/members-list-view';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';

const MEMBERS_DB_PATH = path.join(process.cwd(), 'src/lib/members-db.json');
const MINISTRY_AREAS_DB_PATH = path.join(process.cwd(), 'src/lib/ministry-areas-db.json');
const GDIS_DB_PATH = path.join(process.cwd(), 'src/lib/gdis-db.json');


async function readMembersFromDb(): Promise<Member[]> {
  try {
    const fileContent = await fs.readFile(MEMBERS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('members-db.json not found, using initial placeholder data and creating file.');
      await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(initialMembersForDb, null, 2), 'utf-8');
      return initialMembersForDb;
    }
    console.error("Failed to read members-db.json for Member Directory:", error);
    return initialMembersForDb;
  }
}

async function readMinistryAreasFromDb(): Promise<MinistryArea[]> {
  try {
    const fileContent = await fs.readFile(MINISTRY_AREAS_DB_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(MINISTRY_AREAS_DB_PATH, JSON.stringify(placeholderMinistryAreas, null, 2), 'utf-8');
      return placeholderMinistryAreas;
    }
    console.error("Failed to read ministry-areas-db.json for member update sync:", error);
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
    console.error("Failed to read gdis-db.json for member update sync:", error);
    return placeholderGDIs;
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

    // If assigned to a GDI, ensure they are not also guide of that GDI via this flow
    // GDI guide assignment is primarily managed from GDI management.
    // Here, if assignedGDIId is set, they are a member.
    if (newMemberWithId.assignedGDIId) {
        let allGdis = await readGdisFromDb();
        const gdiIndex = allGdis.findIndex(gdi => gdi.id === newMemberWithId.assignedGDIId);
        if (gdiIndex !== -1) {
            if (allGdis[gdiIndex].guideId === newMemberWithId.id) {
                // This scenario should ideally be prevented by UI, but as a safeguard:
                // A member cannot be added as a regular member if they are already the guide.
                // Or, if UI allows assigning GDI and member becomes guide simultaneously (not current flow for this action)
                // For now, this action assumes assignedGDIId makes them a *member*.
                // If this conflict happens, perhaps clear assignedGDIId or flag.
                // For simplicity, let's assume the new member is not simultaneously being made a guide here.
            } else if (!allGdis[gdiIndex].memberIds.includes(newMemberWithId.id)) {
                allGdis[gdiIndex].memberIds.push(newMemberWithId.id);
                await fs.writeFile(GDIS_DB_PATH, JSON.stringify(allGdis, null, 2), 'utf-8');
            }
        }
    }


    const updatedMembers = [...currentMembers, newMemberWithId];
    await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(updatedMembers, null, 2), 'utf-8');

    // Synchronize with Ministry Areas
    const assignedAreaIds = newMemberWithId.assignedAreaIds || [];
    if (assignedAreaIds.length > 0) {
      let allMinistryAreas = await readMinistryAreasFromDb();
      let ministryAreasDbChanged = false;
      assignedAreaIds.forEach(areaId => {
        const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
        if (areaIndex !== -1) {
          if (!allMinistryAreas[areaIndex].memberIds.includes(newMemberWithId.id)) {
            allMinistryAreas[areaIndex].memberIds.push(newMemberWithId.id);
            ministryAreasDbChanged = true;
          }
        }
      });
      if (ministryAreasDbChanged) {
        await fs.writeFile(MINISTRY_AREAS_DB_PATH, JSON.stringify(allMinistryAreas, null, 2), 'utf-8');
      }
    }
    
    revalidatePath('/members');
    revalidatePath('/groups');
    if (newMemberWithId.assignedAreaIds) {
      newMemberWithId.assignedAreaIds.forEach(areaId => {
        revalidatePath(`/groups/ministry-areas/${areaId}/manage`);
      });
    }
    if (newMemberWithId.assignedGDIId) {
        revalidatePath(`/groups/gdis/${newMemberWithId.assignedGDIId}/manage`);
    }
    
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
    
    const originalMemberData = { ...currentMembers[memberIndex] }; 

    const memberToUpdate = {
      ...updatedMemberData,
      avatarUrl: updatedMemberData.avatarUrl || 'https://placehold.co/100x100',
    };
    
    currentMembers[memberIndex] = memberToUpdate;
    await fs.writeFile(MEMBERS_DB_PATH, JSON.stringify(currentMembers, null, 2), 'utf-8');

    // Synchronize with Ministry Areas (as before)
    const originalAreaIds = new Set(originalMemberData.assignedAreaIds || []);
    const updatedAreaIds = new Set(memberToUpdate.assignedAreaIds || []);
    const areasAddedTo = Array.from(updatedAreaIds).filter(id => !originalAreaIds.has(id));
    const areasRemovedFrom = Array.from(originalAreaIds).filter(id => !updatedAreaIds.has(id));

    if (areasAddedTo.length > 0 || areasRemovedFrom.length > 0) {
      let allMinistryAreas = await readMinistryAreasFromDb();
      let ministryAreasDbChanged = false;
      areasAddedTo.forEach(areaId => {
        const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
        if (areaIndex !== -1 && !allMinistryAreas[areaIndex].memberIds.includes(memberToUpdate.id)) {
          allMinistryAreas[areaIndex].memberIds.push(memberToUpdate.id);
          ministryAreasDbChanged = true;
        }
      });
      areasRemovedFrom.forEach(areaId => {
        const areaIndex = allMinistryAreas.findIndex(area => area.id === areaId);
        if (areaIndex !== -1) {
          allMinistryAreas[areaIndex].memberIds = allMinistryAreas[areaIndex].memberIds.filter(id => id !== memberToUpdate.id);
           // If member was leader of this area, this is more complex. Area mgmt should handle leader changes.
           // For now, just remove as member. If they were leader, area management needs to update it.
          ministryAreasDbChanged = true;
        }
      });
      if (ministryAreasDbChanged) {
        await fs.writeFile(MINISTRY_AREAS_DB_PATH, JSON.stringify(allMinistryAreas, null, 2), 'utf-8');
      }
    }

    // Synchronize with GDIs
    const oldGdiId = originalMemberData.assignedGDIId;
    const newGdiId = memberToUpdate.assignedGDIId;

    if (oldGdiId !== newGdiId) {
      let allGdis = await readGdisFromDb();
      let gdisDbChanged = false;
      
      // Remove from old GDI if exists
      if (oldGdiId) {
        const oldGdiIndex = allGdis.findIndex(gdi => gdi.id === oldGdiId);
        if (oldGdiIndex !== -1) {
          // If member was the guide of the old GDI
          if (allGdis[oldGdiIndex].guideId === memberToUpdate.id) {
            allGdis[oldGdiIndex].guideId = placeholderMembers[0]?.id || `NEEDS_GUIDE_${oldGdiId}`; // Placeholder for admin
          }
          // Remove from member list of old GDI
          allGdis[oldGdiIndex].memberIds = allGdis[oldGdiIndex].memberIds.filter(id => id !== memberToUpdate.id);
          gdisDbChanged = true;
        }
      }
      
      // Add to new GDI if exists (as a member, not guide)
      if (newGdiId) {
        const newGdiIndex = allGdis.findIndex(gdi => gdi.id === newGdiId);
        if (newGdiIndex !== -1) {
          // Ensure member is not the guide of the new GDI (guide changes handled by GDI management)
          // And ensure not already in memberIds (though this update implies a change)
          if (allGdis[newGdiIndex].guideId !== memberToUpdate.id && 
              !allGdis[newGdiIndex].memberIds.includes(memberToUpdate.id)) {
            allGdis[newGdiIndex].memberIds.push(memberToUpdate.id);
            gdisDbChanged = true;
          }
        }
      }
      if (gdisDbChanged) {
        await fs.writeFile(GDIS_DB_PATH, JSON.stringify(allGdis, null, 2), 'utf-8');
      }
    }

    revalidatePath('/members');
    revalidatePath('/groups');
    const allAffectedAreaIds = new Set([...areasAddedTo, ...areasRemovedFrom]);
    allAffectedAreaIds.forEach(areaId => revalidatePath(`/groups/ministry-areas/${areaId}/manage`));
    if (oldGdiId) revalidatePath(`/groups/gdis/${oldGdiId}/manage`);
    if (newGdiId) revalidatePath(`/groups/gdis/${newGdiId}/manage`);
    
    return { success: true, message: `Miembro ${memberToUpdate.firstName} ${memberToUpdate.lastName} actualizado exitosamente.`, updatedMember: memberToUpdate };
  } catch (error: any) {
    console.error("Error updating member:", error);
    return { success: false, message: `Error al actualizar miembro: ${error.message}` };
  }
}


async function getMembersData(): Promise<{ members: Member[], gdis: GDI[], ministryAreas: MinistryArea[] }> {
  const members = await readMembersFromDb();
  const gdis = await readGdisFromDb();
  const ministryAreas = await readMinistryAreasFromDb();

  return {
    members,
    gdis,
    ministryAreas,
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
