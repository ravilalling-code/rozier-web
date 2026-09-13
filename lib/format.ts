/**
 * Utilidades de formateo para fechas y moneda en PETALIA
 */

/**
 * Convierte cualquier fecha (ISO YYYY-MM-DD, ISO Datetime, etc.) al formato local DD/MM/YYYY (ej: 14/09/2026)
 */
export function formatLocalDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return 'Fecha no fijada';

  const clean = dateStr.trim();

  // Si ya viene en formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // Si viene en formato YYYY-MM-DD (ej: 2026-09-14)
  const isoDateMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return `${day}/${month}/${year}`;
  }

  // Si viene en formato DD-MM-YYYY
  const dmyHyphenMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyHyphenMatch) {
    const [, day, month, year] = dmyHyphenMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Parseo estándar con Date
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return dateStr;
}

/**
 * Formatea una fecha y hora al formato local DD/MM/YYYY HH:mm (ej: 14/09/2026 16:30)
 */
export function formatLocalDateTime(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return 'Reciente';

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return formatLocalDate(dateStr);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Normaliza cualquier expresión de fecha a un formato válido SQL DATE (YYYY-MM-DD)
 */
export function parseToSqlDate(rawDate?: string | null): string {
  const now = new Date();
  if (!rawDate || !rawDate.trim()) {
    return now.toISOString().split('T')[0];
  }

  const clean = rawDate.trim().toLowerCase();

  if (clean.includes('hoy') || clean.includes('today')) {
    return now.toISOString().split('T')[0];
  }

  if (clean.includes('manana') || clean.includes('mañana') || clean.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (clean.includes('pasado')) {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  }

  // Si ya tiene formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Si tiene formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return now.toISOString().split('T')[0];
}
