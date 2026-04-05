// src/utils/hash.ts
import { createHash } from 'crypto';

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * SimHash for near-duplicate detection
 * Two pages with similar content will have similar hashes
 */
export function simHash(tokens: string[]): bigint {
  const bits = 64;
  const vector = new Array(bits).fill(0);

  for (const token of tokens) {
    const hash = createHash('md5').update(token).digest();
    for (let i = 0; i < bits; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      const bit = (hash[byteIndex] >> bitIndex) & 1;
      vector[i] += bit ? 1 : -1;
    }
  }

  let result = 0n;
  for (let i = 0; i < bits; i++) {
    if (vector[i] > 0) {
      result |= 1n << BigInt(i);
    }
  }

  return result;
}

export function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}