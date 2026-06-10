import { z } from 'zod';

export const personalInfoSchema = z.object({
  fullName: z.string().min(2, { message: 'Full Name must be at least 2 characters' }),
  title: z.string(),
  email: z.string().email({ message: 'Invalid email address' }).or(z.literal('')),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string().url({ message: 'Invalid LinkedIn URL' }).or(z.literal('')),
  github: z.string().url({ message: 'Invalid GitHub URL' }).or(z.literal('')),
  portfolio: z.string().url({ message: 'Invalid Portfolio URL' }).or(z.literal('')),
  summary: z.string(),
});

export const educationItemSchema = z.object({
  id: z.string(),
  school: z.string().min(2, { message: 'School/Institution is required' }),
  degree: z.string().min(2, { message: 'Degree/Certificate is required' }),
  fieldOfStudy: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  current: z.boolean(),
  description: z.string(),
});

export const experienceItemSchema = z.object({
  id: z.string(),
  company: z.string().min(2, { message: 'Company name is required' }),
  position: z.string().min(2, { message: 'Position title is required' }),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  current: z.boolean(),
  description: z.string(),
});

export const projectItemSchema = z.object({
  id: z.string(),
  projectName: z.string().min(2, { message: 'Project name is required' }),
  description: z.string(),
  technologies: z.string(),
  githubUrl: z.string().url({ message: 'Invalid GitHub URL' }).or(z.literal('')),
  liveUrl: z.string().url({ message: 'Invalid Live URL' }).or(z.literal('')),
});

export const certificateItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: 'Certificate name is required' }),
  issuer: z.string(),
  date: z.string(),
  url: z.string().url({ message: 'Invalid URL' }).or(z.literal('')),
});

export const achievementItemSchema = z.object({
  id: z.string(),
  title: z.string().min(2, { message: 'Achievement title is required' }),
  date: z.string(),
  description: z.string(),
});

export const skillsSchema = z.object({
  technicalSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
});

export const visibleSectionsSchema = z.object({
  personalInfo: z.boolean(),
  workExperience: z.boolean(),
  education: z.boolean(),
  projects: z.boolean(),
  skills: z.boolean(),
  certificates: z.boolean(),
  achievements: z.boolean(),
});

export const resumeSchema = z.object({
  personalInfo: personalInfoSchema,
  workExperience: z.array(experienceItemSchema),
  education: z.array(educationItemSchema),
  projects: z.array(projectItemSchema),
  skills: skillsSchema,
  certificates: z.array(certificateItemSchema),
  achievements: z.array(achievementItemSchema),
  templateId: z.enum(['modern-minimalist', 'professional', 'executive']),
  sectionOrder: z.array(z.string()),
  visibleSections: visibleSectionsSchema,
});

export type ResumeValues = z.infer<typeof resumeSchema>;

