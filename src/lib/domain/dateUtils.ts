import { format, parseISO, addDays, differenceInCalendarDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns formatted calendar date YYYY-MM-DD for a given date in the user's timezone.
 */
export function getLocalCalendarDate(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const zoned = toZonedTime(date, timezone);
  return format(zoned, 'yyyy-MM-dd');
}

/**
 * Computes difference in calendar days between date A and date B (A - B).
 */
export function diffCalendarDays(dateStrA: string, dateStrB: string): number {
  const a = parseISO(dateStrA);
  const b = parseISO(dateStrB);
  return differenceInCalendarDays(a, b);
}

/**
 * Checks if two date strings YYYY-MM-DD are consecutive days.
 */
export function isConsecutiveDay(previousDateStr: string, currentDateStr: string): boolean {
  return diffCalendarDays(currentDateStr, previousDateStr) === 1;
}

/**
 * Checks if currentDateStr is after previousDateStr by more than 1 day (i.e. a missed day occurred).
 */
export function isBrokenStreak(previousDateStr: string, currentDateStr: string): boolean {
  return diffCalendarDays(currentDateStr, previousDateStr) > 1;
}
