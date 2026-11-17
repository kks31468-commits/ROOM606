import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_CANVA_URL = 'https://canva.link/forlinktoweb606';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const OUTPUT_DATA_DIR = path.resolve(rootDir, 'public', 'data');
const OUTPUT_MEDIA_DIR = path.resolve(OUTPUT_DATA_DIR, 'canva-media');
const OUTPUT_JSON_PATH = path.resolve(OUTPUT_DATA_DIR, 'canva-sync.json');

function toEmbedUrl(resolvedUrl) {
  const u = new URL(resolvedUrl);
  const match = u.pathname.match(/\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?/);
  if (!match) {
    throw new Error('ไม่พบ Design ID ในลิงก์ Canva ที่ระบุ');
  }
  const designId = match[1];
  const token = match[2] || null;
  return {
    designId,
    token,
    embedUrl: token
      ? `https://www.canva.com/design/${designId}/${token}/view?embed`
      : `https://www.canva.com/design/${designId}/view?embed`,
  };
}

function decodeBootstrapFromHtml(html) {
  const marker = "window['bootstrap'] = JSON.parse('";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) {
    throw new Error('ไม่สามารถอ่านโครงสร้างข้อมูลจากหน้า Canva ได้');
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

function pickBestImageUrl(media, preferSvg = false) {
  if (!media?.files || media.files.length === 0) return null;
  if (preferSvg) {
    const svgFile = media.files.find((f) => f.mimeType === 'image/svg+xml' && f.url);
    if (svgFile) return svgFile.url;
  }
  const preferredOrder = ['SCREEN', 'SCREEN_2X', 'SCREEN_3X', 'THUMBNAIL'];
  for (const q of preferredOrder) {
    const found = media.files.find((f) => f.quality === q && f.url);
    if (found) return found.url;
  }
  return media.files[media.files.length - 1]?.url || null;
}

function sanitizeColorMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const hexRegex = /^#[0-9a-fA-F]{3,8}$/;
  const clean = {};
  let count = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && hexRegex.test(k) && hexRegex.test(v)) {
      clean[k] = v;
      count++;
    }
  }
  return count > 0 ? clean : null;
}

