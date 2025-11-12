<script lang="ts">
  let board: Array<'X' | 'O' | null> = Array(9).fill(null);
  let currentPlayer: 'X' | 'O' = 'X';
  let winner: 'X' | 'O' | null = null;
  let isDraw: boolean = false;
  let winningLine: number[] = [];

  function makeMove(index: number) {
    if (board[index] || winner || isDraw) return;
    board[index] = currentPlayer;
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
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
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
  <div class="board">
    {#each board as cell, i}
      <div
        class="cell {winningLine.includes(i) ? 'win' : ''}"
        on:click={() => makeMove(i)}
      >
        {#if cell}
          <span class="marker {cell === 'X' ? 'x' : 'o'}">{cell}</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="status">
    {#if winner}
      <div class="message">Player {winner} Wins!</div>
    {:else if isDraw}
      <div class="message">Draw!</div>
    {:else}
      <div class="message">Current Turn: {currentPlayer}</div>
    {/if}
  </div>

  <button class="reset-button" on:click={resetGame}>
    Reset Game
  </button>
</div>

<style>
  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #000;
    padding: 2rem;
    min-height: 100vh;
    color: #fff;
    font-family: sans-serif;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 100px);
    grid-template-rows: repeat(3, 100px);
    gap: 10px;
  }

  .cell {
    background: #111;
    border: 2px solid #0ff;
    box-shadow: 0 0 10px #0ff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.3s, box-shadow 0.3s;
  }

  .cell:hover {
    background: #222;
    box-shadow: 0 0 20px #0ff;
  }

  .cell.win {
    animation: glow 1s infinite alternate;
  }

  .marker {
    font-size: 2rem;
    text-shadow: 0 0 5px;
  }

  .marker.x {
    color: #f0f;
    text-shadow: 0 0 10px #f0f;
  }

  .marker.o {
    color: #0ff;
    text-shadow: 0 0 10px #0ff;
  }

  .status {
    margin-top: 1rem;
  }

  .message {
    font-size: 1.5rem;
    text-shadow: 0 0 10px #fff;
  }

  .reset-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 2px solid #0ff;
    color: #0ff;
    text-shadow: 0 0 5px #0ff;
    cursor: pointer;
    transition: box-shadow 0.3s;
  }

  .reset-button:hover {
    box-shadow: 0 0 20px #0ff;
  }

  @keyframes glow {
    from {
      box-shadow: 0 0 20px #f0f;
    }
    to {
      box-shadow: 0 0 40px #f0f;
    }
  }
</style>
