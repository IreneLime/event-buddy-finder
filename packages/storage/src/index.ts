import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface StoredObjectUpload {
  key: string
  body: Uint8Array
  contentType: string
  cacheControl?: string
}

export interface ObjectStorage {
  upload(object: StoredObjectUpload): Promise<void>
  delete(key: string): Promise<void>
  createDownloadUrl(key: string): Promise<string>
}

export interface DigitalOceanSpacesConfig {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  downloadUrlExpiresInSeconds?: number
}

export class DigitalOceanSpacesStorage implements ObjectStorage {
  private readonly client: S3Client

  constructor(private readonly config: DigitalOceanSpacesConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: false,
    })
  }

  async upload(object: StoredObjectUpload): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: object.key,
        Body: object.body,
        ContentType: object.contentType,
        CacheControl: object.cacheControl,
      }),
    )
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    )
  }

  async createDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { expiresIn: this.config.downloadUrlExpiresInSeconds ?? 900 },
    )
  }
}
