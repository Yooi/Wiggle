/**
 * WebRTC Connection Manager
 * 处理P2P音频连接的建立、维护和管理
 */

import SimplePeer from 'simple-peer'
import { AudioManager } from '../audio/AudioManager'

export interface WebRTCConfig {
  iceServers?: RTCIceServer[]
  enableDataChannel?: boolean
  dataChannelOptions?: RTCDataChannelInit
}

export interface PeerConnection {
  id: string
  peer: SimplePeer.Instance
  stream?: MediaStream
  isConnected: boolean
  isInitiator: boolean
  createdAt: Date
}

export interface SignalData {
  from: string
  to: string
  signal: SimplePeer.SignalData
  callId: string
  type: 'offer' | 'answer' | 'ice-candidate'
}

export class WebRTCManager {
  private connections: Map<string, PeerConnection> = new Map()
  private audioManager: AudioManager
  private isInitialized = false

  private defaultConfig: WebRTCConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    enableDataChannel: true,
    dataChannelOptions: {
      ordered: true,
      maxRetransmits: 3
    }
  }

  constructor(
    audioManager: AudioManager,
    private config: Partial<WebRTCConfig> = {},
    private onSignal?: (data: SignalData) => void,
    private onStreamReceived?: (peerId: string, stream: MediaStream) => void,
    private onConnectionStateChange?: (peerId: string, state: string) => void
  ) {
    this.audioManager = audioManager
    this.config = { ...this.defaultConfig, ...config }
  }

  /**
   * 初始化WebRTC管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 确保AudioManager已初始化
      await this.audioManager.initialize()
      
      this.isInitialized = true
      console.log('✅ WebRTCManager initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize WebRTCManager:', error)
      throw error
    }
  }

  /**
   * 创建新的P2P连接
   */
  async createConnection(peerId: string, isInitiator: boolean, callId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('WebRTCManager not initialized')
    }

    try {
      // 获取本地音频流
      const localStream = this.audioManager.getLocalStream()
      if (!localStream) {
        throw new Error('No local audio stream available')
      }

      // 创建SimplePeer实例
      const peer = new SimplePeer({
        initiator: isInitiator,
        stream: localStream,
        config: {
          iceServers: this.config.iceServers
        },
        channelConfig: this.config.dataChannelOptions
      })

      const connection: PeerConnection = {
        id: peerId,
        peer,
        isConnected: false,
        isInitiator,
        createdAt: new Date()
      }

      // 设置事件监听器
      this.setupPeerEventListeners(connection, callId)

      // 存储连接
      this.connections.set(peerId, connection)

      console.log(`🔗 Created ${isInitiator ? 'initiator' : 'receiver'} connection for peer: ${peerId}`)
    } catch (error) {
      console.error(`❌ Failed to create connection for peer ${peerId}:`, error)
      throw error
    }
  }

  /**
   * 设置Peer事件监听器
   */
  private setupPeerEventListeners(connection: PeerConnection, callId: string): void {
    const { peer, id: peerId } = connection

    // 信令数据事件
    peer.on('signal', (data: SimplePeer.SignalData) => {
      const signalData: SignalData = {
        from: 'local', // 这应该是本地peer ID
        to: peerId,
        signal: data,
        callId,
        type: data.type as 'offer' | 'answer' | 'ice-candidate'
      }

      console.log(`📡 Sending signal to ${peerId}:`, data.type)
      this.onSignal?.(signalData)
    })

    // 连接建立事件
    peer.on('connect', () => {
      connection.isConnected = true
      console.log(`✅ WebRTC connection established with ${peerId}`)
      this.onConnectionStateChange?.(peerId, 'connected')
    })

    // 接收到远程流事件
    peer.on('stream', (stream: MediaStream) => {
      console.log(`📥 Received remote stream from ${peerId}`)
      connection.stream = stream
      
      // 添加到音频管理器
      this.audioManager.addRemoteStream(peerId, stream)
      
      // 通知上层应用
      this.onStreamReceived?.(peerId, stream)
    })

    // 数据通道消息
    peer.on('data', (data: Uint8Array) => {
      try {
        const message = JSON.parse(data.toString())
        console.log(`📨 Received data from ${peerId}:`, message)
        
        // 处理控制消息（如静音状态等）
        this.handleDataChannelMessage(peerId, message)
      } catch (error) {
        console.error('❌ Failed to parse data channel message:', error)
      }
    })

    // 连接关闭事件
    peer.on('close', () => {
      console.log(`🔌 Connection closed with ${peerId}`)
      connection.isConnected = false
      this.onConnectionStateChange?.(peerId, 'disconnected')
      
      // 清理远程流
      this.audioManager.removeRemoteStream(peerId)
    })

    // 错误事件
    peer.on('error', (error: Error) => {
      console.error(`❌ WebRTC error with ${peerId}:`, error)
      this.onConnectionStateChange?.(peerId, 'error')
    })
  }

  /**
   * 处理接收到的信令数据
   */
  async handleSignal(signalData: SignalData): Promise<void> {
    const { from: peerId, signal } = signalData
    
    try {
      const connection = this.connections.get(peerId)
      if (!connection) {
        console.warn(`⚠️ No connection found for peer: ${peerId}`)
        return
      }

      console.log(`📡 Processing signal from ${peerId}:`, signal.type)
      connection.peer.signal(signal)
    } catch (error) {
      console.error(`❌ Failed to handle signal from ${peerId}:`, error)
    }
  }

  /**
   * 处理数据通道消息
   */
  private handleDataChannelMessage(peerId: string, message: any): void {
    switch (message.type) {
      case 'mute-status':
        console.log(`🔇 Peer ${peerId} mute status: ${message.isMuted}`)
        // 可以在这里更新UI显示对方的静音状态
        break
      
      case 'audio-level':
        // 接收到对方的音频音量信息
        console.log(`🔊 Peer ${peerId} audio level: ${message.level}`)
        break
        
      default:
        console.log(`📝 Unknown message type from ${peerId}:`, message)
    }
  }

  /**
   * 发送数据通道消息
   */
  sendDataChannelMessage(peerId: string, message: any): void {
    const connection = this.connections.get(peerId)
    if (!connection || !connection.isConnected) {
      console.warn(`⚠️ Cannot send message to ${peerId}: connection not available`)
      return
    }

    try {
      const data = JSON.stringify(message)
      connection.peer.send(data)
      console.log(`📤 Sent message to ${peerId}:`, message.type)
    } catch (error) {
      console.error(`❌ Failed to send message to ${peerId}:`, error)
    }
  }

  /**
   * 广播静音状态
   */
  broadcastMuteStatus(isMuted: boolean): void {
    this.connections.forEach((connection, peerId) => {
      if (connection.isConnected) {
        this.sendDataChannelMessage(peerId, {
          type: 'mute-status',
          isMuted,
          timestamp: Date.now()
        })
      }
    })
  }

  /**
   * 广播音频级别
   */
  broadcastAudioLevel(level: number): void {
    this.connections.forEach((connection, peerId) => {
      if (connection.isConnected) {
        this.sendDataChannelMessage(peerId, {
          type: 'audio-level',
          level,
          timestamp: Date.now()
        })
      }
    })
  }

  /**
   * 关闭与特定peer的连接
   */
  closeConnection(peerId: string): void {
    const connection = this.connections.get(peerId)
    if (connection) {
      connection.peer.destroy()
      this.connections.delete(peerId)
      this.audioManager.removeRemoteStream(peerId)
      console.log(`🔌 Closed connection with ${peerId}`)
    }
  }

  /**
   * 获取连接信息
   */
  getConnection(peerId: string): PeerConnection | undefined {
    return this.connections.get(peerId)
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): Map<string, PeerConnection> {
    return new Map(this.connections)
  }

  /**
   * 获取已连接的peer数量
   */
  getConnectedPeerCount(): number {
    return Array.from(this.connections.values()).filter(conn => conn.isConnected).length
  }

  /**
   * 检查是否有活动连接
   */
  hasActiveConnections(): boolean {
    return this.getConnectedPeerCount() > 0
  }

  /**
   * 关闭所有连接
   */
  closeAllConnections(): void {
    this.connections.forEach((connection, peerId) => {
      connection.peer.destroy()
      this.audioManager.removeRemoteStream(peerId)
    })
    this.connections.clear()
    console.log('🔌 All WebRTC connections closed')
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.closeAllConnections()
    this.isInitialized = false
    console.log('🧹 WebRTCManager cleaned up')
  }
}
