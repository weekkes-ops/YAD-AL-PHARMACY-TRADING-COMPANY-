import { Timestamp } from 'firebase/firestore';

/**
 * Consistently parses a date from various formats, including Firestore Timestamps.
 */
export function parseFirestoreDate(date: any): Date {
  if (!date) return new Date();
  
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  
  if (typeof date === 'object' && date.seconds !== undefined) {
    return new Timestamp(date.seconds, date.nanoseconds || 0).toDate();
  }
  
  if (typeof date === 'string') {
    return new Date(date);
  }
  
  if (date instanceof Date) {
    return date;
  }

  return new Date();
}
