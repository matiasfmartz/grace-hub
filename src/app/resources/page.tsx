import { placeholderResources } from '@/lib/placeholder-data';
import type { Resource } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import Link from 'next/link';
import { BookOpenText, FileText, Megaphone, BookMarked, ArrowRight } from 'lucide-react';

async function getResources(): Promise<Resource[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return placeholderResources;
}

const ResourceIcon = ({ type }: { type: Resource['type'] }) => {
  switch (type) {
    case 'Article':
      return <FileText className="mr-2 h-5 w-5 text-primary" />;
    case 'Devotional':
      return <BookOpenText className="mr-2 h-5 w-5 text-primary" />;
    case 'Announcement':
      return <Megaphone className="mr-2 h-5 w-5 text-primary" />;
    case 'Sermon Notes':
      return <BookMarked className="mr-2 h-5 w-5 text-primary" />;
    default:
      return <FileText className="mr-2 h-5 w-5 text-primary" />;
  }
};

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-10 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary">Resources</h1>
        <p className="text-muted-foreground mt-2">Explore articles, devotionals, announcements, and more to aid your spiritual growth.</p>
      </div>
      
      {resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resources.map((resource) => (
            <Card key={resource.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              {resource.imageUrl && (
                <div className="relative h-48 w-full">
                  <Image 
                    src={resource.imageUrl} 
                    alt={resource.title} 
                    layout="fill" 
                    objectFit="cover"
                    data-ai-hint="study book"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="secondary" className="capitalize">{resource.type}</Badge>
                </div>
                <CardTitle className="font-headline text-xl flex items-start">
                  <ResourceIcon type={resource.type} /> 
                  {resource.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-sm leading-relaxed">{resource.snippet}</CardDescription>
              </CardContent>
              <CardFooter>
                {resource.link ? (
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link href={resource.link}>
                      Read More <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    More Info Soon
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <BookOpenText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No Resources Available</h2>
          <p className="text-muted-foreground mt-2">Please check back later for new content.</p>
        </div>
      )}
    </div>
  );
}
