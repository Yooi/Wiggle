const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class SignalingServer {
  constructor(port = 3001) {
    this.port = port;
    this.rooms = new Map(); // roomId -> Set of participants
    this.participants = new Map(); // participantId -> { ws, roomId, nickname }
    
    this.server = new WebSocket.Server({ port: this.port });
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.server.on('connection', (ws) => {
      const participantId = uuidv4();
      console.log(`📱 New connection: ${participantId}`);

      // Store participant info
      this.participants.set(participantId, {
        ws,
        roomId: null,
        nickname: 'Anonymous'
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(participantId, message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`📱 Connection closed: ${participantId}`);
        this.handleDisconnection(participantId);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${participantId}:`, error);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connected',
        participantId: participantId
      });
    });

    console.log(`🚀 Signaling server running on ws://localhost:${this.port}`);
  }

  handleMessage(participantId, message) {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    console.log(`📨 Message from ${participantId}:`, message.type);

    switch (message.type) {
      case 'join-room':
        this.handleJoinRoom(participantId, message);
        break;
      case 'leave-room':
        this.handleLeaveRoom(participantId);
        break;
      case 'signal':
        this.handleSignal(participantId, message);
        break;
      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
        this.sendError(participant.ws, `Unknown message type: ${message.type}`);
    }
  }

  handleJoinRoom(participantId, message) {
    const { roomId, nickname } = message;
    const participant = this.participants.get(participantId);
    
    if (!participant || !roomId) return;

    // Leave current room if in one
    if (participant.roomId) {
      this.handleLeaveRoom(participantId);
    }

    // Initialize room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }

    const room = this.rooms.get(roomId);
    
    // Update participant info
    participant.roomId = roomId;
    participant.nickname = nickname || 'Anonymous';

    // Add to room
    room.add(participantId);

    console.log(`👥 ${participantId} joined room ${roomId} as "${participant.nickname}"`);

    // Notify the participant they joined successfully
    this.sendMessage(participant.ws, {
      type: 'room-joined',
      roomId: roomId,
      participantId: participantId
    });

    // Notify existing participants about the new participant
    this.broadcastToRoom(roomId, {
      type: 'participant-joined',
      participantId: participantId,
      nickname: participant.nickname
    }, participantId);

    // Send existing participants list to the new participant
    const existingParticipants = Array.from(room)
      .filter(id => id !== participantId)
      .map(id => {
        const p = this.participants.get(id);
        return {
          participantId: id,
          nickname: p?.nickname || 'Anonymous'
        };
      });

    if (existingParticipants.length > 0) {
      this.sendMessage(participant.ws, {
        type: 'existing-participants',
        participants: existingParticipants
      });
    }
  }

  handleLeaveRoom(participantId) {
    const participant = this.participants.get(participantId);
    if (!participant || !participant.roomId) return;

    const roomId = participant.roomId;
    const room = this.rooms.get(roomId);

    if (room) {
      room.delete(participantId);
      
      // Clean up empty room
      if (room.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🏠 Room ${roomId} deleted (empty)`);
      } else {
        // Notify remaining participants
        this.broadcastToRoom(roomId, {
          type: 'participant-left',
          participantId: participantId
        });
      }
    }

    console.log(`👋 ${participantId} left room ${roomId}`);
    
    // Update participant info
    participant.roomId = null;

    // Notify the participant they left
    this.sendMessage(participant.ws, {
      type: 'room-left',
      roomId: roomId
    });
  }

  handleSignal(participantId, message) {
    const { to, signal } = message;
    const targetParticipant = this.participants.get(to);

    if (!targetParticipant) {
      console.warn(`⚠️ Signal target not found: ${to}`);
      return;
    }

    // Forward the signal to the target participant
    this.sendMessage(targetParticipant.ws, {
      type: 'signal',
      from: participantId,
      signal: signal
    });

    console.log(`📡 Signal forwarded from ${participantId} to ${to}`);
  }

  handleDisconnection(participantId) {
    const participant = this.participants.get(participantId);
    
    if (participant && participant.roomId) {
      this.handleLeaveRoom(participantId);
    }

    this.participants.delete(participantId);
  }

  broadcastToRoom(roomId, message, excludeParticipantId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.forEach(participantId => {
      if (participantId === excludeParticipantId) return;
      
      const participant = this.participants.get(participantId);
      if (participant && participant.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(participant.ws, message);
      }
    });
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, errorMessage) {
    this.sendMessage(ws, {
      type: 'error',
      message: errorMessage
    });
  }

  // Get server stats
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalParticipants: this.participants.size,
      rooms: Array.from(this.rooms.entries()).map(([roomId, participants]) => ({
        roomId,
        participantCount: participants.size
      }))
    };
  }
}

// Start the server
const server = new SignalingServer(process.env.PORT || 3002);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down signaling server...');
  server.server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

module.exports = SignalingServer;
