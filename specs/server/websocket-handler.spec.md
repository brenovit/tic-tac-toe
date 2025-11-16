# WebSocket Handler

WebSocket server handler that integrates with SvelteKit server hooks to provide real-time multiplayer tic-tac-toe game functionality.

## Target

[@generate](../../src/hooks.server.ts)

## Capabilities

### SvelteKit Hook Integration

Provides a handle function that intercepts HTTP upgrade requests for WebSocket connections while passing other requests to SvelteKit's normal handling.

- Detects WebSocket upgrade requests using request headers
- Handles WebSocket protocol upgrade using the 'ws' library
- Delegates non-WebSocket requests to SvelteKit's resolve function
- Integrates seamlessly with SvelteKit's hook system

### WebSocket Server Setup

Creates and manages a WebSocket server using the 'ws' library that operates on the same server as SvelteKit.

- Uses WebSocketServer in noServer mode for manual upgrade handling
- Handles HTTP upgrade requests for WebSocket protocol
- Maintains server instance for connection management
- Provides proper error handling during server setup

### Connection Management

Tracks active WebSocket connections and maps them to game rooms and players.

- Maintains connection-to-player mapping (WebSocket → {roomId, playerId})
- Stores active connections organized by room ID
- Handles new connection establishment
- Cleans up connection mappings on disconnect
- Provides connection lookup by room ID for broadcasting

### Message Protocol Handling

Processes JSON-based messages between client and server with comprehensive message types.

- Parses incoming JSON messages from clients
- Validates message structure and required fields
- Handles client-to-server message types:
  - create-room: Creates new game room
  - join-room: Joins existing room
  - make-move: Makes game move
- Sends server-to-client message types:
  - room-created: Confirms room creation
  - player-joined: Notifies player joined
  - game-start: Signals game beginning
  - move-made: Updates game state after move
  - game-over: Announces game completion
  - player-disconnected: Notifies player left
  - error: Reports errors

### Room-Based Broadcasting

Sends messages to specific players or all players in a room.

- Broadcasts state updates to all players in a room
- Filters connections by room ID for targeted messaging
- Handles individual player messaging
- Ensures messages only reach intended recipients
- Manages broadcast reliability with connection state checking

### Disconnect Handling

Manages client disconnections and notifies remaining players.

- Detects WebSocket connection close events
- Calls room manager's handleDisconnect function
- Notifies remaining players about disconnections
- Cleans up connection tracking data
- Handles mid-game disconnections gracefully

### Error Handling

Provides comprehensive error handling for WebSocket operations and game logic.

- Catches and handles JSON parsing errors
- Validates message structure and content
- Sends appropriate error messages to clients
- Logs errors for debugging
- Prevents server crashes from client errors

## API

```typescript { .api }
import type { Handle } from '@sveltejs/kit';
import type { WebSocket } from 'ws';
import type { RoomState } from '../types/game-types.js';

// Connection tracking types
interface ConnectionInfo {
  roomId: string;
  playerId: string;
}

// Client to server message types
interface CreateRoomMessage {
  type: 'create-room';
  playerName: string;
}

interface JoinRoomMessage {
  type: 'join-room';
  roomId: string;
  playerName: string;
}

interface MakeMoveMessage {
  type: 'make-move';
  roomId: string;
  playerId: string;
  position: number;
}

type ClientMessage = CreateRoomMessage | JoinRoomMessage | MakeMoveMessage;

// Server to client message types
interface RoomCreatedMessage {
  type: 'room-created';
  roomId: string;
  playerId: string;
}

interface PlayerJoinedMessage {
  type: 'player-joined';
  playerName: string;
  gameState: RoomState;
}

interface GameStartMessage {
  type: 'game-start';
  gameState: RoomState;
}

interface MoveMadeMessage {
  type: 'move-made';
  gameState: RoomState;
}

interface GameOverMessage {
  type: 'game-over';
  winner: 'X' | 'O' | 'draw';
  reason: 'win' | 'disconnect';
}

interface PlayerDisconnectedMessage {
  type: 'player-disconnected';
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ServerMessage = RoomCreatedMessage | PlayerJoinedMessage | GameStartMessage | 
                    MoveMadeMessage | GameOverMessage | PlayerDisconnectedMessage | ErrorMessage;

/**
 * SvelteKit handle function that intercepts WebSocket upgrade requests
 * @param event - SvelteKit request event
 * @param resolve - SvelteKit resolve function
 * @returns Response or WebSocket upgrade handling
 */
export const handle: Handle;

/**
 * Initialize WebSocket server and connection tracking
 */
function initializeWebSocketServer(): void;

/**
 * Handle WebSocket upgrade request
 * @param request - HTTP request
 * @param socket - Network socket
 * @param head - Upgrade head
 */
function handleUpgrade(request: any, socket: any, head: any): void;

/**
 * Handle new WebSocket connection
 * @param ws - WebSocket connection
 * @param request - HTTP request
 */
function handleConnection(ws: WebSocket, request: any): void;

/**
 * Process incoming WebSocket message
 * @param ws - WebSocket connection
 * @param data - Raw message data
 */
function handleMessage(ws: WebSocket, data: any): void;

/**
 * Handle WebSocket connection close
 * @param ws - WebSocket connection
 */
function handleDisconnect(ws: WebSocket): void;

/**
 * Send message to specific WebSocket connection
 * @param ws - WebSocket connection
 * @param message - Message to send
 */
function sendMessage(ws: WebSocket, message: ServerMessage): void;

/**
 * Broadcast message to all players in a room
 * @param roomId - Room identifier
 * @param message - Message to broadcast
 */
function broadcastToRoom(roomId: string, message: ServerMessage): void;

/**
 * Get all connections for a specific room
 * @param roomId - Room identifier
 * @returns Array of WebSocket connections
 */
function getRoomConnections(roomId: string): WebSocket[];
```

## Dependencies

### Room Manager

Game room management and logic operations.
[@use](./room-manager.spec.md)

### Game Types

Type definitions for game state and player information.
[@use](../types/game-types.spec.md)

### WebSocket Library

WebSocket server implementation from 'ws' package.
[@use](ws)

### SvelteKit

Server hooks and request handling types.
[@use](@sveltejs/kit)