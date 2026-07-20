import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS class names conditionally, resolving conflicts.
 * Combines `clsx` (conditional class composition) with `tailwind-merge`
 * (de-duplication of conflicting Tailwind utilities).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
