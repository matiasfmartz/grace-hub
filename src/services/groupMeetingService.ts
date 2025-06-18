
'use server';
import type {
  Meeting,
  MeetingSeries,
  DefineMeetingSeriesFormValues,
  MeetingInstanceFormValues,
  Member,
  GDI,
  MinistryArea,
  AttendanceRecord,
  MeetingSeriesType,
  AnyMeetingInstanceUpdateData,
} from '@/lib/types';
import { readDbFile, writeDbFile } from '@/lib/db-utils';
import { format, parseISO, startOfDay, isSameDay, isValid as isValidDateFn } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getAllMeetingSeries as getAllCoreMeetingSeries,
  getMeetingSeriesById as getCoreMeetingSeriesById,
  addMeetingSeries as addCoreMeetingSeries,
  updateMeetingSeries as updateCoreMeetingSeries,
  deleteMeetingSeries as deleteCoreMeetingSeries,
  getAllMeetings as getAllCoreMeetings,
  getMeetingById as getCoreMeetingById,
  addMeetingInstance as addCoreMeetingInstance,
  updateMeeting as updateCoreMeeting,
  deleteMeetingInstance as deleteCoreMeetingInstance,
  updateMeetingMinute as updateCoreMeetingMinute,
  getMeetingsBySeriesId as getCoreMeetingsBySeriesId,
} from './meetingService'; 
import { getAllMembersNonPaginated } from './memberService';
import { getAllGdis } from './gdiService';
import { getAllMinistryAreas } from './ministryAreaService';

const ATTENDANCE_DB_FILE = 'attendance-db.json';
const MEETINGS_DB_FILE = 'meetings-db.json'; 

// --- Group Meeting Series Actions ---

export async function getSeriesByIdForGroup(
  groupType: 'gdi' | 'ministryArea',
  groupId: string,
  seriesId?: string // If provided, fetches a specific series for the group
): Promise<MeetingSeries[]> { // Returns an array, even if fetching a single series
  const allSeries = await getAllCoreMeetingSeries();
  const groupSeries = allSeries.filter(
    s => s.seriesType === groupType && s.ownerGroupId === groupId
  );
  if (seriesId) {
    return groupSeries.filter(s => s.id === seriesId);
  }
  return groupSeries;
}

export async function addMeetingSeriesForGroup(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesData: DefineMeetingSeriesFormValues
): Promise<{ series: MeetingSeries, message: string, newInstances?: Meeting[] }> {
  if (groupType !== 'gdi' && groupType !== 'ministryArea') {
    throw new Error('Invalid group type for series creation.');
  }

  const seriesDataForCore: Omit<MeetingSeries, 'id'> = {
    name: seriesData.name,
    description: seriesData.description,
    defaultTime: seriesData.defaultTime,
    defaultLocation: seriesData.defaultLocation,
    seriesType: groupType,
    ownerGroupId: groupId,
    targetAttendeeGroups: ['allMembers'], // For group meetings, attendees are implicitly group members
    frequency: seriesData.frequency,
    oneTimeDate: seriesData.frequency === "OneTime" ? (seriesData.oneTimeDate instanceof Date ? format(seriesData.oneTimeDate, 'yyyy-MM-dd') : seriesData.oneTimeDate) : undefined,
    weeklyDays: seriesData.frequency === "Weekly" ? seriesData.weeklyDays : undefined,
    monthlyRuleType: seriesData.frequency === "Monthly" ? seriesData.monthlyRuleType : undefined,
    monthlyDayOfMonth: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfMonth" ? seriesData.monthlyDayOfMonth : undefined,
    monthlyWeekOrdinal: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyWeekOrdinal : undefined,
    monthlyDayOfWeek: seriesData.frequency === "Monthly" && seriesData.monthlyRuleType === "DayOfWeekOfMonth" ? seriesData.monthlyDayOfWeek : undefined,
  };

  const { series, newInstances } = await addCoreMeetingSeries(seriesDataForCore);
  
  let message = `Serie de reuniones "${series.name}" para el grupo agregada exitosamente.`;
  if (newInstances && newInstances.length > 0) {
      message += ` ${newInstances.length} instancia(s) inicial(es) creada(s).`;
  } else if (series.frequency === "OneTime" && newInstances && newInstances.length === 1) {
      const instanceDateStr = newInstances[0].date;
      const parsedInstanceDate = parseISO(instanceDateStr);
      if (isValidDateFn(parsedInstanceDate)) {
           message += ` Instancia creada para el ${format(parsedInstanceDate, "d 'de' MMMM", { locale: es })}.`;
      } else {
          message += ` Instancia creada (fecha: ${instanceDateStr}).`;
      }
  }
  return { series, message, newInstances };
}


