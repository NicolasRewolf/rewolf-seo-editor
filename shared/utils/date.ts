type DateInput = string | number | Date;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDateTimeFr(input: DateInput): string {
  return toDate(input).toLocaleString('fr-FR');
}

export function formatDateTimeFrShort(input: DateInput): string {
  return toDate(input).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
