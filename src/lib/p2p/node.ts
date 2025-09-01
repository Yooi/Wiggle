// Real P2P node implementation using libp2p
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { identify } from '@libp2p/identify'
import { webRTC } from '@libp2p/webrtc'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { fromString } from 'uint8arrays/from-string'
import { toString } from 'uint8arrays/to-string'
import type { Libp2p } from 'libp2p'
import type { GossipSub } from '@chainsafe/libp2p-gossipsub'

export const WIGGLE_TOPIC = 'wiggle-voice-chat'

export interface WiggleMessage {
  type: 'join-call' | 'leave-call' | 'signal' | 'call-request' | 'call-response'
  callId: string
  peerId: string
  nickname: string
  data?: any
  timestamp: number
}

export interface Libp2pNode extends Libp2p {
  services: {
    pubsub: any
    identify: any
  }
}

export const initializeP2PNode = async (): Promise<Libp2pNode> => {
  console.log('Initializing libp2p node...')
  
  const node = await createLibp2p({
    addresses: {
      listen: ['/webrtc']
    },
    transports: [
      webSockets(),
      webRTC(),
      circuitRelayTransport()
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [],
    services: {
      identify: identify(),
      pubsub: gossipsub({
        allowPublishToZeroTopicPeers: true,
        msgIdFn: (msg) => {
          // Create deterministic message ID as Uint8Array
          const id = `${msg.topic}-${Date.now()}-${Math.random()}`
          return fromString(id, 'utf8')
        },
        ignoreDuplicatePublishError: true
      })
    }
  })

  // Start the node
  await node.start()
  console.log('libp2p node started successfully')
  console.log('Peer ID:', node.peerId.toString())

  // Subscribe to the wiggle topic
  const pubsub = node.services.pubsub as any
  await pubsub.subscribe(WIGGLE_TOPIC)
  console.log(`Subscribed to topic: ${WIGGLE_TOPIC}`)

  return node as Libp2pNode
}

export const publishMessage = async (
  node: Libp2p,
  message: WiggleMessage
): Promise<void> => {
  console.log('Publishing message:', message)
  const messageData = fromString(JSON.stringify(message), 'utf8')
  const pubsub = node.services.pubsub as any
  await pubsub.publish(WIGGLE_TOPIC, messageData)
}

export const parseMessage = (data: Uint8Array): WiggleMessage | null => {
  try {
    const messageStr = toString(data, 'utf8')
    return JSON.parse(messageStr) as WiggleMessage
  } catch (error) {
    console.error('Failed to parse message:', error)
    return null
  }
}

export const generateCallId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export const createCallToken = (callId: string, nickname: string): string => {
  // Simple token-like structure for call authorization
  const payload = {
    callId,
    nickname,
    timestamp: Date.now(),
    // In production, you'd add proper cryptographic signing
  }
  
  return btoa(JSON.stringify(payload))
}

export const parseCallToken = (token: string): { callId: string; nickname: string } | null => {
  try {
    const payload = JSON.parse(atob(token))
    
    // Basic validation
    if (!payload.callId || !payload.nickname || !payload.timestamp) {
      return null
    }
    
    // Check if token is not too old (1 hour)
    const age = Date.now() - payload.timestamp
    if (age > 60 * 60 * 1000) {
      return null
    }
    
    return {
      callId: payload.callId,
      nickname: payload.nickname,
    }
  } catch {
    return null
  }
}