function extractBackground(pageObj) {
  const fillObj = pageObj?.D || pageObj?.w?.A?.[0];
  if (fillObj?.C && typeof fillObj.C === 'string') {
    return { type: 'solid', color: fillObj.C };
  }
  const gradStops = fillObj?.K?.A;
  if (Array.isArray(gradStops) && gradStops.length >= 2) {
    const colors = gradStops.map((s) => s?.A).filter((c) => typeof c === 'string');
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

function parseAdmissionMetadata(texts) {
  let studentName = '';
  const universities = [];
  const faculties = [];

  for (const raw of texts) {
    const text = raw.trim();
    if (!text) continue;
    if (/^ขอแสดงความยินดี/.test(text)) continue;

    if (/^(นาย|นางสาว|นาง)\s*[ก-๙]+/.test(text) && text.length < 60 && !text.includes('มหาวิทยาลัย')) {
      studentName = text.replace(/\s+/g, ' ').trim();
      continue;
    }

    if (text.includes('ได้ผ่านการคัดเลือก') || text.includes('ระดับปริญญาตรี')) {
      const cleaned = text
        .replace(/ได้ผ่านการคัดเลือกมีสิทธิ์เข้าศึกษาต่อ\s*/g, '')
        .replace(/ระดับปริญญาตรี\s*/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      if (cleaned) {
        const normalized = cleaned
          .replace('มหาวิทยาลัยราชภัฎสวนสุนันทา', 'มหาวิทยาลัยราชภัฏสวนสุนันทา')
          .replace('ศูนย์ฝึกพาณิย์นาวี', 'ศูนย์ฝึกพาณิชย์นาวี')
          .replace(/มหาวิทยาลัยกาฬสิน$/, 'มหาวิทยาลัยกาฬสินธุ์');
        universities.push(normalized);
      }
      continue;
    }

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

async function resolveAndFetchCanvaEmbed(inputUrl) {
  let currentUrl = inputUrl;
  if (new URL(currentUrl).hostname.toLowerCase() === 'canva.link') {
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
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
    },
  });

  if (!embedRes.ok) {
    throw new Error(`Canva ตอบกลับด้วยสถานะ ${embedRes.status}`);
  }

  const setCookies =
    typeof embedRes.headers.getSetCookie === 'function'
      ? embedRes.headers.getSetCookie()
      : [];
  const cookies = setCookies.map((c) => c.split(';')[0]).join('; ');
  const html = await embedRes.text();
  return { finalEmbedUrl: embedUrl, html, designId, token, cookies };
}

async function fetchMissingDocumentMedia({
  designId,
  extensionToken,
  pages,
  cookies,
  referer,
  mediaMap,
}) {
  if (!designId || pages.length === 0) return;
  const chunkSize = 10;
  for (let i = 0; i < pages.length; i += chunkSize) {
    const batch = pages.slice(i, i + chunkSize);
    let continuation;
    let safety = 0;

    do {
      safety++;
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

      const headers = {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json, text/plain, */*',
        Referer: referer,
      };
      if (cookies) {
        headers.Cookie = cookies;
      }

      const res = await fetch(url.toString(), { cache: 'no-store', headers });
      if (!res.ok) break;

      const rawText = await res.text();
      const jsonStart = rawText.indexOf('{');
      if (jsonStart === -1) break;
      const json = JSON.parse(rawText.slice(jsonStart));
      const mediaList = Array.isArray(json?.media) ? json.media : [];
      for (const entry of mediaList) {
        if (entry?.id && !mediaMap.has(entry.id)) {
          mediaMap.set(entry.id, entry);
        }
      }
      continuation = typeof json?.continuation === 'string' ? json.continuation : undefined;
    } while (continuation && safety < 20);
  }
}

function guessExtension(contentType, url) {
  const lower = (contentType || '').toLowerCase();
  if (lower.includes('svg')) return 'svg';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('png')) return 'png';
  const m = url.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i);
  return m ? m[1].toLowerCase() : 'png';
}

async function cacheAssetLocally(url, colorMap, assetMemo, targetMediaDir) {
  const key = `${url}|${colorMap ? JSON.stringify(colorMap) : ''}`;
  if (assetMemo.has(key)) return assetMemo.get(key);

  const hash = crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
  const promise = (async () => {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': BROWSER_UA },
      });
      if (!res.ok) return url;
      const contentType = res.headers.get('content-type') || 'image/png';
      const ext = guessExtension(contentType, url);
      const fileName = `${hash}.${ext}`;
      const filePath = path.join(targetMediaDir, fileName);

      if (colorMap && contentType.toLowerCase().includes('svg')) {
        let svgText = await res.text();
        for (const [fromHex, toHex] of Object.entries(colorMap)) {
          const escaped = fromHex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          svgText = svgText.replace(new RegExp(escaped, 'gi'), toHex);
        }
        fs.writeFileSync(filePath, svgText, 'utf8');
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(filePath, buf);
      }

      return `./data/canva-media/${fileName}`;
    } catch {
      return url;
    }
  })();

  assetMemo.set(key, promise);
  return promise;
}

async function run() {
  console.log('Syncing Canva album for GitHub Pages static bundle...');
  const { finalEmbedUrl, html, designId: urlDesignId, token: urlToken, cookies } =
    await resolveAndFetchCanvaEmbed(DEFAULT_CANVA_URL);

  const bootstrap = decodeBootstrapFromHtml(html);
  const doc = bootstrap?.page?.C;
  if (!doc || !Array.isArray(doc?.D?.A?.A)) {
    throw new Error('ไม่พบข้อมูลหน้างานในไฟล์ Canva นี้');
  }

  const designId = doc.A || urlDesignId || '';
  const docVersion = typeof doc.B === 'number' ? doc.B : null;
  const designTitle = doc.D?.A?.D || 'Canva Design';
  const canvasWidth = doc.D?.A?.C?.A || 1080;
  const canvasHeight = doc.D?.A?.C?.B || 1080;

  const mediaMap = new Map();
  if (Array.isArray(doc.I)) {
    for (const item of doc.I) {
      if (item?.id) mediaMap.set(item.id, item);
    }
  }

  const thumbnailMap = new Map();
  if (Array.isArray(doc.G?.images)) {
    for (const img of doc.G.images) {
      if (typeof img?.page === 'number' && typeof img?.url === 'string') {
        thumbnailMap.set(img.page, img.url);
      }
    }
  }

  const rawPages = doc.D.A.A;
  const pagesWithMissingMedia = [];
  for (let i = 0; i < rawPages.length; i++) {
    const elems = Array.isArray(rawPages[i]?.E) ? rawPages[i].E : [];
    const hasMissing = elems.some((el) => {
      const type = el?.['A?'];
      if (type === 'I') {
        const pid = el?.a?.B?.I?.A;
        const fid = el?.a?.B?.A?.A;
        return Boolean((pid && !mediaMap.has(pid)) || (!pid && fid && !mediaMap.has(fid)));
      }
      if (type === 'J') {
        const frameItem = Array.isArray(el?.b) ? el.b[0] : null;
        const pid = frameItem?.B?.B?.I?.A;
        const fid = frameItem?.B?.B?.A?.A;
        return Boolean((pid && !mediaMap.has(pid)) || (!pid && fid && !mediaMap.has(fid)));
      }
      return false;
    });
    if (hasMissing) pagesWithMissingMedia.push(i + 1);
  }

  if (pagesWithMissingMedia.length > 0) {
    const extensionToken = doc?.Q?.A || doc?.Q?.B || urlToken || null;
    await fetchMissingDocumentMedia({
      designId,
      extensionToken,
      pages: pagesWithMissingMedia,
      cookies,
      referer: finalEmbedUrl,
      mediaMap,
    });
  }

  const tempMediaDir = path.resolve(OUTPUT_DATA_DIR, 'canva-media-tmp');
  fs.rmSync(tempMediaDir, { recursive: true, force: true });
  fs.mkdirSync(tempMediaDir, { recursive: true });

  const assetMemo = new Map();
  const pages = await Promise.all(
    rawPages.map(async (rawPage, idx) => {
      const pageNumber = idx + 1;
      let rawThumb = thumbnailMap.get(pageNumber) || null;
      if (rawThumb && docVersion !== null) {
        try {
          const thumbVerStr = new URL(rawThumb).searchParams.get('version');
          const thumbVer = thumbVerStr !== null ? Number(thumbVerStr) : NaN;
          if (!Number.isNaN(thumbVer) && thumbVer < docVersion) {
            rawThumb = null;
          }
        } catch {
          // keep
        }
      }

      const cachedThumbUrl = rawThumb
        ? await cacheAssetLocally(rawThumb, null, assetMemo, tempMediaDir)
        : null;
      const hasLocalThumb = Boolean(cachedThumbUrl && cachedThumbUrl.startsWith('./'));
      const renderedImageUrl = hasLocalThumb ? cachedThumbUrl : null;

      const background = extractBackground(rawPage);
      const layers = [];
      const textValues = [];
      const elements = Array.isArray(rawPage?.E) ? rawPage.E : [];

      for (const el of elements) {
        const type = el?.['A?'];
        const y = Number(el?.A || 0);
        const x = Number(el?.B || 0);
        const width = Number(el?.D || 0);
        const height = Number(el?.C || 0);
        const rotation = typeof el?.E === 'number' ? el.E : undefined;

        if (type === 'I') {
          if (hasLocalThumb) continue;
          const primaryId = el?.a?.B?.I?.A;
          const fallbackId = el?.a?.B?.A?.A;
          const mediaEntry =
            (primaryId ? mediaMap.get(primaryId) : undefined) ||
            (fallbackId ? mediaMap.get(fallbackId) : undefined);
          const colorMap = sanitizeColorMap(el?.a?.B?.C);
          const mediaUrl = pickBestImageUrl(mediaEntry, Boolean(colorMap));
          if (mediaUrl) {
            const localUrl = await cacheAssetLocally(mediaUrl, colorMap, assetMemo, tempMediaDir);
            const cropBox = el?.a?.B?.B;
            layers.push({
              kind: 'image',
              x,
              y,
              width,
              height,
              rotation,
              url: localUrl,
              innerX: typeof cropBox?.B === 'number' ? cropBox.B : 0,
              innerY: typeof cropBox?.A === 'number' ? cropBox.A : 0,
              innerWidth: typeof cropBox?.D === 'number' ? cropBox.D : width,
              innerHeight: typeof cropBox?.C === 'number' ? cropBox.C : height,
            });
          }
        } else if (type === 'J') {
          if (hasLocalThumb) continue;
          const frameItem = Array.isArray(el?.b) ? el.b[0] : null;
          const primaryId = frameItem?.B?.B?.I?.A;
          const fallbackId = frameItem?.B?.B?.A?.A;
          const mediaEntry =
            (primaryId ? mediaMap.get(primaryId) : undefined) ||
            (fallbackId ? mediaMap.get(fallbackId) : undefined);
          const colorMap = sanitizeColorMap(frameItem?.B?.B?.C);
          const mediaUrl = pickBestImageUrl(mediaEntry, Boolean(colorMap));
          if (mediaUrl) {
            const localUrl = await cacheAssetLocally(mediaUrl, colorMap, assetMemo, tempMediaDir);
            layers.push({
              kind: 'image',
              x,
              y,
              width,
              height,
              rotation,
              url: localUrl,
              circular: true,
            });
          }
        } else if (type === 'K') {
          const textStr = Array.isArray(el?.a?.C?.A) ? el.a.C.A.join('') : '';
          const trimmed = textStr.trim();
          if (trimmed) {
            textValues.push(trimmed);
            if (!hasLocalThumb) {
              const styleList = Array.isArray(el?.a?.C?.C) ? el.a.C.C : [];
              const pickStr = (key) => {
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
      }

      const meta = parseAdmissionMetadata(textValues);
      return {
        page: pageNumber,
        renderedImageUrl,
        background,
        layers,
        studentName: meta.studentName,
        university: meta.university,
        faculty: meta.faculty,
      };
    })
  );

  const payload = {
    designId,
    docVersion,
    title: designTitle,
    sourceUrl: DEFAULT_CANVA_URL,
    embedUrl: finalEmbedUrl,
    canvasWidth,
    canvasHeight,
    totalPages: pages.length,
    renderedThumbnailsCount: thumbnailMap.size,
    syncedAt: new Date().toISOString(),
    pages,
  };

  fs.mkdirSync(OUTPUT_DATA_DIR, { recursive: true });
  fs.rmSync(OUTPUT_MEDIA_DIR, { recursive: true, force: true });
  fs.renameSync(tempMediaDir, OUTPUT_MEDIA_DIR);
  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(payload), 'utf8');
  console.log(`Synced ${pages.length} pages and ${assetMemo.size} static media files to public/data/`);
}

run().catch((err) => {
  console.error('Canva static sync failed:', err?.message || err);
  process.exit(1);
});
