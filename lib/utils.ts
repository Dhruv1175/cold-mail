export function cleanDomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, '')      // remove protocol
    .replace(/^www\./, '')            // remove www.
    .replace(/\?.*$/, '')             // remove query parameters (everything after ?)
    .replace(/\/.*$/, '')             // remove any path
    .trim();
}