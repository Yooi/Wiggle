// Basic demo version with WebRTC audio functionality
import { useState, useEffect, useRef } from 'react'
import { initializeP2PNode } from './lib/p2p/node'
import { AudioControls } from './components/AudioControls'

// 临时类型定义
class AudioManager {
  private localStream: MediaStream | null = null
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return
    console.log('🎵 Initializing AudioManager...')
    this.isInitialized = true
  }

  async getUserAudioStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      this.localStream = stream
      console.log('✅ Got user audio stream')
      return stream
    } catch (error) {
      console.error('❌ Failed to get audio stream:', error)
      throw error
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) return false
    
    const audioTracks = this.localStream.getAudioTracks()
    const newMutedState = !audioTracks[0]?.enabled
    
    audioTracks.forEach(track => {
      track.enabled = !newMutedState
    })
    
    return newMutedState
  }

  getVolumeLevel(): number {
    return Math.floor(Math.random() * 50) + 10 // 模拟音量
  }

  async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
          kind: 'audioinput' as const
        }))
    } catch (error) {
      console.error('Failed to get audio devices:', error)
      return []
    }
  }

  getLocalStream() {
    return this.localStream
  }

  stopAllStreams() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
  }
}

interface DemoState {
  nickname: string
  isInCall: boolean
  isMuted: boolean
  callId: string
  participants: Array<{ id: string; name: string; isMuted: boolean }>
}

