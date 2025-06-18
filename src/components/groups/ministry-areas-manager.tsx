
"use client";

import type { MinistryArea, Member } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Mail, Phone, UserCircle, UsersRound, Settings } from 'lucide-react';

interface MinistryAreasManagerProps {
  ministryAreas: MinistryArea[];
  allMembers: Member[];
  activeMembers: Member[]; 
}

export default function MinistryAreasManager({ ministryAreas, allMembers, activeMembers }: MinistryAreasManagerProps) {

  const getLeaderDetails = (leaderId: string) => {
    return allMembers.find(member => member.id === leaderId);
  };

  return (
    <div>
      {/* Button to add new area is now in ManageGroupsTabs.tsx */}
      {ministryAreas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ministryAreas.map((area) => {
            const leader = getLeaderDetails(area.leaderId);
            return (
              <Card key={area.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl text-primary flex items-center">
                    <UsersRound className="mr-2 h-6 w-6" /> {area.name}
                  </CardTitle>
                  <CardDescription className="text-sm h-20 overflow-y-auto">{area.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Líder del Área:</h4>
                    <p className="text-muted-foreground text-sm">{leader ? `${leader.firstName} ${leader.lastName}` : 'N/A'}</p>
                  </div>
                  {leader && (
                    <>
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email del Líder:</h4>
                        <a href={`mailto:${leader.email}`} className="text-primary hover:underline text-sm">{leader.email}</a>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /> Teléfono del Líder:</h4>
                        <a href={`tel:${leader.phone}`} className="text-primary hover:underline text-sm">{leader.phone}</a>
                      </div>
                    </>
                  )}
                   <CardDescription className="text-sm pt-2">
                    Miembros: {area.memberIds.length}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                    <Link href={`/groups/ministry-areas/${area.id}/admin`}>
                      <Settings className="mr-2 h-4 w-4" /> Admin. Reuniones
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <UsersRound className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Ministry Areas Available</h2>
          <p className="text-muted-foreground mt-2">Add a new ministry area to get started.</p>
        </div>
      )}
      {/* Dialog for adding area is now in ManageGroupsTabs.tsx */}
    </div>
  );
}
