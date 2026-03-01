// Cookie utilities for client-side cookie management

// Check if we're in production
function isProduction(): boolean {
  return typeof window !== "undefined" && window.location?.hostname !== "localhost";
}

export function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === "undefined") return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Use Secure flag only in production
  const secureFlag = isProduction() ? ";Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict${secureFlag}`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(";");
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }
  
  return null;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  
  // Use Secure flag only in production
  const secureFlag = isProduction() ? ";Secure" : "";
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Strict${secureFlag}`;
}

// Check if a cookie exists
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}
