import type { EventSummary } from '@event-buddy/contracts'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isUpcomingEvent(event: Pick<EventSummary, 'status' | 'startsAt'>, now: number) {
  return event.status === 'scheduled' && Date.parse(event.startsAt) >= now
}

export function formatEventDate(date: string) {
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(date))
}
