
import type { Member, MinistryArea, GDI, Meeting, Resource, AttendanceRecord, MeetingType } from './types';

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
    status: 'Active', 
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1985-08-22',
    churchJoinDate: '2015-01-20',
    baptismDate: 'April 2015',
    attendsLifeSchool: false,
    attendsBibleInstitute: true,
    fromAnotherChurch: true,
    assignedGDIId: null, // Bob is guide of gdi2, so assignedGDIId is null here as per new logic
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
    // No baptismDate
    attendsLifeSchool: true,
    attendsBibleInstitute: true,
    fromAnotherChurch: false,
    assignedGDIId: 'gdi2',
    assignedAreaIds: []
  },
  { 
    id: '4', 
    firstName: 'David', 
    lastName: 'Brown', 
    email: 'david@example.com', 
    phone: '555-0104', 
    status: 'Active',
    avatarUrl: 'https://placehold.co/100x100',
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
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1975-07-20',
    churchJoinDate: '2005-10-10',
    baptismDate: 'May 2006',
    attendsLifeSchool: true,
    attendsBibleInstitute: true,
    fromAnotherChurch: false,
    assignedGDIId: 'gdi1', 
    assignedAreaIds: [], 
  },
  { 
    id: '7', 
    firstName: 'Sarah', 
    lastName: 'Miller', 
    email: 'sarah.miller@example.com', 
    phone: '555-0202', 
    status: 'Active',
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1982-03-12',
    churchJoinDate: '2012-02-02',
    baptismDate: 'August 2012',
    attendsLifeSchool: true,
    attendsBibleInstitute: false,
    fromAnotherChurch: true,
    assignedGDIId: null, // Sarah is guide of gdi1
    assignedAreaIds: [], 
  },
   { 
    id: '8', 
    firstName: 'James', 
    lastName: 'Wilson', 
    email: 'james.wilson@example.com', 
    phone: '555-0203', 
    status: 'Active',
    avatarUrl: 'https://placehold.co/100x100',
    birthDate: '1988-09-03',
    churchJoinDate: '2017-05-15',
    baptismDate: 'November 2017',
    attendsLifeSchool: false,
    attendsBibleInstitute: true,
    fromAnotherChurch: false,
    assignedGDIId: 'gdi2',
    assignedAreaIds: [],
  }
];

export const placeholderMinistryAreas: MinistryArea[] = [
  { 
    id: 'ma1', 
    name: 'Youth Ministry', 
    description: 'Engaging young people with faith and community activities.',
    leaderId: '1', // Alice Johnson
    memberIds: ['4'],
    imageUrl: 'https://placehold.co/600x400'
  },
  { 
    id: 'ma2', 
    name: 'Worship Team', 
    description: 'Leading the congregation in worship through music and song.',
    leaderId: '2', // Bob Smith
    memberIds: ['5'],
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
    guideId: '7', // Sarah Miller
    memberIds: ['1', '5', '6'] 
  },
  {
    id: 'gdi2',
    name: 'GDI Beta',
    guideId: '2', // Bob Smith
    memberIds: ['4', '8', '3'] 
  }
];

export const placeholderMeetings: Meeting[] = [
  { 
    id: 'm1', 
    name: 'Sunday General Service', 
    type: 'General',
    date: '2024-07-28', 
    time: '10:00', 
    location: 'Main Sanctuary', 
    description: 'Join us for our weekly worship service, open to all.',
    imageUrl: 'https://placehold.co/600x400' 
  },
  { 
    id: 'm2', 
    name: 'Mid-week GDI Focus', 
    type: 'GDI Focus',
    date: '2024-07-31', 
    time: '19:00', 
    location: 'Fellowship Hall', 
    description: 'A time for all GDI members to connect and grow together.',
    imageUrl: 'https://placehold.co/600x400'
  },
  { 
    id: 'm3', 
    name: 'Obreros Training Session', 
    type: 'Obreros',
    date: '2024-08-03', 
    time: '09:00', 
    location: 'Room 101', 
    description: 'Special training for all active workers (members of ministry areas).',
    imageUrl: 'https://placehold.co/600x400'
  },
  {
    id: 'm4',
    name: 'Leadership Council',
    type: 'Lideres',
    date: '2024-08-05',
    time: '18:00',
    location: 'Pastor\'s Office',
    description: 'Meeting for all GDI Guides and Ministry Area Leaders.',
    imageUrl: 'https://placehold.co/600x400'
  }
];

export const placeholderAttendanceRecords: AttendanceRecord[] = [
  // Example: Alice attended the Sunday General Service
  { id: 'att1', meetingId: 'm1', memberId: '1', attended: true },
  // Example: Bob did not attend the Mid-week GDI Focus
  { id: 'att2', meetingId: 'm2', memberId: '2', attended: false, notes: "Called in sick" },
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
