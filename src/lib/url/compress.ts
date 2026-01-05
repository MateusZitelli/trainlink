// Compression utilities using fflate (deflate) with URL-safe base64 encoding
import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate'

// Version prefix for new format
const VERSION = '2'

// Encode Uint8Array to URL-safe base64
function toUrlSafeBase64(data: Uint8Array): string {
  // Convert to binary string
  const binary = strFromU8(data, true) // latin1 mode
  // Encode to base64
  const base64 = btoa(binary)
  // Make URL-safe: replace + with -, / with _, remove padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Decode URL-safe base64 to Uint8Array
function fromUrlSafeBase64(str: string): Uint8Array {
  // Restore standard base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding if needed
  const pad = base64.length % 4
  if (pad) {
    base64 += '='.repeat(4 - pad)
  }
  // Decode from base64
  const binary = atob(base64)
  // Convert to Uint8Array
  return strToU8(binary, true) // latin1 mode
}

// Compress data to URL-safe string with version prefix
export function compress(data: unknown): string {
  const json = JSON.stringify(data)
  const jsonBytes = strToU8(json)
  const compressed = deflateSync(jsonBytes, { level: 9 }) // max compression
  return VERSION + toUrlSafeBase64(compressed)
}

// Decompress URL-safe string back to data
export function decompress(encoded: string): unknown {
  if (!encoded.startsWith(VERSION)) {
    throw new Error(`Unknown compression version: ${encoded[0]}`)
  }
  const base64Data = encoded.slice(VERSION.length)
  const compressed = fromUrlSafeBase64(base64Data)
  const jsonBytes = inflateSync(compressed)
  const json = strFromU8(jsonBytes)
  return JSON.parse(json)
}

// Check if encoded string is v2 format
export function isV2Format(encoded: string): boolean {
  return encoded.startsWith(VERSION)
}
