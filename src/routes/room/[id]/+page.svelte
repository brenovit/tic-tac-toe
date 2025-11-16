<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { websocketStore } from "$lib/websocket-store";
  import type {
    RoomState,
    Player,
    CellValue,
    ClientToServerMessage,
    ServerToClientMessage,
  } from "$lib/types/game-types";

  // Extract room ID from URL parameters
  $: roomId = $page.params.id;
  $: playerName = $page.url.searchParams.get("name") || $page.state?.playerName;

  // Redirect if no player name provided
  $: if (browser && !playerName) {
    goto("/");
  }

  // Component state
  let connectionStatus: "connecting" | "connected" | "disconnected" | "error" =
    "connecting";
  let gameState: "waiting" | "playing" | "finished" | "disconnected" =
    "waiting";
  let board: CellValue[] = Array(9).fill(null);
  let currentPlayer: "X" | "O" | null = null;
  let players: { X?: Player; O?: Player } = {};
  let winner: "X" | "O" | "draw" | null = null;
  let winningCells: number[] = [];
  let playerSymbol: "X" | "O" | null = null;
  let error: string | null = null;
  let playerId: string | null = null;
  let copySuccess = false;

  // WebSocket message handler
  function handleMessage(message: ServerToClientMessage) {
    switch (message.type) {
      case "roomCreated":
        connectionStatus = "connected";
        updateGameState(message.roomState);
        playerId = message.playerId;
        break;

      case "playerJoined":
        updateGameState(message.roomState);
        break;

      case "gameStart":
        gameState = "playing";
        updateGameState(message.roomState);
        break;

      case "moveMade":
        updateGameState(message.roomState);
        break;

      case "gameOver":
        gameState = "finished";
        winner = message.result.winner;
        updateGameState(message.roomState);
        calculateWinningCells();
        break;

      case "playerDisconnected":
        if (message.roomState.status === "finished") {
          gameState = "finished";
          winner = playerSymbol;
        } else {
          gameState = "disconnected";
        }
        updateGameState(message.roomState);
        break;

      case "error":
        error = message.message;
        connectionStatus = "error";
        break;
    }
  }

  function updateGameState(roomState: RoomState) {
    board = [...roomState.board];
    currentPlayer = roomState.currentTurn;

    // Update players object
    players = {};
    roomState.players.forEach((player) => {
      if (player) {
        players[player.symbol] = player;
        if (player.id === playerId) {
          playerSymbol = player.symbol;
        }
      }
    });

    // Update game state based on room status
    if (roomState.status === "waiting") {
      gameState = "waiting";
    } else if (roomState.status === "playing") {
      gameState = "playing";
    } else if (roomState.status === "finished") {
      gameState = "finished";
      winner = roomState.winner || null;
    }
  }

  function calculateWinningCells() {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
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
    // Validate move
    if (
      gameState !== "playing" ||
      board[index] !== null ||
      currentPlayer !== playerSymbol ||
      connectionStatus !== "connected"
    ) {
      return;
    }

    // Send move to server
    const message: ClientToServerMessage = {
      type: "makeMove",
      roomId,
      cellIndex: index,
    };
    websocketStore.send(message);
  }

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/room/${roomId}?name=`;
      await navigator.clipboard.writeText(url);
      copySuccess = true;
      setTimeout(() => (copySuccess = false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  }

  function handleNewGame() {
    goto("/");
  }

  function handleBackToHome() {
    goto("/");
  }

  onMount(() => {
    if (!browser || !roomId || !playerName) return;

    connectionStatus = "connecting";

    // Subscribe to WebSocket messages
    const unsubscribe = websocketStore.subscribe((message) => {
      if (message) {
        handleMessage(message);
      }
    });

    // Connect and join room
    websocketStore.connect();

    // Send join room message when connected
    const checkConnection = setInterval(() => {
      if (websocketStore.isConnected()) {
        const joinMessage: ClientToServerMessage = {
          type: "joinRoom",
          roomId,
          playerName,
        };
        websocketStore.send(joinMessage);
        clearInterval(checkConnection);
      }
    }, 100);

    return () => {
      unsubscribe();
      clearInterval(checkConnection);
    };
  });

  onDestroy(() => {
    if (browser) {
      websocketStore.disconnect();
    }
  });
</script>

<svelte:head>
  <title>Room {roomId} - Tic Tac Toe</title>
</svelte:head>

<div class="game-room">
  {#if connectionStatus === "connecting"}
    <div class="status-message">
      <div class="loading">Connecting to game...</div>
    </div>
  {:else if error}
    <div class="error-state">
      <h2>Error</h2>
      <p>{error}</p>
      <button on:click={handleBackToHome} class="button">Back to Home</button>
    </div>
  {:else if gameState === "waiting"}
    <div class="waiting-state">
      <h2>Waiting for opponent...</h2>
      <div class="room-info">
        <p>Room ID: <code>{roomId}</code></p>
        <div class="share-link">
          <p>Share this link with your opponent:</p>
          <div class="link-container">
            <input
              type="text"
              value="{window?.location?.origin}/room/{roomId}?name="
              readonly
              class="link-input"
            />
            <button
              on:click={handleCopyLink}
              class="copy-button"
              class:success={copySuccess}
            >
              {copySuccess ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>
      {#if players.X}
        <div class="player-info">
          <p>Player X: {players.X.name} {players.X.connected ? "🟢" : "🔴"}</p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="game-active">
      <!-- Player Information Panel -->
      <div class="players-panel">
        <div class="player" class:active={currentPlayer === "X"}>
          <span class="symbol">X</span>
          <span class="name">{players.X?.name || "Player X"}</span>
          <span class="status">{players.X?.connected ? "🟢" : "🔴"}</span>
        </div>
        <div class="vs">vs</div>
        <div class="player" class:active={currentPlayer === "O"}>
          <span class="symbol">O</span>
          <span class="name">{players.O?.name || "Player O"}</span>
          <span class="status">{players.O?.connected ? "🟢" : "🔴"}</span>
        </div>
      </div>

      <!-- Game Status -->
      {#if gameState === "playing"}
        <div class="turn-indicator">
          {#if currentPlayer === playerSymbol}
            Your turn
          {:else}
            {players[currentPlayer]?.name || `Player ${currentPlayer}`}'s turn
          {/if}
        </div>
      {:else if gameState === "finished"}
        <div class="game-result">
          {#if winner === "draw"}
            It's a draw!
          {:else if winner === playerSymbol}
            You win! 🎉
          {:else}
            {players[winner]?.name || `Player ${winner}`} wins!
          {/if}
        </div>
      {:else if gameState === "disconnected"}
        <div class="game-result">Opponent disconnected - You win! 🎉</div>
      {/if}

      <!-- Game Board -->
      <div
        class="board"
        class:disabled={gameState !== "playing" ||
          currentPlayer !== playerSymbol}
      >
        {#each board as cell, index}
          <button
            class="cell"
            class:winning={winningCells.includes(index)}
            class:clickable={gameState === "playing" &&
              cell === null &&
              currentPlayer === playerSymbol}
            on:click={() => handleCellClick(index)}
            disabled={gameState !== "playing" ||
              cell !== null ||
              currentPlayer !== playerSymbol}
            aria-label="Cell {index + 1}"
          >
            {cell || ""}
          </button>
        {/each}
      </div>

      <!-- Game Actions -->
      {#if gameState === "finished" || gameState === "disconnected"}
        <div class="game-actions">
          <button on:click={handleNewGame} class="button primary"
            >New Game</button
          >
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .game-room {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .status-message {
    text-align: center;
    font-size: 1.2rem;
  }

  .loading {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .error-state {
    text-align: center;
  }

  .error-state h2 {
    color: #ef4444;
    margin-bottom: 1rem;
  }

  .waiting-state {
    text-align: center;
  }

  .room-info {
    margin: 2rem 0;
  }

  .room-info code {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
  }

  .share-link {
    margin-top: 1.5rem;
  }

  .link-container {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  .link-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-family: monospace;
    font-size: 0.875rem;
    min-width: 200px;
  }

  .copy-button {
    padding: 0.75rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .copy-button:hover {
    background: #2563eb;
  }

  .copy-button.success {
    background: #10b981;
  }

  .player-info {
    margin-top: 1rem;
  }

  .game-active {
    text-align: center;
  }

  .players-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.75rem;
  }

  .player {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    transition: background-color 0.2s;
  }

  .player.active {
    background: #dbeafe;
    border: 2px solid #3b82f6;
  }

  .player .symbol {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .player .name {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .player .status {
    font-size: 0.75rem;
  }

  .vs {
    font-weight: bold;
    color: #6b7280;
  }

  .turn-indicator,
  .game-result {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 2rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background: #f0f9ff;
    color: #0369a1;
  }

  .game-result {
    background: #f0fdf4;
    color: #166534;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    max-width: 300px;
    margin: 0 auto 2rem;
  }

  .board.disabled {
    pointer-events: none;
    opacity: 0.7;
  }

  .cell {
    aspect-ratio: 1;
    border: 2px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    font-size: 2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .cell:disabled {
    cursor: not-allowed;
  }

  .cell.clickable:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
    transform: translateY(-1px);
  }

  .cell.winning {
    background: #dcfce7;
    border-color: #16a34a;
    animation: highlight 0.5s ease-in-out;
  }

  @keyframes highlight {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .game-actions {
    margin-top: 2rem;
  }

  .button {
    padding: 0.75rem 2rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .button:hover {
    background: #f9fafb;
  }

  .button.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .button.primary:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  /* Mobile responsive design */
  @media (max-width: 640px) {
    .game-room {
      padding: 1rem;
    }

    .players-panel {
      flex-direction: column;
      gap: 0.5rem;
    }

    .player {
      flex-direction: row;
      gap: 0.5rem;
    }

    .vs {
      transform: rotate(90deg);
    }

    .link-container {
      flex-direction: column;
    }

    .link-input {
      min-width: unset;
    }

    .board {
      max-width: 250px;
    }

    .cell {
      min-height: 60px;
      font-size: 1.5rem;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .cell {
      border-width: 3px;
    }

    .player.active {
      border-width: 3px;
    }
  }

  /* Focus styles for keyboard navigation */
  .cell:focus,
  .button:focus,
  .copy-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
</style>
