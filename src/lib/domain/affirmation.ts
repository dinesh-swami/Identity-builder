import { diffCalendarDays, isConsecutiveDay, isBrokenStreak } from './dateUtils';

export const MIN_WORDS = 50;
export const MIN_CHARS = 300;

export interface AffirmationValidationResult {
  isValid: boolean;
  wordCount: number;
  charCount: number;
  wordsNeeded: number;
  charsNeeded: number;
  errorMessages: string[];
}

/**
 * Validates affirmation text according to the strict 50-word and 300-character rules.
 */
export function validateAffirmation(rawText: string): AffirmationValidationResult {
  const trimmed = (rawText || '').trim();
  const words = trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = trimmed.length;

  const errorMessages: string[] = [];
  const wordsNeeded = Math.max(0, MIN_WORDS - wordCount);
  const charsNeeded = Math.max(0, MIN_CHARS - charCount);

  if (wordCount < MIN_WORDS) {
    errorMessages.push(`Needs at least ${MIN_WORDS} words (currently ${wordCount}, ${wordsNeeded} more needed).`);
  }

  if (charCount < MIN_CHARS) {
    errorMessages.push(`Needs at least ${MIN_CHARS} characters (currently ${charCount}, ${charsNeeded} more needed).`);
  }

  return {
    isValid: errorMessages.length === 0,
    wordCount,
    charCount,
    wordsNeeded,
    charsNeeded,
    errorMessages,
  };
}

export interface StreakCalculationInput {
  lastCompletedDate: string | null; // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
  totalDaysCompleted: number;
  newCompletionDate: string; // YYYY-MM-DD
}

export interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
  totalDaysCompleted: number;
  isNewDayCredit: boolean;
  isStreakMaintained: boolean;
  wasStreakBroken: boolean;
}

/**
 * Deterministic calculation of user's affirmation streak upon submitting a valid affirmation.
 * Prevents multiple streak increments on the same calendar day.
 */
export function calculateNewStreak(input: StreakCalculationInput): StreakCalculationResult {
  const { lastCompletedDate, currentStreak, longestStreak, totalDaysCompleted, newCompletionDate } = input;

  // First time completing an affirmation
  if (!lastCompletedDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      totalDaysCompleted: totalDaysCompleted + 1,
      isNewDayCredit: true,
      isStreakMaintained: true,
      wasStreakBroken: false,
    };
  }

  const diff = diffCalendarDays(newCompletionDate, lastCompletedDate);

  // Same day: already credited, do NOT increase streak or count
  if (diff === 0) {
    return {
      currentStreak,
      longestStreak,
      totalDaysCompleted,
      isNewDayCredit: false,
      isStreakMaintained: true,
      wasStreakBroken: false,
    };
  }

  // Exactly next consecutive day
  if (diff === 1) {
    const updatedStreak = currentStreak + 1;
    return {
      currentStreak: updatedStreak,
      longestStreak: Math.max(longestStreak, updatedStreak),
      totalDaysCompleted: totalDaysCompleted + 1,
      isNewDayCredit: true,
      isStreakMaintained: true,
      wasStreakBroken: false,
    };
  }

  // Missed one or more days: streak breaks and resets to 1, but longestStreak is preserved!
  if (diff > 1) {
    return {
      currentStreak: 1,
      longestStreak,
      totalDaysCompleted: totalDaysCompleted + 1,
      isNewDayCredit: true,
      isStreakMaintained: false,
      wasStreakBroken: true,
    };
  }

  // If for some reason new date is in the past, preserve current state
  return {
    currentStreak,
    longestStreak,
    totalDaysCompleted,
    isNewDayCredit: false,
    isStreakMaintained: true,
    wasStreakBroken: false,
  };
}
