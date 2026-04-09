import { toast } from 'sonner';

export type ApiErrorCode =
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'AI_PROVIDER_ERROR'
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: ApiErrorCode;
  readonly details?: unknown;

  constructor(
    message: string,
    options?: { status?: number; code?: ApiErrorCode; details?: unknown }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

type ErrorPayload = {
  error?: string;
  code?: ApiErrorCode;
  details?: unknown;
};

export async function createApiErrorFromResponse(
  res: Response,
  fallbackMessage?: string
): Promise<ApiError> {
  let payload: ErrorPayload | null = null;

  try {
    const data = (await res.json()) as unknown;
    if (data && typeof data === 'object') {
      payload = data as ErrorPayload;
    }
  } catch {
    payload = null;
  }

  const message =
    payload?.error ??
    fallbackMessage ??
    `Erreur API (${res.status})`;

  return new ApiError(message, {
    status: res.status,
    code: payload?.code,
    details: payload?.details,
  });
}

function messageForCode(code: ApiErrorCode): string {
  switch (code) {
    case 'NOT_FOUND':
      return 'La ressource demandée est introuvable.';
    case 'AUTH_ERROR':
      return "Erreur d'authentification. Vérifiez vos accès.";
    case 'AI_PROVIDER_ERROR':
      return 'Le fournisseur IA est indisponible pour le moment.';
    case 'VALIDATION_ERROR':
      return 'Les données envoyées sont invalides.';
    case 'BAD_REQUEST':
      return 'La requête est invalide.';
    case 'INTERNAL_ERROR':
    default:
      return "Une erreur interne s'est produite.";
  }
}

export function getUserErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue.'
): string {
  if (error instanceof ApiError) {
    if (error.code) return messageForCode(error.code);
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

export function notifyApiError(
  error: unknown,
  fallback = 'Une erreur est survenue.'
): string {
  const message = getUserErrorMessage(error, fallback);
  toast.error(message);
  return message;
}
