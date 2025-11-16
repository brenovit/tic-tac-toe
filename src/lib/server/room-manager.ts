// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../../specs/server/room-manager.spec.md
// (spec:6f666a9a) (code:26a1eedb)

import type { RoomState, Player, CellValue, GameResult } from '../types/game-types.js';

// In-memory storage for rooms
const rooms = new Map<string, RoomState>();

// Generate a unique 6-character alphanumeric room ID
function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a unique player ID
function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function createRoom(playerName: string): { roomId: string, playerId: string } {
  const roomId = generateRoomId();
  const playerId = generatePlayerId();
  
  const player: Player = {
    id: playerId,
    name: playerName,
    symbol: 'X',
    connected: true
  };
  
  const roomState: RoomState = {
    id: roomId,
    players: [player],
    board: new Array(9).fill(null),
    currentTurn: 'X',
    status: 'waiting',
    createdAt: new Date()
  };
  
  rooms.set(roomId, roomState);
  console.log(`Room created: ${roomId} by player: ${playerName}`);
  
  return { roomId, playerId };
}

export function joinRoom(roomId: string, playerName: string): { playerId: string, roomState: RoomState } {
  const room = rooms.get(roomId);
  
  if (!room) {
    console.log(`Player join failed - room not found: ${roomId} by player: ${playerName}`);
    throw new Error('Room not found');
  }
  
  // Check if player with same name already exists in room (reconnection case)
  const existingPlayer = room.players.find(p => p.name === playerName);
  if (existingPlayer) {
    existingPlayer.connected = true;
    console.log(`Player reconnected: ${roomId} by player: ${playerName}`);
    return { playerId: existingPlayer.id, roomState: room };
  }
  
  if (room.players.length >= 2) {
    console.log(`Player join failed - room is full: ${roomId} by player: ${playerName}`);
    throw new Error('Room is full');
  }
  
  const playerId = generatePlayerId();
  
  const player: Player = {
    id: playerId,
    name: playerName,
    symbol: 'O',
    connected: true
  };
  
  room.players.push(player);
  room.status = 'playing';
  
  console.log(`Player joined: ${roomId} by player: ${playerName}`);
  
  return { playerId, roomState: room };
}

export function makeMove(roomId: string, playerId: string, position: number): RoomState {
  const room = rooms.get(roomId);
  
  if (!room) {
    console.log(`Move failed - room not found: ${roomId} by player: ${playerId} at position: ${position}`);
    throw new Error('Room not found');
  }
  
  if (room.status !== 'playing') {
    console.log(`Move failed - game not in progress: ${roomId} by player: ${playerId} at position: ${position}`);
    throw new Error('Game is not in progress');
  }
  
  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    console.log(`Move failed - player not in room: ${roomId} by player: ${playerId} at position: ${position}`);
    throw new Error('Player not in room');
  }
  
  if (room.currentTurn !== player.symbol) {
    console.log(`Move failed - not player's turn: ${roomId} by player: ${playerId} at position: ${position}`);
    throw new Error('Not your turn');
  }
  
  if (position < 0 || position >= 9) {
    console.log(`Move failed - invalid position: ${roomId} by player: ${playerId} at position: ${position}`);
    throw new Error('Invalid position');
  }
  
  if (room.board[position] !== null) {
    console.log(`Move failed - cell occupied: ${roomId} by player: ${playerId} at position: ${position}`);
    throw new Error('Cell is already occupied');
  }
  
  // Make the move
  room.board[position] = player.symbol;
  console.log(`Move made: ${roomId} by player: ${playerId} at position: ${position}`);
  
  // Check for win or draw
  const winner = checkWinner(room.board);
  
  if (winner && winner !== 'draw') {
    room.winner = winner;
    room.status = 'finished';
  } else if (room.board.every(cell => cell !== null)) {
    // Draw - board is full
    room.winner = 'draw';
    room.status = 'finished';
  } else {
    // Switch turns
    room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
  }
  
  return room;
}

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
  const diagonal1 = [board[0], board[4], board[8]];
  if (diagonal1[0] && diagonal1[0] === diagonal1[1] && diagonal1[1] === diagonal1[2]) {
    return diagonal1[0];
  }
  
  const diagonal2 = [board[2], board[4], board[6]];
  if (diagonal2[0] && diagonal2[0] === diagonal2[1] && diagonal2[1] === diagonal2[2]) {
    return diagonal2[0];
  }
  
  return null;
}

export function handleDisconnect(roomId: string, playerId: string): GameResult | null {
  const room = rooms.get(roomId);
  
  if (!room) {
    return null;
  }
  
  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    return null;
  }
  
  player.connected = false;
  console.log(`Player disconnected: ${roomId} by player: ${playerId}`);
  
  if (room.status === 'playing') {
    // Award win to the remaining player
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    if (remainingPlayer) {
      room.winner = remainingPlayer.symbol;
      room.status = 'finished';
      
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
