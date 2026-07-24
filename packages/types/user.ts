/**
 * Core User interface mapped from the JWT token.
 */
export interface User {
  name: string;
  email: string;
  picture: string;
  jwt: string;
  exp?: number;
}

/**
 * User Settings mapped from the Server Prisma Schema.
 */
export interface UserSettings {
  id: number;
  email: string;
  storagePreference: 'both' | 'drive' | 'local' | string;
  updatedAt: Date | string;
}
