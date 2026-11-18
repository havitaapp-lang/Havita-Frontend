/**
 * Checks if a host is an IPv4 or IPv6 address.
 * Examples: 192.168.1.35, 127.0.0.1, [::1]
 */
export const isIpAddress = (host: string): boolean => {
  if (!host) return false;
  const clean = host.split(':')[0].toLowerCase();
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(clean) || clean.includes(':');
};

/**
 * Returns the base domain for a given host, handling localhost, vercel, IPs, and multi-part TLDs.
 * Examples:
 * - havita.com.co -> havita.com.co
 * - admin.havita.com.co -> havita.com.co
 * - tenant.havita-frontend.vercel.app -> havita-frontend.vercel.app
 * - localhost -> localhost
 * - 192.168.1.35 -> 192.168.1.35
 */
export const getBaseDomain = (host: string): string => {
  const lowerHost = host.toLowerCase().split(':')[0];

  // IP addresses (e.g. 192.168.1.35, 10.0.0.5)
  if (isIpAddress(lowerHost)) {
    return lowerHost;
  }

  // Wildcard DNS domains for local IP testing (e.g. limonar.192.168.1.35.sslip.io -> base: 192.168.1.35.sslip.io)
  const sslipMatch = lowerHost.match(/(?:^|\.)((\d{1,3}\.){3}\d{1,3}\.(sslip|nip)\.io)$/);
  if (sslipMatch) {
    return sslipMatch[1];
  }

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
 * Returns null if it's the base domain, an IP address, 'www', or 'app'.
 * If accessing via IP, permits optional query param (?tenant=xxx or ?subdomain=xxx).
 */
export const getSubdomainFromHost = (): string | null => {
  const host = window.location.hostname.toLowerCase();

  // If host is an IP address, do not treat IP octets as subdomains!
  if (isIpAddress(host)) {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const queryTenant = params.get('tenant') || params.get('subdomain');
      if (queryTenant && queryTenant !== 'www' && queryTenant !== 'app') {
        return queryTenant.toLowerCase();
      }
    }
    return null;
  }

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
