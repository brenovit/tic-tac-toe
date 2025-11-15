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
        if (message.message.includes('not found') || message.message.includes('does not exist')) {
          goto('/');
        } else {
          connectionStatus = 'error';
        }
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

    // Send move to server (no optimistic updates)
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
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        copied = true;
        setTimeout(() => (copied = false), 2000);
      } catch (fallbackErr) {
        console.error('Clipboard fallback failed:', fallbackErr);
      }
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
  $: isMyTurn = gameState === 'playing' && currentPlayer === playerSymbol;
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
                  {playerSymbol === symbol ? 'Your turn' : 'Their turn'}
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
                class:clickable={isMyTurn && !cell}
                role="gridcell"
                tabindex={isMyTurn && !cell ? 0 : -1}
                aria-label={cell ? `Cell ${i + 1}: ${cell}` : `Cell ${i + 1}: empty`}
                on:click={() => onCellClick(i)}
                on:keydown={(e) => handleKeyDown(e, i)}
                disabled={!isMyTurn || cell !== null}
              >
                <span class="cell-content" aria-hidden="true">
                  {cell || ''}
                </span>
              </button>
            {/each}
          </div>
          
          {#if gameState === 'playing'}
            <div class="game-status" role="status" aria-live="polite">
              {#if isMyTurn}
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
          <div class="game-actions">
            <button on:click={onNewGame} class="primary">New Game</button>
            <button on:click={onCopyLink} class="secondary">
              {copied ? '✓ Link Copied' : 'Copy Rematch Link'}
            </button>
          </div>
        </div>
      {:else if gameState === 'disconnected'}
        <div class="game-result disconnected" role="status" aria-live="polite">
          <h2>Opponent Disconnected</h2>
          <p class="result-message">Your opponent has left the game. You win by default!</p>
          <button on:click={onNewGame} class="primary">New Game</button>
        </div>
      {/if}

      <!-- Connection Loss Indicator -->
      {#if connectionStatus === 'disconnected'}
        <div class="connection-status-banner" role="alert">
          <div class="reconnecting-indicator">
            <div class="spinner small" aria-hidden="true"></div>
            <span>Connection lost - Reconnecting...</span>
          </div>
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
  /* Base styles and layout */
  .game-room {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    min-height: 100vh;
  }

  h2 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.5rem;
  }

  /* Status screens */
  .status {
    text-align: center;
    padding: 2rem;
    border-radius: 12px;
    margin: 2rem 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .status.waiting {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 2px solid #dee2e6;
  }

  .status.error {
    background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
    border: 2px solid #fc8181;
    color: #c53030;
  }

  /* Loading spinner */
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #4285f4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner.small {
    width: 20px;
    height: 20px;
    border-width: 3px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Share room section */
  .share-room {
    margin: 2rem 0;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #e9ecef;
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
    background: #f8f9fa;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.85rem;
    word-break: break-all;
    max-width: 350px;
    border: 2px solid #dee2e6;
    color: #495057;
  }

  .copy-btn {
    background: #4285f4;
    color: white;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(66, 133, 244, 0.3);
  }

  .copy-btn:hover {
    background: #3367d6;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(66, 133, 244, 0.4);
  }

  .copy-btn:active {
    transform: translateY(0);
  }

  /* Player information */
  .player-info {
    margin-top: 1.5rem;
    padding: 1rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e9ecef;
  }

  /* Game area layout */
  .game-area {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Players panel */
  .players-panel {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #dee2e6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .players-panel h2 {
    text-align: center;
    color: #495057;
    margin-bottom: 1.5rem;
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
    padding: 1.25rem;
    background: white;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .player-card.active {
    border-color: #4285f4;
    background: linear-gradient(135deg, #f0f7ff 0%, #e3f2fd 100%);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
  }

  .player-card.current-player {
    box-shadow: 0 0 0 3px rgba(52, 168, 83, 0.3);
  }

  .player-symbol {
    width: 48px;
    height: 48px;
    background: #4285f4;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .player-details {
    flex: 1;
    min-width: 0;
  }

  .player-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
    font-size: 1rem;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #666;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #dc3545;
    flex-shrink: 0;
  }

  .status-indicator.connected {
    background: #28a745;
  }

  .turn-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #4285f4;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  /* Game board */
  .board-container {
    text-align: center;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    max-width: 300px;
    margin: 0 auto 1.5rem;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;
    border: 2px solid #dee2e6;
  }

  .cell {
    width: 80px;
    height: 80px;
    background: white;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    font-size: 2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    outline-offset: 2px;
  }

  .cell:hover.clickable {
    background: #e3f2fd;
    border-color: #4285f4;
    transform: scale(1.05);
  }

  .cell:active.clickable {
    transform: scale(0.98);
  }

  .cell:focus {
    outline: 2px solid #4285f4;
    outline-offset: 2px;
  }

  .cell:disabled {
    cursor: not-allowed;
  }

  .cell.winning {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    border-color: #28a745;
    animation: winningPulse 1s ease-in-out;
  }

  @keyframes winningPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .cell-content {
    color: inherit;
  }

  .board.finished .cell:not(.winning) {
    opacity: 0.6;
  }

  /* Game status */
  .game-status {
    margin: 1rem 0;
  }

  .turn-message {
    font-size: 1.1rem;
    font-weight: 500;
    color: #495057;
    margin: 0;
  }

  /* Game result */
  .game-result {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    border: 2px solid #dee2e6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .game-result.disconnected {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border-color: #ffc107;
  }

  .result-message {
    font-size: 1.25rem;
    font-weight: 500;
    margin: 1rem 0 2rem;
  }

  .result-message.win {
    color: #28a745;
    font-size: 1.5rem;
  }

  .result-message.lose {
    color: #dc3545;
  }

  .game-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* Connection status banner */
  .connection-status-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ffc107;
    color: #856404;
    padding: 0.75rem;
    text-align: center;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .reconnecting-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  /* Error message */
  .error-message {
    background: #fff5f5;
    border: 2px solid #fed7d7;
    color: #c53030;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .error-message p {
    margin: 0;
    flex: 1;
  }

  /* Buttons */
  button {
    background: #4285f4;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    outline-offset: 2px;
  }

  button:hover {
    background: #3367d6;
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }

  button:focus {
    outline: 2px solid #4285f4;
  }

  button.primary {
    background: #4285f4;
    box-shadow: 0 2px 4px rgba(66, 133, 244, 0.3);
  }

  button.primary:hover {
    background: #3367d6;
    box-shadow: 0 4px 8px rgba(66, 133, 244, 0.4);
  }

  button.secondary {
    background: #6c757d;
    box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
  }

  button.secondary:hover {
    background: #5a6268;
    box-shadow: 0 4px 8px rgba(108, 117, 125, 0.4);
  }

  button.small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .game-room {
      padding: 0.5rem;
    }

    .players-grid {
      grid-template-columns: 1fr;
    }

    .player-card {
      padding: 1rem;
    }

    .player-symbol {
      width: 40px;
      height: 40px;
      font-size: 1.25rem;
    }

    .board {
      max-width: 280px;
      gap: 6px;
      padding: 12px;
    }

    .cell {
      width: 70px;
      height: 70px;
      font-size: 1.75rem;
    }

    .url-container {
      flex-direction: column;
      align-items: stretch;
    }

    .room-url {
      max-width: none;
      font-size: 0.8rem;
    }

    .game-actions {
      flex-direction: column;
      align-items: center;
    }

    .game-actions button {
      width: 100%;
      max-width: 200px;
    }

    .status {
      padding: 1.5rem 1rem;
    }

    h2 {
      font-size: 1.25rem;
    }
  }

  @media (max-width: 480px) {
    .board {
      max-width: 240px;
    }

    .cell {
      width: 60px;
      height: 60px;
      font-size: 1.5rem;
    }

    .room-url {
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
    }

    .copy-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .cell {
      border-width: 3px;
    }

    .player-card {
      border-width: 3px;
    }

    .status {
      border-width: 3px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .cell,
    .player-card,
    button,
    .copy-btn {
      transition: none;
    }

    .spinner {
      animation: none;
    }

    @keyframes winningPulse {
      0%, 100% { transform: none; }
    }
  }

  /* Focus management for better accessibility */
  .cell:focus-visible {
    outline: 3px solid #4285f4;
    outline-offset: 2px;
  }

  button:focus-visible {
    outline: 3px solid #4285f4;
    outline-offset: 2px;
  }

  /* Ensure sufficient color contrast */
  .status.waiting {
    color: #495057;
  }

  .connection-status {
    color: #6c757d;
  }

  .turn-message {
    color: #343a40;
  }
</style>
