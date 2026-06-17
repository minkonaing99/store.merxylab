import 'server-only'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

const PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET ?? ''
const PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET ?? ''

function client(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials missing (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
}

export async function putPublic(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!PUBLIC_BUCKET) throw new Error('R2_PUBLIC_BUCKET not configured')
  await client().send(
    new PutObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
}

export async function putPrivate(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!PRIVATE_BUCKET) throw new Error('R2_PRIVATE_BUCKET not configured')
  await client().send(
    new PutObjectCommand({
      Bucket: PRIVATE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'private, no-store',
    }),
  )
}

export async function deletePublic(key: string): Promise<void> {
  if (!PUBLIC_BUCKET) return
  await client()
    .send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key }))
    .catch(() => {})
}

export async function deletePrivate(key: string): Promise<void> {
  if (!PRIVATE_BUCKET) return
  await client()
    .send(new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }))
    .catch(() => {})
}

export async function getPrivateBytes(key: string): Promise<Buffer | null> {
  if (!PRIVATE_BUCKET) return null
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }))
    if (!res.Body) return null
    const stream = res.Body as Readable
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } catch {
    return null
  }
}

export { r2PublicUrl } from './cdn'
