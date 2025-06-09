import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UsersRound, CalendarDays, BookOpen, ArrowRight } from 'lucide-react';
import Image from 'next/image';

const featureCards = [
  {
    title: "Member Directory",
    description: "Access and manage member information efficiently.",
    link: "/members",
    icon: Users,
    image: "https://placehold.co/600x400",
    aiHint: "community gathering"
  },
  {
    title: "Groups & Ministries",
    description: "Discover and join various church groups and ministry teams.",
    link: "/groups",
    icon: UsersRound,
    image: "https://placehold.co/600x400",
    aiHint: "team collaboration"
  },
  {
    title: "Events Calendar",
    description: "Stay updated on all upcoming church events and activities.",
    link: "/events",
    icon: CalendarDays,
    image: "https://placehold.co/600x400",
    aiHint: "event schedule"
  },
  {
    title: "Resources",
    description: "Find helpful articles, devotionals, and announcements.",
    link: "/resources",
    icon: BookOpen,
    image: "https://placehold.co/600x400",
    aiHint: "knowledge sharing"
  }
];

export default function HomePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <section className="text-center py-12 bg-card rounded-lg shadow-lg mb-12">
        <Image 
          src="https://placehold.co/1200x400" 
          alt="Church community" 
          width={1200} 
          height={400} 
          className="w-full h-64 object-cover rounded-t-lg"
          data-ai-hint="church community"
        />
        <div className="p-8">
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            Welcome to Grace Hub
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Your central place for church community, management, and engagement.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg">
              <Link href="/events">View Upcoming Events</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/about">Learn More <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-headline text-3xl font-semibold text-center mb-8">Explore Grace Hub</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => (
            <Card key={feature.title} className="flex flex-col_hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                   <Image src={feature.image} alt={feature.title} width={600} height={400} className="rounded-md h-40 w-full object-cover" data-ai-hint={feature.aiHint} />
                </div>
                <CardTitle className="flex items-center font-headline">
                  <feature.icon className="mr-2 h-6 w-6 text-primary" />
                  {feature.title}
                </CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                <Button asChild variant="default" className="w-full mt-auto bg-primary hover:bg-primary/90">
                  <Link href={feature.link}>
                    Go to {feature.title}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-12 bg-card rounded-lg shadow-lg">
        <div className="container mx-auto px-4 text-center">
            <h2 className="font-headline text-3xl font-semibold mb-4">Get Connected</h2>
            <p className="text-muted-foreground mb-6">
                Join a small group, serve in a ministry, or attend an event. There's a place for you here.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/groups">Find Your Place</Link>
            </Button>
        </div>
      </section>
    </div>
  );
}
