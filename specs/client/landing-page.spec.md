# Landing Page Component

The main landing page for the tic-tac-toe multiplayer game. Provides entry points to create new rooms or join existing ones.

## Target

[@generate](../../src/routes/+page.svelte)

## Capabilities

### Player Name Input

Allows players to enter their display name with validation.

- Player name is required and must be 1-20 characters
- Whitespace is trimmed from input
- Shows validation error for empty or invalid names
- Input field has proper focus and accessibility attributes

### Create New Room

Enables players to create a new game room and become the host.

- Validates player name before attempting to create room
- Calls SvelteKit API endpoint POST /api/rooms to create room
- Shows loading state while creating room
- On success, navigates to /room/[roomId] with player name in URL state
- Displays error message if room creation fails
- Button is disabled during loading or validation errors

### Join Existing Room

Allows players to join an existing room using a room ID.

- Validates both player name and room ID before joining
- Room ID must be exactly 6 alphanumeric characters
- Navigates to /room/[roomId] with player name for connection handling
- Shows validation errors for invalid room ID format
- Button is disabled during validation errors

### Form Validation

Provides comprehensive client-side validation with user feedback.

- Real-time validation as user types
- Shows specific error messages for each validation rule
- Prevents form submission when validation fails
- Clears errors when input becomes valid

### Responsive Design

Adapts layout for different screen sizes and devices.

- Centered content layout
- Mobile-friendly touch targets
- Responsive typography and spacing
- Clear visual hierarchy between sections

### Loading States

Provides visual feedback during asynchronous operations.

- Shows loading indicator during room creation
- Disables interactive elements during loading
- Maintains form state during loading
- Allows cancellation if needed

## API

```typescript { .api }
interface LandingPageState {
  playerName: string;
  roomId: string;
  isCreatingRoom: boolean;
  errors: {
    playerName?: string;
    roomId?: string;
    connection?: string;
  };
}

// Form validation functions
function validatePlayerName(name: string): string | null;
function validateRoomId(id: string): string | null;

// API operations
function createRoom(playerName: string): Promise<{ roomId: string; playerId: string }>;

// Navigation helpers
function navigateToRoom(roomId: string, playerName: string, playerId: string): void;
```

## Dependencies

### Game Types

Type definitions for room IDs and validation rules.
[@use](../types/game-types.spec.md)

### Room API Endpoint

API endpoint for creating rooms.
[@use](../server/room-api.spec.md)

### SvelteKit Navigation

Client-side navigation functionality.
[@use](@sveltejs/kit)

### Svelte

Reactive component framework for building user interfaces.
[@use](svelte)