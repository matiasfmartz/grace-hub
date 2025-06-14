
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

export interface MinistryArea {
  id: string;
  name: string;
  description: string;
  leaderId: string; // Member ID of the leader
  memberIds: string[];
  imageUrl?: string;
}

export interface GDI { // Grupo de Integración
  id: string;
  name: string;
  guideId: string; // Member ID of the guide
  memberIds: string[];
}

export interface ChurchEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  imageUrl?: string;
}

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

export const NONE_GDI_OPTION_VALUE = "__NONE__"; // Added this export

export const AddMemberFormSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Phone number seems too short." }),
  birthDate: z.date().optional(),
  churchJoinDate: z.date().optional(),
  baptismDate: z.string().optional(),
  attendsLifeSchool: z.boolean().default(false),
  attendsBibleInstitute: z.boolean().default(false),
  fromAnotherChurch: z.boolean().default(false),
  status: MemberStatusSchema,
  avatarUrl: z.string().url({ message: "Invalid URL." }).optional().or(z.literal('')),
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
