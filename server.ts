import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_CANVA_URL = 'https://canva.link/forlinktoweb606';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const VISITOR_STATS_FILE = path.resolve(__dirname, 'data', 'visitor-stats.json');

interface VisitorStatsStore {
  totalVisits: number;
  todayDate: string;
  todayVisits: number;
  visitorIds: string[];
}

function getBangkokDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function loadVisitorStats(): VisitorStatsStore {
  const today = getBangkokDateKey();
  try {
    if (fs.existsSync(VISITOR_STATS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VISITOR_STATS_FILE, 'utf8'));
      const sameDay = parsed?.todayDate === today;
      return {
        totalVisits: typeof parsed?.totalVisits === 'number' ? parsed.totalVisits : 0,
        todayDate: today,
        todayVisits: sameDay && typeof parsed?.todayVisits === 'number' ? parsed.todayVisits : 0,
        visitorIds: Array.isArray(parsed?.visitorIds)
          ? parsed.visitorIds.filter((v: unknown) => typeof v === 'string').slice(0, 50000)
          : [],
      };
    }
  } catch {
    // Fall back to fresh store
  }
  return { totalVisits: 0, todayDate: today, todayVisits: 0, visitorIds: [] };
}

function saveVisitorStats(store: VisitorStatsStore): void {
  try {
    fs.mkdirSync(path.dirname(VISITOR_STATS_FILE), { recursive: true });
    fs.writeFileSync(VISITOR_STATS_FILE, JSON.stringify(store), 'utf8');
  } catch {
    // Ignore read-only filesystem errors cleanly while keeping in-memory stats
  }
}

const GUESTBOOK_FILE = path.resolve(__dirname, 'data', 'guestbook.json');

