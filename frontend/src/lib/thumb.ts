/** Thumbnail URL helper — maps a raw thumbnail string to an optimally-sized URL. */
export function thumb(url: string | undefined | null, px: number): string {
  if (!url) return '';
  // YouTube thumbnail size variants
  if (url.includes('lh3.googleusercontent.com') || url.includes('yt3.ggpht')) {
    return `${url}=w${px}-h${px}-s`;
  }
  if (url.includes('i.ytimg.com') || url.includes('ytimg.com')) {
    if (px >= 480) return url.replace(/\/(?:maxresdefault|hqdefault|mqdefault|sddefault|default)\./i, '/maxresdefault.');
    if (px >= 320) return url.replace(/\/(?:hqdefault|mqdefault|sddefault|default)\./i, '/hqdefault.');
    return url.replace(/\/(?:mqdefault|sddefault|default)\./i, '/mqdefault.');
  }
  return url;
}
