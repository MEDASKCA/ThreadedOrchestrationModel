import type { CSSProperties } from "react";

/**
 * "New Thread" icon — ChatGPT compose-style open square with a sewing needle
 * and thread instead of a pencil. Responds to CSS `color` / `currentColor`.
 *
 * SVG layout (24×24 viewBox):
 *  • Open rounded-square frame — same 3-sided shape as the ChatGPT new-chat icon,
 *    with the top-right corner left open for the needle to emerge from.
 *  • Needle — thin filled triangle pointing SW (tip) from the open NE corner (blunt end).
 *    Drawn before the thread so the thread appears to exit through the eye.
 *  • Thread — gentle S-curve that exits the needle eye area, loops, and trails
 *    toward the lower-left interior of the square.
 */
export function NewThreadIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* ── Open square frame ─────────────────────────────────────────────── */}
      {/* Starts at (12, 3) on the top edge, goes left→down→right→up,
          leaving the diagonal from (12,3) to (21,12) open for the needle. */}
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />

      {/* ── Thread ────────────────────────────────────────────────────────── */}
      {/* Drawn BEFORE the needle so the portion passing through the needle
          body is hidden behind it — giving the visual of thread through the eye.
          Exits right-side of needle at ~(18,7), loops up-left past the eye area,
          then trails in a graceful S-curve toward the lower-left interior. */}
      <path
        d="M18 7C16 5 13.5 7 14.5 10C15.5 13 12 14 10.5 16"
        strokeWidth="1.5"
        fill="none"
      />

      {/* ── Needle body ───────────────────────────────────────────────────── */}
      {/* Thin filled triangle: blunt end at upper-right (21,4)→(20,3),
          tapers to a sharp tip at lower-left (11,12). Width ≈ 1.4 viewbox units. */}
      <path d="M21 4 L20 3 L11 12 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
