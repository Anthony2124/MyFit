import { KG_PER_LB } from './types'

/** Convert stored kg into the user's display unit. */
export function displayWeight(kg: number, unit: 'kg' | 'lb'): number {
  return Math.round((unit === 'lb' ? kg / KG_PER_LB : kg) * 10) / 10
}

export function toKg(value: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? value * KG_PER_LB : value
}
