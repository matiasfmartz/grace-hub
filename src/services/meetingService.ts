
'use server';
import type { Meeting, MeetingWriteData, MeetingSeries, MeetingSeriesWriteData, Member, GDI, MinistryArea, MeetingTargetRoleType, AttendanceRecord, DayOfWeekType, MonthlyRuleType, WeekOrdinalType, MeetingFrequencyType } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { format, parseISO, addWeeks, setDay, addMonths, setDate, getDate, getDaysInMonth, lastDayOfMonth, startOfDay, isSameDay, nextDay, previousDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';


const MEETINGS_DB_FILE = 'meetings-db.json';
const MEETING_SERIES_DB_FILE = 'meeting-series-db.json';
const MEMBERS_DB_FILE = 'members-db.json';
const GDIS_DB_FILE = 'gdis-db.json';
const MINISTRY_AREAS_DB_FILE = 'ministry-areas-db.json';
const ATTENDANCE_DB_FILE = 'attendance-db.json';

// --- Helper Functions for Date Calculations ---

const dayOfWeekMapping: Record<DayOfWeekType, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function getNextWeeklyOccurrences(series: MeetingSeries, startDate: Date, count: number): Date[] {
    if (!series.weeklyDays || series.weeklyDays.length === 0) return [];
    const occurrences: Date[] = [];
    let currentDate = startOfDay(startDate);

    while (occurrences.length < count) {
        for (const dayStr of series.weeklyDays) {
            const targetDayNumber = dayOfWeekMapping[dayStr];
            let nextOccurrence = nextDay(currentDate, targetDayNumber);
            
            // If nextDay returns a date in the past or same day but we've already processed today
            // advance current_date to the start of next week before finding nextDay
            if (isSameDay(nextOccurrence, currentDate) || nextOccurrence < currentDate) {
                 nextOccurrence = nextDay(addWeeks(currentDate,1), targetDayNumber);
            }
            
            // Ensure we don't add duplicates and only add if it's after or on start_date
            if (occurrences.length < count && !occurrences.some(d => isSameDay(d, nextOccurrence)) && nextOccurrence >= startDate) {
                 // Only add if it's truly in the future or on the start date
                 if(nextOccurrence > startDate || (isSameDay(nextOccurrence, startDate) && !occurrences.some(d => isSameDay(d,nextOccurrence)))) {
                    occurrences.push(startOfDay(nextOccurrence));
                 } else if(nextOccurrence.getTime() === startDate.getTime() && !occurrences.some(d => isSameDay(d,nextOccurrence))) {
                    occurrences.push(startOfDay(nextOccurrence));
                 }
            }
        }
        currentDate = addWeeks(currentDate, 1); // Move to the next week to find more occurrences
        currentDate = setDay(currentDate, 0, { weekStartsOn: 0 }); // Start of that week (Sunday)
        occurrences.sort((a,b) => a.getTime() - b.getTime()); // Keep sorted
         if (occurrences.length >= count) break;
    }
    return occurrences.slice(0, count).sort((a,b) => a.getTime() - b.getTime());
}


function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, ordinal: number): Date | null {
    const firstDayOfMonth = new Date(year, month, 1);
    let count = 0;
    let currentDate = firstDayOfMonth;

    while (currentDate.getMonth() === month) {
        if (getDay(currentDate) === dayOfWeek) {
            count++;
            if (count === ordinal) {
                return currentDate;
            }
        }
        currentDate = new Date(year, month, getDate(currentDate) + 1);
    }
    return null; 
}

function getLastDayOfWeekInMonth(year: number, month: number, dayOfWeek: number): Date | null {
    let current = lastDayOfMonth(new Date(year, month));
    while (getDay(current) !== dayOfWeek) {
        current = previousDay(current, dayOfWeek); // previousDay is not in date-fns v2. For v3 use subDays or similar.
                                                // For simplicity, assuming a manual loop or correct previousDay equivalent
        current = new Date(current.setDate(current.getDate()-1)); // Simple way to go back one day.
         if(current.getMonth() !== month) return null; // safety break
    }
     return (current.getMonth() === month) ? current : null;
}


