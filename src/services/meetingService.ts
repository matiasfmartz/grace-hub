
'use server';
import type { Meeting, MeetingWriteData, MeetingSeries, MeetingSeriesWriteData, Member, GDI, MinistryArea, MeetingTargetRoleType, AttendanceRecord, DayOfWeekType, MonthlyRuleType, WeekOrdinalType, MeetingFrequencyType, MeetingInstanceUpdateData } from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { format, parseISO, addWeeks, setDay, addMonths, setDate, getDate, getDaysInMonth, lastDayOfMonth, startOfDay, isSameDay, nextDay, previousDay, getDay, isValid as isValidDateFn, isWithinInterval, addDays } from 'date-fns';
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
            
            if (isSameDay(nextOccurrence, currentDate) || nextOccurrence < currentDate) {
                 nextOccurrence = nextDay(addWeeks(currentDate,1), targetDayNumber);
            }
            
            if (occurrences.length < count && !occurrences.some(d => isSameDay(d, nextOccurrence)) && nextOccurrence >= startDate) {
                 if(nextOccurrence > startDate || (isSameDay(nextOccurrence, startDate) && !occurrences.some(d => isSameDay(d,nextOccurrence)))) {
                    occurrences.push(startOfDay(nextOccurrence));
                 } else if(nextOccurrence.getTime() === startDate.getTime() && !occurrences.some(d => isSameDay(d,nextOccurrence))) {
                    occurrences.push(startOfDay(nextOccurrence));
                 }
            }
        }
        currentDate = addWeeks(currentDate, 1); 
        currentDate = setDay(currentDate, 0, { weekStartsOn: 0 }); 
        occurrences.sort((a,b) => a.getTime() - b.getTime()); 
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
        current = new Date(current.setDate(current.getDate()-1)); 
         if(current.getMonth() !== month) return null; 
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
        const ordinalMap: Record<WeekOrdinalType, number> = { First: 1, Second: 2, Third: 3, Fourth: 4, Last: 5 }; 
        
        while (occurrences.length < count) {
            let potentialDate: Date | null = null;
            if (series.monthlyWeekOrdinal === 'Last') {
                let testDate = lastDayOfMonth(currentMonthDate);
                while(getDay(testDate) !== targetDayNumber) {
                    testDate = setDate(testDate, getDate(testDate) - 1);
                    if(testDate.getMonth() !== currentMonthDate.getMonth()) { 
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

export async function resolveAttendeeUidsForGeneralSeries(
  targetGroups: MeetingTargetRoleType[],
  allMembers: Member[],
  allGdis: GDI[],
  allMinistryAreas: MinistryArea[]
): Promise<string[]> {
    const attendeeSet = new Set<string>();

    if (targetGroups.includes("allMembers")) {
        return []; 
    }

    for (const role of targetGroups) {
        if (role === 'workers') {
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

async function resolveAttendeeUidsForGroupSeries(
    groupType: 'gdi' | 'ministryArea',
    groupId: string,
    allMembers: Member[],
    allGdis: GDI[],
    allMinistryAreas: MinistryArea[]
): Promise<string[]> {
    if (groupType === 'gdi') {
        const gdi = allGdis.find(g => g.id === groupId);
        if (!gdi) return [];
        return allMembers
            .filter(m => m.id === gdi.guideId || (gdi.memberIds && gdi.memberIds.includes(m.id)))
            .map(m => m.id);

    } else if (groupType === 'ministryArea') {
        const area = allMinistryAreas.find(a => a.id === groupId);
        if (!area) return [];
         return allMembers
            .filter(m => m.id === area.leaderId || (area.memberIds && area.memberIds.includes(m.id)))
            .map(m => m.id);
    }
    return [];
}

export async function ensureFutureInstances(seriesId: string): Promise<Meeting[]> {
    const series = await getMeetingSeriesById(seriesId);
    if (!series || series.frequency === "OneTime") {
        return []; 
    }

    const allMeetingsFromFile = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
    const existingInstancesForSeries = allMeetingsFromFile.filter(m => m.seriesId === seriesId)
                                                .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const today = startOfDay(new Date());
    const futureInstances = existingInstancesForSeries.filter(m => parseISO(m.date) >= today);

    let instancesToGenerateCount = 0;
    if (series.frequency === "Weekly") {
        instancesToGenerateCount = 4 - futureInstances.length;
    } else if (series.frequency === "Monthly") {
        instancesToGenerateCount = 2 - futureInstances.length;
    }

    if (instancesToGenerateCount <= 0) {
        return []; 
    }

    let startDateForNewGen = today;
    if (futureInstances.length > 0) {
        startDateForNewGen = addDays(parseISO(futureInstances[futureInstances.length - 1].date), 1);
    } else if (existingInstancesForSeries.length > 0) {
        const lastExistingDate = parseISO(existingInstancesForSeries[existingInstancesForSeries.length - 1].date);
        if (lastExistingDate < today) {
            startDateForNewGen = today;
        } else { 
            startDateForNewGen = addDays(lastExistingDate, 1);
        }
    }
    
    let newOccurrenceDates: Date[] = [];
    if (series.frequency === "Weekly") {
        newOccurrenceDates = getNextWeeklyOccurrences(series, startDateForNewGen, instancesToGenerateCount);
    } else if (series.frequency === "Monthly") {
        newOccurrenceDates = getNextMonthlyOccurrences(series, startDateForNewGen, instancesToGenerateCount);
    }

    const newlyGeneratedInstances: Meeting[] = [];
    if (newOccurrenceDates.length > 0) {
        const allMembersForResolve = await readDbFile<Member>(MEMBERS_DB_FILE, []);
        const allGdisForResolve = await readDbFile<GDI>(GDIS_DB_FILE, []);
        const allMinistryAreasForResolve = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, []);

        let resolvedUids: string[];
         if (series.seriesType === 'general') {
            resolvedUids = await resolveAttendeeUidsForGeneralSeries(series.targetAttendeeGroups, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
        } else if (series.seriesType === 'gdi' && series.ownerGroupId) {
            resolvedUids = await resolveAttendeeUidsForGroupSeries('gdi', series.ownerGroupId, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
        } else if (series.seriesType === 'ministryArea' && series.ownerGroupId) {
            resolvedUids = await resolveAttendeeUidsForGroupSeries('ministryArea', series.ownerGroupId, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
        } else {
            resolvedUids = [];
        }

        for (const date of newOccurrenceDates) {
            // Check if this date was previously cancelled
            const formattedDateToCheck = format(date, 'yyyy-MM-dd');
            if (series.cancelledDates && series.cancelledDates.includes(formattedDateToCheck)) {
                continue; // Skip generating this instance
            }

            const alreadyExists = existingInstancesForSeries.some(m => isSameDay(parseISO(m.date), date));
            if (!alreadyExists) {
                const instance = await addMeetingInstanceInternal({
                    seriesId: series.id,
                    name: `${series.name} (${format(date, 'd MMM', { locale: es })})`,
                    date: formattedDateToCheck,
                    time: series.defaultTime,
                    location: series.defaultLocation,
                    description: series.description,
                    attendeeUids: resolvedUids,
                    minute: null,
                });
                newlyGeneratedInstances.push(instance);
            }
        }
    }
    return newlyGeneratedInstances;
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
    seriesType: seriesData.seriesType,
    ownerGroupId: seriesData.ownerGroupId,
    targetAttendeeGroups: seriesData.targetAttendeeGroups,
    frequency: seriesData.frequency,
    oneTimeDate: seriesData.frequency === "OneTime" ? seriesData.oneTimeDate : undefined,
    cancelledDates: [], 
    weeklyDays: seriesData.frequency === "Weekly" ? seriesData.weeklyDays : undefined,
    monthlyRuleType: seriesData.frequency === "Monthly" ? seriesData.monthlyRuleType : undefined,
    monthlyDayOfMonth: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfMonth" ? seriesData.monthlyDayOfMonth : undefined,
    monthlyWeekOrdinal: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyWeekOrdinal : undefined,
    monthlyDayOfWeek: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyDayOfWeek : undefined,
  };

  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, [...seriesList, newSeries]);
  
  let generatedInstances: Meeting[] = [];

  if (newSeries.frequency === "OneTime" && newSeries.oneTimeDate && isValidDateFn(parseISO(newSeries.oneTimeDate))) {
    const oneTimeDateObj = parseISO(newSeries.oneTimeDate);
    // Resolve attendees
    const allMembersForResolve = await readDbFile<Member>(MEMBERS_DB_FILE, []);
    const allGdisForResolve = await readDbFile<GDI>(GDIS_DB_FILE, []);
    const allMinistryAreasForResolve = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, []);
    
    let resolvedUids: string[];
    if (newSeries.seriesType === 'general') {
        resolvedUids = await resolveAttendeeUidsForGeneralSeries(newSeries.targetAttendeeGroups, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
    } else if (newSeries.seriesType === 'gdi' && newSeries.ownerGroupId) {
        resolvedUids = await resolveAttendeeUidsForGroupSeries('gdi', newSeries.ownerGroupId, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
    } else if (newSeries.seriesType === 'ministryArea' && newSeries.ownerGroupId) {
        resolvedUids = await resolveAttendeeUidsForGroupSeries('ministryArea', newSeries.ownerGroupId, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
    } else {
        resolvedUids = [];
    }

    const oneTimeInstance = await addMeetingInstanceInternal({
        seriesId: newSeries.id,
        name: `${newSeries.name} (${format(oneTimeDateObj, 'd MMM', { locale: es })})`,
        date: newSeries.oneTimeDate, // Already a 'yyyy-MM-dd' string or undefined
        time: newSeries.defaultTime,
        location: newSeries.defaultLocation,
        description: newSeries.description,
        attendeeUids: resolvedUids,
        minute: null,
    });
    generatedInstances.push(oneTimeInstance);
  } else if (newSeries.frequency !== "OneTime") {
    // For recurring series, call ensureFutureInstances
    const recurringGeneratedInstances = await ensureFutureInstances(newSeries.id);
    if (recurringGeneratedInstances.length > 0) {
        generatedInstances.push(...recurringGeneratedInstances);
    }
  }
  return {series: newSeries, newInstances: generatedInstances.length > 0 ? generatedInstances : undefined };
}

export async function updateMeetingSeries(
    seriesId: string, 
    updates: Partial<MeetingSeriesWriteData>
): Promise<{ updatedSeries: MeetingSeries; newlyGeneratedInstances?: Meeting[] }> {
  const seriesList = await getAllMeetingSeries();
  const seriesIndex = seriesList.findIndex(s => s.id === seriesId);
  if (seriesIndex === -1) {
    throw new Error(`MeetingSeries with ID ${seriesId} not found.`);
  }

  const existingSeries = seriesList[seriesIndex];
  const updatedSeries: MeetingSeries = {
    ...existingSeries,
    ...updates,
    cancelledDates: updates.cancelledDates ?? existingSeries.cancelledDates ?? [], 
    oneTimeDate: updates.frequency === "OneTime" ? (updates.oneTimeDate ?? existingSeries.oneTimeDate) : undefined,
    weeklyDays: updates.frequency === "Weekly" ? (updates.weeklyDays ?? existingSeries.weeklyDays) : undefined,
    monthlyRuleType: updates.frequency === "Monthly" ? (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) : undefined,
    monthlyDayOfMonth: (updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfMonth") ? (updates.monthlyDayOfMonth ?? existingSeries.monthlyDayOfMonth) : undefined,
    monthlyWeekOrdinal: (updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfWeekOfMonth") ? (updates.monthlyWeekOrdinal ?? existingSeries.monthlyWeekOrdinal) : undefined,
    monthlyDayOfWeek: (updates.frequency === "Monthly" && (updates.monthlyRuleType ?? existingSeries.monthlyRuleType) === "DayOfWeekOfMonth") ? (updates.monthlyDayOfWeek ?? existingSeries.monthlyDayOfWeek) : undefined,
  };
  
  seriesList[seriesIndex] = updatedSeries;
  await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, seriesList);
  const newlyGeneratedInstances = await ensureFutureInstances(updatedSeries.id);
  return { updatedSeries, newlyGeneratedInstances: newlyGeneratedInstances.length > 0 ? newlyGeneratedInstances : undefined };
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

export async function getFilteredMeetingInstances(
  seriesId: string,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
  if (seriesId) {
    await ensureFutureInstances(seriesId);
  }
  
  let allMeetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  
  let filtered = allMeetings.filter(meeting => meeting.seriesId === seriesId);

  if (startDate) {
    const start = startOfDay(parseISO(startDate));
    filtered = filtered.filter(meeting => {
      const meetingDate = parseISO(meeting.date);
      return isValidDateFn(meetingDate) && meetingDate >= start;
    });
  }

  if (endDate) {
    const end = startOfDay(parseISO(endDate)); 
    filtered = filtered.filter(meeting => {
      const meetingDate = parseISO(meeting.date);
      return isValidDateFn(meetingDate) && meetingDate <= end;
    });
  }
  
  filtered.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedInstances = filtered.slice(startIndex, startIndex + pageSize);
  
  return { instances: paginatedInstances, totalCount, totalPages };
}


export async function getMeetingsBySeriesId(seriesId: string): Promise<Meeting[]> {
  await ensureFutureInstances(seriesId);
  const allMeetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []); // Reread after potential generation
  return allMeetings.filter(meeting => meeting.seriesId === seriesId)
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const meetings = await getAllMeetings(); 
  return meetings.find(meeting => meeting.id === id);
}

async function addMeetingInstanceInternal(meetingInstanceData: Omit<Meeting, 'id'>): Promise<Meeting> {
  const meetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const newMeetingInstance: Meeting = {
    id: `instance-${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}-${meetings.length}`,
    ...meetingInstanceData,
  };
  const updatedMeetings = [...meetings, newMeetingInstance];
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, updatedMeetings);
  return newMeetingInstance;
}

export async function addMeetingInstance(
  seriesId: string,
  instanceDetails: Pick<Meeting, 'name' | 'date' | 'time' | 'location' | 'description'>
): Promise<Meeting> {
  const series = await getMeetingSeriesById(seriesId);
  if (!series) {
    throw new Error(`MeetingSeries with ID ${seriesId} not found.`);
  }
  
  const allMembersForResolve = await readDbFile<Member>(MEMBERS_DB_FILE, []);
  const allGdisForResolve = await readDbFile<GDI>(GDIS_DB_FILE, []);
  const allMinistryAreasForResolve = await readDbFile<MinistryArea>(MINISTRY_AREAS_DB_FILE, []);

  let resolvedUids: string[];
  if (series.seriesType === 'general') {
    resolvedUids = await resolveAttendeeUidsForGeneralSeries(series.targetAttendeeGroups, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
  } else if (series.seriesType === 'gdi' && series.ownerGroupId) {
      resolvedUids = await resolveAttendeeUidsForGroupSeries('gdi', series.ownerGroupId, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
  } else if (series.seriesType === 'ministryArea' && series.ownerGroupId) {
      resolvedUids = await resolveAttendeeUidsForGroupSeries('ministryArea', series.ownerGroupId, allMembersForResolve, allGdisForResolve, allMinistryAreasForResolve);
  } else {
      resolvedUids = [];
  }

  return addMeetingInstanceInternal({
    seriesId: series.id,
    name: instanceDetails.name,
    date: instanceDetails.date, 
    time: instanceDetails.time,
    location: instanceDetails.location,
    description: instanceDetails.description,
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
  
  const originalMeeting = meetings[meetingIndex];

  let formattedUpdates = { ...updates } as Partial<Meeting>;
  if (updates.date && typeof updates.date === 'string' && !isNaN(parseISO(updates.date).getTime())) {
    formattedUpdates.date = updates.date;
  } else if (updates.date && updates.date instanceof Date) {
     formattedUpdates.date = format(updates.date, 'yyyy-MM-dd');
  }

  const updatedMeeting: Meeting = {
    ...originalMeeting,
    ...formattedUpdates,
    attendeeUids: updates.attendeeUids !== undefined ? updates.attendeeUids : originalMeeting.attendeeUids,
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

export async function deleteMeetingInstance(instanceId: string): Promise<void> {
  const instanceToDelete = await getMeetingById(instanceId); 
  if (!instanceToDelete) {
    console.warn(`Attempted to delete non-existent meeting instance: ${instanceId}`);
    return; 
  }

  let allSeries = await getAllMeetingSeries();
  const seriesIndex = allSeries.findIndex(s => s.id === instanceToDelete.seriesId);

  if (seriesIndex !== -1) {
    const series = allSeries[seriesIndex];
    if (series.frequency !== "OneTime") { 
      if (!series.cancelledDates) {
        series.cancelledDates = [];
      }
      const formattedDate = format(parseISO(instanceToDelete.date), 'yyyy-MM-dd');
      if (!series.cancelledDates.includes(formattedDate)) {
        series.cancelledDates.push(formattedDate);
        allSeries[seriesIndex] = series;
        await writeDbFile<MeetingSeries>(MEETING_SERIES_DB_FILE, allSeries);
      }
    }
  }

  let allMeetings = await readDbFile<Meeting>(MEETINGS_DB_FILE, []);
  const meetingsLeft = allMeetings.filter(m => m.id !== instanceId);
  await writeDbFile<Meeting>(MEETINGS_DB_FILE, meetingsLeft);

  let allAttendanceRecords = await readDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, []);
  const attendanceRecordsLeft = allAttendanceRecords.filter(ar => ar.meetingId !== instanceId);
  await writeDbFile<AttendanceRecord>(ATTENDANCE_DB_FILE, attendanceRecordsLeft);
}
