/**
 * M.6/6 APE Khukhan School — Google Apps Script Backend (V8)
 * Official Canva Album Locked: https://canva.link/forlinktoweb606
 */

var OFFICIAL_CANVA_URL = 'https://canva.link/forlinktoweb606';
var BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('M.6/6 วิทย์-คณิต (APE) | โรงเรียนขุขันธ์')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* -------------------------------------------------------------------------- */
/*  PropertiesService Chunked Storage Helpers (9 KB per property limit safe)  */
/* -------------------------------------------------------------------------- */

function getChunkedProperty_(prefix) {
  var props = PropertiesService.getScriptProperties();
  var countStr = props.getProperty(prefix + '_COUNT');
  var count = countStr ? parseInt(countStr, 10) : 0;
  if (!count || count < 1) {
    return props.getProperty(prefix) || '';
  }
  var parts = [];
  for (var i = 0; i < count; i++) {
    parts.push(props.getProperty(prefix + '_' + i) || '');
  }
  return parts.join('');
}

function setChunkedProperty_(prefix, value) {
  var props = PropertiesService.getScriptProperties();
  var chunkSize = 7500;
  var prevCountStr = props.getProperty(prefix + '_COUNT');
  var prevCount = prevCountStr ? parseInt(prevCountStr, 10) : 0;
  var newCount = Math.max(1, Math.ceil(value.length / chunkSize));
  var updates = {};
  updates[prefix + '_COUNT'] = String(newCount);
  for (var i = 0; i < newCount; i++) {
    updates[prefix + '_' + i] = value.slice(i * chunkSize, (i + 1) * chunkSize);
  }
  props.setProperties(updates, false);
  for (var j = newCount; j < prevCount; j++) {
    props.deleteProperty(prefix + '_' + j);
  }
}

/* -------------------------------------------------------------------------- */
/*  Visitor Counter (Asia/Bangkok daily rollover + unique visitor tracking)   */
/* -------------------------------------------------------------------------- */

function getBangkokDateKey_() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
}

function hashVisitorId_(visitorId) {
  var hash = 2166136261;
  for (var i = 0; i < visitorId.length; i++) {
    hash ^= visitorId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function gasGetVisits() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('M66_VISITOR_META');
  var today = getBangkokDateKey_();
  var meta = { totalVisits: 0, todayDate: today, todayVisits: 0, uniqueVisitors: 0 };
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      meta.totalVisits = typeof parsed.totalVisits === 'number' ? parsed.totalVisits : 0;
      meta.todayVisits =
        parsed.todayDate === today && typeof parsed.todayVisits === 'number'
          ? parsed.todayVisits
          : 0;
      meta.uniqueVisitors = typeof parsed.uniqueVisitors === 'number' ? parsed.uniqueVisitors : 0;
    } catch (e) {}
  }
  return {
    totalVisits: meta.totalVisits,
    todayVisits: meta.todayVisits,
    uniqueVisitors: meta.uniqueVisitors,
  };
}

