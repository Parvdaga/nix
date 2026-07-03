/**
 * Hashes a 4-digit PIN using SHA-256 for local authentication verification.
 * Runs on the client side using the standard browser Web Crypto API.
 */
export async function hashPin(pin: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    // Fallback if running during SSR
    return "";
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
    
  return hashHex;
}
