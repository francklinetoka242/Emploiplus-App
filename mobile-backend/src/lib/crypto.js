import crypto from 'crypto';

export function createHmacToken(payload, secret) {
  const serialized = JSON.stringify(payload);
  const base64Payload = Buffer.from(serialized).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(serialized)
    .digest('base64url');

  return `${base64Payload}.${signature}`;
}

export function verifyHmacToken(token, secret) {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    throw new Error('Invalid token format');
  }

  const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  const payload = JSON.parse(payloadJson);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadJson)
    .digest('base64url');

  if (expectedSignature !== signature) {
    throw new Error('Invalid token signature');
  }

  if (payload.exp && Date.now() > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

export function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
