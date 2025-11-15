<script lang="ts">
  // Game state with TypeScript types
  let board = $state<Array<"X" | "O" | null>>(Array(9).fill(null));
  let currentPlayer = $state<"X" | "O">("X");
  let winner = $state<"X" | "O" | null>(null);
  let isDraw = $state(false);
  let winningLine = $state<number[] | null>(null);

  // Core game functions
  function makeMove(index: number): void {
    // Validate move
    if (board[index] !== null || winner !== null || isDraw) {
      return;
    }

    // Update board state
    board[index] = currentPlayer;

    // Check for winner
    const winResult = checkWinner();
    if (winResult) {
      winner = winResult.winner;
      winningLine = winResult.line;
      return;
    }

    // Check for draw
    if (checkDraw()) {
      isDraw = true;
      return;
    }

    // Switch player
    currentPlayer = currentPlayer === "X" ? "O" : "X";
  }

  function checkWinner(): { winner: "X" | "O"; line: number[] } | null {
    const winPatterns = [
      [0, 1, 2], // rows
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6], // columns
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8], // diagonals
      [2, 4, 6],
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: pattern };
      }
    }

    return null;
  }

  function checkDraw(): boolean {
    return board.every((cell) => cell !== null);
  }

  function resetGame(): void {
    board = Array(9).fill(null);
    currentPlayer = "X";
    winner = null;
    isDraw = false;
    winningLine = null;
  }

  function isWinningCell(index: number): boolean {
    return winningLine?.includes(index) ?? false;
  }

  function getGameStatus(): string {
    if (winner) {
      return `Player ${winner} Wins!`;
    }
    if (isDraw) {
      return "It's a Draw!";
    }
    return `Player ${currentPlayer}'s Turn`;
  }
</script>

<svelte:head>
  <title>Tic-Tac-Toe</title>
</svelte:head>

<main class="game-container">
  <h1 class="title">TIC-TAC-TOE</h1>

  <div class="status {winner ? 'winner' : ''} {isDraw ? 'draw' : ''}">
    {getGameStatus()}
  </div>

  <div class="board">
    {#each board as cell, index}
      <button
        class="cell {cell} {isWinningCell(index) ? 'winning' : ''}"
        onclick={() => makeMove(index)}
        disabled={cell !== null || winner !== null || isDraw}
      >
        {cell || ""}
      </button>
    {/each}
  </div>

  <button class="reset-button" onclick={resetGame}>New Game</button>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%);
    color: #00ffff;
    font-family: Arial, sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 2rem;
  }

  .title {
    font-size: 3rem;
    color: #00ffff;
    text-shadow:
      0 0 20px #00ffff,
      0 0 40px #00ffff,
      0 0 60px #00ffff;
    margin: 0;
    letter-spacing: 0.2em;
  }

  .status {
    font-size: 1.5rem;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
    min-height: 2rem;
    text-align: center;
  }

  .status.winner {
    color: #ffff00;
    text-shadow:
      0 0 20px #ffff00,
      0 0 40px #ffff00;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .status.draw {
    color: #ffff00;
    text-shadow:
      0 0 20px #ffff00,
      0 0 40px #ffff00;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 120px);
    grid-template-rows: repeat(3, 120px);
    gap: 4px;
    background: #333;
    padding: 4px;
    border-radius: 10px;
    box-shadow: 0 0 20px #00ffff;
  }

  .cell {
    background: #000;
    border: 2px solid #333;
    color: #fff;
    font-size: 2.5rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cell:hover:not(:disabled) {
    background: #1a1a1a;
    border-color: #00ffff;
    box-shadow: 0 0 15px #00ffff;
  }

  .cell:disabled {
    cursor: not-allowed;
  }

  .cell.X {
    color: #ff0080;
    text-shadow:
      0 0 15px #ff0080,
      0 0 30px #ff0080;
  }

  .cell.O {
    color: #00ff80;
    text-shadow:
      0 0 15px #00ff80,
      0 0 30px #00ff80;
  }

  .cell.winning {
    background: #222;
    border-color: #ffff00;
    box-shadow:
      0 0 25px #ffff00,
      inset 0 0 25px rgba(255, 255, 0, 0.2);
    animation: glow 2s ease-in-out infinite;
  }

  .reset-button {
    background: #000;
    border: 2px solid #00ffff;
    color: #00ffff;
    padding: 12px 24px;
    font-size: 1.2rem;
    cursor: pointer;
    border-radius: 5px;
    transition: all 0.3s ease;
    text-shadow: 0 0 10px #00ffff;
    box-shadow: 0 0 10px #00ffff;
  }

  .reset-button:hover {
    background: #00ffff;
    color: #000;
    box-shadow:
      0 0 20px #00ffff,
      0 0 40px #00ffff;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }

  @keyframes glow {
    0%,
    100% {
      box-shadow:
        0 0 25px #ffff00,
        inset 0 0 25px rgba(255, 255, 0, 0.2);
    }
    50% {
      box-shadow:
        0 0 35px #ffff00,
        inset 0 0 35px rgba(255, 255, 0, 0.4);
    }
  }

  @media (max-width: 480px) {
    .title {
      font-size: 2rem;
    }

    .board {
      grid-template-columns: repeat(3, 80px);
      grid-template-rows: repeat(3, 80px);
    }

    .cell {
      font-size: 1.8rem;
    }

    .status {
      font-size: 1.2rem;
    }

    .reset-button {
      font-size: 1rem;
      padding: 10px 20px;
    }
  }
</style>
