import type { Member, Group, ChurchEvent, Resource } from './types';

export const placeholderMembers: Member[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', phone: '555-0101', status: 'Active', avatarUrl: 'https://placehold.co/100x100' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', phone: '555-0102', status: 'Inactive', avatarUrl: 'https://placehold.co/100x100' },
  { id: '3', name: 'Carol White', email: 'carol@example.com', phone: '555-0103', status: 'New', avatarUrl: 'https://placehold.co/100x100' },
  { id: '4', name: 'David Brown', email: 'david@example.com', phone: '555-0104', status: 'Active' },
  { id: '5', name: 'Eve Davis', email: 'eve@example.com', phone: '555-0105', status: 'Active', avatarUrl: 'https://placehold.co/100x100' },
];

export const placeholderGroups: Group[] = [
  { 
    id: 'g1', 
    name: 'Youth Ministry', 
    description: 'Engaging young people with faith and community activities.',
    leaderName: 'Michael Lee', 
    leaderEmail: 'michael.lee@example.com', 
    leaderPhone: '555-0201',
    imageUrl: 'https://placehold.co/600x400'
  },
  { 
    id: 'g2', 
    name: 'Worship Team', 
    description: 'Leading the congregation in worship through music and song.',
    leaderName: 'Sarah Miller', 
    leaderEmail: 'sarah.miller@example.com', 
    leaderPhone: '555-0202',
    imageUrl: 'https://placehold.co/600x400'
  },
  { 
    id: 'g3', 
    name: 'Community Outreach', 
    description: 'Serving the local community and sharing our faith.',
    leaderName: 'James Wilson', 
    leaderEmail: 'james.wilson@example.com', 
    leaderPhone: '555-0203',
    imageUrl: 'https://placehold.co/600x400'
  },
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
