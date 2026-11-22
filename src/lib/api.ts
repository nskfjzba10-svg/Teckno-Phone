import { TrackingRecord, VerifiedReview } from '../types';

const TOKEN_KEY = 'technophone_auth_token_v1';
const CUSTOMER_SESSION_KEY = 'technophone_customer_session_v1';
const CUSTOMER_NAME_KEY = 'technophone_customer_name_v1';

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getCustomerSessionId(): string {
  try {
    let existing = window.localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!existing) {
      existing = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      window.localStorage.setItem(CUSTOMER_SESSION_KEY, existing);
    }
    return existing;
  } catch {
    return 'guest-session';
  }
}

export function getSavedCustomerName(): string {
  try {
    return window.localStorage.getItem(CUSTOMER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCustomerName(name: string): void {
  try {
    window.localStorage.setItem(CUSTOMER_NAME_KEY, name);
  } catch {
    // Ignore
  }
}

let backendMarkedUnavailable = false;

export class BackendUnavailableError extends Error {
  status: number;
  constructor(message = 'Backend API unavailable', status = 404) {
    super(message);
    this.name = 'BackendUnavailableError';
    this.status = status;
  }
}

export function isBackendUnavailable(err: unknown): boolean {
  if (err instanceof BackendUnavailableError) return true;
  if (err instanceof TypeError) return true; // Network / offline / refused API call
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('request failed (404)') ||
      msg.includes('request failed (405)') ||
      msg.includes('failed to fetch') ||
      msg.includes('backend api unavailable')
    );
  }
  return false;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  if (backendMarkedUnavailable && url.startsWith('/api/')) {
    throw new BackendUnavailableError('Backend API unavailable', 404);
  }

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new BackendUnavailableError(
      err instanceof Error ? err.message : 'Network request failed',
      0
    );
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const data = isJson
    ? ((await res.json().catch(() => ({}))) as T & { error?: string })
    : ({} as T & { error?: string });

  if (res.ok && !isJson) {
    // Static SPA host rewrote /api/* to index.html
    backendMarkedUnavailable = true;
    throw new BackendUnavailableError('Static host returned HTML instead of API JSON', 404);
  }

  if (!res.ok) {
    const isAuthOrDirectoryRoute =
      url.startsWith('/api/auth/') || url === '/api/stores';
    if (
      res.status === 405 ||
      (res.status === 404 && (!data.error || isAuthOrDirectoryRoute || !isJson))
    ) {
      if (isAuthOrDirectoryRoute || !isJson) {
        backendMarkedUnavailable = true;
      }
      throw new BackendUnavailableError(`Request failed (${res.status})`, res.status);
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 640;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('فشل تحميل الملف'));
    reader.readAsDataURL(file);
  });
}

function readRawFileAsBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('فشل قراءة الملف المرفوع'));
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFile(
  file: File
): Promise<{ url: string; kind: 'image' | 'video' }> {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) {
    throw new Error('يرجى اختيار ملف صورة أو فيديو قصير صالح.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('حجم الملف يتجاوز الحد المسموح (8 ميجابايت).');
  }

  const dataUrl = isImage
    ? await readImageFileAsDataUrl(file)
    : await readRawFileAsBase64DataUrl(file);

  try {
    const res = await apiRequest<{ url: string; kind: 'image' | 'video' }>(
      '/api/uploads',
      {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mimeType: isImage ? 'image/jpeg' : file.type,
          dataUrl,
        }),
      }
    );
    return res;
  } catch (err) {
    if (isBackendUnavailable(err)) {
      throw new Error(
        'ميزة رفع الملفات من الجهاز تتطلب تشغيل الخادم؛ يمكنك اختيار أحد الشعارات الجاهزة أو إكمال التسجيل بدون ملف.'
      );
    }
    throw err;
  }
}

export async function submitVerifiedReviewApi(payload: {
  bookingId: string;
  rating: number;
  comment: string;
  productId?: string;
}): Promise<{ review: VerifiedReview; booking: TrackingRecord }> {
  return apiRequest<{ review: VerifiedReview; booking: TrackingRecord }>(
    '/api/reviews',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}
