/**
 * BaseProvider
 * 
 * The master interface for all storage providers in V2.
 * Every specific provider (Local, R2, Drive) must implement these methods.
 */
class BaseProvider {
  /**
   * Uploads a file buffer to the storage destination.
   * @param {Buffer} buffer - The file's binary data
   * @param {string} filename - The generated filename (e.g., '12345-capture.webm')
   * @param {string} mimeType - e.g., 'video/webm'
   * @param {Object} options - Any provider-specific options (like user config)
   * @returns {Promise<{ providerObjectId: string, sizeBytes: number, providerMeta: Object }>}
   */
  async upload(buffer, filename, mimeType, options = {}) {
    throw new Error('Not implemented: upload() must be defined by subclass');
  }

  /**
   * Generates a URL or path where the client can access the file.
   * For local: returns the local static path.
   * For cloud: returns a pre-signed URL or public URL.
   * For drive: returns the webViewLink.
   * @param {string} providerObjectId - The unique ID/path of the file in the provider
   * @param {Object} options - Provider-specific options
   * @returns {Promise<string>}
   */
  async getAccessUrl(providerObjectId, options = {}) {
    throw new Error('Not implemented: getAccessUrl() must be defined by subclass');
  }

  /**
   * Deletes the file from the storage destination.
   * @param {string} providerObjectId 
   * @param {Object} options 
   * @returns {Promise<boolean>}
   */
  async delete(providerObjectId, options = {}) {
    throw new Error('Not implemented: delete() must be defined by subclass');
  }

  /**
   * Checks if a file exists.
   * @param {string} providerObjectId 
   * @returns {Promise<boolean>}
   */
  async exists(providerObjectId, options = {}) {
    throw new Error('Not implemented: exists() must be defined by subclass');
  }
}

module.exports = BaseProvider;
