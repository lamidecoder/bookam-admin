/**
 * The gold infinity/interlocking-loop symbol from the Bookam brand mark,
 * as an INLINE SVG path rather than a separate image file.
 *
 * This exists because two separate attempts to load the symbol as an
 * external asset (next/image with fill, then a plain <img> tag) both
 * failed in production despite working in local dev — most likely a
 * deployment/caching issue with the public/ folder on Vercel that
 * never fully diagnosed. An inline SVG can never 404, never depends on
 * any file existing on disk at runtime, and renders identically
 * everywhere — it's just code, compiled directly into the JS bundle.
 *
 * Path traced from the original high-res source image via potrace for
 * a pixel-accurate reproduction of the exact same shape (not a
 * hand-approximated recreation).
 */
export function BookamSymbol({ width = 32, height = 16, color = '#C9A84C' }: { width?: number; height?: number; color?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 1172 892" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0,892) scale(0.1,-0.1)" fill={color} stroke="none">
        <path d="M7885 6730 c-346 -26 -634 -104 -950 -260 -348 -170 -622 -355 -1144
-767 -760 -601 -1136 -826 -1741 -1039 -122 -43 -405 -128 -583 -174 -62 -17
-87 -27 -85 -37 2 -10 67 -31 193 -63 652 -166 997 -316 1500 -653 194 -129
321 -224 642 -479 387 -307 571 -440 833 -605 417 -261 769 -398 1150 -449
200 -27 594 -25 785 4 701 105 1271 484 1625 1079 153 257 254 558 301 898 19
136 17 456 -4 600 -63 422 -236 815 -502 1135 -85 102 -272 282 -371 356 -311
234 -677 381 -1089 438 -142 19 -407 27 -560 16z m515 -1350 c105 -26 252 -95
339 -159 207 -154 339 -375 377 -632 13 -93 14 -130 5 -214 -40 -382 -304
-705 -671 -823 -171 -56 -406 -57 -570 -3 -70 23 -185 80 -247 122 -129 88
-276 264 -340 407 -156 352 -85 747 187 1035 149 158 323 246 580 291 57 10
259 -4 340 -24z"/>
      </g>
    </svg>
  );
}