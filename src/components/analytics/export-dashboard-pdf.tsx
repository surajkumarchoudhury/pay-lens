"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { FileDown } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Spinner } from "../ui/spinner";

type Rgb = [number, number, number];

const WHITE: Rgb = [255, 255, 255];
const SUBTITLE: Rgb = [203, 213, 225]; // slate-300
const MUTED: Rgb = [148, 163, 184]; // slate-400

// Fallbacks mirror the light-theme --nav-from / --nav-to in globals.css, used
// only if the CSS variables can't be read at export time.
const NAV_FROM_FALLBACK: Rgb = [0, 62, 122]; // #003e7a
const NAV_TO_FALLBACK: Rgb = [18, 86, 152]; // #125698

/** Pull the first three numbers out of an rgb()/rgba() string. */
function parseRgb(input: string): Rgb {
  const nums = input.match(/\d+(\.\d+)?/g)?.map(Number) ?? [255, 255, 255];
  return [nums[0] ?? 255, nums[1] ?? 255, nums[2] ?? 255];
}

/** Parse a #rgb / #rrggbb hex string into an Rgb triple. */
function hexToRgb(hex: string): Rgb {
  const h = hex.trim().replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Read a CSS custom property off <html> and resolve it to an Rgb triple. */
function cssVarRgb(name: string, fallback: Rgb): Rgb {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  return raw.startsWith("#") ? hexToRgb(raw) : parseRgb(raw);
}

/** Linear interpolation between two colors (t in [0,1]). */
function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Narrow, portrait-friendly width used only while rendering the PDF capture. */
const CAPTURE_WIDTH = 820;

/**
 * Temporarily reflow the report into a narrow, single-column-ish layout for the
 * screenshot, then hand back a `restore()` that undoes every mutation. Overrides
 * are applied as inline styles so they win over Tailwind's viewport-based
 * responsive classes without touching the stylesheet.
 */
function applyPrintLayout(node: HTMLElement): () => void {
  const kpis = node.querySelector<HTMLElement>('[data-pdf-grid="kpis"]');
  const charts = node.querySelector<HTMLElement>('[data-pdf-grid="charts"]');
  const payPair = node.querySelector<HTMLElement>('[data-pdf-grid="pay-pair"]');

  const saved: Array<[HTMLElement, string]> = [[node, node.style.cssText]];
  node.style.width = `${CAPTURE_WIDTH}px`;
  node.style.maxWidth = "none";

  if (kpis) {
    saved.push([kpis, kpis.style.cssText]);
    kpis.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  }
  if (charts) {
    saved.push([charts, charts.style.cssText]);
    charts.style.gridTemplateColumns = "1fr";
  }
  if (payPair) {
    // Keep the Pay-by-level / Pay-by-country cards side by side in the capture
    // regardless of the live viewport width (their md:grid-cols-2 tracks the
    // viewport, not this fixed-width node).
    saved.push([payPair, payPair.style.cssText]);
    payPair.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  }

  // html-to-image's SVG-foreignObject render path mis-paints color-mix()/oklch
  // *border* colors (e.g. `border-border/60`) as red. Pin every border in the
  // capture to a concrete, theme-matched rgb so it renders true to the design.
  const isDark = document.documentElement.classList.contains("dark");
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgb(229, 229, 229)";
  const style = document.createElement("style");
  style.textContent = `#${node.id} *, #${node.id} *::before, #${node.id} *::after { border-color: ${borderColor} !important; }`;
  document.head.appendChild(style);

  return () => {
    style.remove();
    for (const [el, cssText] of saved) el.style.cssText = cssText;
  };
}

/** Await N animation frames — gives ResizeObserver-driven charts time to settle. */
function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const tick = () => (remaining-- <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

/**
 * "Exact" PDF export: rather than re-typesetting the report with vector
 * primitives, we rasterize the live dashboard DOM with `html-to-image` and drop
 * the PNG into a `jsPDF` document. Because `html-to-image` serializes the node
 * into an SVG <foreignObject> and lets the browser paint it, the capture keeps
 * the real recharts donuts/bars, fonts, and modern colors (incl. oklch) — an
 * approach `html2canvas` can't match. A branded header band + page-number footer
 * are drawn per page (with opaque masks) so the sliced screenshot stays tidy
 * across page breaks. Trade-off: the PDF is image-based (text isn't selectable).
 */
export function ExportDashboardPdf({
  targetId = "dashboard-report",
}: {
  targetId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);

  async function onExport() {
    if (busy) return;
    const node = document.getElementById(targetId);
    if (!node) return;

    // Overlay only the main content column (exclude the sidebar/header) by
    // pinning it to the scroll container's viewport rect.
    const main = node.closest("main") ?? node.parentElement;
    setOverlayRect(main?.getBoundingClientRect() ?? null);
    setBusy(true);

    // Tailwind's responsive grids track the viewport, not the node — so to get a
    // print-friendly "narrow" layout (3 KPIs per row, one chart per row) we force
    // it during capture: pin the node to a fixed width and override the two grids
    // inline (inline styles beat utility classes). Everything is restored after.
    const restore = applyPrintLayout(node);
    try {
      // Let recharts' ResponsiveContainer re-measure at the new (narrower) width.
      await nextFrames(2);
      await new Promise((r) => setTimeout(r, 200));

      // Match the page background so grid gaps/rounded corners don't render as
      // transparent (which prints as black in some PDF viewers).
      const bg = parseRgb(getComputedStyle(document.body).backgroundColor);

      // Theme-aware chrome: the header band reuses the app's live navy gradient
      // (--nav-from → --nav-to, which darkens in dark mode), and the footer
      // divider is a light hairline in light mode but a subtle bg-relative line
      // in dark mode (a fixed light slate line would read as a harsh streak).
      const isDark = document.documentElement.classList.contains("dark");
      const navFrom = cssVarRgb("--nav-from", NAV_FROM_FALLBACK);
      const navTo = cssVarRgb("--nav-to", NAV_TO_FALLBACK);
      const divider: Rgb = isDark
        ? lerpRgb(bg, WHITE, 0.18)
        : [226, 232, 240]; // slate-200

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
      });

      const img = new Image();
      img.src = dataUrl;
      await img.decode();

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 24;
      const headerH = 46; // navy brand band
      const gap = 10; // breathing room under the band
      const footerH = 26;
      const contentTop = headerH + gap;
      const contentBottom = pageH - footerH;
      const pageContentH = contentBottom - contentTop;

      const contentW = pageW - margin * 2;
      const renderedH = (img.height / img.width) * contentW;
      const totalPages = Math.max(1, Math.ceil(renderedH / pageContentH));

      const generatedAt = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage();

        // 1) The full screenshot, shifted up one page-height per page.
        pdf.addImage(
          dataUrl,
          "PNG",
          margin,
          contentTop - p * pageContentH,
          contentW,
          renderedH,
        );

        // 2) Opaque masks (page background) hide the slice overflow above/below.
        pdf.setFillColor(bg[0], bg[1], bg[2]);
        pdf.rect(0, 0, pageW, contentTop, "F");
        pdf.rect(0, contentBottom, pageW, pageH - contentBottom, "F");

        // 3) Branded header band — the app's navy chrome gradient, painted as
        // vertical slices (jsPDF has no native linear gradient). Slices overlap
        // by 0.5pt so no seams show between them.
        const SLICES = 48;
        const sliceW = pageW / SLICES;
        for (let i = 0; i < SLICES; i++) {
          const c = lerpRgb(navFrom, navTo, i / (SLICES - 1));
          pdf.setFillColor(c[0], c[1], c[2]);
          pdf.rect(i * sliceW, 0, sliceW + 0.5, headerH, "F");
        }

        pdf.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("PayLens", margin, 27);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(SUBTITLE[0], SUBTITLE[1], SUBTITLE[2]);
        pdf.text(
          "Analytics Summary · USD-normalized · excludes terminated employees",
          margin,
          39,
        );
        pdf.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        pdf.text(`Generated ${generatedAt}`, pageW - margin, 27, {
          align: "right",
        });

        // 4) Footer: divider + confidential note + page numbers.
        pdf.setDrawColor(divider[0], divider[1], divider[2]);
        pdf.setLineWidth(0.5);
        pdf.line(margin, contentBottom + 8, pageW - margin, contentBottom + 8);

        pdf.setFontSize(8);
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text("PayLens — Confidential", margin, pageH - 10);
        pdf.text(`Page ${p + 1} of ${totalPages}`, pageW - margin, pageH - 10, {
          align: "right",
        });
      }

      pdf.save(`paylens-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      restore();
      // One more frame so the on-screen charts snap back to their live width.
      await nextFrames(2);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onExport}
        disabled={busy}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xs border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        {busy ? (
          <Spinner/>
        ) : (
          <FileDown className="size-4" />
        )}
        {busy ? "Preparing…" : "Export PDF"}
      </button>

      {/* Opaque, theme-aware overlay over the main content column (sidebar/header
          stay visible) — masks the brief reflow while we snapshot the narrowed
          layout, so the user just sees a clean loading state. */}
      {busy &&
        overlayRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-100 flex flex-col items-center justify-center gap-3 bg-background"
            style={{
              top: overlayRect.top,
              left: overlayRect.left,
              width: overlayRect.width,
              height: overlayRect.height,
            }}
          >
            <Spinner className="size-10" />
            <p className="text-sm font-medium text-muted-foreground">
              Exporting PDF…
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
