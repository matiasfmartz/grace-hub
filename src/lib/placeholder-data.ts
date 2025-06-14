
import type { Member, MinistryArea, GDI, ChurchEvent, Resource } from './types';

export const placeholderMembers: Member[] = [
  { 
    id: '1', 
    firstName: 'Alice', 
    lastName: 'Johnson', 
    email: 'alice@example.com', 
    phone: '555-0101', 
    status: 'Active', 
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1990-05-15',
    churchJoinDate: '2018-03-10',
    baptismDate: 'June 2018',
    attendsLifeSchool: true,
    attendsBibleInstitute: false,
    fromAnotherChurch: false,
    assignedGDIId: 'gdi1',
    assignedAreaIds: ['ma1']
  },
  { 
    id: '2', 
    firstName: 'Bob', 
    lastName: 'Smith', 
    email: 'bob@example.com', 
    phone: '555-0102', 
    status: 'Inactive', 
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1985-08-22',
    churchJoinDate: '2015-01-20',
    baptismDate: 'April 2015',
    attendsLifeSchool: false,
    attendsBibleInstitute: true,
    fromAnotherChurch: true,
    assignedGDIId: 'gdi2',
    assignedAreaIds: ['ma2']
  },
  { 
    id: '3', 
    firstName: 'Carol', 
    lastName: 'White', 
    email: 'carol@example.com', 
    phone: '555-0103', 
    status: 'New', 
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1995-12-01',
    churchJoinDate: '2023-07-01',
    attendsLifeSchool: true,
    attendsBibleInstitute: true,
    assignedGDIId: 'gdi1',
  },
  { 
    id: '4', 
    firstName: 'David', 
    lastName: 'Brown', 
    email: 'david@example.com', 
    phone: '555-0104', 
    status: 'Active',
    birthDate: '1980-02-10',
    churchJoinDate: '2010-09-05',
    baptismDate: 'March 2011',
    attendsLifeSchool: true,
    attendsBibleInstitute: false,
    fromAnotherChurch: false,
    assignedGDIId: 'gdi2',
    assignedAreaIds: ['ma1', 'ma3']
  },
  { 
    id: '5', 
    firstName: 'Eve', 
    lastName: 'Davis', 
    email: 'eve@example.com', 
    phone: '555-0105', 
    status: 'Active', 
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1992-11-30',
    churchJoinDate: '2019-06-15',
    baptismDate: 'December 2019',
    attendsLifeSchool: false,
    attendsBibleInstitute: false,
    fromAnotherChurch: true,
    assignedGDIId: 'gdi1',
    assignedAreaIds: ['ma2']
  },
  { 
    id: '6', 
    firstName: 'Michael', 
    lastName: 'Lee', 
    email: 'michael.lee@example.com', 
    phone: '555-0201', 
    status: 'Active',
    assignedGDIId: null, // This member is a leader, might not be in a GDI as a regular member
    assignedAreaIds: [], // Leader of ma1
  },
  { 
    id: '7', 
    firstName: 'Sarah', 
    lastName: 'Miller', 
    email: 'sarah.miller@example.com', 
    phone: '555-0202', 
    status: 'Active',
    assignedGDIId: null,
    assignedAreaIds: [], // Leader of ma2
  },
   { 
    id: '8', 
    firstName: 'James', 
    lastName: 'Wilson', 
    email: 'james.wilson@example.com', 
    phone: '555-0203', 
    status: 'Active',
    assignedGDIId: null,
    assignedAreaIds: [], // Leader of ma3
  }
];

export const placeholderMinistryAreas: MinistryArea[] = [
  { 
    id: 'ma1', 
    name: 'Youth Ministry', 
    description: 'Engaging young people with faith and community activities.',
    leaderId: '6', // Michael Lee
    memberIds: ['1', '4'],
    imageUrl: 'https://placehold.co/600x400'
  },
  { 
    id: 'ma2', 
    name: 'Worship Team', 
    description: 'Leading the congregation in worship through music and song.',
    leaderId: '7', // Sarah Miller
    memberIds: ['2', '5'],
    imageUrl: 'https://placehold.co/600x400'
  },
  { 
    id: 'ma3', 
    name: 'Community Outreach', 
    description: 'Serving the local community and sharing our faith.',
    leaderId: '8', // James Wilson
    memberIds: ['4'],
    imageUrl: 'https://placehold.co/600x400'
  },
];

export const placeholderGDIs: GDI[] = [
  {
    id: 'gdi1',
    name: 'GDI Alpha',
    guideId: '1', // Alice Johnson
    memberIds: ['3', '5'] // Carol White, Eve Davis
  },
  {
    id: 'gdi2',
    name: 'GDI Beta',
    guideId: '2', // Bob Smith
    memberIds: ['4'] // David Brown
  }
];

export const placeholderEvents: ChurchEvent[] = [
  { 
    id: 'e1', 
    name: 'Sunday Service', 
    date: 'Every Sunday', 
    time: '10:00 AM - 11:30 AM', 
    location: 'Main Sanctuary', 
    description: 'Join us for our weekly worship service.',
    imageUrl: 'https://placehold.co/600x400' 
  },
  { 
    id: 'e2', 
    name: 'Mid-week Bible Study', 
    date: 'Every Wednesday', 
    time: '7:00 PM - 8:30 PM', 
    location: 'Fellowship Hall', 
    description: 'Deep dive into the scriptures.',
    imageUrl: 'https://placehold.co/600x400'
  },
  { 
    id: 'e3', 
    name: 'Annual Church Picnic', 
    date: 'July 20, 2024', 
    time: '12:00 PM - 4:00 PM', 
    location: 'City Park', 
    description: 'A fun day of fellowship, food, and games for the whole family.',
    imageUrl: 'https://placehold.co/600x400'
  },
];

export const placeholderResources: Resource[] = [
  { 
    id: 'r1', 
    title: 'Understanding Grace', 
    type: 'Article', 
    snippet: 'An in-depth look at the concept of grace in Christian theology.',
    imageUrl: 'https://placehold.co/600x400',
    link: '#'
  },
  { 
    id: 'r2', 
    title: 'Daily Devotional: Strength for Today', 
    type: 'Devotional', 
    snippet: 'A short devotional to inspire and encourage you daily.',
    imageUrl: 'https://placehold.co/600x400',
    link: '#'
  },
  { 
    id: 'r3', 
    title: 'Upcoming Mission Trip Announcement', 
    type: 'Announcement', 
    snippet: 'Information about our upcoming mission trip and how to get involved.',
    imageUrl: 'https://placehold.co/600x400',
    link: '#'
  },
   { 
    id: 'r4', 
    title: 'Sermon Notes: The Beatitudes', 
    type: 'Sermon Notes', 
    snippet: 'Key points and scriptures from last Sunday\'s sermon on the Beatitudes.',
    imageUrl: 'https://placehold.co/600x400',
    link: '#'
  },
];
