<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { websocketStore } from '$lib/stores/websocket-store';
  import type { 
    RoomState, 
    CellValue, 
    Player,
    ClientToServerMessage,
    ServerToClientMessage 
  } from '$lib/types/game-types';

  // Extract room ID from URL params
  $: roomId = $page.params.id;
  $: playerName = $page.url.searchParams.get('name');

  // Component state
  let connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'connecting';
  let roomState: RoomState | null = null;
  let playerSymbol: 'X' | 'O' | null = null;
  let error: string | null = null;
  let winningCells: number[] = [];
  let copyLinkSuccess = false;

  // Redirect if no player name
  if (!playerName) {
    goto('/');
  }

  // WebSocket subscription
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    if (!playerName || !roomId) return;

    // Subscribe to WebSocket store
    unsubscribe = websocketStore.subscribe((ws) => {
      if (ws?.readyState === WebSocket.OPEN) {
        connectionStatus = 'connected';
        
        // Send join room message
        const joinMessage: ClientToServerMessage = {
          type: 'joinRoom',
          roomId,
          playerName
        };
        ws.send(JSON.stringify(joinMessage));
      } else if (ws?.readyState === WebSocket.CONNECTING) {
        connectionStatus = 'connecting';
      } else {
        connectionStatus = 'disconnected';
      }
    });

    // Connect to WebSocket
    websocketStore.connect();

    // Handle WebSocket messages
    const handleMessage = (event: MessageEvent) => {
      const message: ServerToClientMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'playerJoined':
        case 'gameStart':
        case 'moveMade':
          roomState = message.roomState;
          updatePlayerSymbol();
          calculateWinningCells();
          break;
          
        case 'gameOver':
          roomState = message.roomState;
          updatePlayerSymbol();
          calculateWinningCells();
          break;
          
        case 'playerDisconnected':
          roomState = message.roomState;
          break;
          
        case 'error':
          error = message.message;
          connectionStatus = 'error';
          break;
      }
    };

    // Add message listener
    const ws = websocketStore.getWebSocket();
    if (ws) {
      ws.addEventListener('message', handleMessage);
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    websocketStore.disconnect();
  });

  function updatePlayerSymbol() {
    if (!roomState || !playerName) return;
    
    const player1 = roomState.players[0];
    const player2 = roomState.players[1];
    
    if (player1?.name === playerName) {
      playerSymbol = player1.symbol;
    } else if (player2?.name === playerName) {
      playerSymbol = player2.symbol;
    }
  }

  function calculateWinningCells() {
    if (!roomState || roomState.status !== 'finished' || roomState.winner === 'draw') {
      winningCells = [];
      return;
    }

    const board = roomState.board;
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        winningCells = pattern;
        break;
      }
    }
  }

  function handleCellClick(index: number) {
    if (!roomState || !playerSymbol) return;
    if (roomState.status !== 'playing') return;
    if (roomState.currentTurn !== playerSymbol) return;
    if (roomState.board[index] !== null) return;

    const ws = websocketStore.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const moveMessage: ClientToServerMessage = {
      type: 'makeMove',
      roomId,
      cellIndex: index
    };

    ws.send(JSON.stringify(moveMessage));
  }

  async function copyRoomLink() {
    try {
      const url = `${window.location.origin}/room/${roomId}?name=`;
      await navigator.clipboard.writeText(url);
      copyLinkSuccess = true;
      setTimeout(() => {
        copyLinkSuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  function handleNewGame() {
    goto('/');
  }

  function handleBackToHome() {
    goto('/');
  }

  // Computed values
  $: gameState = roomState?.status || 'waiting';
  $: isMyTurn = roomState?.currentTurn === playerSymbol;
  $: opponent = roomState?.players.find(p => p?.symbol !== playerSymbol);
  $: me = roomState?.players.find(p => p?.symbol === playerSymbol);
  $: needsOpponent = !roomState?.players[1];
</script>

<svelte:head>
  <title>Tic Tac Toe - Room {roomId}</title>
</svelte:head>

<div class="game-room">
  <header class="room-header">
    <h1>Tic Tac Toe</h1>
    <div class="room-info">
      <span class="room-id">Room: {roomId}</span>
      {#if connectionStatus === 'connecting'}
        <span class="status connecting">Connecting...</span>
      {:else if connectionStatus === 'disconnected'}
        <span class="status disconnected">Disconnected</span>
      {:else if connectionStatus === 'connected'}
        <span class="status connected">Connected</span>
      {/if}
    </div>
  </header>

  <main class="game-content">
    {#if connectionStatus === 'connecting'}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Connecting to game...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <h2>Error</h2>
        <p>{error}</p>
        <button on:click={handleBackToHome} class="btn-primary">Back to Home</button>
      </div>
    {:else if needsOpponent}
      <div class="waiting-state">
        <h2>Waiting for opponent...</h2>
        <p>Share this link with a friend to start playing:</p>
        <div class="share-link">
          <input 
            type="text" 
            readonly 
            value="{window.location.origin}/room/{roomId}?name="
            class="link-input"
          />
          <button 
            on:click={copyRoomLink} 
            class="btn-secondary"
            class:success={copyLinkSuccess}
          >
            {copyLinkSuccess ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
        {#if me}
          <div class="player-info">
            <p>You are playing as <strong>{me.symbol}</strong></p>
          </div>
        {/if}
      </div>
    {:else if roomState}
      <div class="game-state">
        <!-- Player info panel -->
        <div class="players-panel">
          {#each roomState.players as player}
            {#if player}
              <div 
                class="player-card" 
                class:active={gameState === 'playing' && roomState.currentTurn === player.symbol}
                class:me={player.symbol === playerSymbol}
              >
                <div class="player-symbol">{player.symbol}</div>
                <div class="player-name">{player.name}</div>
                <div class="connection-status" class:connected={player.connected}>
                  {player.connected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <!-- Game status -->
        <div class="game-status">
          {#if gameState === 'playing'}
            {#if isMyTurn}
              <p class="turn-indicator">Your turn</p>
            {:else}
              <p class="turn-indicator">Opponent's turn</p>
            {/if}
          {:else if gameState === 'finished'}
            {#if roomState.winner === 'draw'}
              <p class="game-result draw">It's a draw!</p>
            {:else if roomState.winner === playerSymbol}
              <p class="game-result win">You win! 🎉</p>
            {:else}
              <p class="game-result lose">You lose</p>
            {/if}
            <button on:click={handleNewGame} class="btn-primary">New Game</button>
          {:else if opponent && !opponent.connected}
            <p class="game-result win">Opponent disconnected - You win! 🎉</p>
            <button on:click={handleNewGame} class="btn-primary">New Game</button>
          {/if}
        </div>

        <!-- Game board -->
        <div class="game-board">
          {#each roomState.board as cell, index}
            <button
              class="cell"
              class:winning={winningCells.includes(index)}
              class:clickable={gameState === 'playing' && isMyTurn && cell === null}
              on:click={() => handleCellClick(index)}
              disabled={gameState !== 'playing' || !isMyTurn || cell !== null}
              aria-label="Cell {index + 1}, {cell || 'empty'}"
            >
              {cell || ''}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .game-room {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .room-header {
    text-align: center;
    margin-bottom: 2rem;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 1rem;
  }

  .room-header h1 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  .room-info {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    font-size: 0.9rem;
  }

  .room-id {
    color: #666;
  }

  .status {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .status.connecting {
    background: #fef3c7;
    color: #92400e;
  }

  .status.connected {
    background: #d1fae5;
    color: #065f46;
  }

  .status.disconnected {
    background: #fee2e2;
    color: #991b1b;
  }

  .game-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .loading-state {
    text-align: center;
    padding: 2rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e5e5;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-state, .waiting-state {
    text-align: center;
    padding: 2rem;
    max-width: 500px;
  }

  .share-link {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
    flex-wrap: wrap;
  }

  .link-input {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    font-size: 0.9rem;
  }

  .players-panel {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .player-card {
    background: #f8f9fa;
    border: 2px solid #e9ecef;
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
    min-width: 120px;
    transition: all 0.2s ease;
  }

  .player-card.active {
    border-color: #007bff;
    background: #e3f2fd;
  }

  .player-card.me {
    background: #e8f5e8;
    border-color: #28a745;
  }

  .player-symbol {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .player-name {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .connection-status {
    font-size: 0.8rem;
    color: #666;
  }

  .connection-status.connected {
    color: #28a745;
  }

  .game-status {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .turn-indicator {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0;
  }

  .game-result {
    font-size: 1.2rem;
    font-weight: bold;
    margin: 0 0 1rem 0;
  }

  .game-result.win {
    color: #28a745;
  }

  .game-result.lose {
    color: #dc3545;
  }

  .game-result.draw {
    color: #ffc107;
  }

  .game-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    max-width: 300px;
    width: 100%;
    aspect-ratio: 1;
  }

  .cell {
    background: #fff;
    border: 2px solid #ddd;
    border-radius: 0.5rem;
    font-size: 2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cell:hover.clickable {
    background: #f0f8ff;
    border-color: #007bff;
    transform: scale(1.05);
  }

  .cell.winning {
    background: #d4edda;
    border-color: #28a745;
  }

  .cell:disabled {
    cursor: not-allowed;
  }

  .btn-primary, .btn-secondary {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #545b62;
  }

  .btn-secondary.success {
    background: #28a745;
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .game-room {
      padding: 0.5rem;
    }

    .players-panel {
      flex-direction: column;
      align-items: center;
    }

    .share-link {
      flex-direction: column;
    }

    .link-input {
      min-width: unset;
    }

    .game-board {
      max-width: 250px;
    }

    .cell {
      font-size: 1.5rem;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
    
    .cell {
      transition: none;
    }
    
    .cell:hover.clickable {
      transform: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .cell {
      border-width: 3px;
    }
    
    .player-card {
      border-width: 3px;
    }
  }
</style>
