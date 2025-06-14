
'use server';
import type { Meeting, MeetingWriteData } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { placeholderMeetings } from '@/lib/placeholder-data';
import { format } from 'date-fns';


const MEETINGS_DB_FILE = 'meetings-db.json';

export async function getAllMeetings(): Promise<Meeting[]> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, placeholderMeetings);
  // Sort meetings by date, most recent first, before returning
  return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const meetings = await getAllMeetings();
  return meetings.find(meeting => meeting.id === id);
}

export async function addMeeting(meetingData: MeetingWriteData): Promise<Meeting> {
  const meetings = await getAllMeetings(); // Gets them unsorted initially from readDbFile
  
  // Ensure date is in YYYY-MM-DD string format if it's a Date object
  const formattedDate = typeof meetingData.date === 'string' ? meetingData.date : format(meetingData.date as Date, 'yyyy-MM-dd');

  const newMeeting: Meeting = {
    ...meetingData,
    date: formattedDate,
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    imageUrl: meetingData.imageUrl || 'https://placehold.co/600x400',
    description: meetingData.description || '',
  };
  const updatedMeetings = [...meetings, newMeeting];
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, updatedMeetings);
  return newMeeting;
}

// updateMeeting and deleteMeeting can be added here when needed