interface GuestbookNote {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

function loadGuestbookNotes(): GuestbookNote[] {
  try {
    if (fs.existsSync(GUESTBOOK_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(GUESTBOOK_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (n): n is GuestbookNote =>
              Boolean(n) &&
              typeof n.id === 'string' &&
              typeof n.name === 'string' &&
              typeof n.message === 'string' &&
              typeof n.createdAt === 'string'
          )
          .slice(0, 500);
      }
    }
  } catch {
    // Fall back to empty board
  }
  return [];
}

function saveGuestbookNotes(notes: GuestbookNote[]): void {
  try {
    fs.mkdirSync(path.dirname(GUESTBOOK_FILE), { recursive: true });
    fs.writeFileSync(GUESTBOOK_FILE, JSON.stringify(notes), 'utf8');
  } catch {
    // Ignore read-only filesystem errors cleanly while keeping in-memory notes
  }
}

interface CanvaImageFile {
  url: string;
  width: number;
  height: number;
  quality: string;
  mimeType: string;
}

interface CanvaMediaEntry {
  id: string;
  type: string;
  title?: string;
  files?: CanvaImageFile[];
}

interface CanvaLayerExtracted {
  kind: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  // Image properties
  url?: string;
  innerX?: number;
  innerY?: number;
  innerWidth?: number;
  innerHeight?: number;
  circular?: boolean;
  // Text properties
  text?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

interface CanvaBackground {
  type: 'solid' | 'gradient';
  color?: string;
  colors?: string[];
  angle?: number;
}

interface CanvaPageExtracted {
  page: number;
  renderedImageUrl: string | null;
  background: CanvaBackground;
  layers: CanvaLayerExtracted[];
  studentName: string;
  university: string;
  faculty: string;
}

function isAllowedMediaProxyUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (
      host === 'media.canva.com' ||
      host === 'media-public.canva.com' ||
      host === 'document-export.canva.com'
    ) {
      return true;
    }
    if (host === 's3.amazonaws.com' && u.pathname.startsWith('/document-export.canva.com/')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function toEmbedUrl(resolvedUrl: string): {
  embedUrl: string;
  designId: string | null;
  token: string | null;
} {
  const u = new URL(resolvedUrl);
  const match = u.pathname.match(/\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?/);
  if (!match) {
    throw new Error('ไม่พบ Design ID ในลิงก์ Canva ที่ระบุ');
  }
  const designId = match[1];
  const token = match[2] || null;
  if (token) {
    return {
      designId,
      token,
      embedUrl: `https://www.canva.com/design/${designId}/${token}/view?embed`,
    };
  }
  return {
    designId,
    token: null,
    embedUrl: `https://www.canva.com/design/${designId}/view?embed`,
  };
}

function decodeBootstrapFromHtml(html: string): any {
  const marker = "window['bootstrap'] = JSON.parse('";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) {
    throw new Error('ไม่สามารถอ่านโครงสร้างข้อมูลจากหน้า Canva ได้ (ลิงก์อาจไม่ได้ตั้งค่าเป็นสาธารณะ)');
  }
  const from = startIdx + marker.length;
  const endIdx = html.indexOf("');", from);
  if (endIdx === -1) {
    throw new Error('ข้อมูล Canva ไม่สมบูรณ์');
  }
  const escaped = html.slice(from, endIdx);
  let jsonStr = '';
  for (let i = 0; i < escaped.length; i++) {
    if (escaped[i] === '\\' && i + 1 < escaped.length) {
      const next = escaped[i + 1];
      if (next === '\\') {
        jsonStr += '\\';
        i++;
      } else if (next === "'") {
        jsonStr += "'";
        i++;
      } else if (next === '"') {
        jsonStr += '"';
        i++;
      } else if (next === 'n') {
        jsonStr += '\n';
        i++;
      } else if (next === 'r') {
        jsonStr += '\r';
        i++;
      } else if (next === 't') {
        jsonStr += '\t';
        i++;
      } else if (next === 'u' && i + 5 < escaped.length) {
        jsonStr += String.fromCharCode(parseInt(escaped.slice(i + 2, i + 6), 16));
        i += 5;
      } else if (next === 'x' && i + 3 < escaped.length) {
        jsonStr += String.fromCharCode(parseInt(escaped.slice(i + 2, i + 4), 16));
        i += 3;
      } else {
        jsonStr += next;
        i++;
      }
    } else {
      jsonStr += escaped[i];
    }
  }
  return JSON.parse(jsonStr);
}

function pickBestImageUrl(media: CanvaMediaEntry | undefined, preferSvg = false): string | null {
  if (!media?.files || media.files.length === 0) return null;
  if (preferSvg) {
    const svgFile = media.files.find((f) => f.mimeType === 'image/svg+xml' && f.url);
    if (svgFile) return svgFile.url;
  }
  const preferredOrder = ['SCREEN_2X', 'SCREEN', 'SCREEN_3X', 'THUMBNAIL'];
  for (const q of preferredOrder) {
    const found = media.files.find((f) => f.quality === q && f.url);
    if (found) return found.url;
  }
  return media.files[media.files.length - 1]?.url || null;
}

function sanitizeColorMap(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const hexRegex = /^#[0-9a-fA-F]{3,8}$/;
  const clean: Record<string, string> = {};
  let count = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && hexRegex.test(k) && hexRegex.test(v)) {
      clean[k] = v;
      count++;
    }
  }
  return count > 0 ? clean : null;
}

function proxyImg(
  url: string | null,
  colorMap?: Record<string, string> | null,
  cacheBustToken?: string
): string | null {
  if (!url) return null;
  let result = `/api/canva/image?url=${encodeURIComponent(url)}`;
  if (colorMap && Object.keys(colorMap).length > 0) {
    result += `&colorMap=${encodeURIComponent(JSON.stringify(colorMap))}`;
  }
  if (cacheBustToken) {
    result += `&v=${encodeURIComponent(cacheBustToken)}`;
  }
  return result;
}

function extractBackground(pageObj: any): CanvaBackground {
  const fillObj = pageObj?.D || pageObj?.w?.A?.[0];
  if (fillObj?.C && typeof fillObj.C === 'string') {
    return { type: 'solid', color: fillObj.C };
  }
  const gradStops = fillObj?.K?.A;
  if (Array.isArray(gradStops) && gradStops.length >= 2) {
    const colors = gradStops
      .map((s: any) => s?.A)
      .filter((c: any) => typeof c === 'string');
    if (colors.length >= 2) {
      return {
        type: 'gradient',
        colors,
        angle: typeof fillObj?.K?.B === 'number' ? fillObj.K.B : 90,
      };
    }
  }
  return { type: 'solid', color: '#ffffff' };
}

