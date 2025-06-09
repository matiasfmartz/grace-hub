import { placeholderGroups } from '@/lib/placeholder-data';
import type { Group } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { Mail, Phone, UserCircle, UsersRound } from 'lucide-react';

async function getGroups(): Promise<Group[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return placeholderGroups;
}

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-10 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Groups &amp; Ministry Teams</h1>
        <p className="text-muted-foreground mt-2">Find your place and get involved in our church community.</p>
      </div>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              {group.imageUrl && (
                <div className="relative h-48 w-full">
                  <Image 
                    src={group.imageUrl} 
                    alt={group.name} 
                    layout="fill" 
                    objectFit="cover" 
                    data-ai-hint="team meeting"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center">
                  <UsersRound className="mr-2 h-6 w-6" /> {group.name}
                </CardTitle>
                <CardDescription className="text-sm h-20 overflow-y-auto">{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Team Leader:</h4>
                  <p className="text-muted-foreground text-sm">{group.leaderName}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Leader Email:</h4>
                  <a href={`mailto:${group.leaderEmail}`} className="text-primary hover:underline text-sm">{group.leaderEmail}</a>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /> Leader Phone:</h4>
                  <a href={`tel:${group.leaderPhone}`} className="text-primary hover:underline text-sm">{group.leaderPhone}</a>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  Request to Join
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <UsersRound className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Groups Available</h2>
          <p className="text-muted-foreground mt-2">Please check back later for new groups and ministry teams.</p>
        </div>
      )}
    </div>
  );
}
