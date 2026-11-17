import React, { useEffect, useRef, useState } from 'react';
import { resolveCorsSafeImageSrc } from '../lib/backend';

export interface CanvaLayer {
  kind: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  url?: string;
  innerX?: number;
  innerY?: number;
  innerWidth?: number;
  innerHeight?: number;
  circular?: boolean;
  text?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export interface CanvaBackground {
  type: 'solid' | 'gradient';
  color?: string;
  colors?: string[];
  angle?: number;
}

export interface CanvaSyncedPage {
  page: number;
  renderedImageUrl: string | null;
  background: CanvaBackground;
  layers: CanvaLayer[];
  studentName: string;
  university: string;
  faculty: string;
}

export interface CanvaSyncResponse {
  designId: string;
  docVersion?: number | null;
  title: string;
  sourceUrl: string;
  embedUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  totalPages: number;
  renderedThumbnailsCount: number;
  syncedAt: string;
  pages: CanvaSyncedPage[];
}

interface CanvaPosterRendererProps {
  imageSrc?: string | null;
  canvaPage?: CanvaSyncedPage | null;
  canvasWidth?: number;
  canvasHeight?: number;
  alt: string;
  className?: string;
  preferLayers?: boolean;
}

function getBackgroundCss(bg?: CanvaBackground): React.CSSProperties {
  if (!bg) return { backgroundColor: '#ffffff' };
  if (bg.type === 'gradient' && bg.colors && bg.colors.length >= 2) {
    const angle = typeof bg.angle === 'number' ? bg.angle : 90;
    return {
      background: `linear-gradient(${angle}deg, ${bg.colors.join(', ')})`,
    };
  }
  return { backgroundColor: bg.color || '#ffffff' };
}

export const CanvaPosterRenderer: React.FC<CanvaPosterRendererProps> = ({
  imageSrc,
  canvaPage,
  canvasWidth = 1080,
  canvasHeight = 1080,
  alt,
  className = '',
  preferLayers = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [imgFailed, setImgFailed] = useState(false);

  const directUrl = !preferLayers ? imageSrc || canvaPage?.renderedImageUrl || null : null;
  const shouldShowLayers = (!directUrl || imgFailed) && Boolean(canvaPage?.layers?.length);

  useEffect(() => {
    setImgFailed(false);
  }, [imageSrc, canvaPage?.renderedImageUrl, preferLayers]);

  useEffect(() => {
    if (!shouldShowLayers || !containerRef.current) return;
    const el = containerRef.current;
    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setScale(rect.width / canvasWidth);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldShowLayers, canvasWidth]);

  if (!shouldShowLayers && directUrl) {
    return (
      <img
        key={directUrl}
        src={directUrl}
        alt={alt}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={`w-full h-full object-cover ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (!canvaPage) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-xs text-slate-400 ${className}`}>
        ไม่มีภาพแสดงผล
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={getBackgroundCss(canvaPage.background)}
    >
      <div
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {canvaPage.layers.map((layer, idx) => {
          if (layer.kind === 'image' && layer.url) {
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  width: `${layer.width}px`,
                  height: `${layer.height}px`,
                  overflow: 'hidden',
                  borderRadius: layer.circular ? '9999px' : undefined,
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                  opacity: layer.opacity ?? 1,
                }}
              >
                <img
                  key={layer.url}
                  src={layer.url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  style={{
                    position: 'absolute',
                    left: `${layer.innerX ?? 0}px`,
                    top: `${layer.innerY ?? 0}px`,
                    width: `${layer.innerWidth ?? layer.width}px`,
                    height: `${layer.innerHeight ?? layer.height}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    objectFit: layer.circular ? 'cover' : 'fill',
                  }}
                />
              </div>
            );
          }

          if (layer.kind === 'text' && layer.text) {
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  width: `${layer.width}px`,
                  minHeight: `${layer.height}px`,
                  color: layer.color || '#000000',
                  fontSize: `${layer.fontSize || 36}px`,
                  fontWeight: layer.fontWeight || '500',
                  textAlign: layer.align || 'center',
                  lineHeight: layer.lineHeight || 1.3,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: '"Sarabun", "Plus Jakarta Sans", sans-serif',
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                }}
              >
                {layer.text}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      lines.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let current = '';
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function downloadCanvaPosterAsPng(options: {
  imageSrc?: string | null;
  canvaPage?: CanvaSyncedPage | null;
  canvasWidth?: number;
  canvasHeight?: number;
  filename: string;
}): Promise<void> {
  const {
    imageSrc,
    canvaPage,
    canvasWidth = 1080,
    canvasHeight = 1080,
    filename,
  } = options;

  const directUrl = imageSrc || canvaPage?.renderedImageUrl;
  if (directUrl && !canvaPage?.layers?.length) {
    const safeUrl = await resolveCorsSafeImageSrc(directUrl);
    const res = await fetch(safeUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  // If we have full 1080x1080 layers from Canva, compose crisp 1080x1080 PNG
  if (canvaPage?.layers?.length) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // 1. Background
    const bg = canvaPage.background;
    if (bg?.type === 'gradient' && bg.colors && bg.colors.length >= 2) {
      const rad = (((bg.angle ?? 90) - 90) * Math.PI) / 180;
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      const dx = Math.cos(rad) * cx;
      const dy = Math.sin(rad) * cy;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      bg.colors.forEach((c, idx) => {
        grad.addColorStop(idx / Math.max(1, bg.colors!.length - 1), c);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bg?.color || '#ffffff';
    }
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Layers
    for (const layer of canvaPage.layers) {
      if (layer.kind === 'image' && layer.url) {
        try {
          const safeLayerUrl = await resolveCorsSafeImageSrc(layer.url);
          const img = await loadImage(safeLayerUrl);
          ctx.save();
          if (typeof layer.opacity === 'number') {
            ctx.globalAlpha = layer.opacity;
          }
          if (layer.rotation) {
            const cx = layer.x + layer.width / 2;
            const cy = layer.y + layer.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }
          ctx.beginPath();
          if (layer.circular) {
            ctx.arc(
              layer.x + layer.width / 2,
              layer.y + layer.height / 2,
              Math.min(layer.width, layer.height) / 2,
              0,
              Math.PI * 2
            );
          } else {
            ctx.rect(layer.x, layer.y, layer.width, layer.height);
          }
          ctx.clip();
          ctx.drawImage(
            img,
            layer.x + (layer.innerX ?? 0),
            layer.y + (layer.innerY ?? 0),
            layer.innerWidth ?? layer.width,
            layer.innerHeight ?? layer.height
          );
          ctx.restore();
        } catch {
          // Skip broken external asset gracefully
        }
      } else if (layer.kind === 'text' && layer.text) {
        ctx.save();
        if (layer.rotation) {
          const cx = layer.x + layer.width / 2;
          const cy = layer.y + layer.height / 2;
          ctx.translate(cx, cy);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }
        const fontSize = layer.fontSize || 36;
        const weight = layer.fontWeight || '500';
        ctx.font = `${weight} ${fontSize}px Sarabun, "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = layer.color || '#000000';
        ctx.textAlign = layer.align || 'center';
        ctx.textBaseline = 'top';
        const lineHeightPx = fontSize * (layer.lineHeight || 1.3);
        const lines = wrapLines(ctx, layer.text, layer.width);
        const anchorX =
          layer.align === 'left'
            ? layer.x
            : layer.align === 'right'
            ? layer.x + layer.width
            : layer.x + layer.width / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line, anchorX, layer.y + idx * lineHeightPx);
        });
        ctx.restore();
      }
    }

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
    });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  if (directUrl) {
    const safeUrl = await resolveCorsSafeImageSrc(directUrl);
    const res = await fetch(safeUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