function parseAdmissionMetadata(texts: string[]): {
  studentName: string;
  university: string;
  faculty: string;
} {
  let studentName = '';
  const universities: string[] = [];
  const faculties: string[] = [];

  for (const raw of texts) {
    const text = raw.trim();
    if (!text) continue;
    if (/^ขอแสดงความยินดี/.test(text)) continue;

    // Student name line (นาย... / นางสาว...)
    if (/^(นาย|นางสาว|นาง)\s*[ก-๙]+/.test(text) && text.length < 60 && !text.includes('มหาวิทยาลัย')) {
      studentName = text.replace(/\s+/g, ' ').trim();
      continue;
    }

    // Admission banner line containing university name
    if (text.includes('ได้ผ่านการคัดเลือก') || text.includes('ระดับปริญญาตรี')) {
      const cleaned = text
        .replace(/ได้ผ่านการคัดเลือกมีสิทธิ์เข้าศึกษาต่อ\s*/g, '')
        .replace(/ระดับปริญญาตรี\s*/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      if (cleaned) {
        // Normalize minor Canva typos for cleaner grouping while preserving readable name
        const normalized = cleaned
          .replace('มหาวิทยาลัยราชภัฎสวนสุนันทา', 'มหาวิทยาลัยราชภัฏสวนสุนันทา')
          .replace('ศูนย์ฝึกพาณิย์นาวี', 'ศูนย์ฝึกพาณิชย์นาวี')
          .replace(/มหาวิทยาลัยกาฬสิน$/, 'มหาวิทยาลัยกาฬสินธุ์');
        universities.push(normalized);
      }
      continue;
    }

    // Faculty / major lines
    const facultyClean = text.replace(/\n+/g, ' · ').replace(/\s+/g, ' ').trim();
    if (facultyClean) {
      faculties.push(facultyClean);
    }
  }

  return {
    studentName: studentName || 'นักเรียน ม.6/6 APE',
    university: universities.join(' & ') || 'มหาวิทยาลัยชั้นนำ',
    faculty: faculties.join(' / ') || 'ระดับปริญญาตรี',
  };
}

async function resolveAndFetchCanvaEmbed(inputUrl: string): Promise<{
  finalEmbedUrl: string;
  html: string;
  designId: string | null;
  token: string | null;
  cookies: string;
}> {
  let currentUrl = inputUrl;
  if (new URL(currentUrl).hostname.toLowerCase() === 'canva.link') {
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
      },
    });
    const loc = res.headers.get('location');
    if (loc) {
      currentUrl = new URL(loc, currentUrl).toString();
    }
  }

  const { embedUrl, designId, token } = toEmbedUrl(currentUrl);
  const embedRes = await fetch(embedUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });

  if (!embedRes.ok) {
    throw new Error(`Canva ตอบกลับด้วยสถานะ ${embedRes.status}`);
  }

  const setCookies =
    typeof (embedRes.headers as any).getSetCookie === 'function'
      ? ((embedRes.headers as any).getSetCookie() as string[])
      : [];
  const cookies = setCookies.map((c) => c.split(';')[0]).join('; ');

  const html = await embedRes.text();
  return { finalEmbedUrl: embedUrl, html, designId, token, cookies };
}

