# Game Types

Shared TypeScript type definitions for the online multiplayer tic-tac-toe game. Provides common interfaces and types used by both client and server code.

## Target

[@generate](../../src/lib/types/game-types.ts)

## Capabilities

### Player representation

Defines the Player interface with identification, display information, game role, and connection status.

### Room state management

Defines the RoomState interface to track game rooms including players, board state, turn management, game status, and metadata.

### Board cell representation

Defines CellValue type for representing individual board cells that can be empty or contain player symbols.

### Game result tracking

Defines GameResult interface to capture how games end including winner determination and reason for completion.

### WebSocket message types

Defines message interfaces for client-server communication including room management, game actions, and status updates.

## API

```typescript { .api }
// Player interface
export interface Player {
  id: string; // UUID
  name: string; // player's display name
  symbol: 'X' | 'O'; // which symbol they play as
  connected: boolean; // connection status
}

// Room state interface
export interface RoomState {
  id: string; // unique room identifier
  players: [Player, Player?]; // tuple with max 2 players, second is optional
  board: CellValue[]; // array of 9 cells
  currentTurn: 'X' | 'O'; // whose turn it is
  status: 'waiting' | 'playing' | 'finished'; // game status
  winner?: 'X' | 'O' | 'draw'; // optional, only set when game is finished
  createdAt: Date; // timestamp for room cleanup
}

// Cell value type
export type CellValue = 'X' | 'O' | null;

// Game result interface
export interface GameResult {
  winner: 'X' | 'O' | 'draw';
  reason: 'win' | 'disconnect'; // how the game ended
}

// Client to server messages
export interface CreateRoomMessage {
  type: 'createRoom';
  playerName: string;
}

export interface JoinRoomMessage {
  type: 'joinRoom';
  roomId: string;
  playerName: string;
}

export interface MakeMoveMessage {
  type: 'makeMove';
  roomId: string;
  cellIndex: number; // 0-8 for board position
}

// Server to client messages
export interface RoomCreatedMessage {
  type: 'roomCreated';
  roomState: RoomState;
  playerId: string;
}

export interface PlayerJoinedMessage {
  type: 'playerJoined';
  roomState: RoomState;
}

export interface GameStartMessage {
  type: 'gameStart';
  roomState: RoomState;
}

export interface MoveMadeMessage {
  type: 'moveMade';
  roomState: RoomState;
}

export interface GameOverMessage {
  type: 'gameOver';
  roomState: RoomState;
  result: GameResult;
}

export interface PlayerDisconnectedMessage {
  type: 'playerDisconnected';
  roomState: RoomState;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

// Union types for message handling
export type ClientToServerMessage = CreateRoomMessage | JoinRoomMessage | MakeMoveMessage;
export type ServerToClientMessage = RoomCreatedMessage | PlayerJoinedMessage | GameStartMessage | MoveMadeMessage | GameOverMessage | PlayerDisconnectedMessage | ErrorMessage;
```