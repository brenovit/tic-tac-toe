// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../specs/client/websocket-store.spec.md
// (spec:4bee7a1f) (code:4c4c38d5)

import { writable, derived, type Writable } from 'svelte/store';
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
  isConnected(): boolean;
  
  // Message handling
  send(message: ClientToServerMessage): void;
  subscribe(callback: (message: ServerToClientMessage) => void): () => void;
  
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
  const messageSubscribers: ((message: ServerToClientMessage) => void)[] = [];

  // State using Svelte writable stores
  const connectionStatus = writable<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const roomState = writable<RoomState | null>(null);
  const playerInfo = writable<{ playerId: string; symbol: 'X' | 'O' } | null>(null);
  const errorMessage = writable<string | null>(null);

  // Derived helpers
  const isMyTurn = derived(
    [roomState, playerInfo],
    ([$roomState, $playerInfo]) => {
      if (!$roomState || !$playerInfo) return false;
      return $roomState.currentTurn === $playerInfo.symbol && $roomState.status === 'playing';
    }
  );

  const canMakeMove = (position: number): boolean => {
    let currentRoomState: RoomState | null = null;
    let currentPlayerInfo: { playerId: string; symbol: 'X' | 'O' } | null = null;
    let currentIsMyTurn = false;

    const unsubRoomState = roomState.subscribe(value => currentRoomState = value);
    const unsubPlayerInfo = playerInfo.subscribe(value => currentPlayerInfo = value);
    const unsubIsMyTurn = isMyTurn.subscribe(value => currentIsMyTurn = value);

    unsubRoomState();
    unsubPlayerInfo();
    unsubIsMyTurn();

    if (!currentRoomState || !currentPlayerInfo) return false;
    if (currentRoomState.status !== 'playing') return false;
    if (!currentIsMyTurn) return false;
    if (position < 0 || position > 8) return false;
    return currentRoomState.board[position] === null;
  };

  const isConnected = (): boolean => {
    return ws !== null && ws.readyState === WebSocket.OPEN;
  };

  const connect = (): void => {
    let currentStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
    const unsub = connectionStatus.subscribe(value => currentStatus = value);
    unsub();

    if (currentStatus === 'connecting' || currentStatus === 'connected') {
      return;
    }

    connectionStatus.set('connecting');
    errorMessage.set(null);

    try {
      ws = new WebSocket(serverUrl);

      ws.onopen = () => {
        connectionStatus.set('connected');
        reconnectAttempts = 0;
        errorMessage.set(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerToClientMessage = JSON.parse(event.data);
          handleServerMessage(message);
          
          // Notify message subscribers
          messageSubscribers.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in message subscriber:', error);
            }
          });
        } catch (error) {
          console.error('Failed to parse server message:', error);
          errorMessage.set('Invalid message received from server');
        }
      };

      ws.onclose = (event) => {
        connectionStatus.set('disconnected');
        ws = null;

        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        connectionStatus.set('error');
        errorMessage.set('Connection error occurred');
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      connectionStatus.set('error');
      errorMessage.set('Failed to establish connection');
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

    connectionStatus.set('disconnected');
    roomState.set(null);
    playerInfo.set(null);
    errorMessage.set(null);
  };

  const scheduleReconnect = (): void => {
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;

    reconnectTimeout = window.setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, delay);
  };

  const send = (message: ClientToServerMessage): void => {
    if (!isConnected()) {
      errorMessage.set('Not connected to server');
      return;
    }

    try {
      ws!.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      errorMessage.set('Failed to send message');
    }
  };

  const subscribe = (callback: (message: ServerToClientMessage) => void): (() => void) => {
    messageSubscribers.push(callback);
    
    return () => {
      const index = messageSubscribers.indexOf(callback);
      if (index > -1) {
        messageSubscribers.splice(index, 1);
      }
    };
  };

  const createRoom = (playerName: string): void => {
    const message: CreateRoomMessage = {
      type: 'createRoom',
      playerName
    };
    send(message);
  };

  const joinRoom = (roomId: string, playerName: string): void => {
    const message: JoinRoomMessage = {
      type: 'joinRoom',
      roomId,
      playerName
    };
    send(message);
  };

  const makeMove = (position: number): void => {
    if (!canMakeMove(position)) {
      errorMessage.set('Invalid move');
      return;
    }

    let currentRoomState: RoomState | null = null;
    const unsub = roomState.subscribe(value => currentRoomState = value);
    unsub();

    if (!currentRoomState) {
      errorMessage.set('No active room');
      return;
    }

    const message: MakeMoveMessage = {
      type: 'makeMove',
      roomId: currentRoomState.id,
      cellIndex: position
    };
    send(message);
  };

  const handleServerMessage = (message: ServerToClientMessage): void => {
    errorMessage.set(null);

    switch (message.type) {
      case 'roomCreated':
        roomState.set(message.roomState);
        playerInfo.set({
          playerId: message.playerId,
          symbol: message.roomState.players[0].symbol
        });
        break;

      case 'playerJoined':
        roomState.set(message.roomState);
        
        let currentPlayerInfo: { playerId: string; symbol: 'X' | 'O' } | null = null;
        const unsub = playerInfo.subscribe(value => currentPlayerInfo = value);
        unsub();
        
        if (!currentPlayerInfo && message.roomState.players.length === 2) {
          // If we don't have playerInfo, we must be the second player
          const secondPlayer = message.roomState.players[1];
          if (secondPlayer) {
            playerInfo.set({
              playerId: secondPlayer.id,
              symbol: secondPlayer.symbol
            });
          }
        }
        break;

      case 'gameStart':
        roomState.set(message.roomState);
        break;

      case 'moveMade':
        roomState.set(message.roomState);
        break;

      case 'gameOver':
        roomState.set(message.roomState);
        break;

      case 'playerDisconnected':
        roomState.set(message.roomState);
        break;

      case 'error':
        errorMessage.set(message.message);
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  };

  const destroy = (): void => {
    disconnect();
    messageSubscribers.length = 0;
    storeInstance = null;
  };

  const store: WebSocketStore = {
    get connectionStatus() {
      let value: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
      const unsub = connectionStatus.subscribe(v => value = v);
      unsub();
      return value;
    },
    get roomState() {
      let value: RoomState | null = null;
      const unsub = roomState.subscribe(v => value = v);
      unsub();
      return value;
    },
    get playerInfo() {
      let value: { playerId: string; symbol: 'X' | 'O' } | null = null;
      const unsub = playerInfo.subscribe(v => value = v);
      unsub();
      return value;
    },
    get errorMessage() {
      let value: string | null = null;
      const unsub = errorMessage.subscribe(v => value = v);
      unsub();
      return value;
    },
    get isMyTurn() {
      let value = false;
      const unsub = isMyTurn.subscribe(v => value = v);
      unsub();
      return value;
    },
    canMakeMove,
    connect,
    disconnect,
    isConnected,
    send,
    subscribe,
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
