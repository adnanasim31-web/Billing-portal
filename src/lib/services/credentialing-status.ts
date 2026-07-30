/**
 * Pure expiration logic - no DB access, so it's cheap to unit test. This is
 * a computed alert layer independent of the record's manually-set `status`
 * field: a credential can be marked "active" by a biller but still be past
 * (or approaching) its expiration_date, and the UI should flag that either way.
 */
const DEFAULT_WARNING_WINDOW_DAYS = 60;

function toUtcDate(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00Z`);
}

export function isExpired(expirationDate: string | null, todayIso: string): boolean {
  if (!expirationDate) return false;
  return toUtcDate(expirationDate).getTime() < toUtcDate(todayIso).getTime();
}

export function isExpiringSoon(
  expirationDate: string | null,
  todayIso: string,
  warningWindowDays: number = DEFAULT_WARNING_WINDOW_DAYS
): boolean {
  if (!expirationDate) return false;
  if (isExpired(expirationDate, todayIso)) return false;

  const today = toUtcDate(todayIso);
  const warningDeadline = new Date(today);
  warningDeadline.setUTCDate(warningDeadline.getUTCDate() + warningWindowDays);

  return toUtcDate(expirationDate).getTime() <= warningDeadline.getTime();
}
