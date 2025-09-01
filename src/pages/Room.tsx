import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Copy, 
  Users
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { audioManager } from '@/lib/audio/AudioManager'
import { WebRTCManager, type SignalData } from '@/lib/webrtc/WebRTCManager'
import { SignalingClient } from '@/lib/signaling/SignalingClient'
import { VoiceOrb } from '@/components/VoiceOrb'

interface Participant {
  id: string
  nickname: string
  isMuted: boolean
  isConnected: boolean
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const webrtcManagerRef = useRef<WebRTCManager | null>(null)
  const signalingClientRef = useRef<SignalingClient | null>(null)
  const [myParticipantId, setMyParticipantId] = useState<string>('')
  
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [nickname, setNickname] = useState('User')
  const [roomUrl, setRoomUrl] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)

  // WebRTC callback handlers
  const handleSignalData = (signalData: SignalData) => {
    console.log('📡 Sending signal data:', signalData)
    // Send signal through signaling server
    if (signalingClientRef.current && signalData.to) {
      signalingClientRef.current.sendSignal(signalData.to, signalData.signal)
    }
  }

  const handleStreamReceived = (peerId: string, stream: MediaStream) => {
    console.log('📥 Remote stream received from:', peerId)
    // Remote participant is already added via signaling events
    // Just log the stream reception
    audioManager.addRemoteStream(peerId, stream)
  }

  const handleConnectionStateChange = (peerId: string, state: string) => {
    console.log(`🔗 Connection state changed for ${peerId}:`, state)
    setParticipants(prev => 
      prev.map(p => 
        p.id === peerId 
          ? { ...p, isConnected: state === 'connected' }
          : p
      )
    )
  }

  useEffect(() => {
    if (roomId) {
      setRoomUrl(`${window.location.origin}/room/${roomId}`)
      // Auto-connect when entering room
      handleConnect()
    }

    // Initialize WebRTC manager and signaling client
    const initWebRTC = async () => {
      try {
        const webrtcManager = new WebRTCManager(
          audioManager,
          {}, // Use default config
          handleSignalData,
          handleStreamReceived,
          handleConnectionStateChange
        )
        
        await webrtcManager.initialize()
        webrtcManagerRef.current = webrtcManager
        console.log('✅ WebRTC Manager initialized')
      } catch (error) {
        console.error('❌ Failed to initialize WebRTC Manager:', error)
      }
    }

    const initSignaling = async () => {
      try {
        const signalingClient = new SignalingClient('ws://localhost:3002')
        
        // Set up event handlers
        signalingClient.onConnected(() => {
          console.log('✅ Connected to signaling server')
        })

        signalingClient.onDisconnected(() => {
          console.log('⚠️ Disconnected from signaling server')
        })

        signalingClient.onRoomJoined((roomId, participantId) => {
          console.log(`✅ Joined room ${roomId} as ${participantId}`)
          setMyParticipantId(participantId)
          
          // Add self as participant when successfully joined
          setParticipants(prev => {
            // Check if self is already in the list
            const hasSelf = prev.some(p => p.id === 'self')
            if (hasSelf) {
              console.log('⚠️ Self already in participants list')
              return prev
            }
            
            const newParticipants = [...prev, {
              id: 'self',
              nickname: nickname,
              isMuted: false,
              isConnected: true
            }]
            console.log('👤 Added self to participants. Total:', newParticipants.length)
            return newParticipants
          })
        })

        signalingClient.onParticipantJoined((participant) => {
          console.log('👥 Participant joined:', participant)
          setParticipants(prev => {
            // Check if participant already exists
            const existing = prev.find(p => p.id === participant.participantId)
            if (existing) {
              console.log('⚠️ Participant already exists:', participant.participantId)
              return prev
            }
            
            const newParticipants = [...prev, {
              id: participant.participantId,
              nickname: participant.nickname,
              isMuted: false,
              isConnected: false // Will be updated when WebRTC connects
            }]
            console.log('👥 Added new participant. Total:', newParticipants.length)
            return newParticipants
          })
          
          // Create WebRTC connection as initiator
          if (webrtcManagerRef.current) {
            webrtcManagerRef.current.createConnection(
              participant.participantId,
              true, // We are the initiator for new participants
              roomId || ''
            )
          }
        })

        signalingClient.onParticipantLeft((participantId) => {
          console.log('👋 Participant left:', participantId)
          setParticipants(prev => prev.filter(p => p.id !== participantId))
          
          // Close WebRTC connection
          if (webrtcManagerRef.current) {
            webrtcManagerRef.current.closeConnection(participantId)
          }
        })

        signalingClient.onExistingParticipants((participants) => {
          console.log('👥 Existing participants:', participants)
          // Add existing participants and create connections
          participants.forEach(participant => {
            setParticipants(prev => {
              // Check if participant already exists
              const existing = prev.find(p => p.id === participant.participantId)
              if (existing) {
                console.log('⚠️ Existing participant already in list:', participant.participantId)
                return prev
              }
              
              return [...prev, {
                id: participant.participantId,
                nickname: participant.nickname,
                isMuted: false,
                isConnected: false
              }]
            })
            
            // Create WebRTC connection as non-initiator (existing participants initiate)
            if (webrtcManagerRef.current) {
              webrtcManagerRef.current.createConnection(
                participant.participantId,
                false, // They are the initiator for existing connections
                roomId || ''
              )
            }
          })
        })

        signalingClient.onSignalReceived((from, signal) => {
          console.log('📡 Signal received from:', from)
          if (webrtcManagerRef.current) {
            webrtcManagerRef.current.handleSignal({
              from,
              to: myParticipantId,
              signal,
              callId: roomId || '',
              type: signal.type || 'unknown'
            })
          }
        })

        signalingClient.onError((error) => {
          console.error('❌ Signaling error:', error)
          toast.error(`Signaling error: ${error}`)
        })

        await signalingClient.connect()
        signalingClientRef.current = signalingClient
        console.log('✅ Signaling Client initialized')
      } catch (error) {
        console.error('❌ Failed to initialize Signaling Client:', error)
        toast.error('Failed to connect to signaling server')
      }
    }

    initWebRTC()
    initSignaling()

    // Cleanup on unmount
    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanup()
        webrtcManagerRef.current = null
      }
      if (signalingClientRef.current) {
        signalingClientRef.current.disconnect()
        signalingClientRef.current = null
      }
    }
  }, [roomId])

  // Real-time audio level monitoring
  useEffect(() => {
    if (!isConnected || isMuted) {
      setAudioLevel(0)
      return
    }

    // Use real audio level from AudioManager
    const interval = setInterval(() => {
      const level = audioManager.getVolumeLevel()
      setAudioLevel(level)
    }, 100)

    return () => clearInterval(interval)
  }, [isConnected, isMuted])

  const handleConnect = async () => {
    if (!roomId) return
    
    setIsConnecting(true)
    try {
      // Initialize audio system
      await audioManager.initialize()
      
      // Get user's audio stream
      await audioManager.getUserAudioStream()
      
      // Ensure we have a local audio stream before creating WebRTC connection
      const localStream = audioManager.getLocalStream()
      if (!localStream) {
        throw new Error('Failed to obtain local audio stream')
      }
      
      console.log('✅ Local audio stream ready')
      
      // Join room through signaling server
      if (signalingClientRef.current) {
        signalingClientRef.current.joinRoom(roomId, nickname)
      } else {
        throw new Error('Signaling client not connected')
      }
      
      // Connection successful
      setIsConnected(true)
      toast.success('Connected to room')
    } catch (error) {
      console.error('Connection failed:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('audio stream')) {
          toast.error('Failed to access microphone. Please allow microphone access and try again.')
        } else if (error.message.includes('WebRTC')) {
          toast.error('Failed to establish connection. Please check your network and try again.')
        } else {
          toast.error(`Connection failed: ${error.message}`)
        }
      } else {
        toast.error('Failed to connect, please try again')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setParticipants([])
    audioManager.cleanup()
    
    // Leave room through signaling server
    if (signalingClientRef.current) {
      signalingClientRef.current.leaveRoom()
    }
    
    // Cleanup WebRTC connections
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.closeAllConnections()
    }
    
    navigate('/')
  }

  const toggleMute = async () => {
    try {
      await audioManager.toggleMute()
      const newMutedState = !isMuted
      setIsMuted(newMutedState)
      
      // Broadcast mute status through WebRTC
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.broadcastMuteStatus(newMutedState)
      }
      
      // Update participant status
      setParticipants(prev => 
        prev.map(p => 
          p.id === 'self' ? { ...p, isMuted: newMutedState } : p
        )
      )
      
      toast.success(newMutedState ? 'Microphone muted' : 'Microphone unmuted')
    } catch (error) {
      console.error('Failed to toggle mute:', error)
      toast.error('Operation failed')
    }
  }

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl)
      toast.success('Room link copied')
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Copy failed')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
      {/* Header - Fixed height */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm flex-shrink-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xs sm:text-sm">W</span>
                </div>
                <span className="text-lg sm:text-xl font-semibold text-white">Wiggle</span>
              </Link>
              
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-white/70 text-sm">Room:</span>
                <code className="text-xs sm:text-sm bg-white/10 text-white px-2 py-1 rounded">
                  {roomId?.substring(0, 8)}...
                </code>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge 
                variant={isConnected ? "default" : "secondary"} 
                className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs sm:text-sm"
              >
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomLink}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Copy Link</span>
                <span className="sm:hidden">Copy</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Fill remaining space */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 overflow-hidden">
        <div className="w-full max-w-4xl">
          
          {/* Connection Status */}
          {!isConnected && (
            <div className="text-center">
              <div className="mb-6 sm:mb-8">
                {isConnecting ? (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                ) : (
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-white/60 mx-auto mb-4" />
                )}
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">
                {isConnecting ? 'Connecting to room...' : 'Ready to join room'}
              </h2>
              
              <p className="text-white/70 mb-6 sm:mb-8 text-sm sm:text-base">
                {isConnecting 
                  ? 'Establishing P2P connection, please wait...' 
                  : 'Click the button below to start voice chat'
                }
              </p>
              
              {!isConnecting && (
                <Button 
                  onClick={handleConnect} 
                  size="lg" 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3"
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Join Voice Chat
                </Button>
              )}
            </div>
          )}

          {/* Connected State - Voice Sphere */}
          {isConnected && (
            <div className="flex flex-col items-center justify-center h-full">
              {/* Voice Visualization - Responsive size */}
              <div className="mb-4 sm:mb-6 lg:mb-8">
                <VoiceOrb 
                  isActive={isConnected} 
                  isMuted={isMuted}
                  audioLevel={audioLevel}
                  size={200} // Will be handled responsively in the component
                />
              </div>

              {/* Participants count */}
              <div className="mb-4 sm:mb-6 lg:mb-8">
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white/70" />
                  <span className="text-white/90 text-xs sm:text-sm font-medium">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Control Buttons - Responsive */}
              <div className="flex justify-center items-center space-x-6 sm:space-x-8">
                <Button
                  onClick={toggleMute}
                  size="lg"
                  className={`w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full transition-all duration-200 ${
                    isMuted 
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                      : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                  } text-white border-0`}
                >
                  {isMuted ? (
                    <MicOff 
                      className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" 
                      style={{ minWidth: '24px', minHeight: '24px' }}
                    />
                  ) : (
                    <Mic 
                      className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" 
                      style={{ minWidth: '24px', minHeight: '24px' }}
                    />
                  )}
                </Button>

                <Button
                  onClick={handleDisconnect}
                  size="lg"
                  className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full bg-gray-600 hover:bg-gray-700 text-white border-0 shadow-lg shadow-gray-600/25 transition-all duration-200"
                >
                  <PhoneOff 
                    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" 
                    style={{ minWidth: '24px', minHeight: '24px' }}
                  />
                </Button>
              </div>

              {/* Status text */}
              <div className="mt-4 sm:mt-6">
                <p className="text-white/60 text-xs sm:text-sm">
                  {isMuted ? 'Microphone is muted' : 'Microphone is active'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