function gasHitVisit(rawVisitorId, countView) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var today = getBangkokDateKey_();
    var rawMeta = props.getProperty('M66_VISITOR_META');
    var meta = { totalVisits: 0, todayDate: today, todayVisits: 0, uniqueVisitors: 0 };
    if (rawMeta) {
      try {
        var parsed = JSON.parse(rawMeta);
        meta.totalVisits = typeof parsed.totalVisits === 'number' ? parsed.totalVisits : 0;
        meta.todayVisits =
          parsed.todayDate === today && typeof parsed.todayVisits === 'number'
            ? parsed.todayVisits
            : 0;
        meta.uniqueVisitors = typeof parsed.uniqueVisitors === 'number' ? parsed.uniqueVisitors : 0;
      } catch (e) {}
    }

    var changed = false;
    if (countView !== false) {
      meta.totalVisits += 1;
      meta.todayVisits += 1;
      changed = true;
    }

    var vid = typeof rawVisitorId === 'string' ? rawVisitorId.trim() : '';
    if (vid && /^[A-Za-z0-9_-]{8,64}$/.test(vid)) {
      var rawSet = getChunkedProperty_('M66_VISITOR_HASHES');
      var hashes = rawSet ? rawSet.split(',').filter(Boolean) : [];
      var hashed = hashVisitorId_(vid);
      if (hashes.indexOf(hashed) === -1 && hashes.length < 20000) {
        hashes.push(hashed);
        meta.uniqueVisitors = hashes.length;
        setChunkedProperty_('M66_VISITOR_HASHES', hashes.join(','));
        changed = true;
      }
    }

    if (changed) {
      props.setProperty('M66_VISITOR_META', JSON.stringify(meta));
    }

    return {
      totalVisits: meta.totalVisits,
      todayVisits: meta.todayVisits,
      uniqueVisitors: meta.uniqueVisitors,
    };
  } finally {
    lock.releaseLock();
  }
}

/* -------------------------------------------------------------------------- */
/*  Shared Guestbook Comment / Note Board (starts empty, zero sample notes)   */
/* -------------------------------------------------------------------------- */

function loadGuestbookNotes_() {
  var raw = getChunkedProperty_('M66_GUESTBOOK_NOTES');
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(function (n) {
        return (
          n &&
          typeof n.id === 'string' &&
          typeof n.name === 'string' &&
          typeof n.message === 'string' &&
          typeof n.createdAt === 'string'
        );
      });
    }
  } catch (e) {}
  return [];
}

function gasGetGuestbook() {
  return { notes: loadGuestbookNotes_() };
}

function gasAddGuestbookNote(rawName, rawMessage) {
  var message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  if (!message) {
    throw new Error('กรุณาเขียนข้อความก่อนส่งโน้ต');
  }
  var name = (typeof rawName === 'string' ? rawName.trim() : '') || 'ผู้เยี่ยมชม';
  var note = {
    id: new Date().getTime().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    name: name.slice(0, 60),
    message: message.slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var notes = loadGuestbookNotes_();
    notes.unshift(note);
    if (notes.length > 300) {
      notes.length = 300;
    }
    setChunkedProperty_('M66_GUESTBOOK_NOTES', JSON.stringify(notes));
    return { note: note, notes: notes };
  } finally {
    lock.releaseLock();
  }
}

/* -------------------------------------------------------------------------- */
/*  Canva Sync Engine (canva.link/forlinktoweb606 + paginated resources)      */
/* -------------------------------------------------------------------------- */

function isAllowedMediaProxyUrl_(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  var m = rawUrl.match(/^https:\/\/([^\/]+)(\/.*)?$/i);
  if (!m) return false;
  var host = m[1].toLowerCase();
  var path = m[2] || '/';
  if (
    host === 'media.canva.com' ||
    host === 'media-public.canva.com' ||
    host === 'document-export.canva.com'
  ) {
    return true;
  }
  if (host === 's3.amazonaws.com' && path.indexOf('/document-export.canva.com/') === 0) {
    return true;
  }
  return false;
}

function gasFetchImageDataUrl(targetUrl) {
  if (!isAllowedMediaProxyUrl_(targetUrl)) {
    throw new Error('Invalid image URL');
  }
  var res = UrlFetchApp.fetch(targetUrl, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': BROWSER_UA,
      'Cache-Control': 'no-cache',
    },
  });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error('Failed to fetch image from Canva');
  }
  var blob = res.getBlob();
  var mimeType = blob.getContentType() || 'image/png';
  var b64 = Utilities.base64Encode(blob.getBytes());
  return 'data:' + mimeType + ';base64,' + b64;
}

function getHeaderCaseInsensitive_(headers, targetName) {
  var lower = targetName.toLowerCase();
  var keys = Object.keys(headers || {});
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === lower) {
      return headers[keys[i]];
    }
  }
  return null;
}

