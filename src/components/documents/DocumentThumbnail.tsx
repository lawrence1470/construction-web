'use client';

import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

interface DocumentThumbnailProps {
  /** Same-origin proxy URL (doc.blobUrl → /api/blob/[documentId]). */
  url: string;
  mimeType: string;
  name: string;
  /** Icon shown for non-previewable types, while a PDF renders, or on any error. */
  fallback: React.ReactNode;
  /** How to crop the preview within its box. Documents read best from the top. */
  objectPosition?: string;
  /** Intrinsic bitmap width to rasterize a PDF page at (CSS then downscales). */
  renderWidth?: number;
}

/**
 * Renders a real preview of a document inside a card's thumbnail box:
 * - images → the image itself (falls back to the icon if it fails to load)
 * - PDFs → the first page, rasterized to a canvas via pdf.js (lazy, in-view only)
 * - everything else → the provided fallback icon
 *
 * pdf.js is dynamically imported so it stays out of the SSR/initial bundle and
 * only evaluates in the browser. The worker is self-hosted at
 * /pdf/pdf.worker.min.mjs (copied from node_modules by scripts/sync-pdf-worker.mjs).
 */
export default function DocumentThumbnail({
  url,
  mimeType,
  name,
  fallback,
  objectPosition = 'top',
  renderWidth = 400,
}: DocumentThumbnailProps) {
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  const [imgError, setImgError] = useState(false);

  if (isImage && !imgError) {
    return (
      <Box
        component="img"
        src={url}
        alt={name}
        onError={() => setImgError(true)}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition, display: 'block' }}
      />
    );
  }

  if (isPdf) {
    return <PdfCanvas url={url} name={name} fallback={fallback} objectPosition={objectPosition} renderWidth={renderWidth} />;
  }

  return <>{fallback}</>;
}

function PdfCanvas({
  url,
  name,
  fallback,
  objectPosition,
  renderWidth,
}: {
  url: string;
  name: string;
  fallback: React.ReactNode;
  objectPosition: string;
  renderWidth: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Only rasterize once the card scrolls near the viewport — avoids rendering
  // dozens of PDFs up front on a full gallery page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    let loadingTask: { promise: Promise<unknown>; destroy?: () => void } | null = null;

    void (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs';
      loadingTask = pdfjs.getDocument({ url, withCredentials: true });
      const pdf = await (loadingTask.promise as Promise<Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>>);
      if (cancelled) return;
      const page = await pdf.getPage(1);
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: renderWidth / base.width });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      if (cancelled) return;
      setRendered(true);
      pdf.cleanup();
    })().catch(() => {
      /* leave fallback visible */
    });

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [inView, url, renderWidth]);

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box
        component="canvas"
        ref={canvasRef}
        aria-label={name}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition,
          display: rendered ? 'block' : 'none',
        }}
      />
      {!rendered && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {fallback}
        </Box>
      )}
    </Box>
  );
}
