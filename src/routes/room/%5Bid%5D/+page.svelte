<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { websocketStore } from '$lib/websocket-store';
  import type { CellValue, RoomState, Player, GameResult } from '$lib/types/game-types';

  let roomId: string;
  let playerName: string | null = null;
  let copied = false;

  // Component state
  let connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'connecting';
  let gameState: 'waiting' | 'playing' | 'finished' | 'disconnected' = 'waiting';
  let board: CellValue[] = Array(9).fill(null);
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
  let wsUnsub: () => void;

  onMount(() => {
    if (!browser) return;

    pageUnsub = page.subscribe(p => {
      roomId = p.params.id;
      playerName = p.url.searchParams.get('playerName') || p.state?.playerName;
    });

    // Redirect if no player name provided
    if (!playerName) {
      goto('/');
      return;
    }

    // Validate room ID format
    if (!roomId || !/^[A-Za-z0-9_-]+$/.test(roomId)) {
      error = 'Invalid room ID';
      connectionStatus = 'error';
      return;
    }

    // Connect to WebSocket and set up message handling
    ws.connect();
    wsUnsub = ws.subscribe(handleWebSocketMessage);

    // Send join room message
    ws.send({
      type: 'joinRoom',
      roomId,
      playerName: playerName!
    });
  });

  onDestroy(() => {
    if (wsUnsub) wsUnsub();
    if (pageUnsub) pageUnsub();
    ws.disconnect();
  });

  function handleWebSocketMessage(message: any) {
    if (!message) return;

    switch (message.type) {
      case 'connected':
        connectionStatus = 'connected';
        break;
      
      case 'disconnected':
        connectionStatus = 'disconnected';
        if (gameState === 'playing') {
          gameState = 'disconnected';
        }
        break;

      case 'roomCreated':
      case 'playerJoined':
      case 'gameStart':
      case 'moveMade':
        updateGameState(message.roomState);
        break;

      case 'gameOver':
        updateGameState(message.roomState);
        gameState = 'finished';
        winner = message.result.winner;
        calculateWinningCells();
        break;

      case 'playerDisconnected':
        updateGameState(message.roomState);
        if (gameState === 'playing') {
          gameState = 'disconnected';
        }
        break;

      case 'error':
        error = message.message;
        connectionStatus = 'error';
        break;
    }
  }

  function updateGameState(roomState: RoomState) {
    board = [...roomState.board];
    currentPlayer = roomState.currentTurn;
    
    // Map players array to our players object
    players = {};
    roomState.players.forEach((player: Player) => {
      if (player) {
        players[player.symbol] = {
          name: player.name,
          connected: player.connected
        };
        
        // Set player symbol if this is our player
        if (player.name === playerName) {
          playerSymbol = player.symbol;
        }
      }
    });

    // Update game state based on room status
    switch (roomState.status) {
      case 'waiting':
        gameState = 'waiting';
        break;
      case 'playing':
        gameState = 'playing';
        break;
      case 'finished':
        gameState = 'finished';
        winner = roomState.winner || null;
        calculateWinningCells();
        break;
    }

    connectionStatus = 'connected';
    error = null;
  }

  function calculateWinningCells() {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        winningCells = pattern;
        return;
      }
    }
    winningCells = [];
  }

  function onCellClick(index: number) {
    // Validate move conditions
    if (
      gameState !== 'playing' ||
      currentPlayer !== playerSymbol ||
      board[index] !== null ||
      connectionStatus !== 'connected'
    ) {
      return;
    }

    // Optimistic UI update
    board[index] = playerSymbol;
    
    // Send move to server
    ws.send({
      type: 'makeMove',
      roomId,
      cellIndex: index
    });
  }

  async function onCopyLink() {
    if (!browser) return;
    
    try {
      await navigator.clipboard.writeText(window.location.href);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  function onNewGame() {
    goto('/');
  }

  function onBackToHome() {
    goto('/');
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCellClick(index);
    }
  }

  $: roomUrl = browser ? window.location.href : '';
</script>

<svelte:head>
  <title>Tic Tac Toe - Room {roomId}</title>
</svelte:head>

<main class="game-room">
  {#if connectionStatus === 'connecting'}
    <div class="status" role="status" aria-live="polite">
      <div class="loading">
        <p>Connecting to game...</p>
        <div class="spinner" aria-hidden="true"></div>
      </div>
    </div>
  {:else if connectionStatus === 'error'}
    <div class="status error" role="alert">
      <h2>Connection Error</h2>
      <p>{error || 'Failed to connect to game server'}</p>
      <button on:click={onBackToHome} class="primary">Back to Home</button>
    </div>
  {:else if gameState === 'waiting'}
    <div class="status waiting" role="status" aria-live="polite">
      <h2>Waiting for opponent...</h2>
      <div class="share-room">
        <p>Share this link to invite a friend:</p>
        <div class="url-container">
          <code class="room-url">{roomUrl}</code>
          <button 
            on:click={onCopyLink} 
            class="copy-btn"
            aria-label="Copy room link to clipboard"
          >
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
        </div>
      </div>
      {#if players.X}
        <div class="player-info">
          <p>Player: <strong>{players.X.name}</strong> (X)</p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="game-area">
      <!-- Player Information Panel -->
      <div class="players-panel" role="region" aria-label="Player information">
        <h2>Players</h2>
        <div class="players-grid">
          {#each ['X', 'O'] as symbol}
            <div 
              class="player-card" 
              class:active={currentPlayer === symbol && gameState === 'playing'}
              class:current-player={playerSymbol === symbol}
            >
              <div class="player-symbol">{symbol}</div>
              <div class="player-details">
                <div class="player-name">
                  {players[symbol]?.name || 'Waiting...'}
                </div>
                <div class="connection-status">
                  <span 
                    class="status-indicator" 
                    class:connected={players[symbol]?.connected}
                    aria-label={players[symbol]?.connected ? 'Connected' : 'Disconnected'}
                  ></span>
                  {players[symbol]?.connected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
              {#if currentPlayer === symbol && gameState === 'playing'}
                <div class="turn-indicator" aria-label="Current turn">
                  ← Your turn
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Game Board -->
      {#if gameState === 'playing' || gameState === 'finished'}
        <div class="board-container">
          <h2>Game Board</h2>
          <div 
            class="board" 
            role="grid" 
            aria-label="Tic Tac Toe game board"
            class:finished={gameState === 'finished'}
          >
            {#each board as cell, i}
              <button
                class="cell"
                class:winning={winningCells.includes(i)}
                class:clickable={gameState === 'playing' && currentPlayer === playerSymbol && !cell}
                role="gridcell"
                tabindex={gameState === 'playing' && currentPlayer === playerSymbol && !cell ? 0 : -1}
                aria-label={cell ? `Cell ${i + 1}: ${cell}` : `Cell ${i + 1}: empty`}
                on:click={() => onCellClick(i)}
                on:keydown={(e) => handleKeyDown(e, i)}
                disabled={gameState !== 'playing' || currentPlayer !== playerSymbol || cell !== null}
              >
                <span class="cell-content" aria-hidden="true">
                  {cell || ''}
                </span>
              </button>
            {/each}
          </div>
          
          {#if gameState === 'playing'}
            <div class="game-status" role="status" aria-live="polite">
              {#if currentPlayer === playerSymbol}
                <p class="turn-message">Your turn - Make your move!</p>
              {:else}
                <p class="turn-message">Waiting for {players[currentPlayer]?.name || 'opponent'}...</p>
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Game Result -->
      {#if gameState === 'finished'}
        <div class="game-result" role="status" aria-live="polite">
          <h2>Game Over!</h2>
          {#if winner === 'draw'}
            <p class="result-message">It's a draw! Great game!</p>
          {:else if winner === playerSymbol}
            <p class="result-message win">🎉 You won! Congratulations!</p>
          {:else}
            <p class="result-message lose">You lost. Better luck next time!</p>
          {/if}
          <button on:click={onNewGame} class="primary">Play Again</button>
        </div>
      {:else if gameState === 'disconnected'}
        <div class="game-result disconnected" role="status" aria-live="polite">
          <h2>Opponent Disconnected</h2>
          <p class="result-message">Your opponent has left the game. You win by default!</p>
          <button on:click={onNewGame} class="primary">New Game</button>
        </div>
      {/if}

      <!-- Error Display -->
      {#if error && connectionStatus === 'connected'}
        <div class="error-message" role="alert">
          <p>⚠️ {error}</p>
          <button on:click={() => error = null} class="small">Dismiss</button>
        </div>
      {/if}
    </div>
  {/if}
</main>

<style>
  .game-room {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .status {
    text-align: center;
    padding: 2rem;
    border-radius: 8px;
    margin: 2rem 0;
  }

  .status.waiting {
    background: #f8f9fa;
    border: 2px solid #e9ecef;
  }

  .status.error {
    background: #fff5f5;
    border: 2px solid #fed7d7;
    color: #c53030;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .share-room {
    margin: 2rem 0;
  }

  .url-container {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    margin: 1rem 0;
  }

  .room-url {
    background: #f1f3f4;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9rem;
    word-break: break-all;
    max-width: 300px;
  }

  .copy-btn {
    background: #4285f4;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .copy-btn:hover {
    background: #3367d6;
  }

  .game-area {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .players-panel {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border: 2px solid #e9ecef;
  }

  .players-panel h2 {
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .players-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .player-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 6px;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .player-card.active {
    border-color: #4285f4;
    background: #f0f7ff;
  }

  .player-card.current-player {
    box-shadow: 0 0 0 2px #34a853;
  }

  .player-symbol {
    font-size: 1.5rem;
    font-weight: bold;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e9ecef;
    border-radius: 50%;
  }

  .player-details {
    flex: 1;
  }

  .player-name {
    font-weight: bold;
    margin-bottom: 0.25rem;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6c757d;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #dc3545;
  }

  .status-indicator.connected {
    background: #28a745;
  }

  .turn-indicator {
    font-size: 0.875rem;
    color: #4285f4;
    font-weight: bold;
  }

  .board-container {
    text-align: center;
  }

  .board-container h2 {
    margin-bottom: 1rem;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 4px;
    max-width: 300px;
    margin: 0 auto 1rem;
    background: #dee2e6;
    padding: 4px;
    border-radius: 8px;
  }

  .cell {
    aspect-ratio: 1;
    background: white;
    border: none;
    border-radius: 4px;
    font-size: 2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cell:disabled {
    cursor: default;
  }

  .cell.clickable:hover {
    background: #f8f9fa;
    transform: scale(0.95);
  }

  .cell.clickable:focus {
    outline: 2px solid #4285f4;
    outline-offset: 2px;
  }

  .cell.winning {
    background: #fff3cd;
    animation: highlight 0.5s ease-in-out;
  }

  @keyframes highlight {
    0% { background: #ffc107; }
    100% { background: #fff3cd; }
  }

  .cell-content {
    color: #495057;
  }

  .game-status {
    margin: 1rem 0;
  }

  .turn-message {
    font-size: 1.1rem;
    margin: 0;
    color: #495057;
  }

  .game-result {
    text-align: center;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid #e9ecef;
  }

  .game-result.disconnected {
    background: #fff3cd;
    border-color: #ffeaa7;
  }

  .game-result h2 {
    margin: 0 0 1rem 0;
  }

  .result-message {
    font-size: 1.2rem;
    margin: 1rem 0;
  }

  .result-message.win {
    color: #28a745;
  }

  .result-message.lose {
    color: #dc3545;
  }

  .error-message {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    color: #c53030;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
    text-align: center;
  }

  .player-info {
    margin-top: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 6px;
  }

  /* Button styles */
  button {
    background: #6c757d;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  button:hover {
    background: #5a6268;
  }

  button.primary {
    background: #4285f4;
  }

  button.primary:hover {
    background: #3367d6;
  }

  button.small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  /* Responsive design */
  @media (max-width: 600px) {
    .game-room {
      padding: 0.5rem;
    }

    .players-grid {
      grid-template-columns: 1fr;
    }

    .board {
      max-width: 250px;
    }

    .cell {
      font-size: 1.5rem;
    }

    .url-container {
      flex-direction: column;
    }

    .room-url {
      max-width: 100%;
      font-size: 0.8rem;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .cell {
      border: 2px solid #000;
    }
    
    .status-indicator {
      border: 1px solid #000;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
    
    .cell.clickable:hover {
      transform: none;
    }
    
    @keyframes highlight {
      0%, 100% { background: #fff3cd; }
    }
  }
</style>
