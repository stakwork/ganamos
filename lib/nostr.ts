import { SimplePool, Event, getPublicKey, finalizeEvent, generateSecretKey } from 'nostr-tools'

/**
 * Nostr integration for Ganamos
 * Posts new Ganamos issues to Nostr relays
 */

// Popular Nostr relays
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nostr.wine',
  'wss://relay.snort.social',
  'wss://nos.lol',
  'wss://relay.primal.net',
]

let pool: SimplePool | null = null

function getPool() {
  if (!pool) {
    pool = new SimplePool()
  }
  return pool
}

/**
 * Get Ganamos Nostr private key from environment
 * If not set, this will need to be generated once and stored
 */
function getGanamosNostrKey(): Uint8Array {
  const nostrPrivateKeyHex = process.env.NOSTR_PRIVATE_KEY
  
  if (!nostrPrivateKeyHex) {
    throw new Error('NOSTR_PRIVATE_KEY not configured in environment variables')
  }
  
  // Convert hex string to Uint8Array
  const hexArray = nostrPrivateKeyHex.match(/.{1,2}/g)
  if (!hexArray || hexArray.length !== 32) {
    throw new Error('NOSTR_PRIVATE_KEY must be a 64-character hex string (32 bytes)')
  }
  
  return new Uint8Array(hexArray.map(byte => parseInt(byte, 16)))
}

/**
 * Generate a new Nostr key pair (run this once to set up the Ganamos account)
 */
export function generateNostrKeyPair() {
  const sk = generateSecretKey()
  const pk = getPublicKey(sk)
  
  // Convert to hex strings for storage
  const skHex = Array.from(sk).map(b => b.toString(16).padStart(2, '0')).join('')
  const pkHex = Array.from(pk).map(b => b.toString(16).padStart(2, '0')).join('')
  
  return {
    privateKey: skHex,
    publicKey: pkHex,
    // npub format (for sharing with users)
    npub: `Add NOSTR_PRIVATE_KEY=${skHex} to .env.local`,
  }
}

/**
 * Post a Ganamos issue to Nostr
 */
export async function postToNostr(params: {
  title: string
  description: string
  location?: string
  city?: string
  latitude?: number
  longitude?: number
  reward: number
  postId: string
  imageUrl?: string
}) {
  try {
    const { title, description, location, city, latitude, longitude, reward, postId, imageUrl } = params
    
    // Get Ganamos Nostr key
    const sk = getGanamosNostrKey()
    const pk = getPublicKey(sk)
    
    // Format the post content
    const locationText = city || location || 'Unknown location'
    const content = `🏙️ New issue reported in ${locationText}!

"${title}"

${description}

💰 Reward: ${reward.toLocaleString()} sats
📍 ${locationText}

Fix it and earn Bitcoin on Ganamos!

https://www.ganamos.earth/post/${postId}

#Ganamos #Bitcoin #CivicTech #FixYourCity`

    // Build tags
    const tags: string[][] = [
      ['t', 'ganamos'],
      ['t', 'bitcoin'],
      ['t', 'civictech'],
      ['r', `https://www.ganamos.earth/post/${postId}`], // reference URL
    ]
    
    // Add geolocation if available
    if (latitude && longitude) {
      tags.push(['g', `${latitude.toFixed(6)},${longitude.toFixed(6)}`])
    }
    
    // Add image if available
    if (imageUrl) {
      tags.push(['imeta', `url ${imageUrl}`])
    }
    
    // Add city tag
    if (city) {
      tags.push(['t', city.toLowerCase().replace(/\s+/g, '')])
    }
    
    // Create the Nostr event
    const eventTemplate = {
      kind: 1, // Short text note
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    }
    
    // Sign the event
    const signedEvent = finalizeEvent(eventTemplate, sk)
    
    console.log('[NOSTR] Publishing event to relays:', signedEvent.id)
    
    // Publish to relays
    const publishPool = getPool()
    const publishPromises = publishPool.publish(RELAYS, signedEvent)
    
    // Wait for at least one relay to confirm
    const results = await Promise.allSettled(publishPromises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log(`[NOSTR] Published to ${successful}/${RELAYS.length} relays (${failed} failed)`)
    
    return {
      success: successful > 0,
      eventId: signedEvent.id,
      relaysPublished: successful,
      relaysFailed: failed,
    }
  } catch (error) {
    console.error('[NOSTR] Error publishing to Nostr:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Close the connection pool (call this on app shutdown)
 */
export function closeNostrPool() {
  if (pool) {
    pool.close(RELAYS)
    pool = null
  }
}