function getNextMonthlyOccurrences(series: MeetingSeries, startDate: Date, count: number): Date[] {
    const occurrences: Date[] = [];
    let currentMonthDate = startOfDay(new Date(startDate.getFullYear(), startDate.getMonth(), 1));

    if (series.monthlyRuleType === 'DayOfMonth' && series.monthlyDayOfMonth) {
        while (occurrences.length < count) {
            const dayInMonth = Math.min(series.monthlyDayOfMonth, getDaysInMonth(currentMonthDate));
            let potentialDate = setDate(currentMonthDate, dayInMonth);
            potentialDate = startOfDay(potentialDate);

            if (potentialDate >= startDate && !occurrences.some(d => isSameDay(d, potentialDate))) {
                occurrences.push(potentialDate);
            }
            currentMonthDate = addMonths(currentMonthDate, 1);
        }
    } else if (series.monthlyRuleType === 'DayOfWeekOfMonth' && series.monthlyWeekOrdinal && series.monthlyDayOfWeek) {
        const targetDayNumber = dayOfWeekMapping[series.monthlyDayOfWeek];
        const ordinalMap: Record<WeekOrdinalType, number> = { First: 1, Second: 2, Third: 3, Fourth: 4, Last: 5 }; // 5 for 'Last'
        
        while (occurrences.length < count) {
            let potentialDate: Date | null = null;
            if (series.monthlyWeekOrdinal === 'Last') {
                // Custom logic for "Last X day of month"
                let testDate = lastDayOfMonth(currentMonthDate);
                while(getDay(testDate) !== targetDayNumber) {
                    testDate = setDate(testDate, getDate(testDate) - 1);
                    if(testDate.getMonth() !== currentMonthDate.getMonth()) { // Gone too far back
                        testDate = null;
                        break;
                    }
                }
                potentialDate = testDate ? startOfDay(testDate) : null;

            } else {
                const ordinalNumber = ordinalMap[series.monthlyWeekOrdinal];
                let firstDayOfMonth = startOfDay(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1));
                let dayCount = 0;
                let dateInMonth = firstDayOfMonth;
                
                while(dateInMonth.getMonth() === firstDayOfMonth.getMonth()){
                    if(getDay(dateInMonth) === targetDayNumber){
                        dayCount++;
                        if(dayCount === ordinalNumber){
                            potentialDate = startOfDay(dateInMonth);
                            break;
                        }
                    }
                    dateInMonth = setDate(dateInMonth, getDate(dateInMonth) + 1 );
                }
            }

            if (potentialDate && potentialDate >= startDate && !occurrences.some(d => isSameDay(d, potentialDate))) {
                occurrences.push(potentialDate);
            }
            currentMonthDate = addMonths(currentMonthDate, 1);
        }
    }
    return occurrences.slice(0, count).sort((a,b) => a.getTime() - b.getTime());
}


// Meeting Series Functions
export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
  return readDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, []);
}

export async function getMeetingSeriesById(id: string): Promise<MeetingSeries | undefined> {
  const seriesList = await getAllMeetingSeries();
  return seriesList.find(series => series.id === id);
}

async function resolveAttendeeUids(targetGroups: MeetingTargetRoleType[]): Promise<string[]> {
    const allMembers = await readDbFile<Member>(MEMBERS_DB_FILE, []);
    const allGdis = await readDbFile<GDI>(GDIS_DB_FILE, []);
    const allMinistryAreas = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, []);
    const attendeeSet = new Set<string>();

    for (const role of targetGroups) {
        if (role === 'generalAttendees') {
            allMembers.forEach(member => {
                if (member.assignedGDIId && member.status === 'Active') {
                    attendeeSet.add(member.id);
                }
            });
        } else if (role === 'workers') {
            allGdis.forEach(gdi => {
                const guide = allMembers.find(m => m.id === gdi.guideId && m.status === 'Active');
                if(guide) attendeeSet.add(gdi.guideId);
            });
            allMinistryAreas.forEach(area => {
                const leader = allMembers.find(m => m.id === area.leaderId && m.status === 'Active');
                if(leader) attendeeSet.add(area.leaderId);
                area.memberIds.forEach(memberId => {
                    const member = allMembers.find(m => m.id === memberId && m.status === 'Active');
                    if (member && memberId !== area.leaderId) attendeeSet.add(memberId);
                });
            });
        } else if (role === 'leaders') {
            allGdis.forEach(gdi => {
                 const guide = allMembers.find(m => m.id === gdi.guideId && m.status === 'Active');
                 if(guide) attendeeSet.add(gdi.guideId);
            });
            allMinistryAreas.forEach(area => {
                const leader = allMembers.find(m => m.id === area.leaderId && m.status === 'Active');
                if(leader) attendeeSet.add(area.leaderId);
            });
        }
    }
    return Array.from(attendeeSet);
}

