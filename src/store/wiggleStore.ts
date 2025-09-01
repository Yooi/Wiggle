import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Libp2pNode } from '../lib/p2p/node'

export interface CallSession {
  id: string
  participants: string[]
  createdAt: Date
  isActive: boolean
}

export interface Participant {
  peerId: string
  nickname: string
  isMuted: boolean
  isConnected: boolean
}

interface WiggleState {
  // P2P Node
  p2pNode: Libp2pNode | null
  isInitializing: boolean
  
  // User State
  nickname: string
  isOnline: boolean
  
  // Call State
  currentCall: CallSession | null
  participants: Map<string, Participant>
  isInCall: boolean
  isMuted: boolean
  
  // Audio State
  localStream: MediaStream | null
  
  // Error Handling
  error: string | null
  
  // Actions
  setP2PNode: (node: Libp2pNode | null) => void
  setIsInitializing: (isInitializing: boolean) => void
  setNickname: (nickname: string) => void
  setIsOnline: (isOnline: boolean) => void
  setCurrentCall: (call: CallSession | null) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (peerId: string) => void
  updateParticipant: (peerId: string, updates: Partial<Participant>) => void
  setIsInCall: (isInCall: boolean) => void
  toggleMute: () => void
  setLocalStream: (stream: MediaStream | null) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  p2pNode: null,
  isInitializing: false,
  nickname: '',
  isOnline: false,
  currentCall: null,
  participants: new Map(),
  isInCall: false,
  isMuted: false,
  localStream: null,
  error: null,
}

export const useWiggleStore = create<WiggleState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setP2PNode: (node) => set({ p2pNode: node }),
    setIsInitializing: (isInitializing) => set({ isInitializing }),
    setNickname: (nickname) => set({ nickname }),
    setIsOnline: (isOnline) => set({ isOnline }),
    setCurrentCall: (call) => set({ currentCall: call }),
    
    addParticipant: (participant) => {
      const participants = new Map(get().participants)
      participants.set(participant.peerId, participant)
      set({ participants })
    },
    
    removeParticipant: (peerId) => {
      const participants = new Map(get().participants)
      participants.delete(peerId)
      set({ participants })
    },
    
    updateParticipant: (peerId, updates) => {
      const participants = new Map(get().participants)
      const existing = participants.get(peerId)
      if (existing) {
        participants.set(peerId, { ...existing, ...updates })
        set({ participants })
      }
    },
    
    setIsInCall: (isInCall) => set({ isInCall }),
    
    toggleMute: () => {
      const { isMuted, localStream } = get()
      const newMuted = !isMuted
      
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = !newMuted
        })
      }
      
      set({ isMuted: newMuted })
    },
    
    setLocalStream: (stream) => set({ localStream: stream }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    
    reset: () => {
      const { localStream } = get()
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
      set(initialState)
    },
  }))
)
