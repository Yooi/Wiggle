/**
 * WebSocket 信令客户端管理器
 * 用于与信令服务器通信，处理房间加入/离开和WebRTC信号传输
 */

export interface SignalingMessage {
  type: string
  [key: string]: any
}

export interface Participant {
  participantId: string
  nickname: string
}

export class SignalingClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private isIntentionalClose = false

  // Event handlers
  private onConnectedHandler?: () => void
  private onDisconnectedHandler?: () => void
  private onRoomJoinedHandler?: (roomId: string, participantId: string) => void
  private onRoomLeftHandler?: (roomId: string) => void
  private onParticipantJoinedHandler?: (participant: Participant) => void
  private onParticipantLeftHandler?: (participantId: string) => void
  private onSignalReceivedHandler?: (from: string, signal: any) => void
  private onExistingParticipantsHandler?: (participants: Participant[]) => void
  private onErrorHandler?: (error: string) => void

  constructor(url?: string) {
    // 支持环境变量配置
    this.url = url || 
      import.meta.env.VITE_SIGNALING_URL || 
      (import.meta.env.DEV 
        ? 'ws://localhost:3002' 
        : `wss://${window.location.host}/api/ws`)
  }

  /**
   * 连接到信令服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting'))
        return
      }

      this.isConnecting = true
      this.isIntentionalClose = false

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('🔗 Connected to signaling server')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.onConnectedHandler?.()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('❌ Error parsing signaling message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('🔌 Disconnected from signaling server', event.code)
          this.isConnecting = false
          this.onDisconnectedHandler?.()
          
          // Auto-reconnect unless it was intentional
          if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.isIntentionalClose = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string, nickname: string) {
    this.sendMessage({
      type: 'join-room',
      roomId,
      nickname
    })
  }

  /**
   * 离开房间
   */
  leaveRoom() {
    this.sendMessage({
      type: 'leave-room'
    })
  }

  /**
   * 发送信号数据
   */
  sendSignal(to: string, signal: any) {
    this.sendMessage({
      type: 'signal',
      to,
      signal
    })
  }

  /**
   * 发送消息到信令服务器
   */
  private sendMessage(message: SignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected')
    }
  }

  /**
   * 处理来自服务器的消息
   */
  private handleMessage(message: SignalingMessage) {
    console.log('📨 Received signaling message:', message.type)

    switch (message.type) {
      case 'connected':
        // Server confirmed connection
        break

      case 'room-joined':
        this.onRoomJoinedHandler?.(message.roomId, message.participantId)
        break

      case 'room-left':
        this.onRoomLeftHandler?.(message.roomId)
        break

      case 'participant-joined':
        this.onParticipantJoinedHandler?.({
          participantId: message.participantId,
          nickname: message.nickname
        })
        break

      case 'participant-left':
        this.onParticipantLeftHandler?.(message.participantId)
        break

      case 'existing-participants':
        this.onExistingParticipantsHandler?.(message.participants)
        break

      case 'signal':
        this.onSignalReceivedHandler?.(message.from, message.signal)
        break

      case 'error':
        console.error('❌ Signaling server error:', message.message)
        this.onErrorHandler?.(message.message)
        break

      default:
        console.warn('⚠️ Unknown signaling message type:', message.type)
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ Reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Event handler setters
  onConnected(handler: () => void) {
    this.onConnectedHandler = handler
  }

  onDisconnected(handler: () => void) {
    this.onDisconnectedHandler = handler
  }

  onRoomJoined(handler: (roomId: string, participantId: string) => void) {
    this.onRoomJoinedHandler = handler
  }

  onRoomLeft(handler: (roomId: string) => void) {
    this.onRoomLeftHandler = handler
  }

  onParticipantJoined(handler: (participant: Participant) => void) {
    this.onParticipantJoinedHandler = handler
  }

  onParticipantLeft(handler: (participantId: string) => void) {
    this.onParticipantLeftHandler = handler
  }

  onSignalReceived(handler: (from: string, signal: any) => void) {
    this.onSignalReceivedHandler = handler
  }

  onExistingParticipants(handler: (participants: Participant[]) => void) {
    this.onExistingParticipantsHandler = handler
  }

  onError(handler: (error: string) => void) {
    this.onErrorHandler = handler
  }
}
