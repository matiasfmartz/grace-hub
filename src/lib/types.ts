export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive' | 'New';
  avatarUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  imageUrl?: string;
}

export interface ChurchEvent { // Renamed to ChurchEvent to avoid conflict with global Event type
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  imageUrl?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'Article' | 'Devotional' | 'Announcement' | 'Sermon Notes';
  snippet: string;
  imageUrl?: string;
  link?: string;
}
