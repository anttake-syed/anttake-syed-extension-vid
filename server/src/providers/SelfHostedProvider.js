const BaseProvider = require('./BaseProvider');
const LocalProvider = require('./LocalProvider');

/**
 * SelfHostedProvider
 * 
 * For now, this is functionally identical to the LocalProvider.
 * It uses the local file system to store files in the /uploads directory.
 * We keep it separate in case self-hosted deployments need specific overrides
 * later (e.g., pointing to a specific mounted Docker volume path).
 */
class SelfHostedProvider extends BaseProvider {
  async upload(buffer, filename, mimeType, options = {}) {
    return LocalProvider.upload(buffer, filename, mimeType, options);
  }

  async getAccessUrl(providerObjectId, options = {}) {
    return LocalProvider.getAccessUrl(providerObjectId, options);
  }

  async delete(providerObjectId, options = {}) {
    return LocalProvider.delete(providerObjectId, options);
  }

  async exists(providerObjectId, options = {}) {
    return LocalProvider.exists(providerObjectId, options);
  }
}

module.exports = new SelfHostedProvider();
