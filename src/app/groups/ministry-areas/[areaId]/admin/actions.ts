
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

// --- Ministry Area Meeting Series Actions ---
export async function handleAddAreaMeetingSeriesAction(
  areaId: string,
  seriesData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; newSeries?: MeetingSeries, newInstances?: Meeting[] }> {
  try {
    const result = await addMeetingSeriesForGroup('ministryArea', areaId, seriesData);
    revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
    return { success: true, message: result.message, newSeries: result.series, newInstances: result.newInstances };
  } catch (error: any) {
    return { success: false, message: `Error al definir serie para Área: ${error.message}` };
  }
}

export async function handleUpdateAreaMeetingSeriesAction(
  areaId: string,
  seriesId: string,
  updatedData: DefineMeetingSeriesFormValues
): Promise<{ success: boolean; message: string; updatedSeries?: MeetingSeries, newlyGeneratedInstances?: Meeting[] }> {
  try {
    const result = await updateMeetingSeriesForGroup('ministryArea', areaId, seriesId, updatedData);
    revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
    return { success: true, message: result.message, updatedSeries: result.updatedSeries, newlyGeneratedInstances: result.newlyGeneratedInstances };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar serie para Área: ${error.message}` };
  }
}

export async function handleDeleteAreaMeetingSeriesAction(
  areaId: string,
  seriesId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await deleteMeetingSeriesForGroup('ministryArea', areaId, seriesId);
    revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
    return { success: true, message: "Serie de reuniones del Área Ministerial eliminada exitosamente." };
  } catch (error: any) {
    return { success: false, message: `Error al eliminar serie del Área: ${error.message}` };
  }
}

// --- Ministry Area Meeting Instance Actions ---
export async function handleAddMeetingForCurrentAreaAction(
  areaId: string,
  seriesId: string,
  formData: MeetingInstanceFormValues
): Promise<{ success: boolean; message: string; newInstance?: Meeting }> {
  if (!formData.time || !/^[0-2][0-9]:[0-5][0-9]$/.test(formData.time)) {
    return { success: false, message: "Formato de hora proporcionado es inválido o está vacío." };
  }
  try {
    const newInstance = await addMeetingInstanceForGroup('ministryArea', areaId, seriesId, formData);
    revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
    return { success: true, message: `Reunión para Área "${newInstance.name}" agregada.`, newInstance };
  } catch (error: any) {
    return { success: false, message: `Error al agregar reunión para Área: ${error.message}` };
  }
}

export async function handleUpdateAreaMeetingInstanceAction(
  areaId: string,
  instanceId: string,
  data: MeetingInstanceFormValues
): Promise<{ success: boolean; message: string; updatedInstance?: Meeting }> {
  if (!data.time || !/^[0-2][0-9]:[0-5][0-9]$/.test(data.time)) {
    return { success: false, message: "Formato de hora proporcionado es inválido o está vacío." };
  }
  try {
    const series = await getSeriesForInstance(instanceId, 'ministryArea', areaId);
    if (!series) throw new Error("Serie padre no encontrada para la instancia.");

    const instanceDataToUpdate = {
      name: data.name,
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      location: data.location,
      description: data.description,
    };
    const updatedInstance = await updateMeetingInstanceForGroup('ministryArea', areaId, series.id, instanceId, instanceDataToUpdate);
    revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
    revalidatePath(`/events/${instanceId}/attendance`);
    return { success: true, message: "Instancia de reunión del Área actualizada.", updatedInstance };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar instancia del Área: ${error.message}` };
  }
}

export async function handleDeleteAreaMeetingInstanceAction(
  areaId: string,
  instanceId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const series = await getSeriesForInstance(instanceId, 'ministryArea', areaId);
     if (!series) throw new Error("Serie padre no encontrada para la instancia.");
    await deleteMeetingInstanceForGroup('ministryArea', areaId, series.id, instanceId);
    revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
    // No redirect here, handled by client if it's on attendance page
    return { success: true, message: "Instancia de reunión del Área eliminada." };
  } catch (error: any) {
    return { success: false, message: `Error al eliminar instancia del Área: ${error.message}` };
  }
}


export async function handleUpdateAreaMeetingMinuteAction(
  areaId: string,
  instanceId: string,
  minute: string
): Promise<{ success: boolean; message: string }> {
  try {
    await updateMeetingInstanceMinuteForGroup('ministryArea', areaId, instanceId, minute);
    revalidatePath(`/groups/ministry-areas/${areaId}/admin`);
    revalidatePath(`/events/${instanceId}/attendance`);
    return { success: true, message: "Minuta de reunión del Área actualizada." };
  } catch (error: any) {
    return { success: false, message: `Error al actualizar minuta del Área: ${error.message}` };
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
