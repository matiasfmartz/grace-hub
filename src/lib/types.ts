
import { z } from 'zod';

export const MemberRoleEnum = z.enum(['Leader', 'Worker', 'GeneralAttendee']);
export type MemberRoleType = z.infer<typeof MemberRoleEnum>;

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
  roles?: MemberRoleType[];
}

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

// For Meeting Series target roles
export const MeetingTargetRoleEnum = z.enum(["generalAttendees", "workers", "leaders"]);
export type MeetingTargetRoleType = z.infer<typeof MeetingTargetRoleEnum>;

export const MeetingFrequencyEnum = z.enum(["OneTime", "Recurring"]); // Simplified: "Recurring" covers Weekly, Monthly, Irregular for now.
export type MeetingFrequencyType = z.infer<typeof MeetingFrequencyEnum>;

export interface MeetingSeries {
  id: string;
  name: string; // This will be the "Type" displayed in tabs
  description?: string;
  defaultTime: string; // HH:MM
  defaultLocation: string;
  defaultImageUrl?: string;
  targetAttendeeGroups: MeetingTargetRoleType[]; // Roles to determine attendees for new instances
  frequency: MeetingFrequencyType;
  // For future expansion: dayOfWeek, dayOfMonth, etc.
}
export type MeetingSeriesWriteData = Omit<MeetingSeries, 'id'>;

export interface Meeting {
  id: string;
  seriesId: string; // Links to MeetingSeries
  name: string; // Instance-specific name, can default from series name + date
  date: string; // YYYY-MM-DD (Always specific to the instance)
  time: string; // HH:MM (Can default from series, but can be overridden)
  location: string; // (Can default from series, but can be overridden)
  description?: string; // (Can default from series, but can be overridden)
  imageUrl?: string; // (Can default from series, but can be overridden)
  attendeeUids: string[]; // Definitive list of member IDs expected for THIS instance
  minute?: string | null;
}
export type MeetingWriteData = Omit<Meeting, 'id' | 'attendeeUids'> & { attendeeUids?: string[] }; // attendeeUids is populated by server logic


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


export const DefineMeetingSeriesFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la serie debe tener al menos 3 caracteres." }),
  description: z.string().optional(),
  defaultTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  defaultLocation: z.string().min(3, { message: "La ubicación por defecto es requerida." }),
  defaultImageUrl: z.string().url({ message: "URL de imagen inválida." }).optional().or(z.literal('')),
  targetAttendeeGroups: z.array(MeetingTargetRoleEnum).min(1,{message: "Debe seleccionar al menos un grupo de asistentes."}),
  frequency: MeetingFrequencyEnum,
  oneTimeDate: z.date().optional(), // Required only if frequency is "OneTime"
}).refine(data => {
  if (data.frequency === "OneTime") {
    return !!data.oneTimeDate;
  }
  return true;
}, {
  message: "La fecha es requerida para reuniones de 'Única Vez'.",
  path: ["oneTimeDate"], 
});

export type DefineMeetingSeriesFormValues = z.infer<typeof DefineMeetingSeriesFormSchema>;


// This is for adding an ad-hoc instance to an existing series (Future use)
// export const AddMeetingInstanceFormSchema = z.object({
//   seriesId: z.string(),
//   date: z.date({ required_error: "La fecha es requerida." }),
//   time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }).optional(),
//   location: z.string().optional(),
//   name: z.string().optional(),
//   description: z.string().optional(),
//   imageUrl: z.string().url({ message: "URL de imagen inválida." }).optional().or(z.literal('')),
//   // attendeeUids will be resolved by server or inherited + customizable
// });
// export type AddMeetingInstanceFormValues = z.infer<typeof AddMeetingInstanceFormSchema>;
