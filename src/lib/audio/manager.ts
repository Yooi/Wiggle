// Simplified WebRTC audio manager without libp2p dependencies for now
export interface AudioConnection {
  peerId: string
  isConnected: boolean
}

export class AudioManager {
  private connections: Map<string, AudioConnection> = new Map()
  private localStream: MediaStream | null = null
  private onConnectionUpdate?: (peerId: string, isConnected: boolean) => void
  private onStreamReceived?: (peerId: string, stream: MediaStream) => void

  setConnectionUpdateCallback(callback: (peerId: string, isConnected: boolean) => void) {
    this.onConnectionUpdate = callback
  }

  setStreamReceivedCallback(callback: (peerId: string, stream: MediaStream) => void) {
    this.onStreamReceived = callback
  }

  async initializeLocalStream(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: false,
      })
      
      return this.localStream
    } catch (error) {
      console.error('Failed to get user media:', error)
      throw new Error('Could not access microphone')
    }
  }

  muteLocalStream(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted
      })
    }
  }

  getConnectionStatus(peerId: string): boolean {
    const connection = this.connections.get(peerId)
    return connection?.isConnected || false
  }

  getAllConnections(): AudioConnection[] {
    return Array.from(this.connections.values())
  }

  cleanup() {
    this.connections.clear()

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
  }
}

// Create a singleton instance
export const audioManager = new AudioManager()
