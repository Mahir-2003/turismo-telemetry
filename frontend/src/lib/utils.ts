import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats milliseconds into a lap time string (MM:SS.mmm)
 * @param ms Milliseconds to format
 * @returns Formatted string like "1:23.456" or "--:--" if time is 0 or invalid
 */
export function formatLapTime(ms: number): string {
  if (!ms || ms <= 0) {
    return '--:--';
  }
  
  const seconds = ms / 1000;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
}

/**
 * Converts meters per second to either KPH or MPH
 * @param mps Speed in meters per second
 * @param unit Desired output unit ('kph' or 'mph')
 * @returns Formatted speed string with unit
 */
export function formatSpeed(mps: number, unit: 'kph' | 'mph'): string {
  const speed = unit === 'kph' ? mps * 3.6: mps * 2.237; // mps * 3.6 = kph, mps * 2.237 = mph
  return `${speed.toFixed(1)} ${unit.toUpperCase()}`;
}