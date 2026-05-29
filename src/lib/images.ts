// Product images can be a Google Drive link (or any image URL).
// We store the resolved URL in the product's `imageKey` field; if it's not a
// URL, it's treated as a Netlify Blobs key (legacy uploads).

/** Turn a Google Drive share link into an embeddable image URL. Non-Drive URLs pass through. */
export function driveImageUrl(input: string): string {
  const url = (input ?? "").trim();
  if (!url) return "";
  const m =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
  return url; // already a direct image URL
}

export function isImageUrl(s: string | null | undefined): boolean {
  return !!s && /^https?:\/\//i.test(s);
}

/** Where to load a product's image from: a direct URL, the Blobs route, or null. */
export function productImageSrc(p: { id: string; imageKey: string | null }): string | null {
  if (!p.imageKey) return null;
  return isImageUrl(p.imageKey) ? p.imageKey : `/api/products/${p.id}/image`;
}
