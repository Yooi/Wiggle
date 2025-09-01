# Signaling Server

A WebSocket-based signaling server for WebRTC peer-to-peer connections.

## Features

- Room-based connection management
- WebRTC signaling message routing
- Participant management
- Connection state tracking

## Setup

```bash
cd signaling-server
npm install
npm start
```

The server will run on `http://localhost:3001` by default.

## API

### WebSocket Events

#### Client to Server

- `join-room`: Join a specific room
- `leave-room`: Leave the current room
- `signal`: Send WebRTC signaling data to peers

#### Server to Client

- `room-joined`: Confirmation of room join
- `room-left`: Confirmation of room leave
- `participant-joined`: New participant joined the room
- `participant-left`: Participant left the room
- `signal`: WebRTC signaling data from peers

## Message Formats

### Join Room
```json
{
  "type": "join-room",
  "roomId": "room-123",
  "nickname": "User Name"
}
```

### Signal
```json
{
  "type": "signal",
  "to": "peer-id",
  "signal": {
    "type": "offer",
    "sdp": "..."
  }
}
```
