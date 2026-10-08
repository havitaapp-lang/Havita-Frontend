/**
 * Returns the base domain for a given host, handling localhost, vercel, and multi-part TLDs.
 * Examples:
 * - havita.com.co -> havita.com.co
 * - admin.havita.com.co -> havita.com.co
 * - tenant.havita-frontend.vercel.app -> havita-frontend.vercel.app
 * - localhost -> localhost
 */
export const getBaseDomain = (host: string): string => {
  const lowerHost = host.toLowerCase();

  // Localhost
  if (lowerHost === 'localhost' || lowerHost.endsWith('.localhost')) {
    if (lowerHost.includes('.havita.localhost')) {
      return 'havita.localhost';
    }
    return 'localhost';
  }

  // Vercel apps
  if (lowerHost.endsWith('.vercel.app')) {
    const parts = lowerHost.split('.');
    if (parts.length >= 3) {
      return parts.slice(-3).join('.'); // e.g. havita-frontend.vercel.app
    }
    return 'vercel.app';
  }

  // Known multi-part TLDs like .com.co
  if (lowerHost.endsWith('.com.co')) {
    const parts = lowerHost.split('.');
    if (parts.length >= 3) {
      return parts.slice(-3).join('.'); // e.g. havita.com.co
    }
    return lowerHost;
  }

  // Default to 2-part base domains (e.g., example.com)
  const parts = lowerHost.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  return lowerHost;
};

/**
 * Extracts the tenant subdomain from the hostname.
 * Returns null if it's the base domain, 'www', or 'app'.
 */
export const getSubdomainFromHost = (): string | null => {
  const host = window.location.hostname.toLowerCase();
  const baseDomain = getBaseDomain(host);

  if (host === baseDomain || host === `www.${baseDomain}`) {
    return null;
  }

  if (host.endsWith(`.${baseDomain}`)) {
    const sub = host.replace(`.${baseDomain}`, '');
    if (sub && sub !== 'www' && sub !== 'app') {
      return sub;
    }
  }

  return null;
};