export async function addMeetingSeries(
  seriesData: MeetingSeriesWriteData,
): Promise<{series: MeetingSeries, newInstances?: Meeting[]}> {
  const seriesList = await getAllMeetingSeries();
  const newSeriesId = `series-${Date.now().toString()}-${Math.random().toString(36).substring(2, 7)}`;

  const newSeries: MeetingSeries = {
    id: newSeriesId,
    name: seriesData.name,
    description: seriesData.description,
    defaultTime: seriesData.defaultTime,
    defaultLocation: seriesData.defaultLocation,
    defaultImageUrl: seriesData.defaultImageUrl || 'https://placehold.co/600x400',
    targetAttendeeGroups: seriesData.targetAttendeeGroups,
    frequency: seriesData.frequency,
    oneTimeDate: seriesData.frequency === "OneTime" ? seriesData.oneTimeDate : undefined,
    weeklyDays: seriesData.frequency === "Weekly" ? seriesData.weeklyDays : undefined,
    monthlyRuleType: seriesData.frequency === "Monthly" ? seriesData.monthlyRuleType : undefined,
    monthlyDayOfMonth: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfMonth" ? seriesData.monthlyDayOfMonth : undefined,
    monthlyWeekOrdinal: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyWeekOrdinal : undefined,
    monthlyDayOfWeek: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyDayOfWeek : undefined,
  };

  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, [...seriesList, newSeries]);

  let newInstances: Meeting[] = [];
  const resolvedUids = await resolveAttendeeUids(newSeries.targetAttendeeGroups);
  const today = startOfDay(new Date());

  if (newSeries.frequency === "OneTime" && newSeries.oneTimeDate) {
    const oneTimeDateObj = parseISO(newSeries.oneTimeDate);
    const instance = await addMeetingInstanceInternal({
        seriesId: newSeries.id,
        name: `${newSeries.name} (${format(oneTimeDateObj, 'd MMM', { locale: es })})`,
        date: newSeries.oneTimeDate,
        time: newSeries.defaultTime,
        location: newSeries.defaultLocation,
        description: newSeries.description,
        imageUrl: newSeries.defaultImageUrl,
        attendeeUids: resolvedUids,
        minute: null,
    });
    newInstances.push(instance);
  } else if (newSeries.frequency === "Weekly") {
    const occurrenceDates = getNextWeeklyOccurrences(newSeries, today, 4); // Generate next 4 weeks
    for (const date of occurrenceDates) {
      const instance = await addMeetingInstanceInternal({
        seriesId: newSeries.id,
        name: `${newSeries.name} (${format(date, 'd MMM', { locale: es })})`,
        date: format(date, 'yyyy-MM-dd'),
        time: newSeries.defaultTime,
        location: newSeries.defaultLocation,
        description: newSeries.description,
        imageUrl: newSeries.defaultImageUrl,
        attendeeUids: resolvedUids,
        minute: null,
      });
      newInstances.push(instance);
    }
  } else if (newSeries.frequency === "Monthly") {
    const occurrenceDates = getNextMonthlyOccurrences(newSeries, today, 2); // Generate next 2 months
     for (const date of occurrenceDates) {
      const instance = await addMeetingInstanceInternal({
        seriesId: newSeries.id,
        name: `${newSeries.name} (${format(date, 'd MMM', { locale: es })})`,
        date: format(date, 'yyyy-MM-dd'),
        time: newSeries.defaultTime,
        location: newSeries.defaultLocation,
        description: newSeries.description,
        imageUrl: newSeries.defaultImageUrl,
        attendeeUids: resolvedUids,
        minute: null,
      });
      newInstances.push(instance);
    }
  }
  return {series: newSeries, newInstances: newInstances.length > 0 ? newInstances : undefined };
}

export async function updateMeetingSeries(seriesId: string, updates: Partial<MeetingSeriesWriteData>): Promise<MeetingSeries> {
  const seriesList = await getAllMeetingSeries();
  const seriesIndex = seriesList.findIndex(s => s.id === seriesId);
  if (seriesIndex === -1) {
    throw new Error(`MeetingSeries with ID ${seriesId} not found.`);
  }

  const existingSeries = seriesList[seriesIndex];
  const updatedSeries: MeetingSeries = {
    ...existingSeries,
    ...updates,
    defaultImageUrl: updates.defaultImageUrl || existingSeries.defaultImageUrl || 'https://placehold.co/600x400',
    oneTimeDate: updates.frequency === "OneTime" ? updates.oneTimeDate ?? existingSeries.oneTimeDate : undefined,
    weeklyDays: updates.frequency === "Weekly" ? updates.weeklyDays ?? existingSeries.weeklyDays : undefined,
    monthlyRuleType: updates.frequency === "Monthly" ? updates.monthlyRuleType ?? existingSeries.monthlyRuleType : undefined,
    monthlyDayOfMonth: updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfMonth" ? updates.monthlyDayOfMonth ?? existingSeries.monthlyDayOfMonth : undefined,
    monthlyWeekOrdinal: updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfWeekOfMonth" ? updates.monthlyWeekOrdinal ?? existingSeries.monthlyWeekOrdinal : undefined,
    monthlyDayOfWeek: updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfWeekOfMonth" ? updates.monthlyDayOfWeek ?? existingSeries.monthlyDayOfWeek : undefined,
  };

  if (existingSeries.frequency === "OneTime" && updates.frequency && updates.frequency !== "OneTime") {
    updatedSeries.oneTimeDate = undefined;
  }
  if (existingSeries.frequency === "Weekly" && updates.frequency && updates.frequency !== "Weekly") {
    updatedSeries.weeklyDays = undefined;
  }
  if (existingSeries.frequency === "Monthly" && updates.frequency && updates.frequency !== "Monthly") {
    updatedSeries.monthlyRuleType = undefined;
    updatedSeries.monthlyDayOfMonth = undefined;
    updatedSeries.monthlyWeekOrdinal = undefined;
    updatedSeries.monthlyDayOfWeek = undefined;
  }

  seriesList[seriesIndex] = updatedSeries;
  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, seriesList);
  // Note: Updating recurrence rules here does NOT automatically regenerate or delete existing future instances.
  // That would require more complex logic (e.g., comparing old and new rules, deciding update strategy).
  return updatedSeries;
}

