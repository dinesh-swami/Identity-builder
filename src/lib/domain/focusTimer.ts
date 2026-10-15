import { SessionStatus } from '@prisma/client';

export const MAX_EMERGENCY_BREAK_SECONDS = 300; // 5 minutes strict

export interface FocusSessionModel {
  id: string;
  userId: string;
  targetDurationMinutes: number;
  status: SessionStatus;
  startedAt: Date;
  completedAt?: Date | null;
  breakStartedAt?: Date | null;
  breakDurationSeconds: number;
  emergencyBreakUsed: boolean;
  creditedMinutes: number;
  resetReason?: string | null;
  calendarDate: string;
}

export interface FocusSessionStateEvaluation {
  status: SessionStatus;
  elapsedWorkSeconds: number;
  remainingWorkSeconds: number;
  currentBreakSeconds: number;
  remainingBreakSeconds: number;
  isBreakExceeded: boolean;
  isWorkCompleted: boolean;
  canTakeEmergencyBreak: boolean;
  creditedMinutes: number;
  resetReason?: string | null;
}

/**
 * Server-side authoritative evaluation of a focus session's state at a given reference time.
 * Calculates elapsed time from persisted timestamps.
 */
export function evaluateSessionState(
  session: FocusSessionModel,
  now: Date = new Date()
): FocusSessionStateEvaluation {
  const targetWorkSeconds = session.targetDurationMinutes * 60;

  // If already terminal (COMPLETED, RESET, ABANDONED)
  if (session.status === 'COMPLETED') {
    return {
      status: 'COMPLETED',
      elapsedWorkSeconds: targetWorkSeconds,
      remainingWorkSeconds: 0,
      currentBreakSeconds: 0,
      remainingBreakSeconds: 0,
      isBreakExceeded: false,
      isWorkCompleted: true,
      canTakeEmergencyBreak: false,
      creditedMinutes: session.targetDurationMinutes,
      resetReason: null,
    };
  }

  if (session.status === 'RESET' || session.status === 'ABANDONED') {
    return {
      status: session.status,
      elapsedWorkSeconds: 0,
      remainingWorkSeconds: targetWorkSeconds,
      currentBreakSeconds: 0,
      remainingBreakSeconds: 0,
      isBreakExceeded: session.status === 'RESET',
      isWorkCompleted: false,
      canTakeEmergencyBreak: false,
      creditedMinutes: 0,
      resetReason: session.resetReason || 'Session ended without completion',
    };
  }

  // Active or On Break
  if (session.status === 'ON_BREAK') {
    const breakStartTime = session.breakStartedAt ? new Date(session.breakStartedAt).getTime() : now.getTime();
    const currentBreakSeconds = Math.max(0, Math.floor((now.getTime() - breakStartTime) / 1000));
    const remainingBreakSeconds = Math.max(0, MAX_EMERGENCY_BREAK_SECONDS - currentBreakSeconds);
    const isBreakExceeded = currentBreakSeconds > MAX_EMERGENCY_BREAK_SECONDS;

    // Elapsed work up to the moment break started
    const totalTimeBeforeBreak = Math.max(
      0,
      Math.floor((breakStartTime - new Date(session.startedAt).getTime()) / 1000)
    );
    const elapsedWorkSeconds = Math.max(0, totalTimeBeforeBreak - session.breakDurationSeconds);
    const remainingWorkSeconds = Math.max(0, targetWorkSeconds - elapsedWorkSeconds);

    if (isBreakExceeded) {
      return {
        status: 'RESET',
        elapsedWorkSeconds,
        remainingWorkSeconds,
        currentBreakSeconds,
        remainingBreakSeconds: 0,
        isBreakExceeded: true,
        isWorkCompleted: false,
        canTakeEmergencyBreak: false,
        creditedMinutes: 0,
        resetReason: 'Exceeded 5-minute emergency break allowance',
      };
    }

    return {
      status: 'ON_BREAK',
      elapsedWorkSeconds,
      remainingWorkSeconds,
      currentBreakSeconds,
      remainingBreakSeconds,
      isBreakExceeded: false,
      isWorkCompleted: false,
      canTakeEmergencyBreak: false,
      creditedMinutes: 0,
      resetReason: null,
    };
  }

  // ACTIVE state
  const totalElapsedRealSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000)
  );
  // Subtract prior break duration: break time strictly NEVER counts towards focused work
  const elapsedWorkSeconds = Math.max(0, totalElapsedRealSeconds - session.breakDurationSeconds);
  const remainingWorkSeconds = Math.max(0, targetWorkSeconds - elapsedWorkSeconds);
  const isWorkCompleted = elapsedWorkSeconds >= targetWorkSeconds;

  if (isWorkCompleted) {
    return {
      status: 'COMPLETED',
      elapsedWorkSeconds: targetWorkSeconds,
      remainingWorkSeconds: 0,
      currentBreakSeconds: 0,
      remainingBreakSeconds: 0,
      isBreakExceeded: false,
      isWorkCompleted: true,
      canTakeEmergencyBreak: false,
      creditedMinutes: session.targetDurationMinutes,
      resetReason: null,
    };
  }

  return {
    status: 'ACTIVE',
    elapsedWorkSeconds,
    remainingWorkSeconds,
    currentBreakSeconds: 0,
    remainingBreakSeconds: session.emergencyBreakUsed ? 0 : MAX_EMERGENCY_BREAK_SECONDS,
    isBreakExceeded: false,
    isWorkCompleted: false,
    canTakeEmergencyBreak: !session.emergencyBreakUsed,
    creditedMinutes: 0,
    resetReason: null,
  };
}
