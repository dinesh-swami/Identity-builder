import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const goalSchema = z.object({
  title: z.string().min(3, 'Goal title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  startDate: z.string().min(1, 'Start date is required'),
  originalTargetDate: z.string().min(1, 'Target date is required'),
  currentTargetDate: z.string().optional(),
  completionCriteria: z.string().optional(),
  notes: z.string().optional(),
});

export const milestoneSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
  parentId: z.string().optional().nullable(),
  type: z.enum(['MONTHLY', 'WEEKLY']),
  title: z.string().min(3, 'Milestone title is required'),
  description: z.string().optional(),
  weight: z.number().positive().default(1.0),
  originalStartDate: z.string().min(1, 'Start date is required'),
  originalEndDate: z.string().min(1, 'End date is required'),
  currentStartDate: z.string().optional(),
  currentEndDate: z.string().optional(),
  completionCriteria: z.string().optional(),
  delayReason: z.string().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(3, 'Task title is required'),
  description: z.string().optional(),
  goalId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('TODO'),
  weight: z.number().positive().default(1.0),
  assignedDate: z.string().min(1, 'Assigned date is required'),
  dueTime: z.string().optional(),
  estimatedMinutes: z.number().int().positive().default(30),
  actualMinutes: z.number().int().nonnegative().default(0),
});

export const taskRescheduleSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  newPlannedDate: z.string().min(1, 'New planned date is required'),
  delayReason: z.string().min(3, 'Delay reason is required for rescheduling audit trail'),
});

export const focusSessionStartSchema = z.object({
  targetDurationMinutes: z.number().int().min(1).max(720),
  goalId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
});

export const focusSessionActionSchema = z.object({
  sessionId: z.string().min(1),
  action: z.enum(['TAKE_BREAK', 'RESUME_BREAK', 'COMPLETE', 'ABANDON']),
  reason: z.string().optional(),
});

export const affirmationSchema = z.object({
  text: z.string().min(1, 'Affirmation cannot be empty'),
});

export const dailyReviewSchema = z.object({
  calendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  completedSummary: z.string().min(5, 'Completed summary is required'),
  failedSummary: z.string().optional(),
  failureReason: z.string().optional(),
  carryForwardPlan: z.string().optional(),
  tomorrowChanges: z.string().optional(),
  score: z.number().int().min(1).max(10).default(7),
});

export const scheduleLogSchema = z.object({
  calendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  targetSleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
  targetWakeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
  actualSleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
  actualWakeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
  notes: z.string().optional(),
});

export const userSettingsSchema = z.object({
  dailyTargetMinutes: z.number().int().min(30).max(1440),
  timezone: z.string().min(2),
  targetSleepTime: z.string().regex(/^\d{2}:\d{2}$/),
  targetWakeTime: z.string().regex(/^\d{2}:\d{2}$/),
});