export async function deleteMeetingSeries(seriesId: string): Promise<void> {
  const seriesList = await getAllMeetingSeries();
  const updatedSeriesList = seriesList.filter(s => s.id !== seriesId);
  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, updatedSeriesList);

  const allMeetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingsToDelete = allMeetings.filter(m => m.seriesId === seriesId);
  const meetingIdsToDelete = meetingsToDelete.map(m => m.id);
  const remainingMeetings = allMeetings.filter(m => m.seriesId !== seriesId);
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, remainingMeetings);

  if (meetingIdsToDelete.length > 0) {
    const allAttendance = await readDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, []);
    const remainingAttendance = allAttendance.filter(att => !meetingIdsToDelete.includes(att.meetingId));
    await writeDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, remainingAttendance);
  }
}


// Meeting Instance Functions
export async function getAllMeetings(): Promise<Meeting[]> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getMeetingsBySeriesId(seriesId: string): Promise<Meeting[]> {
  const allMeetings = await getAllMeetings();
  return allMeetings.filter(meeting => meeting.seriesId === seriesId)
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const meetings = await getAllMeetings();
  return meetings.find(meeting => meeting.id === id);
}

// Internal function to add instance without re-resolving UIDs if already known
async function addMeetingInstanceInternal(meetingInstanceData: Omit<Meeting, 'id'>): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const newMeetingInstance: Meeting = {
    id: `instance-${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}-${meetings.length}`,
    ...meetingInstanceData,
    attendeeUids: meetingInstanceData.attendeeUids || []
  };
  const updatedMeetings = [...meetings, newMeetingInstance];
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, updatedMeetings);
  return newMeetingInstance;
}

// Public function, typically used for one-off additions where UIDs need resolution based on series
export async function addMeetingInstance(
  seriesId: string,
  instanceDetails: Pick<Meeting, 'name' | 'date' | 'time' | 'location' | 'description' | 'imageUrl' >
): Promise<Meeting> {
  const series = await getMeetingSeriesById(seriesId);
  if (!series) {
    throw new Error(`MeetingSeries with ID ${seriesId} not found.`);
  }
  const resolvedUids = await resolveAttendeeUids(series.targetAttendeeGroups);
  return addMeetingInstanceInternal({
    seriesId: series.id,
    name: instanceDetails.name,
    date: instanceDetails.date, // Expected YYYY-MM-DD
    time: instanceDetails.time,
    location: instanceDetails.location,
    description: instanceDetails.description,
    imageUrl: instanceDetails.imageUrl || series.defaultImageUrl,
    attendeeUids: resolvedUids,
    minute: null,
  });
}


export async function updateMeeting(meetingId: string, updates: Partial<MeetingWriteData>): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingIndex = meetings.findIndex(m => m.id === meetingId);

  if (meetingIndex === -1) {
    throw new Error(`Meeting with ID ${meetingId} not found.`);
  }

  let formattedUpdates = { ...updates } as Partial<Meeting>;
  if (updates.date && typeof updates.date === 'string' && !isNaN(parseISO(updates.date).getTime())) {
    formattedUpdates.date = updates.date;
  } else if (updates.date && updates.date instanceof Date) {
     formattedUpdates.date = format(updates.date, 'yyyy-MM-dd');
  }

  const updatedMeeting: Meeting = {
    ...meetings[meetingIndex],
    ...formattedUpdates,
    attendeeUids: 'attendeeUids' in updates && Array.isArray(updates.attendeeUids)
                  ? updates.attendeeUids
                  : meetings[meetingIndex].attendeeUids,
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
