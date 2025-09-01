/**
 * WebRTC Audio Manager
 * 处理音频流获取、播放和管理
 */

export interface AudioConfig {
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
  sampleRate: number
  channelCount: number
}

export interface AudioDeviceInfo {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

export class AudioManager {
  private localStream: MediaStream | null = null
  private remoteStreams: Map<string, MediaStream> = new Map()
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private isInitialized = false

  private defaultConfig: AudioConfig = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 2
  }

  constructor(private config: AudioConfig = {} as AudioConfig) {
    this.config = { ...this.defaultConfig, ...config }
  }

  /**
   * 初始化音频系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      console.log('🎵 Audio context created:', this.audioContext.state)

      // 检查权限
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      console.log('🎤 Microphone permission:', permissions.state)

      this.isInitialized = true
      console.log('✅ AudioManager initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error)
      throw error
    }
  }

  /**
   * 获取用户的音频流
   */
  async getUserAudioStream(deviceId?: string): Promise<MediaStream> {
    if (!this.isInitialized) {
      throw new Error('AudioManager not initialized')
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount
        },
        video: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.localStream = stream

      // 设置音频分析器
      if (this.audioContext) {
        this.setupAudioAnalyser(stream)
      }

      console.log('✅ Local audio stream obtained')
      return stream
    } catch (error) {
      console.error('❌ Failed to get user audio stream:', error)
      throw error
    }
  }

  /**
   * 设置音频分析器用于音量检测
   */
  private setupAudioAnalyser(stream: MediaStream): void {
    if (!this.audioContext) return

    try {
      const source = this.audioContext.createMediaStreamSource(stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)
      
      console.log('✅ Audio analyser setup complete')
    } catch (error) {
      console.error('❌ Failed to setup audio analyser:', error)
    }
  }

  /**
   * 获取当前音量级别 (0-100)
   */
  getVolumeLevel(): number {
    if (!this.analyser) return 0

    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)

    // 计算平均音量
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i]
    }
    
    const average = sum / bufferLength
    return Math.round((average / 255) * 100)
  }

  /**
   * 静音/取消静音本地音频
   */
  toggleMute(): boolean {
    if (!this.localStream) return false

    const audioTracks = this.localStream.getAudioTracks()
    const newMutedState = !audioTracks[0]?.enabled

    audioTracks.forEach(track => {
      track.enabled = !newMutedState
    })

    console.log(`🔇 Local audio ${newMutedState ? 'muted' : 'unmuted'}`)
    return newMutedState
  }

  /**
   * 检查当前是否静音
   */
  isMuted(): boolean {
    if (!this.localStream) return true

    const audioTracks = this.localStream.getAudioTracks()
    return audioTracks.length === 0 || !audioTracks[0]?.enabled
  }

  /**
   * 添加远程音频流
   */
  addRemoteStream(peerId: string, stream: MediaStream): void {
    this.remoteStreams.set(peerId, stream)
    console.log(`📥 Added remote stream for peer: ${peerId}`)
  }

  /**
   * 移除远程音频流
   */
  removeRemoteStream(peerId: string): void {
    const stream = this.remoteStreams.get(peerId)
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      this.remoteStreams.delete(peerId)
      console.log(`📤 Removed remote stream for peer: ${peerId}`)
    }
  }

  /**
   * 获取可用的音频设备
   */
  async getAudioDevices(): Promise<AudioDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind} ${device.deviceId.slice(0, 5)}...`,
          kind: device.kind as 'audioinput' | 'audiooutput'
        }))
    } catch (error) {
      console.error('❌ Failed to enumerate audio devices:', error)
      return []
    }
  }

  /**
   * 获取本地流
   */
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  /**
   * 获取远程流
   */
  getRemoteStream(peerId: string): MediaStream | null {
    return this.remoteStreams.get(peerId) || null
  }

  /**
   * 获取所有远程流
   */
  getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams)
  }

  /**
   * 停止所有音频流
   */
  stopAllStreams(): void {
    // 停止本地流
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // 停止所有远程流
    this.remoteStreams.forEach((stream, peerId) => {
      stream.getTracks().forEach(track => track.stop())
    })
    this.remoteStreams.clear()

    console.log('🛑 All audio streams stopped')
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopAllStreams()

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyser = null
    this.isInitialized = false
    console.log('🧹 AudioManager cleaned up')
  }
}

// Export a singleton instance
export const audioManager = new AudioManager()