export async function updateMeetingSeriesForGroup(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesId: string,
  updatedData: DefineMeetingSeriesFormValues
): Promise<{ updatedSeries: MeetingSeries, message: string, newlyGeneratedInstances?: Meeting[] }> {
    if (groupType !== 'gdi' && groupType !== 'ministryArea') {
        throw new Error('Invalid group type for series update.');
    }
    const seriesToUpdate = await getCoreMeetingSeriesById(seriesId);
    if (!seriesToUpdate || seriesToUpdate.ownerGroupId !== groupId || seriesToUpdate.seriesType !== groupType) {
        throw new Error('Serie no encontrada o no pertenece a este grupo.');
    }

    const seriesDataForCoreUpdate: Partial<Omit<MeetingSeries, 'id'>> = {
        name: updatedData.name,
        description: updatedData.description,
        defaultTime: updatedData.defaultTime,
        defaultLocation: updatedData.defaultLocation,
        targetAttendeeGroups: ['allMembers'], 
        frequency: updatedData.frequency,
        oneTimeDate: updatedData.frequency === "OneTime" ? (updatedData.oneTimeDate instanceof Date ? format(updatedData.oneTimeDate, 'yyyy-MM-dd') : updatedData.oneTimeDate) : undefined,
        weeklyDays: updatedData.frequency === "Weekly" ? updatedData.weeklyDays : undefined,
        monthlyRuleType: updatedData.frequency === "Monthly" ? updatedData.monthlyRuleType : undefined,
        monthlyDayOfMonth: updatedData.frequency === "Monthly" && updatedData.monthlyRuleType === "DayOfMonth" ? updatedData.monthlyDayOfMonth : undefined,
        monthlyWeekOrdinal: updatedData.frequency === "Monthly" && updatedData.monthlyRuleType === "DayOfWeekOfMonth" ? updatedData.monthlyWeekOrdinal : undefined,
        monthlyDayOfWeek: updatedData.frequency === "Monthly" && updatedData.monthlyRuleType === "DayOfWeekOfMonth" ? updatedData.monthlyDayOfWeek : undefined,
    };
    
    const { updatedSeries, newlyGeneratedInstances } = await updateCoreMeetingSeries(seriesId, seriesDataForCoreUpdate);
    let message = `Serie de reuniones "${updatedSeries.name}" para el grupo actualizada exitosamente.`;
    if (newlyGeneratedInstances && newlyGeneratedInstances.length > 0) {
        message += ` ${newlyGeneratedInstances.length} nueva(s) instancia(s) futura(s) generada(s).`;
    }
    return { updatedSeries, message, newlyGeneratedInstances };
}

export async function deleteMeetingSeriesForGroup(
  groupType: MeetingSeriesType,
  groupId: string,
  seriesId: string
): Promise<void> {
  const seriesToDelete = await getCoreMeetingSeriesById(seriesId);
  if (!seriesToDelete || seriesToDelete.ownerGroupId !== groupId || seriesToDelete.seriesType !== groupType) {
    throw new Error('Serie no encontrada o no pertenece a este grupo.');
  }
  await deleteCoreMeetingSeries(seriesId); 
}


// --- Group Meeting Instance Actions ---

