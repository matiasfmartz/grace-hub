
import { placeholderMembers, placeholderGDIs, placeholderMinistryAreas } from '@/lib/placeholder-data';
import type { Member, GDI, MinistryArea } from '@/lib/types';
import BulkAddMembersView from '@/components/members/bulk-add-members-view';

async function getData(): Promise<{ members: Member[], gdis: GDI[], ministryAreas: MinistryArea[] }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50)); 
  return {
    members: placeholderMembers, // For AddMemberForm guide/leader name lookups
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
        allMembers={members} // Pass all members for the form select options
      />
    </div>
  );
}
