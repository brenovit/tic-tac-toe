# Room Manager Service

Server-side room manager service for managing tic-tac-toe game rooms with in-memory storage and real-time game state management.

## Target

[@generate](../../src/server/room-manager.ts)

## Capabilities

### Room Creation

Generates unique room IDs and initializes game rooms with the first player.

- Creates room with 6-character alphanumeric ID
- Sets first player as 'X' with status 'waiting'
- Initializes empty 3x3 board (9 null values)
- Returns room ID and player ID for joining

### Player Management

Handles player joining and validates room capacity.

- Adds second player to existing room as 'O'
- Changes room status from 'waiting' to 'playing'
- Validates room exists and has space available
- Returns error for full or non-existent rooms

### Move Processing

Validates and processes player moves with turn management.

- Verifies player is in the room and it's their turn
- Validates target cell is empty (null)
- Updates board state with player's symbol
- Switches turn to other player if game continues
- Checks for win conditions or draw after each move

### Win Detection

Implements complete win and draw detection logic.

- Checks all three rows for matching symbols
- Checks all three columns for matching symbols  
- Checks both diagonals for matching symbols
- Detects draw when board is full with no winner

### Disconnect Handling

Manages player disconnections and game termination.

- Marks player as disconnected in room state
- Awards win to remaining player if game in progress
- Returns appropriate game result for client notification
- Handles graceful game termination

### Room Cleanup

Provides maintenance for removing stale rooms.

- Removes rooms with finished games
- Removes rooms older than 1 hour (3600000ms)
- Provides manual cleanup method for maintenance
- Prevents memory leaks from abandoned rooms

## API

```typescript { .api }
export function createRoom(playerName: string): { roomId: string, playerId: string };

export function joinRoom(roomId: string, playerName: string): { playerId: string, roomState: RoomState };

export function makeMove(roomId: string, playerId: string, position: number): RoomState;

export function handleDisconnect(roomId: string, playerId: string): GameResult | null;

export function getRoomState(roomId: string): RoomState | undefined;

export function cleanupStaleRooms(): void;
```

## Dependencies

Game state types and enums for room management.
[@use](../types/game-types.spec.md)