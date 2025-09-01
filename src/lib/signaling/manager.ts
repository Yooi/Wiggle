import type { Libp2p } from 'libp2p'
import { publishMessage, parseMessage, type WiggleMessage } from '../p2p/node'
import { audioManager } from '../audio/manager'
import { useWiggleStore } from '../../store/wiggleStore'

export class SignalingManager {
  private node: Libp2p | null = null
  private currentCallId: string | null = null
  private nickname: string = ''

  initialize(node: Libp2p, nickname: string) {
    this.node = node
    this.nickname = nickname

    // Listen for PubSub messages
    const pubsub = node.services.pubsub as any
    pubsub.addEventListener('message', (event: any) => {
      const message = parseMessage(event.detail.data)
      if (message) {
        this.handleMessage(message)
      }
    })

    // Set up audio manager callbacks
    audioManager.setConnectionUpdateCallback((peerId, isConnected) => {
      const store = useWiggleStore.getState()
      store.updateParticipant(peerId, { isConnected })
    })

    audioManager.setStreamReceivedCallback((peerId, stream) => {
      // Play the received audio stream
      this.playRemoteStream(stream, peerId)
    })
  }

  private async handleMessage(message: any) {
    const myPeerId = this.node?.peerId.toString()
    
    // Ignore messages from ourselves
    if (message.peerId === myPeerId) {
      return
    }

    switch (message.type) {
      case 'join-call':
        await this.handleJoinCall(message)
        break
      case 'leave-call':
        await this.handleLeaveCall(message)
        break
      case 'signal':
        await this.handleSignal(message)
        break
      default:
        console.log('Unknown message type:', message.type)
    }
  }

  private async handleJoinCall(message: any) {
    if (message.callId !== this.currentCallId) {
      return
    }

    const store = useWiggleStore.getState()
    
    // Add participant to store
    store.addParticipant({
      peerId: message.peerId,
      nickname: message.nickname,
      isMuted: false,
      isConnected: false,
    })

    console.log('Participant joined:', message.nickname)
  }

  private async handleLeaveCall(message: any) {
    if (message.callId !== this.currentCallId) {
      return
    }

    const store = useWiggleStore.getState()
    store.removeParticipant(message.peerId)
    console.log('Participant left:', message.nickname)
  }

  private async handleSignal(message: any) {
    if (message.callId !== this.currentCallId) {
      return
    }

    console.log('Received signal from:', message.peerId)
    // Handle WebRTC signaling here
  }

  async joinCall(callId: string) {
    if (!this.node) {
      throw new Error('P2P node not initialized')
    }

    this.currentCallId = callId

    // Initialize local audio stream
    try {
      const stream = await audioManager.initializeLocalStream()
      useWiggleStore.getState().setLocalStream(stream)
    } catch (error) {
      throw new Error('Failed to initialize microphone')
    }

    // Announce joining the call
    await publishMessage(this.node, {
      type: 'join-call',
      callId,
      peerId: this.node.peerId.toString(),
      nickname: this.nickname,
      timestamp: Date.now(),
    })

    useWiggleStore.getState().setIsInCall(true)
  }

  async leaveCall() {
    if (!this.node || !this.currentCallId) {
      return
    }

    // Announce leaving the call
    await publishMessage(this.node, {
      type: 'leave-call',
      callId: this.currentCallId,
      peerId: this.node.peerId.toString(),
      nickname: this.nickname,
      timestamp: Date.now(),
    })

    // Clean up
    audioManager.cleanup()
    this.currentCallId = null

    const store = useWiggleStore.getState()
    store.setIsInCall(false)
    store.setCurrentCall(null)
    store.participants.clear()
  }

  private playRemoteStream(stream: MediaStream, peerId: string) {
    // Create audio element to play remote stream
    const audio = document.createElement('audio')
    audio.srcObject = stream
    audio.autoplay = true
    audio.id = `audio-${peerId}`
    
    // Remove existing audio element if any
    const existing = document.getElementById(`audio-${peerId}`)
    if (existing) {
      existing.remove()
    }
    
    // Add to DOM (hidden)
    audio.style.display = 'none'
    document.body.appendChild(audio)
  }

  getCurrentCallId(): string | null {
    return this.currentCallId
  }
}

// Create singleton instance
export const signalingManager = new SignalingManager()
