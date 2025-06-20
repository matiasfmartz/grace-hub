
'use server';
import type { Meeting, MeetingWriteData, MeetingSeries, MeetingSeriesWriteData, Member, GDI, MinistryArea, MeetingTargetRoleType, AttendanceRecord, DayOfWeekType, MonthlyRuleType, WeekOrdinalType, MeetingFrequencyType, MeetingInstanceUpdateData } from '@/lib/types';
import { format, parseISO, addWeeks, setDay, addMonths, setDate, getDate, getDaysInMonth, lastDayOfMonth, startOfDay, isSameDay, nextDay, getDay, isValid as isValidDateFn, isWithinInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { executeQuery, getRowsAndTotal } from '@/lib/mysql-connector';

// Import other services that are (or will be) MySQL backed for resolving attendees
import { getAllMembersNonPaginated } from './memberService';
import { getAllGdis } from './gdiService';
import { getAllMinistryAreas } from './ministryAreaService';


// Helper to parse comma-separated string from DB
const parseStringList = (str: string | null | undefined): string[] => {
  if (!str) return [];
  return str.split(',').filter(s => s.trim() !== '');
};

interface MeetingSeriesQueryResult extends Omit<MeetingSeries, 'targetAttendeeGroups' | 'weeklyDays' | 'cancelledDates'> {
  targetAttendeeGroups: string | null;
  weeklyDays: string | null;
  cancelledDates: string | null;
}
interface MeetingQueryResult extends Omit<Meeting, 'attendeeUids'> {
  attendeeUids: string | null;
}


// --- Helper Functions for Date Calculations (Remain in TS) ---
const dayOfWeekMapping: Record<DayOfWeekType, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function getNextWeeklyOccurrences(series: MeetingSeries, startDate: Date, count: number): Date[] {
    if (!series.weeklyDays || series.weeklyDays.length === 0) return [];
    const occurrences: Date[] = [];
    let currentDate = startOfDay(startDate);

    while (occurrences.length < count) {
        for (const dayStr of series.weeklyDays) {
            const targetDayNumber = dayOfWeekMapping[dayStr as DayOfWeekType];
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
        const targetDayNumber = dayOfWeekMapping[series.monthlyDayOfWeek as DayOfWeekType];
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
                const ordinalNumber = ordinalMap[series.monthlyWeekOrdinal as WeekOrdinalType];
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


// --- Meeting Series Functions ---
export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
  try {
    const results = await executeQuery<MeetingSeriesQueryResult[]>('CALL sp_GetAllMeetingSeries()');
    const rows = getRowsAndTotal<MeetingSeriesQueryResult>(results).rows;
    return rows.map(s => ({
      ...s,
      targetAttendeeGroups: parseStringList(s.targetAttendeeGroups) as MeetingTargetRoleType[],
      weeklyDays: parseStringList(s.weeklyDays) as DayOfWeekType[],
      cancelledDates: parseStringList(s.cancelledDates),
    }));
  } catch (error) {
    console.error("Error in getAllMeetingSeries service:", error);
    throw error;
  }
}

export async function getMeetingSeriesById(id: string): Promise<MeetingSeries | undefined> {
  try {
    const results = await executeQuery<MeetingSeriesQueryResult[]>('CALL sp_GetMeetingSeriesById(?)', [id]);
    const rows = getRowsAndTotal<MeetingSeriesQueryResult>(results).rows;
    if (rows.length > 0) {
      const s = rows[0];
      return {
        ...s,
        targetAttendeeGroups: parseStringList(s.targetAttendeeGroups) as MeetingTargetRoleType[],
        weeklyDays: parseStringList(s.weeklyDays) as DayOfWeekType[],
        cancelledDates: parseStringList(s.cancelledDates),
      };
    }
    return undefined;
  } catch (error) {
    console.error(`Error in getMeetingSeriesById service for ID ${id}:`, error);
    throw error;
  }
}

async function resolveAttendeeUidsForGeneralSeries(
  targetGroups: MeetingTargetRoleType[],
  allMembers: Member[], // Assumed to be MySQL-backed via memberService
  allGdis: GDI[],       // Assumed to be MySQL-backed via gdiService
  allMinistryAreas: MinistryArea[] // Assumed to be MySQL-backed via ministryAreaService
): Promise<string[]> {
    const attendeeSet = new Set<string>();
    if (targetGroups.includes("allMembers")) {
        return []; // Empty array signifies "all members" to the SP or instance creation logic
    }
    for (const role of targetGroups) {
        if (role === 'workers') {
            allGdis.forEach(gdi => {
                const guide = allMembers.find(m => m.id === gdi.guideId && m.status === 'Active');
                if(guide) attendeeSet.add(gdi.guideId);
                 if (gdi.coordinatorId) { // Include GDI Coordinator if exists
                    const coordinator = allMembers.find(m => m.id === gdi.coordinatorId && m.status === 'Active');
                    if (coordinator) attendeeSet.add(gdi.coordinatorId);
                }
                if (gdi.mentorId) { // Include GDI Mentor if exists
                    const mentor = allMembers.find(m => m.id === gdi.mentorId && m.status === 'Active');
                    if (mentor) attendeeSet.add(gdi.mentorId);
                }
            });
            allMinistryAreas.forEach(area => {
                const leader = allMembers.find(m => m.id === area.leaderId && m.status === 'Active');
                if(leader) attendeeSet.add(area.leaderId);
                if (area.coordinatorId) { // Include Area Coordinator if exists
                    const coordinator = allMembers.find(m => m.id === area.coordinatorId && m.status === 'Active');
                    if (coordinator) attendeeSet.add(area.coordinatorId);
                }
                 if (area.mentorId) { // Include Area Mentor if exists
                    const mentor = allMembers.find(m => m.id === area.mentorId && m.status === 'Active');
                    if (mentor) attendeeSet.add(area.mentorId);
                }
                (area.memberIds || []).forEach(memberId => {
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
        const memberIds = new Set<string>();
        if (gdi.guideId) memberIds.add(gdi.guideId);
        if (gdi.coordinatorId) memberIds.add(gdi.coordinatorId);
        if (gdi.mentorId) memberIds.add(gdi.mentorId);
        (gdi.memberIds || []).forEach(id => memberIds.add(id));
        return allMembers
            .filter(m => memberIds.has(m.id))
            .map(m => m.id);

    } else if (groupType === 'ministryArea') {
        const area = allMinistryAreas.find(a => a.id === groupId);
        if (!area) return [];
        const memberIds = new Set<string>();
        if (area.leaderId) memberIds.add(area.leaderId);
        if (area.coordinatorId) memberIds.add(area.coordinatorId);
        if (area.mentorId) memberIds.add(area.mentorId);
        (area.memberIds || []).forEach(id => memberIds.add(id));
         return allMembers
            .filter(m => memberIds.has(m.id))
            .map(m => m.id);
    }
    return [];
}

export async function ensureFutureInstances(seriesId: string): Promise<Meeting[]> {
    const series = await getMeetingSeriesById(seriesId);
    if (!series || series.frequency === "OneTime") {
        return []; 
    }

    const existingInstancesForSeries = await getMeetingsBySeriesIdInternal(seriesId); // Use internal fetch
    existingInstancesForSeries.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

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
        const allMembersForResolve = await getAllMembersNonPaginated();
        const allGdisForResolve = await getAllGdis();
        const allMinistryAreasForResolve = await getAllMinistryAreas();

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
            const formattedDateToCheck = format(date, 'yyyy-MM-dd');
            if (series.cancelledDates && series.cancelledDates.includes(formattedDateToCheck)) {
                continue; 
            }
            const alreadyExists = existingInstancesForSeries.some(m => isSameDay(parseISO(m.date), date));
            if (!alreadyExists) {
                const instance = await addMeetingInstanceSP({ // Use SP direct call
                    seriesId: series.id,
                    name: `${series.name} (${format(date, 'd MMM', { locale: es })})`,
                    date: formattedDateToCheck,
                    time: series.defaultTime,
                    location: series.defaultLocation,
                    description: series.description || '',
                    attendeeUids: resolvedUids, // This will be a string[]
                    minute: null,
                });
                if (instance) newlyGeneratedInstances.push(instance);
            }
        }
    }
    return newlyGeneratedInstances;
}


export async function addMeetingSeries(
  seriesData: MeetingSeriesWriteData,
): Promise<{series: MeetingSeries, newInstances?: Meeting[]}> {
  const newSeriesId = `series-${Date.now().toString()}-${Math.random().toString(36).substring(2, 7)}`;
  try {
    await executeQuery<any>(
      'CALL sp_AddMeetingSeries(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newSeriesId,
        seriesData.name,
        seriesData.description || null,
        seriesData.defaultTime,
        seriesData.defaultLocation,
        seriesData.seriesType,
        seriesData.ownerGroupId || null,
        seriesData.targetAttendeeGroups ? seriesData.targetAttendeeGroups.join(',') : null,
        seriesData.frequency,
        seriesData.oneTimeDate || null,
        seriesData.weeklyDays ? seriesData.weeklyDays.join(',') : null,
        seriesData.monthlyRuleType || null,
        (seriesData.monthlyRuleType === 'DayOfMonth' ? seriesData.monthlyDayOfMonth : 
         seriesData.monthlyRuleType === 'DayOfWeekOfMonth' ? `${seriesData.monthlyWeekOrdinal}_${seriesData.monthlyDayOfWeek}` : null)
      ]
    );

    const newSeries = await getMeetingSeriesById(newSeriesId);
    if (!newSeries) throw new Error("Failed to retrieve newly added meeting series.");
    
    let generatedInstances: Meeting[] = [];
    if (newSeries.frequency === "OneTime" && newSeries.oneTimeDate && isValidDateFn(parseISO(newSeries.oneTimeDate))) {
        const oneTimeDateObj = parseISO(newSeries.oneTimeDate);
        const allMembersForResolve = await getAllMembersNonPaginated();
        const allGdisForResolve = await getAllGdis();
        const allMinistryAreasForResolve = await getAllMinistryAreas();
        
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

        const oneTimeInstance = await addMeetingInstanceSP({
            seriesId: newSeries.id,
            name: `${newSeries.name} (${format(oneTimeDateObj, 'd MMM', { locale: es })})`,
            date: newSeries.oneTimeDate,
            time: newSeries.defaultTime,
            location: newSeries.defaultLocation,
            description: newSeries.description || '',
            attendeeUids: resolvedUids,
            minute: null,
        });
        if (oneTimeInstance) generatedInstances.push(oneTimeInstance);
    } else if (newSeries.frequency !== "OneTime") {
        const recurringGeneratedInstances = await ensureFutureInstances(newSeries.id);
        if (recurringGeneratedInstances.length > 0) {
            generatedInstances.push(...recurringGeneratedInstances);
        }
    }
    return {series: newSeries, newInstances: generatedInstances.length > 0 ? generatedInstances : undefined };

  } catch (error) {
    console.error("Error in addMeetingSeries service:", error);
    throw error;
  }
}

export async function updateMeetingSeries(
    seriesId: string, 
    updates: Partial<MeetingSeriesWriteData>
): Promise<{ updatedSeries: MeetingSeries; newlyGeneratedInstances?: Meeting[] }> {
  try {
    const existingSeries = await getMeetingSeriesById(seriesId);
    if (!existingSeries) {
      throw new Error(`MeetingSeries with ID ${seriesId} not found.`);
    }
    
    const finalSeriesData = { ...existingSeries, ...updates };

    await executeQuery<any>(
      'CALL sp_UpdateMeetingSeries(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        seriesId,
        finalSeriesData.name,
        finalSeriesData.description || null,
        finalSeriesData.defaultTime,
        finalSeriesData.defaultLocation,
        finalSeriesData.seriesType,
        finalSeriesData.ownerGroupId || null,
        finalSeriesData.targetAttendeeGroups ? finalSeriesData.targetAttendeeGroups.join(',') : null,
        finalSeriesData.frequency,
        finalSeriesData.oneTimeDate || null,
        finalSeriesData.cancelledDates ? finalSeriesData.cancelledDates.join(',') : null,
        finalSeriesData.weeklyDays ? finalSeriesData.weeklyDays.join(',') : null,
        finalSeriesData.monthlyRuleType || null,
        (finalSeriesData.monthlyRuleType === 'DayOfMonth' ? finalSeriesData.monthlyDayOfMonth : 
         finalSeriesData.monthlyRuleType === 'DayOfWeekOfMonth' ? `${finalSeriesData.monthlyWeekOrdinal}_${finalSeriesData.monthlyDayOfWeek}` : null)
      ]
    );

    const updatedSeries = await getMeetingSeriesById(seriesId);
    if (!updatedSeries) throw new Error("Failed to retrieve updated meeting series.");
    
    const newlyGeneratedInstances = await ensureFutureInstances(updatedSeries.id);
    return { updatedSeries, newlyGeneratedInstances: newlyGeneratedInstances.length > 0 ? newlyGeneratedInstances : undefined };

  } catch (error) {
    console.error(`Error in updateMeetingSeries service for ID ${seriesId}:`, error);
    throw error;
  }
}

export async function deleteMeetingSeries(seriesId: string): Promise<void> {
  try {
    await executeQuery<any>('CALL sp_DeleteMeetingSeries(?)', [seriesId]);
  } catch (error) {
    console.error(`Error in deleteMeetingSeries service for ID ${seriesId}:`, error);
    throw error;
  }
}


// --- Meeting Instance Functions ---
export async function getAllMeetings(): Promise<Meeting[]> {
  try {
    const results = await executeQuery<MeetingQueryResult[]>('CALL sp_GetAllMeetings()');
    const rows = getRowsAndTotal<MeetingQueryResult>(results).rows;
    return rows.map(m => ({
      ...m,
      attendeeUids: parseStringList(m.attendeeUids),
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error in getAllMeetings service:", error);
    throw error;
  }
}

export async function getFilteredMeetingInstances(
  seriesId: string,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
  try {
    if (seriesId) {
      await ensureFutureInstances(seriesId);
    }
    
    const results = await executeQuery<any[]>(
      'CALL sp_GetFilteredMeetingInstances(?, ?, ?, ?, ?)',
      [seriesId, startDate || null, endDate || null, page, pageSize]
    );
    const { rows, totalCount } = getRowsAndTotal<MeetingQueryResult>(results);
    
    const instances: Meeting[] = rows.map(row => ({
      ...row,
      attendeeUids: parseStringList(row.attendeeUids),
    }));

    const totalPages = Math.ceil(totalCount / pageSize);
    return { instances, totalCount, totalPages };

  } catch (error) {
    console.error("Error in getFilteredMeetingInstances service:", error);
    throw error;
  }
}

async function getMeetingsBySeriesIdInternal(seriesId: string): Promise<Meeting[]> {
  try {
    const results = await executeQuery<MeetingQueryResult[]>('CALL sp_GetMeetingsBySeriesId(?)', [seriesId]);
    const rows = getRowsAndTotal<MeetingQueryResult>(results).rows;
    return rows.map(m => ({
        ...m,
        attendeeUids: parseStringList(m.attendeeUids),
    })).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  } catch (error) {
    console.error(`Error in getMeetingsBySeriesIdInternal for series ID ${seriesId}:`, error);
    return []; // Return empty on error to allow ensureFutureInstances to proceed
  }
}

export async function getMeetingsBySeriesId(seriesId: string): Promise<Meeting[]> {
  await ensureFutureInstances(seriesId);
  return getMeetingsBySeriesIdInternal(seriesId);
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  try {
    const results = await executeQuery<MeetingQueryResult[]>('CALL sp_GetMeetingById(?)', [id]);
    const rows = getRowsAndTotal<MeetingQueryResult>(results).rows;
    if (rows.length > 0) {
      const m = rows[0];
      return {
        ...m,
        attendeeUids: parseStringList(m.attendeeUids),
      };
    }
    return undefined;
  } catch (error) {
    console.error(`Error in getMeetingById service for ID ${id}:`, error);
    throw error;
  }
}

async function addMeetingInstanceSP(meetingInstanceData: Omit<Meeting, 'id'>): Promise<Meeting | null> {
  const newMeetingInstanceId = `instance-${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    await executeQuery<any>(
      'CALL sp_AddMeetingInstance(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newMeetingInstanceId,
        meetingInstanceData.seriesId,
        meetingInstanceData.name,
        meetingInstanceData.date,
        meetingInstanceData.time,
        meetingInstanceData.location,
        meetingInstanceData.description || null,
        meetingInstanceData.attendeeUids ? meetingInstanceData.attendeeUids.join(',') : null,
        meetingInstanceData.minute || null,
      ]
    );
    return getMeetingById(newMeetingInstanceId);
  } catch (error) {
     console.error("Error in addMeetingInstanceSP:", error);
     return null;
  }
}

export async function addMeetingInstance(
  seriesId: string,
  instanceDetails: Pick<Meeting, 'name' | 'date' | 'time' | 'location' | 'description'>
): Promise<Meeting> {
  const series = await getMeetingSeriesById(seriesId);
  if (!series) {
    throw new Error(`MeetingSeries with ID ${seriesId} not found.`);
  }
  
  const allMembersForResolve = await getAllMembersNonPaginated();
  const allGdisForResolve = await getAllGdis();
  const allMinistryAreasForResolve = await getAllMinistryAreas();

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

  const newInstance = await addMeetingInstanceSP({
    seriesId: series.id,
    name: instanceDetails.name,
    date: instanceDetails.date, 
    time: instanceDetails.time,
    location: instanceDetails.location,
    description: instanceDetails.description || '',
    attendeeUids: resolvedUids,
    minute: null,
  });
  if (!newInstance) throw new Error("Failed to create and retrieve new meeting instance via SP.");
  return newInstance;
}


export async function updateMeeting(meetingId: string, updates: Partial<MeetingWriteData>): Promise<Meeting> {
  try {
    const existingMeeting = await getMeetingById(meetingId);
    if (!existingMeeting) {
        throw new Error(`Meeting with ID ${meetingId} not found.`);
    }
    const finalUpdates = { ...existingMeeting, ...updates };

    await executeQuery<any>(
      'CALL sp_UpdateMeetingInstance(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        meetingId,
        finalUpdates.seriesId, // SP needs seriesId, though it shouldn't change
        finalUpdates.name,
        finalUpdates.date, // Ensure date is in YYYY-MM-DD string format
        finalUpdates.time,
        finalUpdates.location,
        finalUpdates.description || null,
        finalUpdates.attendeeUids ? finalUpdates.attendeeUids.join(',') : null,
        finalUpdates.minute || null
      ]
    );
    const updatedMeeting = await getMeetingById(meetingId);
    if (!updatedMeeting) throw new Error("Failed to retrieve updated meeting instance.");
    return updatedMeeting;
  } catch (error) {
    console.error(`Error in updateMeeting service for ID ${meetingId}:`, error);
    throw error;
  }
}


export async function updateMeetingMinute(meetingId: string, minute: string | null): Promise<Meeting> {
  try {
    await executeQuery<any>('CALL sp_UpdateMeetingInstanceMinute(?, ?)', [meetingId, minute]);
    const updatedMeeting = await getMeetingById(meetingId);
    if (!updatedMeeting) throw new Error("Failed to retrieve meeting after updating minute.");
    return updatedMeeting;
  } catch (error) {
    console.error(`Error in updateMeetingMinute service for ID ${meetingId}:`, error);
    throw error;
  }
}

export async function deleteMeetingInstance(instanceId: string): Promise<void> {
  try {
    const instanceToDelete = await getMeetingById(instanceId); 
    if (!instanceToDelete) {
      console.warn(`Attempted to delete non-existent meeting instance: ${instanceId}`);
      return; 
    }

    const series = await getMeetingSeriesById(instanceToDelete.seriesId);
    if (series && series.frequency !== "OneTime") { 
      const formattedDate = format(parseISO(instanceToDelete.date), 'yyyy-MM-dd');
      await executeQuery<any>('CALL sp_AddCancelledDateToSeries(?, ?)', [series.id, formattedDate]);
    }

    await executeQuery<any>('CALL sp_DeleteMeetingInstance(?)', [instanceId]);
  } catch (error) {
    console.error(`Error in deleteMeetingInstance service for ID ${instanceId}:`, error);
    throw error;
  }
}

