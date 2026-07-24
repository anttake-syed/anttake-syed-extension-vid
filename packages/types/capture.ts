/**
 * Core interface representing a single capture (Video or Image).
 * Matches the Prisma Schema in the Server.
 */
export interface Capture {
  id: number;
  email: string;
  title: string | null;
  type: 'video' | 'image' | string;
  size: string | null;
  mimeType: string | null;
  fileUrl: string;
  driveUrl: string | null;
  storageLocation: 'drive' | 'local' | string;
  mediaData?: ArrayBuffer | null; // Used for local SQLite BLOB storage
  createdAt: Date | string;
}

/**
 * Interface used when creating a new Capture via the API.
 */
export interface CreateCaptureDTO {
  title?: string;
  type: string;
  size?: string;
  mimeType?: string;
  fileUrl: string;
  driveUrl?: string;
  storageLocation?: string;
}
