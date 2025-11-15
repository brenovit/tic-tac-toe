// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/server/room-manager.spec.md
// (spec:acc7bc36) (code:0ed5cfc7)

import { v4 as uuidv4 } from 'uuid';
import { Player, RoomState, CellValue, GameResult } from '../types/game-types.js';

// In-memory storage for rooms
const rooms = new Map<string, RoomState>();

// Generate 6-character alphanumeric room ID
function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if a room ID already exists
function isRoomIdTaken(roomId: string): boolean {
  return rooms.has(roomId);
}

// Generate unique room ID
function generateUniqueRoomId(): string {
  let roomId: string;
  do {
    roomId = generateRoomId();
  } while (isRoomIdTaken(roomId));
  return roomId;
}

// Check for win condition
function checkWinner(board: CellValue[]): 'X' | 'O' | 'draw' | null {
  // Check rows
  for (let i = 0; i < 3; i++) {
    const row = [board[i * 3], board[i * 3 + 1], board[i * 3 + 2]];
    if (row[0] && row[0] === row[1] && row[1] === row[2]) {
      return row[0];
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    const col = [board[i], board[i + 3], board[i + 6]];
    if (col[0] && col[0] === col[1] && col[1] === col[2]) {
      return col[0];
    }
  }

  // Check diagonals
  const diag1 = [board[0], board[4], board[8]];
  if (diag1[0] && diag1[0] === diag1[1] && diag1[1] === diag1[2]) {
    return diag1[0];
  }

  const diag2 = [board[2], board[4], board[6]];
  if (diag2[0] && diag2[0] === diag2[1] && diag2[1] === diag2[2]) {
    return diag2[0];
  }

  // Check for draw (board full)
  if (board.every(cell => cell !== null)) {
    return 'draw';
  }

  return null;
}

export function createRoom(playerName: string): { roomId: string, playerId: string } {
  const roomId = generateUniqueRoomId();
  const playerId = uuidv4();

  const player: Player = {
    id: playerId,
    name: playerName,
    symbol: 'X',
    connected: true
  };

  const roomState: RoomState = {
    id: roomId,
    players: [player],
    board: Array(9).fill(null),
    currentTurn: 'X',
    status: 'waiting',
    createdAt: new Date()
  };

  rooms.set(roomId, roomState);

  return { roomId, playerId };
}

export function joinRoom(roomId: string, playerName: string): { playerId: string, roomState: RoomState } {
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.players.length >= 2) {
    throw new Error('Room is full');
  }

  const playerId = uuidv4();

  const player: Player = {
    id: playerId,
    name: playerName,
    symbol: 'O',
    connected: true
  };

  room.players.push(player);
  room.status = 'playing';

  return { playerId, roomState: room };
}

export function makeMove(roomId: string, playerId: string, position: number): RoomState {
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }

  // Find the player
  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error('Player not in room');
  }

  // Check if it's player's turn
  if (room.currentTurn !== player.symbol) {
    throw new Error('Not your turn');
  }

  // Check if position is valid and empty
  if (position < 0 || position > 8) {
    throw new Error('Invalid position');
  }

  if (room.board[position] !== null) {
    throw new Error('Cell already occupied');
  }

  // Make the move
  room.board[position] = player.symbol;

  // Check for winner
  const winner = checkWinner(room.board);
  if (winner) {
    room.status = 'finished';
    room.winner = winner;
  } else {
    // Switch turns
    room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
  }

  return room;
}

export function handleDisconnect(roomId: string, playerId: string): GameResult | null {
  const room = rooms.get(roomId);
  
  if (!room) {
    return null;
  }

  // Find and mark player as disconnected
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return null;
  }

  room.players[playerIndex].connected = false;

  // If game was in progress, award win to remaining player
  if (room.status === 'playing') {
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    if (remainingPlayer) {
      room.status = 'finished';
      room.winner = remainingPlayer.symbol;
      
      return {
        winner: remainingPlayer.symbol,
        reason: 'disconnect'
      };
    }
  }

  return null;
}

export function getRoomState(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

export function cleanupStaleRooms(): void {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000); // 1 hour in milliseconds

  for (const [roomId, room] of rooms.entries()) {
    if (room.status === 'finished' || room.createdAt < oneHourAgo) {
      rooms.delete(roomId);
    }
  }
}
