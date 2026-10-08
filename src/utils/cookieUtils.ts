/**
 * Cookie Utilities for Cross-Subdomain SSO
 */

export const setSSOCookie = (name: string, value: string, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Use .localhost for local dev, or extract base domain in prod
  const hostname = window.location.hostname;
  let domainString = '';
  if (!hostname.includes('localhost') && hostname.split('.').length > 2) {
    // For prod like tenant.havita.com, extract .havita.com
    const parts = hostname.split('.');
    domainString = `;domain=.${parts.slice(-2).join('.')}`;
  }
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()}${domainString};path=/;samesite=lax`;
};

export const getSSOCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export const removeSSOCookie = (name: string) => {
  const hostname = window.location.hostname;
  
  // Clear without explicit domain (current exact host)
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;samesite=lax`;
  
  if (hostname.includes('localhost')) {
    // Clear both localhost variants for local dev
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=localhost;path=/;samesite=lax`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.localhost;path=/;samesite=lax`;
  } else if (hostname.split('.').length > 2) {
    const parts = hostname.split('.');
    const domain = '.' + parts.slice(-2).join('.');
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain};path=/;samesite=lax`;
  }
};
