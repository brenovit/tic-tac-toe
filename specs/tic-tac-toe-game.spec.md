# Tic-Tac-Toe Game

A SvelteKit page component implementing a tic-tac-toe game with a black neon design aesthetic. This serves as the main route page for the application.

## Target

[@generate](../src/routes/+page.svelte)

## Capabilities

### Game State Management

Manages game state using Svelte's reactive state system with TypeScript type annotations. Tracks board state, current player, winner, draw status, and winning line position.

- Board state tracked as array of 9 positions with typed values: 'X' | 'O' | null [@test](../src/tic-tac-toe.test.ts)
- Current player alternates between 'X' and 'O' with proper typing [@test](../src/tic-tac-toe.test.ts)
- Winner state properly typed as 'X' | 'O' | null [@test](../src/tic-tac-toe.test.ts)
- Draw detection with boolean state [@test](../src/tic-tac-toe.test.ts)
- Winning line tracking with number array type [@test](../src/tic-tac-toe.test.ts)

### Move Execution

Processes player moves with validation and state updates.

- Validates moves against occupied squares [@test](../src/tic-tac-toe.test.ts)
- Prevents moves when game is finished [@test](../src/tic-tac-toe.test.ts)
- Updates board state with current player's mark [@test](../src/tic-tac-toe.test.ts)
- Switches player turn after valid move [@test](../src/tic-tac-toe.test.ts)
- Triggers win/draw checking after each move [@test](../src/tic-tac-toe.test.ts)

### Win Detection Algorithm

Implements comprehensive win detection for all possible winning combinations.

- Checks all three row combinations: [0,1,2], [3,4,5], [6,7,8] [@test](../src/tic-tac-toe.test.ts)
- Checks all three column combinations: [0,3,6], [1,4,7], [2,5,8] [@test](../src/tic-tac-toe.test.ts)
- Checks both diagonal combinations: [0,4,8], [2,4,6] [@test](../src/tic-tac-toe.test.ts)
- Returns winner and winning line positions [@test](../src/tic-tac-toe.test.ts)
- Returns null when no winner found [@test](../src/tic-tac-toe.test.ts)

### Draw Detection

Detects draw conditions when board is full without a winner.

- Checks if all board positions are filled [@test](../src/tic-tac-toe.test.ts)
- Returns true only when no null values remain [@test](../src/tic-tac-toe.test.ts)

### Game Reset Functionality

Provides complete game state reset to initial conditions.

- Resets board to empty state (9 null values) [@test](../src/tic-tac-toe.test.ts)
- Resets current player to 'X' [@test](../src/tic-tac-toe.test.ts)
- Clears winner state [@test](../src/tic-tac-toe.test.ts)
- Clears draw state [@test](../src/tic-tac-toe.test.ts)
- Clears winning line state [@test](../src/tic-tac-toe.test.ts)

### Game Status Display

Shows current game state with appropriate messaging and styling.

- Displays winner announcement when game is won [@test](../src/tic-tac-toe.test.ts)
- Shows draw message when board is full [@test](../src/tic-tac-toe.test.ts)
- Indicates current player's turn during active game [@test](../src/tic-tac-toe.test.ts)

### Interactive Game Board

Renders clickable 3x3 grid with proper interaction handling.

- Renders 9 clickable cells in grid layout [@test](../src/tic-tac-toe.test.ts)
- Shows current cell contents (X, O, or empty) [@test](../src/tic-tac-toe.test.ts)
- Handles click events to trigger moves [@test](../src/tic-tac-toe.test.ts)
- Disables interaction when cell is occupied or game is finished [@test](../src/tic-tac-toe.test.ts)

### Winning Line Highlighting

Highlights cells that form the winning combination.

- Identifies winning cells using winning line array [@test](../src/tic-tac-toe.test.ts)
- Applies special styling to winning cells [@test](../src/tic-tac-toe.test.ts)

### Black Neon Design Theme { .impl }

Implements comprehensive black neon aesthetic throughout the application.

- Black background with radial gradient effect
- Cyan (#00ffff) neon glow for title and primary elements
- Pink (#ff0080) neon styling for X markers
- Green (#00ff80) neon styling for O markers
- Yellow (#ffff00) neon effects for winning states and draw
- Glowing box shadows and text shadows throughout
- Pulsing animations for winner and draw states
- Hover effects with neon glow on interactive elements
- Responsive design for mobile devices

### TypeScript Integration { .impl }

Provides full TypeScript type safety for all game state and functions.

- State variables typed with union types for game values
- Function parameters properly typed for index numbers
- Return types specified for game logic functions
- Null safety handled throughout component logic

### Global Styling { .impl }

Sets up application-wide styling for the neon theme.

- Global body styling with black background and neon colors
- Custom font family (Arial) for consistent typography
- Zero margin/padding reset for clean layout

### Responsive Design { .impl }

Adapts interface for different screen sizes.

- Mobile breakpoint at 480px width
- Scaled down cell sizes and fonts for mobile
- Adjusted spacing and typography for smaller screens

## API

```svelte { .api }
<script lang="ts">
  // Game state with TypeScript types
  let board = $state<Array<'X' | 'O' | null>>(Array(9).fill(null));
  let currentPlayer = $state<'X' | 'O'>('X');
  let winner = $state<'X' | 'O' | null>(null);
  let isDraw = $state(false);
  let winningLine = $state<number[] | null>(null);

  // Core game functions
  function makeMove(index: number): void;
  function checkWinner(): { winner: 'X' | 'O', line: number[] } | null;
  function checkDraw(): boolean;
  function resetGame(): void;
  function isWinningCell(index: number): boolean;
</script>

<!-- Svelte template with black neon styling -->
<main class="game-container">
  <!-- Game title, status, board, and controls -->
</main>

<style>
  /* Black neon design styles with CSS animations */
</style>
```

## Dependencies

### Svelte Framework

Modern reactive framework providing component-based architecture with runes-based reactivity system.
[@use](svelte)

### TypeScript

Type system providing compile-time type checking and enhanced developer experience.
[@use](typescript)