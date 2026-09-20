import { z } from "zod";

export const semesterTermSchema = z.object({
  year: z.number().int(),
  termType: z.enum(["fall", "spring", "summer"]),
  label: z.string().min(1),
});

export const userPreferencesSchema = z.object({
  targetGraduation: semesterTermSchema.optional(),
  creditLoadMin: z.number().min(0).default(12),
  creditLoadMax: z.number().min(0).default(12),
  allowSummer: z.boolean().default(false),
  timePreferences: z
    .object({
      preferEvening: z.boolean().default(false),
      noClassesBefore: z.string().optional(),
      noFridayClasses: z.boolean().default(false),
      preferredDays: z.array(z.string()).optional(),
    })
    .default({
      preferEvening: false,
      noFridayClasses: false,
    }),
  electiveInterests: z.array(z.string()).default([]),
  electiveTags: z.array(z.string()).default([]),
  priorityWeights: z
    .object({
      professorRating: z.number().min(0).max(10),
      rigorPreference: z.number().min(0).max(10),
      timePreferenceFit: z.number().min(0).max(10),
      graduatingSooner: z.number().min(0).max(10),
    })
    .default({
      professorRating: 7,
      rigorPreference: 5,
      timePreferenceFit: 6,
      graduatingSooner: 8,
    }),
  completedCourses: z.array(z.unknown()).optional(),
  inProgressCourses: z.array(z.string()).optional(),
  semesterCreditOverrides: z.record(z.string(), z.number().min(3).max(19)).optional(),
});

export const createPlanSchema = z.object({
  name: z.string().min(1).max(200),
  major: z.string().min(1).max(200),
  minors: z.array(z.string()).default([]),
  catalogYear: z.string().min(1).max(50),
  preferences: userPreferencesSchema.optional(),
});

export const updatePlanSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    major: z.string().min(1).max(200).optional(),
    minors: z.array(z.string()).optional(),
    catalogYear: z.string().min(1).max(50).optional(),
    preferences: userPreferencesSchema.optional(),
    theme: z.string().min(1).max(100).optional(),
    planGraph: z.unknown().optional(),
    presentationSpec: z.unknown().optional(),
    status: z.enum(["draft", "generating", "ready", "error"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
