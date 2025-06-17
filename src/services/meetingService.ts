
'use server';
import type { Meeting, MeetingWriteData } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderMeetings } from '@/lib/placeholder-data'; // Will be empty or need update
import { format } from 'date-fns';

const MEETINGS_DB_FILE = 'meetings-db.json';

export async function getAllMeetings(): Promise<Meeting[]> {
  // Read existing meetings or default to an empty array if placeholderMeetings isn't suitable.
  // For this iteration, we expect meetings-db.json to be populated.
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []); 
  
  // Sort meetings by date, most recent first, before returning
  return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const meetings = await getAllMeetings(); // This already sorts them, though not strictly necessary for findById
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
    minute: meetingData.minute || null,
  };
  const updatedMeetings = [...meetings, newMeeting];
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, updatedMeetings);
  return newMeeting;
}

// updateMeeting and deleteMeeting can be added here when needed
