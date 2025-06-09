import { placeholderEvents } from '@/lib/placeholder-data';
import type { ChurchEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { CalendarDays, Clock, MapPin, Info } from 'lucide-react';

async function getEvents(): Promise<ChurchEvent[]> {
  await new Promise(resolve => setTimeout(resolve, 400));
  return placeholderEvents;
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-10 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Upcoming Events</h1>
        <p className="text-muted-foreground mt-2">Stay informed about all activities and gatherings at Grace Hub.</p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-8">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 md:flex">
              {event.imageUrl && (
                <div className="md:w-1/3 relative h-48 md:h-auto">
                  <Image 
                    src={event.imageUrl} 
                    alt={event.name} 
                    layout="fill" 
                    objectFit="cover"
                    className="md:rounded-l-lg md:rounded-t-none rounded-t-lg"
                    data-ai-hint="church event"
                  />
                </div>
              )}
              <div className={`flex flex-col ${event.imageUrl ? 'md:w-2/3' : 'w-full'}`}>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl text-primary">{event.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-5 w-5 text-primary" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-5 w-5 text-primary" />
                    <span>{event.location}</span>
                  </div>
                  <CardDescription className="text-sm pt-2 leading-relaxed">{event.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                    <Info className="mr-2 h-4 w-4" />
                    Learn More
                  </Button>
                </CardFooter>
              </div>
            </Card>
          ))}
        </div>
      ) : (
         <div className="text-center py-10">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Upcoming Events</h2>
          <p className="text-muted-foreground mt-2">Please check back soon for our event schedule.</p>
        </div>
      )}
    </div>
  );
}
