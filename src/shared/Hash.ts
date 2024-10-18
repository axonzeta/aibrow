/**
 * Generates the sha256 hash of a string
 * @param str: the string to generate the hash from
 * @return the sha-hash
 */
export async function sha256 (str: string) {
  const msgBuffer = new TextEncoder().encode(str)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
