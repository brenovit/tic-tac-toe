// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../specs/server/websocket-handler.spec.md
// (spec:6306074c) (code:6cbdd94f)

import type { Handle } from '@sveltejs/kit';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { 
  createRoom, 
  joinRoom, 
  makeMove, 
  handleDisconnect as roomHandleDisconnect,
  getRoomState 
} from '$lib/server/room-manager.js';
import type { RoomState } from '$lib/types/game-types.js';

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
let wss: WebSocketServer;
const connections = new Map<WebSocket, ConnectionInfo>();
const roomConnections = new Map<string, Set<WebSocket>>();

function initializeWebSocketServer(): void {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    wss.on('connection', handleConnection);
  }
}

function handleUpgrade(request: any, socket: any, head: any): void {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
}

function handleConnection(ws: WebSocket, request: any): void {
  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => handleDisconnect(ws));
}

function handleMessage(ws: WebSocket, data: any): void {
  try {
    const message: ClientMessage = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'create-room': {
        try {
          const { roomId, playerId } = createRoom(message.playerName);
          
          // Track connection
          connections.set(ws, { roomId, playerId });
          
          // Add to room connections
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
          connections.set(ws, { roomId: message.roomId, playerId });
          
          // Add to room connections
          if (!roomConnections.has(message.roomId)) {
            roomConnections.set(message.roomId, new Set());
          }
          roomConnections.get(message.roomId)!.add(ws);
          
          // Notify the joining player
          sendMessage(ws, {
            type: 'player-joined',
            playerName: message.playerName,
            gameState: roomState
          });
          
          // If room is now full and playing, broadcast game start
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
          
          // Broadcast the move to all players in the room
          broadcastToRoom(message.roomId, {
            type: 'move-made',
            gameState: roomState
          });
          
          // If game is over, send game over message
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
    sendMessage(ws, {
      type: 'error',
      message: 'Invalid message format'
    });
  }
}

function handleDisconnect(ws: WebSocket): void {
  const connectionInfo = connections.get(ws);
  
  if (connectionInfo) {
    const { roomId, playerId } = connectionInfo;
    
    // Remove from room connections
    const roomWs = roomConnections.get(roomId);
    if (roomWs) {
      roomWs.delete(ws);
      if (roomWs.size === 0) {
        roomConnections.delete(roomId);
      }
    }
    
    // Handle disconnect in room manager
    const gameResult = roomHandleDisconnect(roomId, playerId);
    
    if (gameResult) {
      // Notify remaining players
      broadcastToRoom(roomId, {
        type: 'game-over',
        winner: gameResult.winner,
        reason: gameResult.reason
      });
    } else {
      // Just notify that player disconnected
      broadcastToRoom(roomId, {
        type: 'player-disconnected'
      });
    }
    
    // Clean up connection tracking
    connections.delete(ws);
  }
}

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(roomId: string, message: ServerMessage): void {
  const roomWs = roomConnections.get(roomId);
  if (roomWs) {
    roomWs.forEach(ws => sendMessage(ws, message));
  }
}

function getRoomConnections(roomId: string): WebSocket[] {
  const roomWs = roomConnections.get(roomId);
  return roomWs ? Array.from(roomWs) : [];
}

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize WebSocket server on first request
  initializeWebSocketServer();
  
  const { request } = event;
  
  // Check if this is a WebSocket upgrade request
  if (request.headers.get('upgrade') === 'websocket') {
    // Handle the WebSocket upgrade
    return new Promise((resolve) => {
      const server = event.platform?.server;
      if (server) {
        server.on('upgrade', handleUpgrade);
      }
      
      // Return a dummy response - the actual WebSocket handling happens in the upgrade event
      resolve(new Response('WebSocket upgrade', { status: 426 }));
    });
  }
  
  // For non-WebSocket requests, continue with normal SvelteKit handling
  return resolve(event);
};
