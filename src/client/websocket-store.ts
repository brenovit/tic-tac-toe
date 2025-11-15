// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/client/websocket-store.spec.md
// (spec:84cd5212) (code:02d167cf)

import type { 
  RoomState, 
  ClientToServerMessage, 
  ServerToClientMessage,
  CreateRoomMessage,
  JoinRoomMessage,
  MakeMoveMessage 
} from '../types/game-types.js';

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

export function createWebSocketStore(serverUrl: string = 'ws://localhost:3001'): WebSocketStore {
  if (storeInstance) {
    return storeInstance;
  }

  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let reconnectTimeout: number | null = null;

  // State using Svelte 5 runes
  let connectionStatus = $state<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  let roomState = $state<RoomState | null>(null);
  let playerInfo = $state<{ playerId: string; symbol: 'X' | 'O' } | null>(null);
  let errorMessage = $state<string | null>(null);

  // Derived values
  const isMyTurn = $derived(() => {
    if (!roomState || !playerInfo) return false;
    return roomState.currentTurn === playerInfo.symbol;
  });

  const canMakeMove = $derived(() => {
    return (position: number) => {
      if (!roomState || !playerInfo || roomState.status !== 'playing') return false;
      if (roomState.currentTurn !== playerInfo.symbol) return false;
      if (position < 0 || position > 8) return false;
      return roomState.board[position] === null;
    };
  });

  function connect(): void {
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
          console.error('Failed to parse message:', error);
          errorMessage = 'Invalid message received from server';
        }
      };

      ws.onclose = (event) => {
        connectionStatus = 'disconnected';
        ws = null;

        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        connectionStatus = 'error';
        errorMessage = 'Connection error occurred';
      };

    } catch (error) {
      connectionStatus = 'error';
      errorMessage = 'Failed to establish connection';
    }
  }

  function scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    reconnectAttempts++;

    reconnectTimeout = window.setTimeout(() => {
      connect();
    }, delay);
  }

  function disconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      ws.close(1000);
      ws = null;
    }

    connectionStatus = 'disconnected';
    reconnectAttempts = 0;
  }

  function sendMessage(message: ClientToServerMessage): void {
    if (ws && connectionStatus === 'connected') {
      ws.send(JSON.stringify(message));
    } else {
      errorMessage = 'Not connected to server';
    }
  }

  function createRoom(playerName: string): void {
    const message: CreateRoomMessage = {
      type: 'createRoom',
      playerName
    };
    sendMessage(message);
  }

  function joinRoom(roomId: string, playerName: string): void {
    const message: JoinRoomMessage = {
      type: 'joinRoom',
      roomId,
      playerName
    };
    sendMessage(message);
  }

  function makeMove(position: number): void {
    if (!roomState) {
      errorMessage = 'No active room';
      return;
    }

    const message: MakeMoveMessage = {
      type: 'makeMove',
      roomId: roomState.id,
      cellIndex: position
    };
    sendMessage(message);
  }

  function handleServerMessage(message: ServerToClientMessage): void {
    switch (message.type) {
      case 'roomCreated':
        roomState = message.roomState;
        playerInfo = {
          playerId: message.playerId,
          symbol: message.roomState.players[0]?.symbol || 'X'
        };
        break;

      case 'playerJoined':
        roomState = message.roomState;
        if (playerInfo && roomState.players.length === 2) {
          // Update player info if we're the second player
          const otherPlayer = roomState.players.find(p => p?.id !== playerInfo.playerId);
          if (otherPlayer && !playerInfo.symbol) {
            playerInfo.symbol = otherPlayer.symbol === 'X' ? 'O' : 'X';
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
        // Could add notification logic here
        break;

      case 'error':
        errorMessage = message.message;
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  }

  function destroy(): void {
    disconnect();
    storeInstance = null;
  }

  const store: WebSocketStore = {
    get connectionStatus() { return connectionStatus; },
    get roomState() { return roomState; },
    get playerInfo() { return playerInfo; },
    get errorMessage() { return errorMessage; },
    get isMyTurn() { return isMyTurn; },
    get canMakeMove() { return canMakeMove; },
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
