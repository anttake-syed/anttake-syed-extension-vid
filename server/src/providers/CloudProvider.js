const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const BaseProvider = require('./BaseProvider');

class CloudProvider extends BaseProvider {
  constructor() {
    super();
    // Initialize S3 client for Cloudflare R2
    // Requires env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
    const accountId = process.env.R2_ACCOUNT_ID;
    this.bucketName = process.env.R2_BUCKET_NAME;
    
    // Only initialize if we have the credentials, otherwise it fails gracefully in local mode
    if (accountId && process.env.R2_ACCESS_KEY_ID) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  async upload(buffer, filename, mimeType, options = {}) {
    if (!this.client) throw new Error('CloudProvider not configured (missing R2 env vars)');

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.client.send(command);

    return {
      providerObjectId: filename, // The key in R2
      sizeBytes: buffer.length,
      providerMeta: {}
    };
  }

  async getAccessUrl(providerObjectId, options = {}) {
    if (!this.client) throw new Error('CloudProvider not configured');

    // Generate a pre-signed URL that expires in 1 hour
    // Or if they have a custom R2 domain, we could just return `https://${process.env.R2_PUBLIC_DOMAIN}/${providerObjectId}`
    if (process.env.R2_PUBLIC_DOMAIN) {
      return `https://${process.env.R2_PUBLIC_DOMAIN}/${providerObjectId}`;
    }

    // Fallback to pre-signed URL if no public domain is configured
    // Note: getObject command needs to be imported if we do pre-signed URLs, 
    // but typically R2 buckets for public images are just exposed via a custom domain.
    // For now, we will assume a public domain or error out.
    throw new Error('R2_PUBLIC_DOMAIN is required to generate access URLs for Cloudflare R2');
  }

  async delete(providerObjectId, options = {}) {
    if (!this.client) return false;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: providerObjectId,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      console.error(`CloudProvider: Failed to delete ${providerObjectId}`, err);
      return false;
    }
  }

  async exists(providerObjectId, options = {}) {
    if (!this.client) return false;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: providerObjectId,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound') return false;
      throw err;
    }
  }
}

module.exports = new CloudProvider();
