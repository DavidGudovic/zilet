// Keep collection allowlists identical in the browser and server proxy.
export const publicAnalyticsPath =
  /^\/$|^\/(tekst|rubrika|autor)\/[a-z0-9-]+$|^\/(autori|o-casopisu)$/;

export function analyticsReferrer(value: string, ownOrigin: string) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && url.origin !== ownOrigin ? url.origin : '';
  } catch {
    return '';
  }
}
