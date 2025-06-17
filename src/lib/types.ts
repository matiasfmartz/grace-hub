
import { z } from 'zod';

export interface Member {
  id: string;
  firstName: string;
  lastName:string;
  email: string;
  phone: string;
  birthDate?: string; // YYYY-MM-DD
  churchJoinDate?: string; // YYYY-MM-DD
  baptismDate?: string; // User input, e.g., "June 2023" or "2023-06-15"
  attendsLifeSchool?: boolean;
  attendsBibleInstitute?: boolean;
  fromAnotherChurch?: boolean;
  assignedGDIId?: string | null; // ID of the GDI the member attends
  assignedAreaIds?: string[]; // IDs of MinistryAreas the member is part of
  status: 'Active' | 'Inactive' | 'New';
  avatarUrl?: string;
}

// Type for data sent to server action for CREATING (ID will be generated server-side)
export type MemberWriteData = Omit<Member, 'id'>;


export interface MinistryArea {
  id: string;
  name: string;
  description: string;
  leaderId: string; // Member ID of the leader
  memberIds: string[];
  imageUrl?: string;
}

export type MinistryAreaWriteData = Omit<MinistryArea, 'id'>;


export interface GDI { // Grupo de Integración
  id: string;
  name: string;
  guideId: string; // Member ID of the guide
  memberIds: string[];
}

export type GDIWriteData = Omit<GDI, 'id'>;

export const MeetingTypeSchema = z.enum([
  "General_Service",  // e.g., Sunday Service for all
  "GDI_Meeting",      // Weekly meeting for a specific GDI
  "Obreros_Meeting",  // For active workers in any ministry area + GDI guides
  "Lideres_Meeting",  // For Ministry Area Leaders AND GDI Guides
  "Area_Meeting",     // For members of a specific ministry area
  "Special_Meeting"   // Manually selected group of attendees
]);
export type MeetingType = z.infer<typeof MeetingTypeSchema>;

export interface Meeting {
  id: string;
  name: string;
  type: MeetingType;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, e.g., "10:00" or "19:30"
  location: string;
  description?: string;
  imageUrl?: string;
  relatedGdiId?: string | null;    // For GDI_Meeting type
  relatedAreaId?: string | null;   // For Area_Meeting type
  attendeeUids?: string[] | null; // For Special_Meeting type (specific UIDs)
  minute?: string | null;          // For Area_Meeting or others requiring minutes
}
export type MeetingWriteData = Omit<Meeting, 'id'>;


export interface AttendanceRecord {
  id: string;
  meetingId: string;
  memberId: string;
  attended: boolean;
  notes?: string;
}
export type AttendanceRecordWriteData = Omit<AttendanceRecord, 'id'>;


export interface Resource {
  id: string;
  title: string;
  type: 'Article' | 'Devotional' | 'Announcement' | 'Sermon Notes';
  snippet: string;
  imageUrl?: string;
  link?: string;
}

// Zod Schemas for Forms

export const MemberStatusSchema = z.enum(['Active', 'Inactive', 'New']);

export const NONE_GDI_OPTION_VALUE = "__NONE__";

export const AddMemberFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastName: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de email inválida." }),
  phone: z.string().min(7, { message: "El número de teléfono parece demasiado corto." }),
  birthDate: z.date().optional(),
  churchJoinDate: z.date().optional(),
  baptismDate: z.string().optional(),
  attendsLifeSchool: z.boolean().default(false),
  attendsBibleInstitute: z.boolean().default(false),
  fromAnotherChurch: z.boolean().default(false),
  status: MemberStatusSchema,
  avatarUrl: z.string().url({ message: "URL inválida." }).optional().or(z.literal('')),
  assignedGDIId: z.string().nullable().optional(),
  assignedAreaIds: z.array(z.string()).optional(),
});
export type AddMemberFormValues = z.infer<typeof AddMemberFormSchema>;


export const AddMinistryAreaFormSchema = z.object({
  name: z.string().min(3, { message: "Area name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  imageUrl: z.string().url({ message: "Invalid URL for image." }).optional().or(z.literal('')),
  leaderId: z.string().min(1, { message: "A leader must be selected." }),
});
export type AddMinistryAreaFormValues = z.infer<typeof AddMinistryAreaFormSchema>;

export const AddGdiFormSchema = z.object({
  name: z.string().min(3, { message: "GDI name must be at least 3 characters." }),
  guideId: z.string().min(1, { message: "A guide must be selected." }),
});
export type AddGdiFormValues = z.infer<typeof AddGdiFormSchema>;

export const UpdateMinistryAreaLeaderFormSchema = z.object({
  leaderId: z.string().min(1, { message: "A leader must be selected." }),
});
export type UpdateMinistryAreaLeaderFormValues = z.infer<typeof UpdateMinistryAreaLeaderFormSchema>;

export const AssignMinistryAreaMembersFormSchema = z.object({
  memberIds: z.array(z.string()).min(0, { message: "Select at least one member or an empty list." }),
});
export type AssignMinistryAreaMembersFormValues = z.infer<typeof AssignMinistryAreaMembersFormSchema>;


// Schema for adding meetings from the general /events page
// GDI_Meeting and Area_Meeting are typically created from their respective management pages.
export const AddGeneralMeetingFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la reunión debe tener al menos 3 caracteres." }),
  type: z.enum([
    "General_Service",
    "Obreros_Meeting",
    "Lideres_Meeting",
    "Special_Meeting"
  ]),
  date: z.date({ required_error: "La fecha es requerida." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  location: z.string().min(3, { message: "La ubicación es requerida." }),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: "URL de imagen inválida." }).optional().or(z.literal('')),
  attendeeUids: z.array(z.string()).optional(), // For "Special_Meeting"
  // relatedGdiId, relatedAreaId, minute are part of Meeting type but not set in this specific form
});

export type AddGeneralMeetingFormValues = z.infer<typeof AddGeneralMeetingFormSchema>;

