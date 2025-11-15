# WebSocket Store

Svelte store for managing WebSocket connections on the client side with real-time game communication.

## Target

[@generate](../../src/client/websocket-store.ts)

## Capabilities

### Connection Management

Manages WebSocket connection lifecycle with automatic reconnection.

- Establishes WebSocket connection to the server
- Closes WebSocket connection cleanly
- Automatically reconnects on unexpected disconnection with exponential backoff
- Uses browser's native WebSocket API

### Store State Management

Maintains reactive game state using Svelte 5 runes.

- Connection status: 'disconnected' | 'connecting' | 'connected' | 'error'
- Current room state: RoomState | null
- Player info: {playerId: string, symbol: 'X' | 'O'} | null
- Error message: string | null

### Message Sending

Sends typed messages to the server for game actions.

- createRoom(playerName: string): Creates a new game room
- joinRoom(roomId: string, playerName: string): Joins an existing room
- makeMove(position: number): Makes a move at the specified position

### Message Receiving

Handles incoming server messages with proper state updates.

- 'room-created': Stores roomId and playerId
- 'player-joined': Updates room state, stores opponent info
- 'game-start': Updates room state to 'playing'
- 'move-made': Updates board and current turn
- 'game-over': Updates room state with winner
- 'player-disconnected': Shows disconnect notification
- 'error': Stores error message

### Reactive Helpers

Provides derived values for component reactivity.

- isMyTurn: Checks if current turn matches player symbol
- canMakeMove: Validates if player can make a move (my turn && game is playing && cell is empty)

### Store Factory

Implements singleton pattern with proper cleanup.

- createWebSocketStore(): Factory function for store creation
- Singleton per component tree
- Proper cleanup on unmount

### Error Handling

Comprehensive error management for WebSocket operations.

- Connection errors with retry logic
- Invalid message handling
- Timeout handling for connection attempts

## API

```typescript { .api }
interface WebSocketStore {
  // State
  readonly connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  readonly roomState: RoomState | null;
  readonly playerInfo: { playerId: string; symbol: 'X' | 'O' } | null;
  readonly errorMessage: string | null;
  
  // Derived helpers
  readonly isMyTurn: boolean;
  readonly canMakeMove: (position: number) => boolean;
  
  // Connection methods
  connect(): void;
  disconnect(): void;
  
  // Game actions
  createRoom(playerName: string): void;
  joinRoom(roomId: string, playerName: string): void;
  makeMove(position: number): void;
  
  // Cleanup
  destroy(): void;
}

/**
 * Creates a WebSocket store instance for managing game connections
 * @param serverUrl - WebSocket server URL (default: ws://localhost:3001)
 * @returns WebSocket store instance
 */
function createWebSocketStore(serverUrl?: string): WebSocketStore;
```

## Dependencies

### Game Types

Type definitions for game state and messages.
[@use](../types/game-types.spec.md)