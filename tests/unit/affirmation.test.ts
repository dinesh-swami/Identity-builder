import { describe, it, expect } from 'vitest';
import {
  validateAffirmation,
  calculateNewStreak,
  MIN_WORDS,
  MIN_CHARS,
} from '../../src/lib/domain/affirmation';

describe('Daily Affirmations & Streaks Rules', () => {
  it('rejects affirmations with fewer than 50 words', () => {
    // 20 words, but repeated to make it long in characters
    const shortWordText = new Array(20).fill('supercalifragilisticexpialidocious').join(' ');
    expect(shortWordText.length).toBeGreaterThanOrEqual(MIN_CHARS); // chars pass

    const result = validateAffirmation(shortWordText);
    expect(result.isValid).toBe(false);
    expect(result.wordCount).toBe(20);
    expect(result.errorMessages[0]).toContain(`Needs at least ${MIN_WORDS} words`);
  });

  it('rejects affirmations with fewer than 300 characters', () => {
    // 55 very short words, but under 300 chars
    const shortCharText = new Array(55).fill('I am').join(' ');
    const words = shortCharText.trim().split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(MIN_WORDS); // words pass

    const result = validateAffirmation(shortCharText);
    expect(result.isValid).toBe(false);
    expect(result.charCount).toBeLessThan(MIN_CHARS);
    expect(result.errorMessages[0]).toContain(`Needs at least ${MIN_CHARS} characters`);
  });

  it('accepts an affirmation that satisfies both >= 50 words AND >= 300 characters', () => {
    const validText =
      'I am committed to showing up every single day with relentless focus, personal accountability, and absolute discipline. ' +
      'Every obstacle I encounter is an opportunity to strengthen my execution and master my craft. ' +
      'I will not make excuses or defer the necessary deep work. ' +
      'My long term goals demand consistent daily execution, and today I choose to execute with precision, clarity, and courage.';

    const result = validateAffirmation(validText);
    expect(result.isValid).toBe(true);
    expect(result.wordCount).toBeGreaterThanOrEqual(MIN_WORDS);
    expect(result.charCount).toBeGreaterThanOrEqual(MIN_CHARS);
    expect(result.errorMessages.length).toBe(0);
  });

  it('awards only one streak credit when saving multiple times on the same calendar day', () => {
    const initial = {
      lastCompletedDate: '2026-10-15',
      currentStreak: 5,
      longestStreak: 10,
      totalDaysCompleted: 15,
      newCompletionDate: '2026-10-15', // Same day
    };

    const result = calculateNewStreak(initial);
    expect(result.isNewDayCredit).toBe(false);
    expect(result.currentStreak).toBe(5); // Not incremented
    expect(result.totalDaysCompleted).toBe(15);
  });

  it('increments streak on consecutive calendar days and updates longest streak', () => {
    const day1Result = calculateNewStreak({
      lastCompletedDate: null,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysCompleted: 0,
      newCompletionDate: '2026-10-14',
    });
    expect(day1Result.currentStreak).toBe(1);
    expect(day1Result.longestStreak).toBe(1);

    const day2Result = calculateNewStreak({
      lastCompletedDate: '2026-10-14',
      currentStreak: day1Result.currentStreak,
      longestStreak: day1Result.longestStreak,
      totalDaysCompleted: day1Result.totalDaysCompleted,
      newCompletionDate: '2026-10-15', // Consecutive day
    });
    expect(day2Result.currentStreak).toBe(2);
    expect(day2Result.longestStreak).toBe(2);
    expect(day2Result.totalDaysCompleted).toBe(2);
  });

  it('breaks streak when a calendar day is missed, resetting current streak to 1 while preserving longest streak', () => {
    const result = calculateNewStreak({
      lastCompletedDate: '2026-10-10',
      currentStreak: 7,
      longestStreak: 14,
      totalDaysCompleted: 20,
      newCompletionDate: '2026-10-15', // 5-day gap!
    });

    expect(result.wasStreakBroken).toBe(true);
    expect(result.currentStreak).toBe(1); // Resets to 1
    expect(result.longestStreak).toBe(14); // Preserves historic record!
    expect(result.totalDaysCompleted).toBe(21);
  });
});
