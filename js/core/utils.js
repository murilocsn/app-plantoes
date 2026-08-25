/**
 * Shared, dependency-free utilities for FinancPlantões.
 * This module is intentionally framework-free so the current app can adopt it incrementally.
 */

export function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(number);
}

export function parseCurrency(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function isValidDate(value) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export function formatDateBR(value) {
  if (!isValidDate(value)) return '';
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function hoursToLabel(hours) {
  const totalMinutes = Math.max(0, Math.round(Number(hours || 0) * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}
