
// src/app/groups/gdis/[gdiId]/admin/page.tsx
'use server';
import { getGdiById } from '@/services/gdiService';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Import actions and other necessary components/services later

interface GdiAdminPageProps {
  params: { gdiId: string };
}

export default async function GdiAdminPage({ params }: GdiAdminPageProps) {
  const gdi = await getGdiById(params.gdiId);

  if (!gdi) {
    notFound();
  }

  // Placeholder for fetching and displaying meeting series/instances for this GDI
  // const meetingSeries = await getSeriesForGroup('gdi', gdi.id);
  // const meetingInstances = meetingSeries ? await getGroupMeetingInstances('gdi', gdi.id, meetingSeries.id) : { instances: [], totalCount: 0, totalPages: 0 };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href={`/groups/gdis/${gdi.id}/manage`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Administrar GDI
          </Link>
        </Button>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary">
            Administrar Reuniones para GDI: {gdi.name}
          </CardTitle>
          <CardDescription>
            Configure la serie de reuniones recurrentes para este GDI y gestione la asistencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Funcionalidad para definir series de reuniones y ver instancias estará aquí.
          </p>
          {/* TODO: Add DefineMeetingSeriesForm for this GDI */}
          {/* TODO: Add MeetingInstancesTable for this GDI's series */}
        </CardContent>
      </Card>
    </div>
  );
}
