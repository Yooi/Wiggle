import { useState, useEffect } from 'react'
import { useWiggleStore } from '../store/wiggleStore'
import { WIGGLE_TOPIC, type WiggleMessage } from '../lib/p2p/node'
import { fromString } from 'uint8arrays/from-string'
import { toString } from 'uint8arrays/to-string'

export function WiggleApp() {
  const { 
    p2pNode, 
    nickname, 
    setNickname, 
    isInCall, 
    setIsInCall,
    isMuted,
    toggleMute,
    participants 
  } = useWiggleStore()

  const [callId, setCallId] = useState('')
  const [messages, setMessages] = useState<string[]>([])

  // Subscribe to messages when node is ready
  useEffect(() => {
    if (!p2pNode) return

    const handleMessage = (msg: any) => {
      try {
        const messageText = toString(msg.data, 'utf8')
        const message: WiggleMessage = JSON.parse(messageText)
        
        setMessages(prev => [...prev, 
          `${new Date().toLocaleTimeString()}: ${message.type} from ${message.nickname}`
        ])
        
        console.log('Received message:', message)
      } catch (err) {
        console.error('Failed to parse message:', err)
      }
    }

    // Subscribe to the topic
    p2pNode.services.pubsub.subscribe(WIGGLE_TOPIC)
    p2pNode.services.pubsub.addEventListener('message', handleMessage)

    return () => {
      p2pNode.services.pubsub.removeEventListener('message', handleMessage)
      p2pNode.services.pubsub.unsubscribe(WIGGLE_TOPIC)
    }
  }, [p2pNode])

  const publishMessage = async (message: Omit<WiggleMessage, 'timestamp'>) => {
    if (!p2pNode) return

    const fullMessage: WiggleMessage = {
      ...message,
      timestamp: Date.now()
    }

    try {
      const data = fromString(JSON.stringify(fullMessage), 'utf8')
      await p2pNode.services.pubsub.publish(WIGGLE_TOPIC, data)
      console.log('Published message:', fullMessage)
    } catch (err) {
      console.error('Failed to publish message:', err)
    }
  }

  const joinCall = async () => {
    if (!nickname.trim() || !callId.trim()) {
      alert('Please enter nickname and call ID')
      return
    }

    setIsInCall(true)
    await publishMessage({
      type: 'join-call',
      callId,
      peerId: p2pNode?.peerId.toString() || '',
      nickname
    })
  }

  const leaveCall = async () => {
    if (!isInCall) return

    setIsInCall(false)
    await publishMessage({
      type: 'leave-call',
      callId,
      peerId: p2pNode?.peerId.toString() || '',
      nickname
    })
  }

  const testMessage = async () => {
    await publishMessage({
      type: 'signal',
      callId: callId || 'test',
      peerId: p2pNode?.peerId.toString() || '',
      nickname: nickname || 'Anonymous',
      data: { test: 'Hello from Wiggle!' }
    })
  }

  if (!p2pNode) {
    return <div>P2P node not initialized</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center text-blue-600">
        Wiggle - P2P Voice Chat
      </h1>

      {/* Node Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Node Information</h2>
        <p><strong>Peer ID:</strong> {p2pNode.peerId.toString()}</p>
        <p><strong>Status:</strong> {p2pNode.status}</p>
      </div>

      {/* User Setup */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">User Setup</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nickname:</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter your nickname"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Call ID:</label>
            <input
              type="text"
              value={callId}
              onChange={(e) => setCallId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter call ID or create new"
            />
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Call Controls</h2>
        <div className="flex gap-4">
          {!isInCall ? (
            <button
              onClick={joinCall}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Join Call
            </button>
          ) : (
            <button
              onClick={leaveCall}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Leave Call
            </button>
          )}
          
          <button
            onClick={toggleMute}
            className={`px-6 py-2 rounded-lg ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={testMessage}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Send Test Message
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Participants ({participants.size})</h2>
        {participants.size === 0 ? (
          <p className="text-gray-500">No participants</p>
        ) : (
          <div className="space-y-2">
            {Array.from(participants.values()).map((participant) => (
              <div key={participant.peerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{participant.nickname}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${participant.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {participant.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  <span className={`text-sm ${participant.isMuted ? 'text-red-600' : 'text-green-600'}`}>
                    {participant.isMuted ? 'Muted' : 'Unmuted'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages Log */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Messages ({messages.length})</h2>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="text-sm font-mono bg-gray-50 p-2 rounded">
                {msg}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