function toEmbedUrl_(resolvedUrl) {
  var match = resolvedUrl.match(/\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?/);
  if (!match) {
    throw new Error('ไม่พบ Design ID ในลิงก์ Canva ที่ระบุ');
  }
  var designId = match[1];
  var token = match[2] || null;
  var embedUrl = token
    ? 'https://www.canva.com/design/' + designId + '/' + token + '/view?embed'
    : 'https://www.canva.com/design/' + designId + '/view?embed';
  return { designId: designId, token: token, embedUrl: embedUrl };
}

function decodeBootstrapFromHtml_(html) {
  var marker = "window['bootstrap'] = JSON.parse('";
  var startIdx = html.indexOf(marker);
  if (startIdx === -1) {
    throw new Error('ไม่สามารถอ่านโครงสร้างข้อมูลจากหน้า Canva ได้ (ลิงก์อาจไม่ได้ตั้งค่าเป็นสาธารณะ)');
  }
  var from = startIdx + marker.length;
  var endIdx = html.indexOf("');", from);
  if (endIdx === -1) {
    throw new Error('ข้อมูล Canva ไม่สมบูรณ์');
  }
  var escaped = html.slice(from, endIdx);
  var out = [];
  for (var i = 0; i < escaped.length; i++) {
    var ch = escaped.charAt(i);
    if (ch === '\\' && i + 1 < escaped.length) {
      var next = escaped.charAt(i + 1);
      if (next === '\\') {
        out.push('\\');
        i++;
      } else if (next === "'") {
        out.push("'");
        i++;
      } else if (next === '"') {
        out.push('"');
        i++;
      } else if (next === 'n') {
        out.push('\n');
        i++;
      } else if (next === 'r') {
        out.push('\r');
        i++;
      } else if (next === 't') {
        out.push('\t');
        i++;
      } else if (next === 'u' && i + 5 < escaped.length) {
        out.push(String.fromCharCode(parseInt(escaped.slice(i + 2, i + 6), 16)));
        i += 5;
      } else if (next === 'x' && i + 3 < escaped.length) {
        out.push(String.fromCharCode(parseInt(escaped.slice(i + 2, i + 4), 16)));
        i += 3;
      } else {
        out.push(next);
        i++;
      }
    } else {
      out.push(ch);
    }
  }
  return JSON.parse(out.join(''));
}

function pickBestImageUrl_(media, preferSvg) {
  if (!media || !Array.isArray(media.files) || media.files.length === 0) return null;
  if (preferSvg) {
    for (var s = 0; s < media.files.length; s++) {
      if (media.files[s].mimeType === 'image/svg+xml' && media.files[s].url) {
        return media.files[s].url;
      }
    }
  }
  var preferredOrder = ['SCREEN_2X', 'SCREEN', 'SCREEN_3X', 'THUMBNAIL'];
  for (var q = 0; q < preferredOrder.length; q++) {
    for (var i = 0; i < media.files.length; i++) {
      if (media.files[i].quality === preferredOrder[q] && media.files[i].url) {
        return media.files[i].url;
      }
    }
  }
  return media.files[media.files.length - 1].url || null;
}

function sanitizeColorMap_(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  var hexRegex = /^#[0-9a-fA-F]{3,8}$/;
  var clean = {};
  var count = 0;
  var keys = Object.keys(raw);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = raw[k];
    if (typeof v === 'string' && hexRegex.test(k) && hexRegex.test(v)) {
      clean[k] = v;
      count++;
    }
  }
  return count > 0 ? clean : null;
}

