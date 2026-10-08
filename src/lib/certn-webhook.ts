import { createHmac, timingSafeEqual } from 'crypto';

/** Certn v1: https://docs.certn.co/api/guides/use-the-api/webhooks */
export function verifyCertnSignature(body: string, header: string | null, secret: string, now = Date.now()) {
  if (!secret.trim() || !header) return false;
  const fields = header.split(',').map(value => value.trim().split('='));
  const timestamps = fields.filter(([key]) => key === 't');
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1] || '')) return false;
  const timestamp = timestamps[0][1];
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  return fields.some(([scheme, signature]) => scheme === 'v1' && /^[a-fA-F0-9]{64}$/.test(signature || '') &&
    timingSafeEqual(expected, Buffer.from(signature, 'hex')));
}
