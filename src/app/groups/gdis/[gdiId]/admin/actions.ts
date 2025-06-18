
'use server';
import {
  addMeetingSeriesForGroup,
  updateMeetingSeriesForGroup,
  deleteMeetingSeriesForGroup,
  addMeetingInstanceForGroup,
  updateMeetingInstanceForGroup,
  deleteMeetingInstanceForGroup,
  getSeriesByIdForGroup,
  updateMeetingInstanceMinuteForGroup,
} from '@/services/groupMeetingService';
import type { DefineMeetingSeriesFormValues, MeetingSeries, MeetingInstanceFormValues, Meeting } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

// --- GDI Meeting Series Actions ---
export async function handleAddGdiMeetingSeriesAction(
  gdiId: string,
  seriesData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; newSeries?: MeetingSeries, newInstances?: Meeting[] }> {
  try {
    const result = await addMeetingSeriesForGroup('gdi', gdiId, seriesData);
    revalidatePath(`/groups/gdis/${gdiId}/admin`);
    return { success: true, message: result.message, newSeries: result.series, newInstances: result.newInstances };
  } catch (error: any) {
    return { success: false, message: `Error al definir serie para GDI: ${error.message}` };
  }
}

export async function handleUpdateGdiMeetingSeriesAction(
  gdiId: string,
  seriesId: string,
  updatedData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; updatedSeries?: MeetingSeries, newlyGeneratedInstances?: Meeting[] }> {
  try {
    const result = await updateMeetingSeriesForGroup('gdi', gdiId, seriesId, updatedData);
    revalidatePath(`/groups/gdis/${gdiId}/admin`);
    return { success: true, message: result.message, updatedSeries: result.updatedSeries, newlyGeneratedInstances: result.newlyGeneratedInstances };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar serie para GDI: ${error.message}` };
  }
}

export async function handleDeleteGdiMeetingSeriesAction(
  gdiId: string,
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await deleteMeetingSeriesForGroup('gdi', gdiId, seriesId);
    revalidatePath(`/groups/gdis/${gdiId}/admin`);
    return { success: true, message: "Serie de reuniones del GDI eliminada exitosamente." };
  } catch (error: any) {
    return { success: false, message: `Error al eliminar serie del GDI: ${error.message}` };
  }
}

// --- GDI Meeting Instance Actions ---
export async function handleAddMeetingForCurrentGDIAction(
  gdiId: string,
  seriesId: string,
  formData: MeetingInstanceFormValues
): Promise<{ success: boolean; message: string; newInstance?: Meeting }> {
   if (!formData.time || !/^[0-2][0-9]:[0-5][0-9]$/.test(formData.time)) {
    return { success: false, message: "Formato de hora proporcionado es inválido o está vacío." };
  }
  try {
    const newInstance = await addMeetingInstanceForGroup('gdi', gdiId, seriesId, formData);
    revalidatePath(`/groups/gdis/${gdiId}/admin`);
    return { success: true, message: `Reunión para GDI "${newInstance.name}" agregada.`, newInstance };
  } catch (error: any) {
    return { success: false, message: `Error al agregar reunión para GDI: ${error.message}` };
  }
}

export async function handleUpdateGdiMeetingInstanceAction(
  gdiId: string,
  instanceId: string,
  data: MeetingInstanceFormValues
): Promise<{ success: boolean; message: string; updatedInstance?: Meeting }> {
   if (!data.time || !/^[0-2][0-9]:[0-5][0-9]$/.test(data.time)) {
    return { success: false, message: "Formato de hora proporcionado es inválido o está vacío." };
  }
  try {
    const series = await getSeriesForInstance(instanceId, 'gdi', gdiId);
    if (!series) throw new Error("Serie padre no encontrada para la instancia.");

    const instanceDataToUpdate = {
      name: data.name,
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      location: data.location,
      description: data.description,
    };
    const updatedInstance = await updateMeetingInstanceForGroup('gdi', gdiId, series.id, instanceId, instanceDataToUpdate);
    revalidatePath(`/groups/gdis/${gdiId}/admin`);
    revalidatePath(`/events/${instanceId}/attendance`);
    return { success: true, message: "Instancia de reunión del GDI actualizada.", updatedInstance };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar instancia del GDI: ${error.message}` };
  }
}

export async function handleDeleteGdiMeetingInstanceAction(
  gdiId: string,
  instanceId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const series = await getSeriesForInstance(instanceId, 'gdi', gdiId);
     if (!series) throw new Error("Serie padre no encontrada para la instancia.");
    await deleteMeetingInstanceForGroup('gdi', gdiId, series.id, instanceId);
    revalidatePath(`/groups/gdis/${gdiId}/admin`);
    // No redirect here, handled by client if it's on attendance page
    return { success: true, message: "Instancia de reunión del GDI eliminada." };
  } catch (error: any) {
    return { success: false, message: `Error al eliminar instancia del GDI: ${error.message}` };
  }
}

export async function handleUpdateGdiMeetingMinuteAction(
  gdiId: string,
  instanceId: string,
  minute: string
): Promise<{ success: boolean; message: string }> {
  try {
    await updateMeetingInstanceMinuteForGroup('gdi', gdiId, instanceId, minute);
    revalidatePath(`/groups/gdis/${gdiId}/admin`);
    revalidatePath(`/events/${instanceId}/attendance`);
    return { success: true, message: "Minuta de reunión del GDI actualizada." };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar minuta del GDI: ${error.message}` };
  }
}

// Helper to find the series an instance belongs to (needed for some operations)
async function getSeriesForInstance(instanceId: string, groupType: 'gdi' | 'ministryArea', groupId: string): Promise<MeetingSeries | undefined> {
    const allSeries = await getSeriesByIdForGroup(groupType, groupId, undefined); // Gets all series for the group
    const allMeetings = await readDbFile<Meeting>('meetings-db.json');
    const meetingInstance = allMeetings.find(m => m.id === instanceId);
    if (!meetingInstance) return undefined;
    return allSeries.find(s => s.id === meetingInstance.seriesId);
}