function fetchRecoloredSvgDataUrl_(url, colorMap, svgCache) {
  if (!colorMap) return url;
  var cacheKey = url + '|' + JSON.stringify(colorMap);
  if (svgCache[cacheKey]) return svgCache[cacheKey];
  try {
    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      var svgText = res.getContentText('UTF-8');
      var mapKeys = Object.keys(colorMap);
      for (var i = 0; i < mapKeys.length; i++) {
        var fromHex = mapKeys[i];
        var toHex = colorMap[fromHex];
        var escaped = fromHex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        svgText = svgText.replace(new RegExp(escaped, 'gi'), toHex);
      }
      var b64 = Utilities.base64Encode(svgText, Utilities.Charset.UTF_8);
      var dataUri = 'data:image/svg+xml;base64,' + b64;
      svgCache[cacheKey] = dataUri;
      return dataUri;
    }
  } catch (e) {}
  return url;
}

function extractBackground_(pageObj) {
  var fillObj = pageObj.D || (pageObj.w && pageObj.w.A && pageObj.w.A[0]);
  if (fillObj && typeof fillObj.C === 'string') {
    return { type: 'solid', color: fillObj.C };
  }
  var gradStops = fillObj && fillObj.K && fillObj.K.A;
  if (Array.isArray(gradStops) && gradStops.length >= 2) {
    var colors = gradStops
      .map(function (s) {
        return s && s.A;
      })
      .filter(function (c) {
        return typeof c === 'string';
      });
    if (colors.length >= 2) {
      return {
        type: 'gradient',
        colors: colors,
        angle: typeof fillObj.K.B === 'number' ? fillObj.K.B : 90,
      };
    }
  }
  return { type: 'solid', color: '#ffffff' };
}

