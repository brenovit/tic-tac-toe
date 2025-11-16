// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/client/websocket-store.spec.md
// (spec:44ee2cde) (code:d9a68fef)

import type {
  RoomState,
  ClientToServerMessage,
  ServerToClientMessage,
  CreateRoomMessage,
  JoinRoomMessage,
  MakeMoveMessage
} from './types/game-types.js';

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

let storeInstance: WebSocketStore | null = null;

/**
 * Creates a WebSocket store instance for managing game connections
 * @param serverUrl - WebSocket server URL (default: ws://localhost:3001)
 * @returns WebSocket store instance
 */
export function createWebSocketStore(serverUrl: string = 'ws://localhost:3001'): WebSocketStore {
  if (storeInstance) {
    return storeInstance;
  }

  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  // State using Svelte 5 runes
  let connectionStatus = $state<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  let roomState = $state<RoomState | null>(null);
  let playerInfo = $state<{ playerId: string; symbol: 'X' | 'O' } | null>(null);
  let errorMessage = $state<string | null>(null);

  // Derived helpers
  const isMyTurn = $derived.by(() => {
    if (!roomState || !playerInfo) return false;
    return roomState.currentTurn === playerInfo.symbol;
  });

  const canMakeMove = (position: number): boolean => {
    if (!roomState || !playerInfo) return false;
    if (roomState.status !== 'playing') return false;
    if (!isMyTurn) return false;
    if (position < 0 || position > 8) return false;
    return roomState.board[position] === null;
  };

  const connect = (): void => {
    if (connectionStatus === 'connecting' || connectionStatus === 'connected') {
      return;
    }

    connectionStatus = 'connecting';
    errorMessage = null;

    try {
      ws = new WebSocket(serverUrl);

      ws.onopen = () => {
        connectionStatus = 'connected';
        reconnectAttempts = 0;
        errorMessage = null;
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerToClientMessage = JSON.parse(event.data);
          handleServerMessage(message);
        } catch (error) {
          console.error('Failed to parse server message:', error);
          errorMessage = 'Invalid message received from server';
        }
      };

      ws.onclose = (event) => {
        connectionStatus = 'disconnected';
        ws = null;

        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatus = 'error';
        errorMessage = 'Connection error occurred';
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      connectionStatus = 'error';
      errorMessage = 'Failed to establish connection';
    }
  };

  const disconnect = (): void => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      ws.close(1000, 'Client disconnect');
      ws = null;
    }

    connectionStatus = 'disconnected';
    roomState = null;
    playerInfo = null;
    errorMessage = null;
  };

  const scheduleReconnect = (): void => {
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;

    reconnectTimeout = window.setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, delay);
  };

  const sendMessage = (message: ClientToServerMessage): void => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      errorMessage = 'Not connected to server';
      return;
    }

    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      errorMessage = 'Failed to send message';
    }
  };

  const createRoom = (playerName: string): void => {
    const message: CreateRoomMessage = {
      type: 'createRoom',
      playerName
    };
    sendMessage(message);
  };

  const joinRoom = (roomId: string, playerName: string): void => {
    const message: JoinRoomMessage = {
      type: 'joinRoom',
      roomId,
      playerName
    };
    sendMessage(message);
  };

  const makeMove = (position: number): void => {
    if (!roomState || !canMakeMove(position)) {
      errorMessage = 'Invalid move';
      return;
    }

    const message: MakeMoveMessage = {
      type: 'makeMove',
      roomId: roomState.id,
      cellIndex: position
    };
    sendMessage(message);
  };

  const handleServerMessage = (message: ServerToClientMessage): void => {
    errorMessage = null;

    switch (message.type) {
      case 'roomCreated':
        roomState = message.roomState;
        playerInfo = {
          playerId: message.playerId,
          symbol: message.roomState.players[0].symbol
        };
        break;

      case 'playerJoined':
        roomState = message.roomState;
        if (!playerInfo && message.roomState.players.length === 2) {
          // If we don't have playerInfo, we must be the second player
          const secondPlayer = message.roomState.players[1];
          if (secondPlayer) {
            playerInfo = {
              playerId: secondPlayer.id,
              symbol: secondPlayer.symbol
            };
          }
        }
        break;

      case 'gameStart':
        roomState = message.roomState;
        break;

      case 'moveMade':
        roomState = message.roomState;
        break;

      case 'gameOver':
        roomState = message.roomState;
        break;

      case 'playerDisconnected':
        roomState = message.roomState;
        break;

      case 'error':
        errorMessage = message.message;
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  };

  const destroy = (): void => {
    disconnect();
    storeInstance = null;
  };

  const store: WebSocketStore = {
    get connectionStatus() { return connectionStatus; },
    get roomState() { return roomState; },
    get playerInfo() { return playerInfo; },
    get errorMessage() { return errorMessage; },
    get isMyTurn() { return isMyTurn; },
    canMakeMove,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    makeMove,
    destroy
  };

  storeInstance = store;
  return store;
}

// Default export for convenience
export const websocketStore = createWebSocketStore();
