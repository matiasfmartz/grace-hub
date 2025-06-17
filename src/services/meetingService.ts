
'use server';
import type { Meeting, MeetingWriteData, Member, GDI, MinistryArea } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { format } from 'date-fns';

const MEETINGS_DB_FILE = 'meetings-db.json';

export async function getAllMeetings(): Promise<Meeting[]> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []); 
  return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const meetings = await getAllMeetings();
  return meetings.find(meeting => meeting.id === id);
}

export async function addMeeting(meetingData: MeetingWriteData): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  
  const formattedDate = typeof meetingData.date === 'string' 
    ? meetingData.date 
    : format(meetingData.date as Date, 'yyyy-MM-dd');

  const newMeeting: Meeting = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    name: meetingData.name,
    type: meetingData.type,
    date: formattedDate,
    time: meetingData.time,
    location: meetingData.location,
    description: meetingData.description || '',
    imageUrl: meetingData.imageUrl || 'https://placehold.co/600x400',
    relatedGdiId: meetingData.relatedGdiId || null,
    relatedAreaId: meetingData.relatedAreaId || null,
    attendeeUids: meetingData.attendeeUids || null,
    minute: meetingData.minute || null, // Initialize minute
  };
  const updatedMeetings = [...meetings, newMeeting];
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, updatedMeetings);
  return newMeeting;
}

export async function updateMeeting(meetingId: string, updates: Partial<MeetingWriteData>): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingIndex = meetings.findIndex(m => m.id === meetingId);

  if (meetingIndex === -1) {
    throw new Error(`Meeting with ID ${meetingId} not found.`);
  }

  // Ensure date is formatted correctly if it's part of updates and is a Date object
  let formattedUpdates = { ...updates };
  if (updates.date && updates.date instanceof Date) {
    formattedUpdates.date = format(updates.date, 'yyyy-MM-dd');
  } else if (updates.date && typeof updates.date === 'string') {
    // If date is already a string, ensure it's in YYYY-MM-DD or handle other formats if necessary
    // For simplicity, assuming it's already correctly formatted or parseISO can handle it
  }


  const updatedMeeting: Meeting = {
    ...meetings[meetingIndex],
    ...formattedUpdates,
    // Ensure specific fields like attendeeUids are handled correctly if they are part of `updates`
    attendeeUids: 'attendeeUids' in updates ? updates.attendeeUids : meetings[meetingIndex].attendeeUids,
    minute: 'minute' in updates ? updates.minute : meetings[meetingIndex].minute,

  };

  meetings[meetingIndex] = updatedMeeting;
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, meetings);
  return updatedMeeting;
}


export async function updateMeetingMinute(meetingId: string, minute: string | null): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingIndex = meetings.findIndex(m => m.id === meetingId);

  if (meetingIndex === -1) {
    throw new Error(`Meeting with ID ${meetingId} not found.`);
  }

  meetings[meetingIndex].minute = minute;
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, meetings);
  return meetings[meetingIndex];
}
