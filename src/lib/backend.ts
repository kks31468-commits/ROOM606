import type { CanvaSyncResponse } from '../components/CanvaPosterRenderer';

export interface VisitorStats {
  totalVisits: number;
  todayVisits: number;
  uniqueVisitors: number;
}

export interface GuestbookNote {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

interface GoogleScriptRun {
  withSuccessHandler: (cb: (result: any) => void) => GoogleScriptRun;
  withFailureHandler: (cb: (err: any) => void) => GoogleScriptRun;
  [fnName: string]: any;
}

declare global {
  interface Window {
    google?: {
      script?: {
        run?: GoogleScriptRun;
      };
    };
    __M66_GAS_SCHEDULE_IMG__?: string;
  }
}

export function isGoogleAppsScriptRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.google?.script?.run !== 'undefined'
  );
}

function runGasFunction<T>(fnName: string, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new Error('Google Apps Script runtime unavailable'));
      return;
    }
    runner
      .withSuccessHandler((res: T) => resolve(res))
      .withFailureHandler((err: any) =>
        reject(new Error(err?.message || String(err || 'Apps Script error')))
      )[fnName](...args);
  });
}

function getBaseUrl(): string {
  const base = import.meta.env?.BASE_URL || './';
  return base.endsWith('/') ? base : `${base}/`;
}

export function getScheduleImageSrc(): string {
  if (typeof window !== 'undefined' && window.__M66_GAS_SCHEDULE_IMG__) {
    return window.__M66_GAS_SCHEDULE_IMG__;
  }
  return `${getBaseUrl()}assets/aistudio/AISelect_20261109_104523_Drive_75742c06.jpg`;
}

async function fetchJsonOrNull(url: string, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  isJson: boolean;
  data: any;
}> {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { ok: false, status: res.status, isJson: false, data: null };
  }
  const data = await res.json();
  return { ok: res.ok, status: res.status, isJson: true, data };
}

export async function syncCanvaData(manual: boolean): Promise<CanvaSyncResponse> {
  if (isGoogleAppsScriptRuntime()) {
    return runGasFunction<CanvaSyncResponse>('gasSyncCanva', manual);
  }

  try {
    const endpoint = `/api/canva/sync?t=${Date.now()}${manual ? '&refresh=1' : ''}`;
    const apiResult = await fetchJsonOrNull(endpoint, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    if (apiResult.isJson) {
      if (!apiResult.ok) {
        throw new Error(apiResult.data?.error || 'ไม่สามารถดึงข้อมูลจาก Canva ได้');
      }
      return apiResult.data as CanvaSyncResponse;
    }
  } catch (err: any) {
    // Only fall through to static JSON if /api is missing (e.g. GitHub Pages)
    if (err?.message && !String(err.message).includes('Failed to fetch')) {
      throw err;
    }
  }

  const staticUrl = `${getBaseUrl()}data/canva-sync.json?t=${Date.now()}`;
  const staticRes = await fetch(staticUrl, { cache: 'no-store' });
  if (!staticRes.ok) {
    throw new Error('ไม่สามารถดึงข้อมูลจาก Canva ได้');
  }
  const staticData = (await staticRes.json()) as CanvaSyncResponse;
  return staticData;
}

function getBangkokDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function updateStaticVisitorStats(countView: boolean): VisitorStats {
  const today = getBangkokDateKey();
  let stored = { totalVisits: 0, todayDate: today, todayVisits: 0 };
  try {
    const raw = localStorage.getItem('m66_static_visitor_stats');
    if (raw) {
      const parsed = JSON.parse(raw);
      stored.totalVisits = typeof parsed?.totalVisits === 'number' ? parsed.totalVisits : 0;
      stored.todayVisits =
        parsed?.todayDate === today && typeof parsed?.todayVisits === 'number'
          ? parsed.todayVisits
          : 0;
    }
  } catch {
    // Ignore storage errors
  }

  if (countView || stored.totalVisits === 0) {
    stored.totalVisits += 1;
    stored.todayVisits += 1;
    stored.todayDate = today;
    try {
      localStorage.setItem('m66_static_visitor_stats', JSON.stringify(stored));
    } catch {
      // Ignore storage errors
    }
  }

  return {
    totalVisits: stored.totalVisits,
    todayVisits: stored.todayVisits,
    uniqueVisitors: 1,
  };
}

export async function hitVisitorCounter(
  visitorId: string,
  countView: boolean
): Promise<VisitorStats> {
  if (isGoogleAppsScriptRuntime()) {
    return runGasFunction<VisitorStats>('gasHitVisit', visitorId, countView);
  }
  try {
    const res = await fetchJsonOrNull('/api/visits/hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, countView }),
    });
    if (res.isJson && res.ok) {
      return res.data as VisitorStats;
    }
  } catch {
    // Fall back to static browser storage on GitHub Pages
  }
  return updateStaticVisitorStats(countView);
}

function loadStaticGuestbookNotes(): GuestbookNote[] {
  try {
    const raw = localStorage.getItem('m66_static_guestbook');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (n): n is GuestbookNote =>
          Boolean(n) &&
          typeof n.id === 'string' &&
          typeof n.name === 'string' &&
          typeof n.message === 'string' &&
          typeof n.createdAt === 'string'
      );
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

export async function fetchGuestbookNotes(): Promise<GuestbookNote[]> {
  if (isGoogleAppsScriptRuntime()) {
    const res = await runGasFunction<{ notes: GuestbookNote[] }>('gasGetGuestbook');
    return Array.isArray(res?.notes) ? res.notes : [];
  }
  try {
    const res = await fetchJsonOrNull('/api/guestbook', { cache: 'no-store' });
    if (res.isJson && res.ok) {
      return Array.isArray(res.data?.notes) ? res.data.notes : [];
    }
  } catch {
    // Fall back to static browser storage on GitHub Pages
  }
  return loadStaticGuestbookNotes();
}

export async function createGuestbookNote(
  name: string,
  message: string
): Promise<{ note?: GuestbookNote; notes: GuestbookNote[] }> {
  if (isGoogleAppsScriptRuntime()) {
    return runGasFunction<{ note?: GuestbookNote; notes: GuestbookNote[] }>(
      'gasAddGuestbookNote',
      name,
      message
    );
  }
  try {
    const res = await fetchJsonOrNull('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message }),
    });
    if (res.isJson) {
      if (!res.ok) {
        throw new Error(res.data?.error || 'ไม่สามารถส่งโน้ตได้');
      }
      return res.data;
    }
  } catch (err: any) {
    if (err?.message && !String(err.message).includes('Failed to fetch')) {
      throw err;
    }
  }

  const cleanMsg = message.trim().slice(0, 500);
  if (!cleanMsg) {
    throw new Error('กรุณาเขียนข้อความก่อนส่งโน้ต');
  }
  const note: GuestbookNote = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: (name.trim() || 'ผู้เยี่ยมชม').slice(0, 60),
    message: cleanMsg,
    createdAt: new Date().toISOString(),
  };
  const notes = [note, ...loadStaticGuestbookNotes()].slice(0, 200);
  try {
    localStorage.setItem('m66_static_guestbook', JSON.stringify(notes));
  } catch {
    // Ignore storage errors
  }
  return { note, notes };
}

export async function resolveCorsSafeImageSrc(src: string): Promise<string> {
  if (!src || src.startsWith('data:') || src.startsWith('/') || src.startsWith('./')) {
    return src;
  }
  if (isGoogleAppsScriptRuntime()) {
    try {
      return await runGasFunction<string>('gasFetchImageDataUrl', src);
    } catch {
      return src;
    }
  }
  return src;
}
