import { createHmac, createHash } from 'crypto';

const ENDPOINT = process.env.STORAGE_ENDPOINT || '';
const ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.STORAGE_BUCKET || '';
const REGION = process.env.STORAGE_REGION || 'ap-southeast-2';

function hash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function hmacHex(key: string | Buffer, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

function presign(method: string, key: string, expires = 3600, contentType?: string): string {
  if (!ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
    throw new Error('storage not configured');
  }
  const url = new URL(`${ENDPOINT.replace(/\/$/, '')}/${BUCKET}/${key}`);
  const host = url.host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const credential = `${ACCESS_KEY_ID}/${scope}`;

  const headers: string[] = [`host:${host}`];
  if (contentType && method === 'PUT') {
    headers.push(`content-type:${contentType}`);
  }
  const signedHeaders = headers.map(h => h.split(':')[0]).join(';');
  const canonicalHeaders = headers.join('\n') + '\n';

  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': signedHeaders
  });

  const canonicalRequest = [
    method,
    url.pathname,
    query.toString(),
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    hash(canonicalRequest)
  ].join('\n');

  const kDate = hmac('AWS4' + SECRET_ACCESS_KEY, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmacHex(kSigning, stringToSign);

  query.set('X-Amz-Signature', signature);
  return `${url.toString()}?${query.toString()}`;
}

export function presignUpload(key: string, contentType: string): string {
  return presign('PUT', key, 3600, contentType);
}

export function presignDownload(key: string, expires = 3600): string {
  return presign('GET', key, expires);
}

export { BUCKET };
