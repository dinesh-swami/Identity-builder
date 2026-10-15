import { describe, it, expect } from 'vitest';
import {
  evaluateSessionState,
  FocusSessionModel,
  MAX_EMERGENCY_BREAK_SECONDS,
} from '../../src/lib/domain/focusTimer';

describe('Focus Timer & 5-Minute Emergency Break Rule', () => {
  const baseSession: FocusSessionModel = {
    id: 'session-1',
    userId: 'user-1',
    targetDurationMinutes: 30, // 30 minute block
    status: 'ACTIVE',
    startedAt: new Date(Date.now() - 10 * 60 * 1000), // started 10 mins ago
    completedAt: null,
    breakStartedAt: null,
    breakDurationSeconds: 0,
    emergencyBreakUsed: false,
    creditedMinutes: 0,
    resetReason: null,
    calendarDate: '2026-10-15',
  };

  it('correctly tracks active work session and remaining time', () => {
    const now = new Date(baseSession.startedAt.getTime() + 12 * 60 * 1000); // 12 minutes elapsed
    const state = evaluateSessionState(baseSession, now);

    expect(state.status).toBe('ACTIVE');
    expect(state.elapsedWorkSeconds).toBe(12 * 60);
    expect(state.remainingWorkSeconds).toBe(18 * 60);
    expect(state.canTakeEmergencyBreak).toBe(true);
    expect(state.creditedMinutes).toBe(0);
  });

  it('credits full selected duration when active work reaches target', () => {
    const now = new Date(baseSession.startedAt.getTime() + 30 * 60 * 1000); // 30 minutes elapsed
    const state = evaluateSessionState(baseSession, now);

    expect(state.status).toBe('COMPLETED');
    expect(state.isWorkCompleted).toBe(true);
    expect(state.creditedMinutes).toBe(30);
  });

  it('handles emergency break resumed within 5 minutes without counting break towards work', () => {
    const startTime = new Date('2026-10-15T10:00:00Z');
    const breakStartTime = new Date('2026-10-15T10:15:00Z'); // 15 mins work done
    const resumeTime = new Date('2026-10-15T10:19:00Z'); // 4 mins break taken (within 5 mins)

    // During break at 3 mins
    const sessionOnBreak: FocusSessionModel = {
      ...baseSession,
      startedAt: startTime,
      status: 'ON_BREAK',
      breakStartedAt: breakStartTime,
      emergencyBreakUsed: true,
    };

    const duringBreakCheck = evaluateSessionState(
      sessionOnBreak,
      new Date('2026-10-15T10:18:00Z') // 3 minutes into break
    );
    expect(duringBreakCheck.status).toBe('ON_BREAK');
    expect(duringBreakCheck.isBreakExceeded).toBe(false);
    expect(duringBreakCheck.currentBreakSeconds).toBe(180);
    expect(duringBreakCheck.remainingBreakSeconds).toBe(120);
    expect(duringBreakCheck.elapsedWorkSeconds).toBe(15 * 60);

    // Resumed session: break duration was 4 minutes (240s)
    const resumedSession: FocusSessionModel = {
      ...sessionOnBreak,
      status: 'ACTIVE',
      breakStartedAt: null,
      breakDurationSeconds: 240, // 4 mins
      emergencyBreakUsed: true,
    };

    // Check at 10:34:00 (15m before break + 15m after break = 30m work)
    const finalCheck = evaluateSessionState(resumedSession, new Date('2026-10-15T10:34:00Z'));
    expect(finalCheck.status).toBe('COMPLETED');
    expect(finalCheck.elapsedWorkSeconds).toBe(30 * 60);
    expect(finalCheck.creditedMinutes).toBe(30);
  });

  it('invalidates and resets block to 0 credit if emergency break exceeds 5 minutes (300 seconds)', () => {
    const startTime = new Date('2026-10-15T10:00:00Z');
    const breakStartTime = new Date('2026-10-15T10:12:00Z');

    const sessionOnBreak: FocusSessionModel = {
      ...baseSession,
      startedAt: startTime,
      status: 'ON_BREAK',
      breakStartedAt: breakStartTime,
      emergencyBreakUsed: true,
    };

    // Checked at 5 minutes and 10 seconds into break (310 seconds)
    const now = new Date(breakStartTime.getTime() + 310 * 1000);
    const state = evaluateSessionState(sessionOnBreak, now);

    expect(state.status).toBe('RESET');
    expect(state.isBreakExceeded).toBe(true);
    expect(state.creditedMinutes).toBe(0); // Strictly zero credit!
    expect(state.resetReason).toContain('Exceeded 5-minute emergency break allowance');
  });

  it('never credits partial work for an abandoned or reset session', () => {
    const abandonedSession: FocusSessionModel = {
      ...baseSession,
      status: 'ABANDONED',
      resetReason: 'Manually abandoned by user',
    };

    const state = evaluateSessionState(abandonedSession);
    expect(state.status).toBe('ABANDONED');
    expect(state.creditedMinutes).toBe(0);
  });
});
