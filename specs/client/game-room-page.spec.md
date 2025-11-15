# Game Room Page

Game room page component for real-time multiplayer tic-tac-toe with dynamic routing and WebSocket integration.

## Target

[@describe](../../src/routes/room/[id]/+page.svelte)

## Capabilities

### Dynamic Route Loading

Extracts room ID from URL parameters and manages player authentication.

- Extracts roomId from URL params using SvelteKit page store
- Retrieves player name from URL query params or page state
- Redirects to landing page if no player name provided
- Validates room ID format and existence

### WebSocket Connection Management

Establishes and manages real-time connection to game server.

- Connects to WebSocket immediately on component mount using websocket store
- Sends join-room message with roomId and playerName on connection
- Handles connection cleanup on component unmount
- Manages reconnection attempts on connection loss

### Game State Display

Renders different UI states based on current game status.

- Connecting state: Shows "Connecting to game..." loading indicator
- Waiting state: Shows "Waiting for opponent..." with shareable room link
- Playing state: Displays active game board with turn indicators
- Finished state: Shows game result with "Play Again" option
- Disconnected state: Shows "Opponent disconnected - You win!" message
- Error state: Shows error message with "Back to Home" button

### Interactive Game Board

Renders 3x3 tic-tac-toe grid with click handling and visual feedback.

- Displays 3x3 grid of cells showing X, O, or empty states
- Handles cell click events for making moves (empty cells only)
- Enables clicks only during player's turn and active game
- Highlights winning combination when game ends
- Shows visual indication of current player's turn
- Provides hover effects for valid moves

### Player Information Panel

Displays player details and game status information.

- Shows both player names and assigned symbols (X/O)
- Highlights active player's turn with visual indicator
- Displays connection status for both players
- Shows game timer or move counter if available

### Shareable Link System

Provides room URL sharing functionality for inviting opponents.

- Displays full room URL for sharing
- "Copy Link" button with clipboard integration
- Visual feedback confirmation when URL copied
- Only visible while waiting for second player to join

### Real-time State Updates

Subscribes to WebSocket events and updates UI reactively.

- Subscribes to websocket store for room state changes
- Reactively updates all UI elements based on state changes
- Handles smooth transitions between different game states
- Processes incoming move updates from opponent

### Move Processing

Handles player move input and server communication.

- Captures cell clicks and validates move legality
- Sends make-move message to server via WebSocket
- Implements optimistic UI updates for responsive feel
- Reverts moves if server rejects with error display
- Disables interaction during opponent's turn

### Game Completion Handling

Manages end-of-game states and post-game actions.

- Displays game result (winner announcement or draw message)
- Shows win reason (normal victory vs opponent disconnect)
- Provides "New Game" button redirecting to landing page
- Offers rematch link copying for same players

### Error Management

Handles various error conditions with appropriate user feedback.

- Room not found errors with redirect to home page
- Connection loss detection with reconnecting indicator
- Invalid move errors with inline message display
- Server error handling with graceful fallbacks

### Accessibility Support

Implements comprehensive accessibility features for inclusive gameplay.

- Keyboard navigation support for game grid
- ARIA labels and roles for screen reader compatibility
- Focus management during state transitions
- Semantic HTML structure for proper document outline

### Responsive Design

Provides mobile-first responsive layout for all device sizes.

- Mobile-first CSS with progressive enhancement
- Touch-friendly cell sizes and spacing
- Scalable game board that adapts to screen size
- Readable text and buttons on all devices
- Accessible color contrast ratios
- Loading state animations and transitions

## API

```typescript { .api }
// Component props (from SvelteKit page data)
interface PageData {
  roomId: string;
}

// Component state
interface GameRoomState {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  gameState: 'waiting' | 'playing' | 'finished' | 'disconnected';
  board: (null | 'X' | 'O')[];
  currentPlayer: 'X' | 'O' | null;
  players: {
    X?: { name: string; connected: boolean };
    O?: { name: string; connected: boolean };
  };
  winner: 'X' | 'O' | 'draw' | null;
  winningCells: number[];
  playerSymbol: 'X' | 'O' | null;
  error: string | null;
}

// Event handlers
interface GameRoomEvents {
  onCellClick: (index: number) => void;
  onCopyLink: () => Promise<void>;
  onNewGame: () => void;
  onBackToHome: () => void;
}
```

## Dependencies

### WebSocket Store
Real-time communication with game server.
[@use](websocket-store.spec.md)

### Game Types
Type definitions for game state and messages.
[@use](../types/game-types.spec.md)