export async function getGroupMeetingInstances(
    groupType: 'gdi' | 'ministryArea',
    groupId: string,
    seriesId?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ instances: Meeting[]; totalCount: number; totalPages: number }> {
    const allMeetings = await getAllCoreMeetings();
    
    let relevantMeetings = allMeetings.filter(async meeting => {
        const parentSeries = meeting.seriesId ? (await getCoreMeetingSeriesById(meeting.seriesId)) : null;
        if (!parentSeries) return false;
        return parentSeries.seriesType === groupType && parentSeries.ownerGroupId === groupId &&
               (!seriesId || parentSeries.id === seriesId);
    });

    if (startDate) {
        const start = startOfDay(parseISO(startDate));
        relevantMeetings = relevantMeetings.filter(m => {
            const meetingDate = parseISO(m.date);
            return isValidDateFn(meetingDate) && meetingDate >= start;
        });
    }
    if (endDate) {
        const end = startOfDay(parseISO(endDate));
        relevantMeetings = relevantMeetings.filter(m => {
            const meetingDate = parseISO(m.date);
            return isValidDateFn(meetingDate) && meetingDate <= end;
        });
    }
    
    relevantMeetings.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    
    const totalCount = relevantMeetings.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedInstances = relevantMeetings.slice(startIndex, startIndex + pageSize);

    return { instances: paginatedInstances, totalCount, totalPages };
}


async function resolveGroupAttendeeUids(
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


export async function addMeetingInstanceForGroup(
  groupType: 'gdi' | 'ministryArea',
  groupId: string,
  seriesId: string,
  instanceDetails: MeetingInstanceFormValues
): Promise<Meeting> {
  const series = await getCoreMeetingSeriesById(seriesId);
  if (!series || series.seriesType !== groupType || series.ownerGroupId !== groupId) {
    throw new Error(`Serie no encontrada o no pertenece a este grupo (${groupType} ID: ${groupId}).`);
  }

  // UIDs for group meetings are resolved by coreMeetingService using its updated resolveAttendeeUids
  // which now considers seriesType and ownerGroupId.
  const meetingData: Pick<Meeting, 'name' | 'date' | 'time' | 'location' | 'description'> = {
    name: instanceDetails.name,
    date: format(instanceDetails.date, 'yyyy-MM-dd'),
    time: instanceDetails.time,
    location: instanceDetails.location,
    description: instanceDetails.description,
  };

  return addCoreMeetingInstance(seriesId, meetingData); // addCoreMeetingInstance will resolve UIDs
}

export async function updateMeetingInstanceForGroup(
  groupType: 'gdi' | 'ministryArea',
  groupId: string,
  seriesId: string, 
  instanceId: string,
  updates: AnyMeetingInstanceUpdateData
): Promise<Meeting> {
  const instance = await getCoreMeetingById(instanceId);
  if (!instance) {
    throw new Error(`Instancia de reunión con ID ${instanceId} no encontrada.`);
  }
  const series = await getCoreMeetingSeriesById(instance.seriesId);
  if (!series || series.seriesType !== groupType || series.ownerGroupId !== groupId || series.id !== seriesId) {
    throw new Error('Instancia no pertenece a la serie o grupo especificado.');
  }
  return updateCoreMeeting(instanceId, updates);
}


export async function deleteMeetingInstanceForGroup(
  groupType: 'gdi' | 'ministryArea',
  groupId: string,
  seriesId: string, 
  instanceId: string
): Promise<void> {
  const instance = await getCoreMeetingById(instanceId);
  if (!instance) {
    throw new Error(`Instancia de reunión con ID ${instanceId} no encontrada.`);
  }
  const series = await getCoreMeetingSeriesById(instance.seriesId);
   if (!series || series.seriesType !== groupType || series.ownerGroupId !== groupId || series.id !== seriesId) {
    throw new Error('Instancia no pertenece a la serie o grupo especificado.');
  }
  await deleteCoreMeetingInstance(instanceId);
}

export async function updateMeetingInstanceMinuteForGroup(
  groupType: 'gdi' | 'ministryArea',
  groupId: string,
  instanceId: string,
  minute: string | null
): Promise<Meeting> {
    const instance = await getCoreMeetingById(instanceId);
    if (!instance) {
        throw new Error(`Instancia de reunión con ID ${instanceId} no encontrada.`);
    }
    const series = await getCoreMeetingSeriesById(instance.seriesId);
    if (!series || series.seriesType !== groupType || series.ownerGroupId !== groupId) {
        throw new Error('La instancia no pertenece a la serie o grupo especificado.');
    }
    return updateCoreMeetingMinute(instanceId, minute);
}