async function fetchMissingDocumentMedia(params: {
  designId: string;
  extensionToken: string | null;
  pages: number[];
  cookies: string;
  referer: string;
  mediaMap: Map<string, CanvaMediaEntry>;
}): Promise<void> {
  const { designId, extensionToken, pages, cookies, referer, mediaMap } = params;
  if (!designId || pages.length === 0) return;

  const chunkSize = 10;
  for (let i = 0; i < pages.length; i += chunkSize) {
    const batch = pages.slice(i, i + chunkSize);
    let continuation: string | undefined;
    let safetyCounter = 0;

    do {
      safetyCounter++;
      const url = new URL(`https://www.canva.com/_ajax/documents/${encodeURIComponent(designId)}/resources`);
      if (extensionToken) {
        url.searchParams.set('extension', extensionToken);
      }
      url.searchParams.set('includeMedia', 'true');
      for (const p of batch) {
        url.searchParams.append('pages', String(p));
      }
      if (continuation) {
        url.searchParams.set('continuation', continuation);
      }

      try {
        const res = await fetch(url.toString(), {
          cache: 'no-store',
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'application/json, text/plain, */*',
            Referer: referer,
            'Cache-Control': 'no-cache, no-store, max-age=0',
            Pragma: 'no-cache',
            ...(cookies ? { Cookie: cookies } : {}),
          },
        });
        if (!res.ok) break;

        const rawText = await res.text();
        const jsonStart = rawText.indexOf('{');
        if (jsonStart === -1) break;
        const parsed = JSON.parse(rawText.slice(jsonStart));

        if (Array.isArray(parsed?.media)) {
          for (const item of parsed.media) {
            if (item?.id) {
              mediaMap.set(item.id, item);
            }
          }
        }
        continuation = typeof parsed?.continuation === 'string' && parsed.continuation ? parsed.continuation : undefined;
      } catch {
        break;
      }
    } while (continuation && safetyCounter < 10);
  }
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  const visitorStore = loadVisitorStats();
  const visitorIdSet = new Set<string>(visitorStore.visitorIds);

  const rollTodayIfNeeded = () => {
    const today = getBangkokDateKey();
    if (visitorStore.todayDate !== today) {
      visitorStore.todayDate = today;
      visitorStore.todayVisits = 0;
    }
  };

  const getPublicVisitorStats = () => {
    rollTodayIfNeeded();
    return {
      totalVisits: visitorStore.totalVisits,
      todayVisits: visitorStore.todayVisits,
      uniqueVisitors: visitorIdSet.size,
    };
  };

  app.get('/api/visits', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(getPublicVisitorStats());
  });

  app.post('/api/visits/hit', (req: Request, res: Response) => {
    rollTodayIfNeeded();
    const rawVisitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.trim() : '';
    const countView = req.body?.countView !== false;
    let changed = false;

    if (countView) {
      visitorStore.totalVisits += 1;
      visitorStore.todayVisits += 1;
      changed = true;
    }

    if (rawVisitorId && /^[A-Za-z0-9_-]{8,64}$/.test(rawVisitorId) && !visitorIdSet.has(rawVisitorId)) {
      if (visitorIdSet.size < 50000) {
        visitorIdSet.add(rawVisitorId);
        visitorStore.visitorIds.push(rawVisitorId);
        changed = true;
      }
    }

    if (changed) {
      saveVisitorStats(visitorStore);
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(getPublicVisitorStats());
  });

  const guestbookNotes = loadGuestbookNotes();

  app.get('/api/guestbook', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ notes: guestbookNotes });
  });

  app.post('/api/guestbook', (req: Request, res: Response) => {
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const rawMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!rawMessage) {
      res.status(400).json({ error: 'กรุณาเขียนข้อความก่อนส่งโน้ต' });
      return;
    }

    const cleanName = (rawName || 'ผู้เยี่ยมชม').slice(0, 60);
    const cleanMessage = rawMessage.slice(0, 500);
    const note: GuestbookNote = {
      id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name: cleanName,
      message: cleanMessage,
      createdAt: new Date().toISOString(),
    };

    guestbookNotes.unshift(note);
    if (guestbookNotes.length > 500) {
      guestbookNotes.length = 500;
    }
    saveGuestbookNotes(guestbookNotes);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(201).json({ note, notes: guestbookNotes });
  });

  app.get('/api/canva/sync', async (req: Request, res: Response) => {
    try {
      if (typeof req.query.url === 'string' && req.query.url.trim() && req.query.url.trim() !== DEFAULT_CANVA_URL) {
        res.status(403).json({
          error: 'ไม่อนุญาตให้เปลี่ยนลิงก์ Canva (ล็อกเฉพาะอัลบั้มทางการของห้อง ม.6/6 APE)',
        });
        return;
      }

      const requestedUrl = DEFAULT_CANVA_URL;
      const { finalEmbedUrl, html, designId: urlDesignId, token: urlToken, cookies } =
        await resolveAndFetchCanvaEmbed(requestedUrl);
      const bootstrap = decodeBootstrapFromHtml(html);
      const doc = bootstrap?.page?.C;
      if (!doc || !Array.isArray(doc?.D?.A?.A)) {
        throw new Error('ไม่พบข้อมูลหน้างานในไฟล์ Canva นี้');
      }

      const designId: string = doc.A || '';
      const docVersion: number | null = typeof doc.B === 'number' ? doc.B : null;
      const isManualRefresh = req.query.refresh === '1' || req.query.force === '1';
      const cacheBustToken = isManualRefresh ? String(Date.now()) : String(docVersion ?? Date.now());
      const designTitle: string = doc.D?.A?.D || 'Canva Design';
      const canvasWidth: number = doc.D?.A?.C?.A || 1080;
      const canvasHeight: number = doc.D?.A?.C?.B || 1080;

      const mediaMap = new Map<string, CanvaMediaEntry>();
      if (Array.isArray(doc.I)) {
        for (const item of doc.I) {
          if (item?.id) mediaMap.set(item.id, item);
        }
      }

      const thumbnailMap = new Map<number, string>();
      if (Array.isArray(doc.G?.images)) {
        for (const img of doc.G.images) {
          if (typeof img?.page === 'number' && typeof img?.url === 'string') {
            thumbnailMap.set(img.page, img.url);
          }
        }
      }

      const rawPages: any[] = doc.D.A.A;
      const pagesWithMissingMedia: number[] = [];
      for (let i = 0; i < rawPages.length; i++) {
        const elems: any[] = Array.isArray(rawPages[i]?.E) ? rawPages[i].E : [];
        const hasMissing = elems.some((el) => {
          const type = el?.['A?'];
          if (type === 'I') {
            const primaryId: string | undefined = el?.a?.B?.I?.A;
            const fallbackId: string | undefined = el?.a?.B?.A?.A;
            return Boolean((primaryId && !mediaMap.has(primaryId)) || (!primaryId && fallbackId && !mediaMap.has(fallbackId)));
          }
          if (type === 'J') {
            const frameItem = Array.isArray(el?.b) ? el.b[0] : null;
            const primaryId: string | undefined = frameItem?.B?.B?.I?.A;
            const fallbackId: string | undefined = frameItem?.B?.B?.A?.A;
            return Boolean((primaryId && !mediaMap.has(primaryId)) || (!primaryId && fallbackId && !mediaMap.has(fallbackId)));
          }
          return false;
        });
        if (hasMissing) {
          pagesWithMissingMedia.push(i + 1);
        }
      }

      if (pagesWithMissingMedia.length > 0) {
        const resolvedDesignId = designId || urlDesignId || '';
        const extensionToken: string | null = doc?.Q?.A || doc?.Q?.B || urlToken || null;
        await fetchMissingDocumentMedia({
          designId: resolvedDesignId,
          extensionToken,
          pages: pagesWithMissingMedia,
          cookies,
          referer: finalEmbedUrl,
          mediaMap,
        });
      }

      const pages: CanvaPageExtracted[] = rawPages.map((rawPage, idx) => {
        const pageNumber = idx + 1;
        let rawThumb = thumbnailMap.get(pageNumber) || null;
        if (rawThumb && docVersion !== null) {
          try {
            const thumbVerStr = new URL(rawThumb).searchParams.get('version');
            const thumbVer = thumbVerStr !== null ? Number(thumbVerStr) : NaN;
            if (!Number.isNaN(thumbVer) && thumbVer < docVersion) {
              // Canva hasn't finished re-rendering this thumbnail yet; render fresh live layers instead
              rawThumb = null;
            }
          } catch {
            // Keep rawThumb if URL parsing fails
          }
        }
        const background = extractBackground(rawPage);
        const layers: CanvaLayerExtracted[] = [];
        const textValues: string[] = [];

        const elements: any[] = Array.isArray(rawPage?.E) ? rawPage.E : [];
        for (const el of elements) {
          const type = el?.['A?'];
          const y = Number(el?.A || 0);
          const x = Number(el?.B || 0);
          const width = Number(el?.D || 0);
          const height = Number(el?.C || 0);
          const rotation = typeof el?.E === 'number' ? el.E : undefined;

          if (type === 'I') {
            const primaryId: string | undefined = el?.a?.B?.I?.A;
            const fallbackId: string | undefined = el?.a?.B?.A?.A;
            const mediaEntry =
              (primaryId ? mediaMap.get(primaryId) : undefined) ||
              (fallbackId ? mediaMap.get(fallbackId) : undefined);
            const colorMap = sanitizeColorMap(el?.a?.B?.C);
            const mediaUrl = pickBestImageUrl(mediaEntry, Boolean(colorMap));
            if (mediaUrl) {
              const cropBox = el?.a?.B?.B;
              layers.push({
                kind: 'image',
                x,
                y,
                width,
                height,
                rotation,
                url: proxyImg(mediaUrl, colorMap, cacheBustToken) || mediaUrl,
                innerX: typeof cropBox?.B === 'number' ? cropBox.B : 0,
                innerY: typeof cropBox?.A === 'number' ? cropBox.A : 0,
                innerWidth: typeof cropBox?.D === 'number' ? cropBox.D : width,
                innerHeight: typeof cropBox?.C === 'number' ? cropBox.C : height,
              });
            }
          } else if (type === 'J') {
            const frameItem = Array.isArray(el?.b) ? el.b[0] : null;
            const primaryId: string | undefined = frameItem?.B?.B?.I?.A;
            const fallbackId: string | undefined = frameItem?.B?.B?.A?.A;
            const mediaEntry =
              (primaryId ? mediaMap.get(primaryId) : undefined) ||
              (fallbackId ? mediaMap.get(fallbackId) : undefined);
            const colorMap = sanitizeColorMap(frameItem?.B?.B?.C);
            const mediaUrl = pickBestImageUrl(mediaEntry, Boolean(colorMap));
            if (mediaUrl) {
              layers.push({
                kind: 'image',
                x,
                y,
                width,
                height,
                rotation,
                url: proxyImg(mediaUrl, colorMap, cacheBustToken) || mediaUrl,
                circular: true,
              });
            }
          } else if (type === 'K') {
            const textStr = Array.isArray(el?.a?.C?.A) ? el.a.C.A.join('') : '';
            const trimmed = textStr.trim();
            if (trimmed) {
              textValues.push(trimmed);
              const styleList: any[] = Array.isArray(el?.a?.C?.C) ? el.a.C.C : [];
              const pickStr = (key: string): string | undefined => {
                for (const s of styleList) {
                  if (s && typeof s[key] === 'string' && s[key].trim() !== '') {
                    return s[key];
                  }
                }
                return undefined;
              };
              const fontSizeNum = parseFloat(pickStr('G') || '36px') || 36;
              const lineHeightNum = parseFloat(pickStr('Y') || '1.3em') || 1.3;
              const weightRaw = pickStr('I');
              const alignRaw = pickStr('c');
              const colorRaw = pickStr('M');
              layers.push({
                kind: 'text',
                x,
                y,
                width,
                height,
                rotation,
                text: trimmed,
                color: colorRaw || '#000000',
                fontSize: fontSizeNum,
                fontWeight: weightRaw === 'bold' ? '700' : weightRaw === 'light' ? '300' : '500',
                align: alignRaw === 'left' || alignRaw === 'right' ? alignRaw : 'center',
                lineHeight: lineHeightNum,
              });
            }
          }
        }

        const meta = parseAdmissionMetadata(textValues);
        return {
          page: pageNumber,
          renderedImageUrl: proxyImg(rawThumb, null, cacheBustToken),
          background,
          layers,
          studentName: meta.studentName,
          university: meta.university,
          faculty: meta.faculty,
        };
      });

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        designId,
        docVersion,
        title: designTitle,
        sourceUrl: requestedUrl,
        embedUrl: finalEmbedUrl,
        canvasWidth,
        canvasHeight,
        totalPages: pages.length,
        renderedThumbnailsCount: thumbnailMap.size,
        syncedAt: new Date().toISOString(),
        pages,
      });
    } catch (err: any) {
      console.error('Canva sync error:', err?.message || err);
      res.status(500).json({
        error: err?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Canva',
      });
    }
  });

  app.get('/api/canva/image', async (req: Request, res: Response) => {
    try {
      const targetUrl = typeof req.query.url === 'string' ? req.query.url : '';
      if (!targetUrl || !isAllowedMediaProxyUrl(targetUrl)) {
        res.status(400).send('Invalid image URL');
        return;
      }

      const imgRes = await fetch(targetUrl, {
        cache: 'no-store',
        headers: {
          'User-Agent': BROWSER_UA,
          'Cache-Control': 'no-cache',
        },
      });

      if (!imgRes.ok) {
        res.status(imgRes.status).send('Failed to fetch image from Canva');
        return;
      }

      const contentType = imgRes.headers.get('content-type') || 'image/png';
      const arrayBuf = await imgRes.arrayBuffer();
      const rawColorMapParam = typeof req.query.colorMap === 'string' ? req.query.colorMap : '';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (rawColorMapParam && contentType.toLowerCase().includes('svg')) {
        try {
          const parsedMap = sanitizeColorMap(JSON.parse(rawColorMapParam));
          if (parsedMap) {
            let svgText = Buffer.from(arrayBuf).toString('utf8');
            for (const [fromHex, toHex] of Object.entries(parsedMap)) {
              const escaped = fromHex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              svgText = svgText.replace(new RegExp(escaped, 'gi'), toHex);
            }
            res.send(svgText);
            return;
          }
        } catch {
          // Ignore malformed colorMap and fall back to original SVG buffer
        }
      }

      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      res.status(500).send('Image proxy error');
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`M.6/6 APE Khukhan server running at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
