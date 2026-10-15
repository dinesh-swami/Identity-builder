-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('MONTHLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ON_BREAK', 'COMPLETED', 'RESET', 'ABANDONED');

-- CreateEnum
CREATE TYPE "HistoryChangeType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'RESCHEDULED', 'PRIORITY_CHANGED', 'DELAY_REASON_ADDED', 'WEIGHT_CHANGED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyTargetMinutes" INTEGER NOT NULL DEFAULT 480,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "targetSleepTime" TEXT NOT NULL DEFAULT '23:00',
    "targetWakeTime" TEXT NOT NULL DEFAULT '07:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'HIGH',
    "status" "GoalStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startDate" TIMESTAMP(3) NOT NULL,
    "originalTargetDate" TIMESTAMP(3) NOT NULL,
    "currentTargetDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completionCriteria" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "MilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "originalStartDate" TIMESTAMP(3) NOT NULL,
    "originalEndDate" TIMESTAMP(3) NOT NULL,
    "currentStartDate" TIMESTAMP(3) NOT NULL,
    "currentEndDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "completionCriteria" TEXT,
    "delayReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "assignedDate" TIMESTAMP(3) NOT NULL,
    "dueTime" TEXT,
    "originalPlannedDate" TIMESTAMP(3) NOT NULL,
    "currentPlannedDate" TIMESTAMP(3) NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "actualMinutes" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "delayReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_change_events" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "changeType" "HistoryChangeType" NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "milestoneId" TEXT,
    "taskId" TEXT,
    "targetDurationMinutes" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "breakStartedAt" TIMESTAMP(3),
    "breakDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "emergencyBreakUsed" BOOLEAN NOT NULL DEFAULT false,
    "creditedMinutes" INTEGER NOT NULL DEFAULT 0,
    "resetReason" TEXT,
    "calendarDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affirmations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "charCount" INTEGER NOT NULL,
    "calendarDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalDaysCompleted" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streak_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarDate" TEXT NOT NULL,
    "completedSummary" TEXT NOT NULL,
    "failedSummary" TEXT,
    "failureReason" TEXT,
    "carryForwardPlan" TEXT,
    "tomorrowChanges" TEXT,
    "score" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarDate" TEXT NOT NULL,
    "targetSleepTime" TEXT NOT NULL,
    "targetWakeTime" TEXT NOT NULL,
    "actualSleepTime" TEXT NOT NULL,
    "actualWakeTime" TEXT NOT NULL,
    "sleepDurationMinutes" INTEGER NOT NULL,
    "deviationMinutes" INTEGER NOT NULL,
    "metTarget" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "goals_userId_status_idx" ON "goals"("userId", "status");

-- CreateIndex
CREATE INDEX "milestones_goalId_type_idx" ON "milestones"("goalId", "type");

-- CreateIndex
CREATE INDEX "milestones_parentId_idx" ON "milestones"("parentId");

-- CreateIndex
CREATE INDEX "tasks_userId_assignedDate_status_idx" ON "tasks"("userId", "assignedDate", "status");

-- CreateIndex
CREATE INDEX "tasks_milestoneId_idx" ON "tasks"("milestoneId");

-- CreateIndex
CREATE INDEX "plan_change_events_taskId_idx" ON "plan_change_events"("taskId");

-- CreateIndex
CREATE INDEX "focus_sessions_userId_calendarDate_status_idx" ON "focus_sessions"("userId", "calendarDate", "status");

-- CreateIndex
CREATE INDEX "affirmations_userId_calendarDate_idx" ON "affirmations"("userId", "calendarDate");

-- CreateIndex
CREATE UNIQUE INDEX "affirmations_userId_calendarDate_key" ON "affirmations"("userId", "calendarDate");

-- CreateIndex
CREATE UNIQUE INDEX "streak_records_userId_key" ON "streak_records"("userId");

-- CreateIndex
CREATE INDEX "daily_reviews_userId_calendarDate_idx" ON "daily_reviews"("userId", "calendarDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reviews_userId_calendarDate_key" ON "daily_reviews"("userId", "calendarDate");

-- CreateIndex
CREATE INDEX "schedule_logs_userId_calendarDate_idx" ON "schedule_logs"("userId", "calendarDate");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_logs_userId_calendarDate_key" ON "schedule_logs"("userId", "calendarDate");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_change_events" ADD CONSTRAINT "plan_change_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affirmations" ADD CONSTRAINT "affirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_records" ADD CONSTRAINT "streak_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reviews" ADD CONSTRAINT "daily_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_logs" ADD CONSTRAINT "schedule_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
