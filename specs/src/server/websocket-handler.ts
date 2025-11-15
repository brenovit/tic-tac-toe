// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../server/websocket-handler.spec.md
// (spec:7fb2bfec) (code:1105241f)

import type { Handle } from '@sveltejs/kit';
import { WebSocketServer, type WebSocket } from 'ws';
import type { RoomState, GameResult } from '../types/game-types.js';
import { createRoom, joinRoom, makeMove, handleDisconnect as roomHandleDisconnect, getRoomState } from './room-manager.js';

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

// Global state
let wss: WebSocketServer | null = null;
const connectionMap = new Map<WebSocket, ConnectionInfo>();
const roomConnections = new Map<string, Set<WebSocket>>();

/**
 * SvelteKit handle function that intercepts WebSocket upgrade requests
 */
export const handle: Handle = async ({ event, resolve }) => {
  const { request } = event;
  
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade === 'websocket') {
    // Initialize WebSocket server if not already done
    if (!wss) {
      initializeWebSocketServer();
    }
    
    // Handle WebSocket upgrade
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      return new Response(null, { status: 101 });
    }
  }
  
  // Pass non-WebSocket requests to SvelteKit
  return resolve(event);
};

/**
 * Initialize WebSocket server and connection tracking
 */
function initializeWebSocketServer(): void {
  wss = new WebSocketServer({ noServer: true });
  
  wss.on('connection', handleConnection);
  
  // Hook into the HTTP server for upgrade handling
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    // In a real server environment, we'd need access to the HTTP server
    // This is a simplified version for the spec
    console.log('WebSocket server initialized');
  }
}

/**
 * Handle WebSocket upgrade request
 */
function handleUpgrade(request: any, socket: any, head: any): void {
  if (!wss) {
    socket.destroy();
    return;
  }
  
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss!.emit('connection', ws, request);
  });
}

/**
 * Handle new WebSocket connection
 */
function handleConnection(ws: WebSocket, request: any): void {
  console.log('New WebSocket connection established');
  
  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => handleDisconnect(ws));
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    handleDisconnect(ws);
  });
}

/**
 * Process incoming WebSocket message
 */
function handleMessage(ws: WebSocket, data: any): void {
  try {
    const message: ClientMessage = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'create-room': {
        try {
          const { roomId, playerId } = createRoom(message.playerName);
          
          // Track connection
          connectionMap.set(ws, { roomId, playerId });
          if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
          }
          roomConnections.get(roomId)!.add(ws);
          
          sendMessage(ws, {
            type: 'room-created',
            roomId,
            playerId
          });
        } catch (error) {
          sendMessage(ws, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to create room'
          });
        }
        break;
      }
      
      case 'join-room': {
        try {
          const { playerId, roomState } = joinRoom(message.roomId, message.playerName);
          
          // Track connection
          connectionMap.set(ws, { roomId: message.roomId, playerId });
          if (!roomConnections.has(message.roomId)) {
            roomConnections.set(message.roomId, new Set());
          }
          roomConnections.get(message.roomId)!.add(ws);
          
          // Notify all players in room
          broadcastToRoom(message.roomId, {
            type: 'player-joined',
            playerName: message.playerName,
            gameState: roomState
          });
          
          // Start game if room is full
          if (roomState.status === 'playing') {
            broadcastToRoom(message.roomId, {
              type: 'game-start',
              gameState: roomState
            });
          }
        } catch (error) {
          sendMessage(ws, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to join room'
          });
        }
        break;
      }
      
      case 'make-move': {
        try {
          const roomState = makeMove(message.roomId, message.playerId, message.position);
          
          broadcastToRoom(message.roomId, {
            type: 'move-made',
            gameState: roomState
          });
          
          // Check if game is over
          if (roomState.status === 'finished') {
            broadcastToRoom(message.roomId, {
              type: 'game-over',
              winner: roomState.winner!,
              reason: 'win'
            });
          }
        } catch (error) {
          sendMessage(ws, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Invalid move'
          });
        }
        break;
      }
      
      default:
        sendMessage(ws, {
          type: 'error',
          message: 'Unknown message type'
        });
    }
  } catch (error) {
    console.error('Error parsing message:', error);
    sendMessage(ws, {
      type: 'error',
      message: 'Invalid message format'
    });
  }
}

/**
 * Handle WebSocket connection close
 */
function handleDisconnect(ws: WebSocket): void {
  const connectionInfo = connectionMap.get(ws);
  
  if (connectionInfo) {
    const { roomId, playerId } = connectionInfo;
    
    // Handle disconnect in room manager
    const result = roomHandleDisconnect(roomId, playerId);
    
    // Notify remaining players
    if (result) {
      broadcastToRoom(roomId, {
        type: 'game-over',
        winner: result.winner,
        reason: result.reason
      });
    } else {
      broadcastToRoom(roomId, {
        type: 'player-disconnected'
      });
    }
    
    // Clean up connection tracking
    connectionMap.delete(ws);
    const roomSet = roomConnections.get(roomId);
    if (roomSet) {
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        roomConnections.delete(roomId);
      }
    }
  }
  
  console.log('WebSocket connection closed');
}

/**
 * Send message to specific WebSocket connection
 */
function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}

/**
 * Broadcast message to all players in a room
 */
function broadcastToRoom(roomId: string, message: ServerMessage): void {
  const connections = getRoomConnections(roomId);
  connections.forEach(ws => sendMessage(ws, message));
}

/**
 * Get all connections for a specific room
 */
function getRoomConnections(roomId: string): WebSocket[] {
  const roomSet = roomConnections.get(roomId);
  return roomSet ? Array.from(roomSet) : [];
}
