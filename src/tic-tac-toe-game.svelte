<script lang="ts">
  let board: Array<'X' | 'O' | null> = Array(9).fill(null);
  let currentPlayer: 'X' | 'O' = 'X';
  let winner: 'X' | 'O' | null = null;
  let isDraw: boolean = false;
  let winningLine: number[] = [];

  function makeMove(index: number) {
    if (board[index] || winner || isDraw) return;
    
    board[index] = currentPlayer;
    board = [...board]; // Trigger reactivity
    
    checkWinner();
    if (!winner) {
      checkDraw();
      if (!isDraw) {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      }
    }
  }

  function checkWinner() {
    const lines = [
      [0, 1, 2], // Top row
      [3, 4, 5], // Middle row
      [6, 7, 8], // Bottom row
      [0, 3, 6], // Left column
      [1, 4, 7], // Middle column
      [2, 5, 8], // Right column
      [0, 4, 8], // Diagonal top-left to bottom-right
      [2, 4, 6]  // Diagonal top-right to bottom-left
    ];
    
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        winner = board[a];
        winningLine = [a, b, c];
        return;
      }
    }
  }

  function checkDraw() {
    if (board.every(cell => cell !== null) && !winner) {
      isDraw = true;
    }
  }

  function resetGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    winner = null;
    isDraw = false;
    winningLine = [];
  }
</script>

<div class="game-container">
  <h1 class="title">Tic-Tac-Toe</h1>
  
  <div class="board">
    {#each board as cell, i}
      <button
        class="cell {winningLine.includes(i) ? 'winning-cell' : ''} {cell ? 'occupied' : ''}"
        on:click={() => makeMove(i)}
        disabled={cell !== null || winner !== null || isDraw}
      >
        {#if cell}
          <span class="marker marker-{cell.toLowerCase()}">{cell}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="status">
    {#if winner}
      <div class="message winner-message">
        🎉 Player <span class="winner-highlight">{winner}</span> Wins! 🎉
      </div>
    {:else if isDraw}
      <div class="message draw-message">
        🤝 It's a Draw! 🤝
      </div>
    {:else}
      <div class="message turn-message">
        Current Turn: <span class="player-highlight player-{currentPlayer.toLowerCase()}">{currentPlayer}</span>
      </div>
    {/if}
  </div>

  <button class="reset-button" on:click={resetGame}>
    <span class="reset-text">Reset Game</span>
  </button>
</div>

<style>
  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #0a0a0a 0%, #000000 100%);
    padding: 2rem;
    min-height: 100vh;
    color: #ffffff;
    font-family: 'Courier New', monospace;
  }

  .title {
    font-size: 3rem;
    font-weight: bold;
    color: #00ffff;
    text-shadow: 
      0 0 10px #00ffff,
      0 0 20px #00ffff,
      0 0 30px #00ffff;
    margin-bottom: 2rem;
    text-align: center;
    animation: pulse-title 2s ease-in-out infinite alternate;
  }

  @keyframes pulse-title {
    from {
      text-shadow: 
        0 0 10px #00ffff,
        0 0 20px #00ffff,
        0 0 30px #00ffff;
    }
    to {
      text-shadow: 
        0 0 20px #00ffff,
        0 0 30px #00ffff,
        0 0 40px #00ffff;
    }
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 120px);
    grid-template-rows: repeat(3, 120px);
    gap: 8px;
    margin-bottom: 2rem;
    padding: 20px;
    background: rgba(0, 255, 255, 0.1);
    border: 2px solid #00ffff;
    border-radius: 10px;
    box-shadow: 
      0 0 20px rgba(0, 255, 255, 0.3),
      inset 0 0 20px rgba(0, 255, 255, 0.1);
  }

  .cell {
    background: linear-gradient(145deg, #1a1a1a, #0d0d0d);
    border: 2px solid #333333;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0;
    position: relative;
    overflow: hidden;
  }

  .cell:not(.occupied):not(:disabled):hover {
    background: linear-gradient(145deg, #2a2a2a, #1d1d1d);
    border-color: #00ffff;
    box-shadow: 
      0 0 15px rgba(0, 255, 255, 0.5),
      inset 0 0 15px rgba(0, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .cell:disabled {
    cursor: not-allowed;
  }

  .winning-cell {
    background: linear-gradient(145deg, #330033, #1a001a) !important;
    border-color: #ff00ff !important;
    animation: winning-glow 1.5s ease-in-out infinite alternate;
  }

  @keyframes winning-glow {
    from {
      box-shadow: 0 0 20px rgba(255, 0, 255, 0.6);
    }
    to {
      box-shadow: 
        0 0 30px rgba(255, 0, 255, 0.8),
        0 0 40px rgba(255, 0, 255, 0.6);
    }
  }

  .marker {
    font-size: 3rem;
    font-weight: bold;
    animation: marker-appear 0.3s ease-out;
  }

  @keyframes marker-appear {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .marker-x {
    color: #ff00ff;
    text-shadow: 
      0 0 10px #ff00ff,
      0 0 20px #ff00ff,
      0 0 30px #ff00ff;
  }

  .marker-o {
    color: #00ffff;
    text-shadow: 
      0 0 10px #00ffff,
      0 0 20px #00ffff,
      0 0 30px #00ffff;
  }

  .status {
    margin-bottom: 2rem;
    text-align: center;
  }

  .message {
    font-size: 1.8rem;
    font-weight: bold;
    padding: 1rem 2rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
  }

  .winner-message {
    color: #ff00ff;
    text-shadow: 0 0 15px #ff00ff;
    border-color: #ff00ff;
    animation: winner-pulse 1s ease-in-out infinite alternate;
  }

  @keyframes winner-pulse {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.05);
    }
  }

  .draw-message {
    color: #ffff00;
    text-shadow: 0 0 15px #ffff00;
    border-color: #ffff00;
  }

  .turn-message {
    color: #ffffff;
    text-shadow: 0 0 10px #ffffff;
  }

  .winner-highlight {
    color: #ff00ff;
    text-shadow: 0 0 20px #ff00ff;
  }

  .player-highlight {
    font-weight: bold;
  }

  .player-x {
    color: #ff00ff;
    text-shadow: 0 0 15px #ff00ff;
  }

  .player-o {
    color: #00ffff;
    text-shadow: 0 0 15px #00ffff;
  }

  .reset-button {
    padding: 1rem 2rem;
    background: linear-gradient(145deg, #1a1a1a, #0d0d0d);
    border: 2px solid #00ff00;
    border-radius: 8px;
    color: #00ff00;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .reset-button:hover {
    background: linear-gradient(145deg, #2a2a2a, #1d1d1d);
    box-shadow: 
      0 0 20px rgba(0, 255, 0, 0.5),
      inset 0 0 20px rgba(0, 255, 0, 0.1);
    transform: translateY(-2px);
  }

  .reset-button:active {
    transform: translateY(0);
  }

  .reset-text {
    text-shadow: 0 0 10px #00ff00;
  }

  /* Global styles for neon effect consistency */
  * {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: #000000;
    overflow-x: hidden;
  }
</style>