export function DemoApp() {
  const [state, setState] = useState<DemoState>({
    nickname: '',
    isInCall: false,
    isMuted: false,
    callId: '',
    participants: []
  })

  const [callToken, setCallToken] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [p2pTesting, setP2pTesting] = useState(false)
  const [p2pNode, setP2pNode] = useState<any>(null)
  
  // 音频相关状态
  const [audioManager, setAudioManager] = useState<AudioManager | null>(null)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)

  // 初始化音频管理器
  useEffect(() => {
    const initAudio = async () => {
      try {
        const manager = new AudioManager()
        await manager.initialize()
        setAudioManager(manager)
        setAudioInitialized(true)
        console.log('✅ Audio system ready')
      } catch (error) {
        console.error('❌ Failed to initialize audio:', error)
      }
    }

    initAudio()

    return () => {
      if (audioManager) {
        audioManager.stopAllStreams()
      }
    }
  }, [])

  const testP2P = async () => {
    if (p2pTesting) return
    
    setP2pTesting(true)
    console.log('Testing P2P node initialization...')
    
    try {
      const node = await initializeP2PNode()
      setP2pNode(node)
      console.log('✅ P2P node initialized successfully!')
      console.log('Peer ID:', node.peerId.toString())
      console.log('Node status:', node.status)
      
      // Test message publishing
      setTimeout(async () => {
        try {
          console.log('Testing message publishing...')
          await node.services.pubsub.publish('test-topic', new TextEncoder().encode('Hello from Wiggle!'))
          console.log('✅ Message published successfully!')
        } catch (err) {
          console.error('❌ Message publishing failed:', err)
        }
      }, 2000)
      
    } catch (err) {
      console.error('❌ P2P node initialization failed:', err)
    }
  }

  const generateCallId = () => {
    return Math.random().toString(36).substring(2, 15)
  }

  const createCall = async () => {
    if (!state.nickname.trim()) {
      alert('请输入昵称')
      return
    }

    if (!audioManager) {
      alert('音频系统未就绪')
      return
    }

    setIsCreating(true)
    try {
      // 获取用户音频流
      console.log('🎤 Getting user audio stream...')
      await audioManager.getUserAudioStream()
      
      const newCallId = generateCallId()
      const token = btoa(JSON.stringify({ callId: newCallId, nickname: state.nickname }))
      
      setState(prev => ({ ...prev, callId: newCallId, isInCall: true }))
      setCallToken(token)
      
      console.log('✅ Call created with audio!')
    } catch (error) {
      console.error('❌ Failed to create call:', error)
      alert('无法访问麦克风，请检查权限设置')
    }
    setIsCreating(false)
  }

  const joinCall = async () => {
    if (!state.nickname.trim()) {
      alert('请输入昵称')
      return
    }

    if (!callToken.trim()) {
      alert('请输入通话令牌')
      return
    }

    if (!audioManager) {
      alert('音频系统未就绪')
      return
    }

    setIsJoining(true)
    try {
      // 获取用户音频流
      console.log('🎤 Getting user audio stream...')
      await audioManager.getUserAudioStream()
      
      const tokenData = JSON.parse(atob(callToken))
      setState(prev => ({ 
        ...prev, 
        callId: tokenData.callId, 
        isInCall: true,
        participants: [{ id: 'demo-peer', name: 'Demo User', isMuted: false }]
      }))
      
      console.log('✅ Joined call with audio!')
    } catch (error) {
      console.error('❌ Failed to join call:', error)
      if (error instanceof SyntaxError) {
        alert('无效的通话令牌')
      } else {
        alert('无法访问麦克风，请检查权限设置')
      }
    }
    setIsJoining(false)
  }

  const leaveCall = () => {
    // 停止音频流
    if (audioManager) {
      audioManager.stopAllStreams()
      console.log('🛑 Audio streams stopped')
    }

    setState(prev => ({ 
      ...prev, 
      isInCall: false, 
      callId: '', 
      participants: [],
      isMuted: false
    }))
    setCallToken('')
    console.log('👋 Left call')
  }

  const handleMuteToggle = (isMuted: boolean) => {
    setState(prev => ({ ...prev, isMuted }))
    console.log(`🔇 Audio ${isMuted ? 'muted' : 'unmuted'}`)
  }

  const handleVolumeChange = (level: number) => {
    setVolumeLevel(level)
  }

  const copyToken = () => {
    navigator.clipboard.writeText(callToken)
    alert('Token copied!')
  }

  if (state.isInCall) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>🎙️ 通话中: {state.callId}</h2>
          <div style={{ marginTop: '10px' }}>
            <label>分享此令牌: </label>
            <input 
              type="text" 
              value={callToken} 
              readOnly 
              style={{ width: '300px', padding: '5px', marginRight: '10px' }}
            />
            <button onClick={copyToken} style={{ padding: '5px 10px' }}>复制</button>
          </div>
        </div>

        {/* 音频控制面板 */}
        <AudioControls
          audioManager={audioManager}
          isInCall={state.isInCall}
          onMuteToggle={handleMuteToggle}
          onVolumeChange={handleVolumeChange}
        />

        <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Call Controls</h3>
          <button 
            onClick={() => audioManager && handleMuteToggle(audioManager.toggleMute())}
            style={{ 
              padding: '10px 20px', 
              marginRight: '10px',
              backgroundColor: state.isMuted ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {state.isMuted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
          <button 
            onClick={leaveCall}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            📞 Leave Call
          </button>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Participants ({state.participants.length + 1})</h3>
          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <strong>{state.nickname} (You)</strong>
            <span style={{ marginLeft: '10px' }}>
              {state.isMuted ? '🔇' : '🎤'} ● Online
            </span>
          </div>
          {state.participants.map(participant => (
            <div key={participant.id} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>{participant.name}</strong>
              <span style={{ marginLeft: '10px' }}>
                {participant.isMuted ? '🔇' : '🎤'} ● Online
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>🎙️ Wiggle</h1>
        <p>Decentralized voice chat demo</p>
      </div>

      {/* P2P Test Section */}
      <div style={{ marginBottom: '20px', padding: '20px', border: '2px solid #007bff', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        <h3>🔬 P2P Network Test</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Test the real libp2p networking functionality
        </p>
        <button
          onClick={testP2P}
          disabled={p2pTesting}
          style={{ 
            padding: '10px 20px',
            backgroundColor: p2pTesting ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {p2pTesting ? '⏳ Testing P2P...' : '🚀 Test P2P Node'}
        </button>
        {p2pNode && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
            <small>✅ P2P Node Active - Check console for details</small>
          </div>
        )}
      </div>

      {/* 音频系统状态 */}
      <div style={{ marginBottom: '20px', padding: '20px', border: '2px solid #28a745', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        <h3>🎵 音频系统状态</h3>
        <div style={{ fontSize: '14px', marginBottom: '10px' }}>
          <div>状态: {audioInitialized ? '✅ 已就绪' : '⏳ 初始化中...'}</div>
          <div>音频流: {audioManager?.getLocalStream() ? '✅ 已获取' : '❌ 未获取'}</div>
          {volumeLevel > 0 && <div>音量级别: {volumeLevel}%</div>}
        </div>
        {!audioInitialized && (
          <div style={{ padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}>
            ⚠️ 需要麦克风权限才能进行语音通话
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Your Nickname</h3>
        <input
          type="text"
          placeholder="Enter your nickname"
          value={state.nickname}
          onChange={(e: any) => setState(prev => ({ ...prev, nickname: e.target.value }))}
          style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>👥 Start New Call</h3>
        <button
          onClick={createCall}
          disabled={isCreating}
          style={{ 
            width: '100%',
            padding: '15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        >
          {isCreating ? 'Creating...' : '📞 Create Call'}
        </button>
      </div>

      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Join Existing Call</h3>
        <input
          type="text"
          placeholder="Paste call token here"
          value={callToken}
          onChange={(e) => setCallToken(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            marginBottom: '10px'
          }}
        />
        <button
          onClick={joinCall}
          disabled={isJoining}
          style={{ 
            width: '100%',
            padding: '15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        >
          {isJoining ? 'Joining...' : '📞 Join Call'}
        </button>
      </div>
    </div>
  )
}
