import { User } from '../types/user';

/**
 * Decodes a JWT without relying on external libraries.
 * Validates the token's expiration date.
 * 
 * @param token The JWT string to validate
 * @returns The decoded User payload, or null if invalid/expired.
 */
export function parseAndValidateJwt(token: string): User | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map((c) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    const data = JSON.parse(jsonPayload);
    
    // Check expiry — exp is in seconds, Date.now() is in ms
    if (data.exp && Date.now() >= data.exp * 1000) {
      return null; // Token is expired
    }
    
    return data as User;
  } catch (err) {
    return null;
  }
}
