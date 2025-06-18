
import type { MinistryArea, Member, GDI, Meeting, Resource, AttendanceRecord, MeetingSeries } from './types'; // Updated import

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
    memberIds: ['4']
  },
  { 
    id: 'ma2', 
    name: 'Worship Team', 
    description: 'Leading the congregation in worship through music and song.',
    leaderId: '2', // Bob Smith
    memberIds: ['5']
  },
  { 
    id: 'ma3', 
    name: 'Community Outreach', 
    description: 'Serving the local community and sharing our faith.',
    leaderId: '8', // James Wilson
    memberIds: ['4']
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

// Placeholder MeetingSeries
export const placeholderMeetingSeries: MeetingSeries[] = [
  {
    id: 'series-general-1',
    name: 'Sunday General Service',
    description: 'Weekly worship service for everyone.',
    defaultTime: '10:00',
    defaultLocation: 'Main Sanctuary',
    // defaultImageUrl: 'https://placehold.co/600x400', // Removed
    seriesType: 'general',
    ownerGroupId: null,
    targetAttendeeGroups: ['allMembers'],
    frequency: 'Weekly',
    weeklyDays: ['Sunday'],
  },
  {
    id: 'series-gdi-alpha-weekly',
    name: 'GDI Alpha Weekly Connect',
    description: 'Weekly meeting for members of GDI Alpha.',
    defaultTime: '19:00',
    defaultLocation: 'Room 101',
    // defaultImageUrl: 'https://placehold.co/600x400', // Removed
    seriesType: 'gdi',
    ownerGroupId: 'gdi1', // Assumes GDI Alpha has id 'gdi1'
    targetAttendeeGroups: ['allMembers'], // Contextually for GDI members only
    frequency: 'Weekly',
    weeklyDays: ['Wednesday'],
  },
  {
    id: 'series-worship-team-practice',
    name: 'Worship Team Practice',
    description: 'Practice session for the worship team.',
    defaultTime: '18:30',
    defaultLocation: 'Music Room',
    // defaultImageUrl: 'https://placehold.co/600x400', // Removed
    seriesType: 'ministryArea',
    ownerGroupId: 'ma2', // Assumes Worship Team area has id 'ma2'
    targetAttendeeGroups: ['allMembers'], // Contextually for MA members only
    frequency: 'Weekly',
    weeklyDays: ['Thursday'],
  }
];


// Placeholder Meetings (Instances) - simplified, specific attendee UIDs would be resolved
export const placeholderMeetings: Meeting[] = [
  { 
    id: 'm1', 
    seriesId: 'series-general-1', // Belongs to "Sunday General Service"
    name: 'Sunday General Service', 
    date: '2024-07-28', 
    time: '10:00', 
    location: 'Main Sanctuary', 
    description: 'Join us for our weekly worship service, open to all.',
    // imageUrl: 'https://placehold.co/600x400', // Removed
    attendeeUids: [] // For 'allMembers', this would be dynamically resolved
  },
  { 
    id: 'm2', 
    seriesId: 'series-gdi-alpha-weekly', // Belongs to "GDI Alpha Weekly Connect"
    name: 'GDI Alpha Connect', 
    date: '2024-07-31', 
    time: '19:00', 
    location: 'Room 101', 
    description: 'Weekly meeting for GDI Alpha.',
    // imageUrl: 'https://placehold.co/600x400', // Removed
    attendeeUids: [] // For group-specific, this would be resolved to members of GDI Alpha
  },
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
