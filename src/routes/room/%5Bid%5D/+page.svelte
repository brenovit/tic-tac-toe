<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { websocketStore } from '$lib/websocket-store';
  import type {
    GameRoomState,
    GameRoomEvents
  } from '$lib/types/game-types';

  let roomId: string;
  let playerName: string | null = null;
  let copied = false;

  // Component state
  let connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'connecting';
  let gameState: 'waiting' | 'playing' | 'finished' | 'disconnected' = 'waiting';
  let board: (null | 'X' | 'O')[] = Array(9).fill(null);
  let currentPlayer: 'X' | 'O' | null = null;
  let players: {
    X?: { name: string; connected: boolean };
    O?: { name: string; connected: boolean };
  } = {};
  let winner: 'X' | 'O' | 'draw' | null = null;
  let winningCells: number[] = [];
  let playerSymbol: 'X' | 'O' | null = null;
  let error: string | null = null;

  let ws = websocketStore();
  let pageUnsub: () => void;

  onMount(() => {
    pageUnsub = page.subscribe(p => {
      roomId = p.params.id;
      playerName = p.url.searchParams.get('playerName');
    });

    if (!playerName) {
      goto('/');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(roomId)) {
      goto('/');
      return;
    }

    ws.connect();
    const unsubWs = ws.subscribe(msg => handleMessage(msg));
    ws.send({ type: 'join-room', roomId, playerName });

    return () => {
      unsubWs();
    };
  });

  onDestroy(() => {
    ws.disconnect();
    pageUnsub();
  });

  function handleMessage(msg: any) {
    switch (msg.type) {
      case 'connection':
        connectionStatus = msg.status;
        if (msg.status === 'disconnected') gameState = 'disconnected';
        break;
      case 'room-state':
        applyState(msg.state);
        break;
      case 'move-result':
        if (!msg.success) {
          board[msg.index] = null;
          error = msg.error;
        }
        break;
      case 'error':
        error = msg.error;
        connectionStatus = 'error';
        break;
    }
  }

  function applyState(state: Partial<GameRoomState>) {
    if (state.board) board = state.board;
    if (state.currentPlayer) currentPlayer = state.currentPlayer;
    if (state.players) players = state.players;
    if (state.gameState) gameState = state.gameState;
    if (state.winner !== undefined) winner = state.winner;
    if (state.winningCells) winningCells = state.winningCells;
    if (state.playerSymbol) playerSymbol = state.playerSymbol;
    connectionStatus = 'connected';
  }

  function onCellClick(index: number) {
    if (
      gameState !== 'playing' ||
      currentPlayer !== playerSymbol ||
      board[index] !== null
    )
      return;
    board[index] = playerSymbol;
    ws.send({ type: 'make-move', index });
  }

  async function onCopyLink() {
    if (!browser) return;
    await navigator.clipboard.writeText(window.location.href);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function onNewGame() {
    goto('/');
  }

  function onBackToHome() {
    goto('/');
  }
</script>

<style>
  .board {
    display: grid;
    grid-template: repeat(3, 1fr) / repeat(3, 1fr);
    gap: 4px;
    max-width: 300px;
    margin: auto;
  }
  .cell {
    width: 100%;
    padding-top: 100%;
    position: relative;
    background: #f0f0f0;
    cursor: pointer;
    font-size: 2rem;
    text-align: center;
  }
  .cell.win {
    background: #ffeb3b;
  }
  .cell div {
    position: absolute;
    top: 0; left: 0;
    right: 0; bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .players {
    display: flex;
    justify-content: space-around;
    margin: 1rem 0;
  }
  button {
    padding: 0.5rem 1rem;
    margin: 0.5rem;
  }
  .status {
    text-align: center;
    margin: 1rem 0;
  }
</style>

{#if connectionStatus === 'connecting'}
  <div class="status">
    <p>Connecting to game...</p>
  </div>
{:else if connectionStatus === 'error'}
  <div class="status">
    <p>Error: {error}</p>
    <button on:click={onBackToHome}>Back to Home</button>
  </div>
{:else}
  {#if gameState === 'waiting'}
    <div class="status">
      <p>Waiting for opponent...</p>
      <p>Room URL: <code>{window.location.href}</code></p>
      <button on:click={onCopyLink}>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  {:else if gameState === 'playing' || gameState === 'finished' || gameState === 'disconnected'}
    <div class="players" role="region" aria-label="Players">
      {#each ['X', 'O'] as sym}
        <div>
          <strong>{players[sym]?.name || '—'}</strong> ({sym})
          <div>
            {players[sym]?.connected
              ? '🟢'
              : '🔴'} {currentPlayer === sym ? '← Turn' : ''}
          </div>
        </div>
      {/each}
    </div>

    {#if gameState === 'playing'}
      <div
        class="board"
        role="grid"
        aria-label="Tic Tac Toe Board"
      >
        {#each board as cell, i}
          <div
            class="cell"
            role="gridcell"
            tabindex={
              gameState === 'playing' &&
              currentPlayer === playerSymbol &&
              !cell
                ? 0
                : -1
            }
            aria-label={cell ?? 'empty cell'}
            on:click={() => onCellClick(i)}
            on:keydown={(e) =>
              e.key === 'Enter' && onCellClick(i)
            }
          >
            <div>{cell}</div>
          </div>
        {/each}
      </div>
    {:else if gameState === 'finished'}
      <div class="status">
        <p>
          {winner === 'draw'
            ? 'Game ended in a draw.'
            : `Winner: ${winner}`}
        </p>
        <button on:click={onNewGame}>Play Again</button>
      </div>
    {:else if gameState === 'disconnected'}
      <div class="status">
        <p>Opponent disconnected - You win!</p>
        <button on:click={onNewGame}>New Game</button>
      </div>
    {/if}
  {/if}
{/if}
