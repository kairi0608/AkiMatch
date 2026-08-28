const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#0f766e"/>
  <path d="M18 18v30M18 33h28M46 18v30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
  <circle cx="32" cy="33" r="6" fill="#fde68a"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
