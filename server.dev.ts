// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from specs/server/dev-server.spec.md
// (spec:907c4e7d) (code:130aff67)

import { WebSocketServer, WebSocket } from 'ws';
import {
  createRoom,
  joinRoom,
  makeMove,
  handleDisconnect as roomHandleDisconnect,
  getRoomState
} from './src/lib/server/room-manager.js';
import type {
  ClientToServerMessage,
  ServerToClientMessage,
  RoomState
} from './src/lib/types/game-types.js';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

// Connection tracking
interface ConnectionInfo {
  roomId: string;
  playerId: string;
}

const connections = new Map<WebSocket, ConnectionInfo>();
const roomConnections = new Map<string, Set<WebSocket>>();

console.log(`WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as ClientToServerMessage;
      console.log('Received message:', message);

      switch (message.type) {
        case 'createRoom': {
          const result = createRoom(message.playerName);
          connections.set(ws, { roomId: result.roomId, playerId: result.playerId });

          // Track room connection
          if (!roomConnections.has(result.roomId)) {
            roomConnections.set(result.roomId, new Set());
          }
          roomConnections.get(result.roomId)!.add(ws);

          const roomState = getRoomState(result.roomId);
          const response: ServerToClientMessage = {
            type: 'roomCreated',
            playerId: result.playerId,
            roomState: roomState!
          };
          ws.send(JSON.stringify(response));
          break;
        }

        case 'joinRoom': {
          const result = joinRoom(message.roomId, message.playerName);
          connections.set(ws, { roomId: message.roomId, playerId: result.playerId });

          // Track room connection
          if (!roomConnections.has(message.roomId)) {
            roomConnections.set(message.roomId, new Set());
          }
          roomConnections.get(message.roomId)!.add(ws);

          const roomState = getRoomState(message.roomId);

          // Broadcast to all clients in the room
          const joinedMessage: ServerToClientMessage = {
            type: 'playerJoined',
            roomState: roomState!
          };
          broadcastToRoom(message.roomId, joinedMessage);

          // If room is full, start the game
          if (roomState && roomState.players.length === 2) {
            const startMessage: ServerToClientMessage = {
              type: 'gameStart',
              roomState
            };
            broadcastToRoom(message.roomId, startMessage);
          }
          break;
        }

        case 'makeMove': {
          const connInfo = connections.get(ws);
          if (!connInfo) {
            const errorMsg: ServerToClientMessage = {
              type: 'error',
              message: 'Not connected to a room'
            };
            ws.send(JSON.stringify(errorMsg));
            break;
          }

          makeMove(message.roomId, connInfo.playerId, message.cellIndex);
          const roomState = getRoomState(message.roomId);

          if (roomState) {
            if (roomState.status === 'finished') {
              const gameOverMsg: ServerToClientMessage = {
                type: 'gameOver',
                roomState,
                result: {
                  winner: roomState.winner || 'draw',
                  reason: roomState.winner ? 'win' : 'draw'
                }
              };
              broadcastToRoom(message.roomId, gameOverMsg);
            } else {
              const moveMsg: ServerToClientMessage = {
                type: 'moveMade',
                roomState
              };
              broadcastToRoom(message.roomId, moveMsg);
            }
          }
          break;
        }

        default:
          console.warn('Unknown message type:', (message as any).type);
          const errorMsg: ServerToClientMessage = {
            type: 'error',
            message: 'Unknown message type'
          };
          ws.send(JSON.stringify(errorMsg));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      const errorMsg: ServerToClientMessage = {
        type: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    const connInfo = connections.get(ws);
    if (connInfo) {
      const { roomId, playerId } = connInfo;

      // Handle disconnection in room manager
      roomHandleDisconnect(roomId, playerId);

      // Remove from room connections
      const roomWs = roomConnections.get(roomId);
      if (roomWs) {
        roomWs.delete(ws);
        if (roomWs.size === 0) {
          roomConnections.delete(roomId);
        }
      }

      // Notify other players
      const roomState = getRoomState(roomId);
      if (roomState) {
        const disconnectMsg: ServerToClientMessage = {
          type: 'playerDisconnected',
          roomState
        };
        broadcastToRoom(roomId, disconnectMsg);
      }

      connections.delete(ws);
    }
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastToRoom(roomId: string, message: ServerToClientMessage): void {
  const roomWs = roomConnections.get(roomId);
  if (roomWs) {
    const messageStr = JSON.stringify(message);
    roomWs.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}
