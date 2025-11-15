// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../types/game-types.spec.md
// (spec:c63724f5) (code:24c90c0d)

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
