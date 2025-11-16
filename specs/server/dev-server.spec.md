# Development WebSocket Server

Standalone WebSocket server for development mode that runs independently from the Vite dev server.

## Target

[@generate](../../server.dev.ts)

## Capabilities

### WebSocket Server Setup

Creates and configures a WebSocket server on port 3001 for local development.

- Runs on `ws://localhost:3001`
- Uses the `ws` package WebSocketServer
- Handles client connections and disconnections
- Logs connection events for debugging

### Connection Tracking

Maintains maps to track client connections and room associations.

- Tracks which WebSocket belongs to which room and player
- Maintains room-to-websocket mappings for broadcasting
- Cleans up connections on disconnect

### Message Handling

Processes incoming client messages and routes them to appropriate handlers.

- Parses JSON messages from clients
- Validates message types
- Handles createRoom, joinRoom, and makeMove messages
- Sends appropriate responses and error messages

### Room Creation via WebSocket

Handles room creation through WebSocket connection.

- Receives createRoom message with playerName
- Calls room-manager's createRoom function
- Tracks the connection with roomId and playerId
- Sends roomCreated response with roomState

### Room Joining

Handles players joining existing rooms.

- Receives joinRoom message with roomId and playerName
- Calls room-manager's joinRoom function
- Broadcasts playerJoined to all room participants
- Sends gameStart when second player joins

### Move Handling

Processes player moves and broadcasts updates.

- Validates player is connected to a room
- Calls room-manager's makeMove function
- Checks if game is finished after move
- Broadcasts moveMade or gameOver to all players in room

### Disconnect Handling

Manages player disconnections gracefully.

- Removes player from room connections
- Calls room-manager's handleDisconnect
- Notifies remaining players via playerDisconnected message
- Cleans up empty rooms

### Broadcasting

Sends messages to all connected clients in a room.

- Serializes messages to JSON
- Checks WebSocket readyState before sending
- Sends to all clients in the specified room

### Error Handling

Comprehensive error management for all operations.

- Catches and logs parsing errors
- Sends error messages to clients
- Handles unknown message types
- Logs WebSocket errors

## API

```typescript { .api }
// No public API - this is a standalone server script
```

## Dependencies

### WebSocket Library

WebSocket server implementation.
[@use](https://esm.sh/ws@8.18.3)

### Room Manager

Server-side room and game state management.
[@use](../lib/server/room-manager.spec.md)

### Game Types

Shared type definitions for messages and game state.
[@use](../types/game-types.spec.md)