function parseAdmissionMetadata_(texts) {
  var studentName = '';
  var universities = [];
  var faculties = [];

  for (var i = 0; i < texts.length; i++) {
    var text = String(texts[i] || '').trim();
    if (!text) continue;
    if (/^ขอแสดงความยินดี/.test(text)) continue;

    if (/^(นาย|นางสาว|นาง)\s*[ก-๙]+/.test(text) && text.length < 60 && text.indexOf('มหาวิทยาลัย') === -1) {
      studentName = text.replace(/\s+/g, ' ').trim();
      continue;
    }

    if (text.indexOf('ได้ผ่านการคัดเลือก') !== -1 || text.indexOf('ระดับปริญญาตรี') !== -1) {
      var cleaned = text
        .replace(/ได้ผ่านการคัดเลือกมีสิทธิ์เข้าศึกษาต่อ\s*/g, '')
        .replace(/ระดับปริญญาตรี\s*/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      if (cleaned) {
        var normalized = cleaned
          .replace('มหาวิทยาลัยราชภัฎสวนสุนันทา', 'มหาวิทยาลัยราชภัฏสวนสุนันทา')
          .replace('ศูนย์ฝึกพาณิย์นาวี', 'ศูนย์ฝึกพาณิชย์นาวี')
          .replace(/มหาวิทยาลัยกาฬสิน$/, 'มหาวิทยาลัยกาฬสินธุ์');
        universities.push(normalized);
      }
      continue;
    }

    var facultyClean = text.replace(/\n+/g, ' · ').replace(/\s+/g, ' ').trim();
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

function fetchMissingDocumentMedia_(designId, extensionToken, pages, cookies, referer, mediaMap) {
  if (!designId || !pages || pages.length === 0) return;
  var chunkSize = 10;
  for (var i = 0; i < pages.length; i += chunkSize) {
    var batch = pages.slice(i, i + chunkSize);
    var continuation = null;
    var safety = 0;

    do {
      safety++;
      var qs = [];
      if (extensionToken) qs.push('extension=' + encodeURIComponent(extensionToken));
      qs.push('includeMedia=true');
      for (var b = 0; b < batch.length; b++) {
        qs.push('pages=' + encodeURIComponent(String(batch[b])));
      }
      if (continuation) {
        qs.push('continuation=' + encodeURIComponent(continuation));
      }
      var url =
        'https://www.canva.com/_ajax/documents/' +
        encodeURIComponent(designId) +
        '/resources?' +
        qs.join('&');

      var headers = {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json, text/plain, */*',
        Referer: referer,
        'Cache-Control': 'no-cache, no-store, max-age=0',
      };
      if (cookies) {
        headers.Cookie = cookies;
      }

      var res = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: headers,
      });
      if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) break;

      var rawText = res.getContentText('UTF-8');
      var jsonStart = rawText.indexOf('{');
      if (jsonStart === -1) break;
      var json = JSON.parse(rawText.slice(jsonStart));
      var mediaList = Array.isArray(json && json.media) ? json.media : [];
      for (var m = 0; m < mediaList.length; m++) {
        var entry = mediaList[m];
        if (entry && entry.id && !mediaMap[entry.id]) {
          mediaMap[entry.id] = entry;
        }
      }
      continuation = json && typeof json.continuation === 'string' ? json.continuation : null;
    } while (continuation && safety < 20);
  }
}

function getCachedCanvaJson_() {
  var cache = CacheService.getScriptCache();
  var countStr = cache.get('M66_CANVA_COUNT');
  var count = countStr ? parseInt(countStr, 10) : 0;
  if (!count || count < 1) return null;
  var keys = [];
  for (var i = 0; i < count; i++) {
    keys.push('M66_CANVA_' + i);
  }
  var map = cache.getAll(keys);
  var parts = [];
  for (var j = 0; j < keys.length; j++) {
    if (!map[keys[j]]) return null;
    parts.push(map[keys[j]]);
  }
  return JSON.parse(parts.join(''));
}

function setCachedCanvaJson_(payload) {
  try {
    var jsonStr = JSON.stringify(payload);
    var chunkSize = 80000;
    var count = Math.ceil(jsonStr.length / chunkSize);
    var obj = { M66_CANVA_COUNT: String(count) };
    for (var i = 0; i < count; i++) {
      obj['M66_CANVA_' + i] = jsonStr.slice(i * chunkSize, (i + 1) * chunkSize);
    }
    CacheService.getScriptCache().putAll(obj, 600);
  } catch (e) {}
}

function gasSyncCanva(forceRefresh) {
  if (!forceRefresh) {
    var cached = getCachedCanvaJson_();
    if (cached) return cached;
  }

  var currentUrl = OFFICIAL_CANVA_URL;
  var redirectRes = UrlFetchApp.fetch(currentUrl, {
    muteHttpExceptions: true,
    followRedirects: false,
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Cache-Control': 'no-cache',
    },
  });
  var loc = getHeaderCaseInsensitive_(redirectRes.getAllHeaders(), 'location');
  if (loc) {
    if (loc.indexOf('http') === 0) {
      currentUrl = loc;
    } else {
      currentUrl = 'https://www.canva.com' + (loc.charAt(0) === '/' ? '' : '/') + loc;
    }
  }

  var parsedUrl = toEmbedUrl_(currentUrl);
  var embedRes = UrlFetchApp.fetch(parsedUrl.embedUrl, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
    },
  });

  if (embedRes.getResponseCode() < 200 || embedRes.getResponseCode() >= 300) {
    throw new Error('Canva ตอบกลับด้วยสถานะ ' + embedRes.getResponseCode());
  }

  var rawSetCookie = getHeaderCaseInsensitive_(embedRes.getAllHeaders(), 'set-cookie');
  var cookies = '';
  if (Array.isArray(rawSetCookie)) {
    cookies = rawSetCookie
      .map(function (c) {
        return String(c).split(';')[0];
      })
      .join('; ');
  } else if (typeof rawSetCookie === 'string') {
    cookies = rawSetCookie.split(';')[0];
  }

  var html = embedRes.getContentText('UTF-8');
  var bootstrap = decodeBootstrapFromHtml_(html);
  var doc = bootstrap && bootstrap.page && bootstrap.page.C;
  if (!doc || !doc.D || !doc.D.A || !Array.isArray(doc.D.A.A)) {
    throw new Error('ไม่พบข้อมูลหน้างานในไฟล์ Canva นี้');
  }

  var designId = doc.A || parsedUrl.designId || '';
  var docVersion = typeof doc.B === 'number' ? doc.B : null;
  var designTitle = (doc.D && doc.D.A && doc.D.A.D) || 'Canva Design';
  var canvasWidth = (doc.D && doc.D.A && doc.D.A.C && doc.D.A.C.A) || 1080;
  var canvasHeight = (doc.D && doc.D.A && doc.D.A.C && doc.D.A.C.B) || 1080;

  var mediaMap = {};
  if (Array.isArray(doc.I)) {
    for (var mi = 0; mi < doc.I.length; mi++) {
      var mItem = doc.I[mi];
      if (mItem && mItem.id) mediaMap[mItem.id] = mItem;
    }
  }

  var thumbnailMap = {};
  if (doc.G && Array.isArray(doc.G.images)) {
    for (var ti = 0; ti < doc.G.images.length; ti++) {
      var tImg = doc.G.images[ti];
      if (tImg && typeof tImg.page === 'number' && typeof tImg.url === 'string') {
        thumbnailMap[tImg.page] = tImg.url;
      }
    }
  }

  var rawPages = doc.D.A.A;
  var pagesWithMissingMedia = [];
  for (var pi = 0; pi < rawPages.length; pi++) {
    var elems = Array.isArray(rawPages[pi] && rawPages[pi].E) ? rawPages[pi].E : [];
    var hasMissing = elems.some(function (el) {
      var type = el && el['A?'];
      if (type === 'I') {
        var pid = el.a && el.a.B && el.a.B.I && el.a.B.I.A;
        var fid = el.a && el.a.B && el.a.B.A && el.a.B.A.A;
        return Boolean((pid && !mediaMap[pid]) || (!pid && fid && !mediaMap[fid]));
      }
      if (type === 'J') {
        var frameItem = Array.isArray(el.b) ? el.b[0] : null;
        var jPid = frameItem && frameItem.B && frameItem.B.B && frameItem.B.B.I && frameItem.B.B.I.A;
        var jFid = frameItem && frameItem.B && frameItem.B.B && frameItem.B.B.A && frameItem.B.B.A.A;
        return Boolean((jPid && !mediaMap[jPid]) || (!jPid && jFid && !mediaMap[jFid]));
      }
      return false;
    });
    if (hasMissing) {
      pagesWithMissingMedia.push(pi + 1);
    }
  }

  if (pagesWithMissingMedia.length > 0) {
    var extensionToken = (doc.Q && (doc.Q.A || doc.Q.B)) || parsedUrl.token || null;
    fetchMissingDocumentMedia_(
      designId,
      extensionToken,
      pagesWithMissingMedia,
      cookies,
      parsedUrl.embedUrl,
      mediaMap
    );
  }

  var svgCache = {};
  var pages = rawPages.map(function (rawPage, idx) {
    var pageNumber = idx + 1;
    var rawThumb = thumbnailMap[pageNumber] || null;
    if (rawThumb && docVersion !== null) {
      var vMatch = rawThumb.match(/[?&]version=(\d+)/);
      if (vMatch && Number(vMatch[1]) < docVersion) {
        rawThumb = null;
      }
    }

    var background = extractBackground_(rawPage);
    var layers = [];
    var textValues = [];
    var elements = Array.isArray(rawPage && rawPage.E) ? rawPage.E : [];

    for (var ei = 0; ei < elements.length; ei++) {
      var el = elements[ei];
      var type = el && el['A?'];
      var y = Number((el && el.A) || 0);
      var x = Number((el && el.B) || 0);
      var width = Number((el && el.D) || 0);
      var height = Number((el && el.C) || 0);
      var rotation = typeof (el && el.E) === 'number' ? el.E : undefined;

      if (type === 'I') {
        var pId = el.a && el.a.B && el.a.B.I && el.a.B.I.A;
        var fId = el.a && el.a.B && el.a.B.A && el.a.B.A.A;
        var mediaEntry = (pId ? mediaMap[pId] : null) || (fId ? mediaMap[fId] : null);
        var colorMap = sanitizeColorMap_(el.a && el.a.B && el.a.B.C);
        var mediaUrl = pickBestImageUrl_(mediaEntry, Boolean(colorMap));
        if (mediaUrl) {
          var finalUrl = colorMap ? fetchRecoloredSvgDataUrl_(mediaUrl, colorMap, svgCache) : mediaUrl;
          var cropBox = el.a && el.a.B && el.a.B.B;
          layers.push({
            kind: 'image',
            x: x,
            y: y,
            width: width,
            height: height,
            rotation: rotation,
            url: finalUrl,
            innerX: cropBox && typeof cropBox.B === 'number' ? cropBox.B : 0,
            innerY: cropBox && typeof cropBox.A === 'number' ? cropBox.A : 0,
            innerWidth: cropBox && typeof cropBox.D === 'number' ? cropBox.D : width,
            innerHeight: cropBox && typeof cropBox.C === 'number' ? cropBox.C : height,
          });
        }
      } else if (type === 'J') {
        var fItem = Array.isArray(el.b) ? el.b[0] : null;
        var jpId = fItem && fItem.B && fItem.B.B && fItem.B.B.I && fItem.B.B.I.A;
        var jfId = fItem && fItem.B && fItem.B.B && fItem.B.B.A && fItem.B.B.A.A;
        var jMedia = (jpId ? mediaMap[jpId] : null) || (jfId ? mediaMap[jfId] : null);
        var jColorMap = sanitizeColorMap_(fItem && fItem.B && fItem.B.B && fItem.B.B.C);
        var jUrl = pickBestImageUrl_(jMedia, Boolean(jColorMap));
        if (jUrl) {
          layers.push({
            kind: 'image',
            x: x,
            y: y,
            width: width,
            height: height,
            rotation: rotation,
            url: jColorMap ? fetchRecoloredSvgDataUrl_(jUrl, jColorMap, svgCache) : jUrl,
            circular: true,
          });
        }
      } else if (type === 'K') {
        var textStr = el.a && el.a.C && Array.isArray(el.a.C.A) ? el.a.C.A.join('') : '';
        var trimmed = textStr.trim();
        if (trimmed) {
          textValues.push(trimmed);
          var styleList = el.a && el.a.C && Array.isArray(el.a.C.C) ? el.a.C.C : [];
          var pickStr = function (key) {
            for (var si = 0; si < styleList.length; si++) {
              var s = styleList[si];
              if (s && typeof s[key] === 'string' && s[key].trim() !== '') {
                return s[key];
              }
            }
            return undefined;
          };
          var fontSizeNum = parseFloat(pickStr('G') || '36px') || 36;
          var lineHeightNum = parseFloat(pickStr('Y') || '1.3em') || 1.3;
          var weightRaw = pickStr('I');
          var alignRaw = pickStr('c');
          var colorRaw = pickStr('M');
          layers.push({
            kind: 'text',
            x: x,
            y: y,
            width: width,
            height: height,
            rotation: rotation,
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

    var meta = parseAdmissionMetadata_(textValues);
    return {
      page: pageNumber,
      renderedImageUrl: rawThumb,
      background: background,
      layers: layers,
      studentName: meta.studentName,
      university: meta.university,
      faculty: meta.faculty,
    };
  });

  var result = {
    designId: designId,
    docVersion: docVersion,
    title: designTitle,
    sourceUrl: OFFICIAL_CANVA_URL,
    embedUrl: parsedUrl.embedUrl,
    canvasWidth: canvasWidth,
    canvasHeight: canvasHeight,
    totalPages: pages.length,
    renderedThumbnailsCount: Object.keys(thumbnailMap).length,
    syncedAt: new Date().toISOString(),
    pages: pages,
  };

  setCachedCanvaJson_(result);
  return result;
}
