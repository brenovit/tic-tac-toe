# Plan: Add Online Multiplayer Functionality

Transform the local tic-tac-toe game into an online multiplayer experience with room-based gameplay and Google Cloud deployment.

## Overview

Current state: Single-player local game in SvelteKit
Target state: Online multiplayer with rooms, player names, and shareable links

## User Requirements

- Disconnection: Other player automatically wins
- Room persistence: Temporary only (in-memory, no database)
- Deployment: Google Cloud, cheapest solution

## Tasks

- [x] Interview user to clarify requirements (room persistence, disconnection handling, etc.)
  > User selected:
  > - Disconnect handling: Other player wins
  > - Room life: Temporary only (cheapest option)

- [x] Research relevant documentation from Knowledge Index
  > **Task** Research agent
  >
  > Found relevant docs:
  > - [.tessl/usage-specs/tessl/npm-svelte/docs/stores.md](../.tessl/usage-specs/tessl/npm-svelte/docs/stores.md) - WebSocket store patterns
  > - [.tessl/usage-specs/tessl/npm-svelte/docs/reactivity.md](../.tessl/usage-specs/tessl/npm-svelte/docs/reactivity.md) - Reactive WebSocket management
  >
  > Missing docs needed:
  > - SvelteKit (API routes, server endpoints)
  > - WebSocket library (ws or socket.io)
  > - Google Cloud deployment/adapters

- [x] Search Tessl registry for missing documentation
  > **MCP** `tessl - search`
  > - query: "sveltekit"
  > - query: "socket.io"
  > - query: "ws"
  > - query: "google cloud adapter"
  >
  > Found:
  > - SvelteKit: tessl/npm-sveltejs--kit@2.37.0
  > - WebSocket library: tessl/npm-ws@8.18.0
  > - No Google Cloud adapter docs found (will use standard Node adapter)
  > ---
  >
  > **MCP** `tessl - install`
  > - name: "tessl/npm-sveltejs--kit@2.37.0"
  >
  > Installed [SvelteKit docs](../.tessl/usage-specs/tessl/npm-sveltejs--kit/docs/index.md)
  > ---
  >
  > **MCP** `tessl - install`
  > - name: "tessl/npm-ws@8.18.0"
  >
  > Installed [ws library docs](../.tessl/usage-specs/tessl/npm-ws/docs/index.md)
  > Updated [KNOWLEDGE.md](../KNOWLEDGE.md)
- [x] Design system architecture (client-server communication, room management)
  > ## Architecture Design
  >
  > ### Backend Architecture
  >
  > **1. Room Manager (In-Memory)**
  > - Stores active rooms: `Map<roomId, RoomState>`
  > - RoomState includes: players (2 max), game board, current turn, status
  > - Auto-cleanup: Remove rooms after game ends or 1 hour timeout
  >
  > **2. WebSocket Server (using `ws` library)**
  > - Integrated into SvelteKit server hooks
  > - Handles connections and room-scoped message broadcasting
  > - Connection tracking per room
  >
  > **3. Game Logic**
  > - Reuse existing tic-tac-toe game logic
  > - Validate moves server-side
  > - Broadcast state updates to both players
  >
  > **4. Disconnect Handling**
  > - On disconnect: Immediately award win to remaining player
  > - Send game-over event to connected player
  > - Clean up room after notification
  >
  > ### Frontend Architecture
  >
  > **1. Landing Page**
  > - Player name input
  > - "Create Room" button → generates unique room ID, redirects to /room/[id]
  > - "Join Room" input → enter room ID, redirects to /room/[id]
  >
  > **2. Game Room Page (`/room/[id]`)**
  > - Establishes WebSocket connection on mount
  > - Displays waiting state until 2 players connected
  > - Shows player names and whose turn it is
  > - Game board with real-time updates
  > - Share link functionality (copy room URL)
  >
  > **3. WebSocket Client**
  > - Svelte store for connection state
  > - Event handlers: room-joined, game-start, move-made, game-over, player-disconnected
  > - Reconnection logic (with room ID)
  >
  > ### Communication Protocol
  >
  > **Client → Server Events:**
  > - `create-room`: { playerName: string } → { roomId: string, playerId: string }
  > - `join-room`: { roomId: string, playerName: string } → { playerId: string, gameState: GameState }
  > - `make-move`: { roomId: string, playerId: string, position: number } → void
  >
  > **Server → Client Events:**
  > - `room-created`: { roomId: string, playerId: string }
  > - `player-joined`: { playerName: string, gameState: GameState }
  > - `game-start`: { gameState: GameState }
  > - `move-made`: { gameState: GameState }
  > - `game-over`: { winner: 'X' | 'O' | 'draw', reason: 'win' | 'disconnect' }
  > - `player-disconnected`: { }
  > - `error`: { message: string }
  >
  > ### Data Models
  >
  > ```typescript
  > interface RoomState {
  >   id: string
  >   players: [Player, Player?]  // Max 2 players
  >   board: (X | O | null)[]  // Length 9
  >   currentTurn: 'X' | 'O'
  >   status: 'waiting' | 'playing' | 'finished'
  >   winner?: 'X' | 'O' | 'draw'
  >   createdAt: Date
  > }
  >
  > interface Player {
  >   id: string  // UUID
  >   name: string
  >   symbol: 'X' | 'O'
  >   connected: boolean
  > }
  > ```
  >
  > ### Deployment Strategy (Google Cloud)
  >
  > **Option 1: Cloud Run (Recommended - Cheapest)**
  > - Pros: Serverless, auto-scaling, pay-per-use
  > - Cons: WebSocket connections limited to 60 min, cold starts
  > - Mitigation: Acceptable for casual games, room timeout at 60 min
  > - Adapter: @sveltejs/adapter-node
  >
  > **Option 2: Compute Engine (If needed)**
  > - Pros: Full control, persistent WebSocket connections
  > - Cons: More expensive, requires instance management
  > - Use: Only if Cloud Run doesn't work
  >
  > **Initial Approach:** Start with Cloud Run + adapter-node
  >
  > ### File Structure
  >
  > ```
  > specs/
  >   ├── server/room-manager.spec.md [@generate src/lib/server/room-manager.ts]
  >   ├── server/websocket-handler.spec.md [@generate src/hooks.server.ts]
  >   └── client/game-room.spec.md [@generate src/routes/room/[id]/+page.svelte]
  > src/
  >   ├── lib/
  >   │   ├── server/
  >   │   │   └── room-manager.ts (Room state management)
  >   │   ├── stores/
  >   │   │   └── websocket.ts (WebSocket store)
  >   │   └── types/
  >   │       └── game.ts (Shared types)
  >   ├── hooks.server.ts (WebSocket server setup)
  >   └── routes/
  >       ├── +page.svelte (Landing page - name + create/join)
  >       └── room/[id]/
  >           └── +page.svelte (Game room)
  > ```
- [ ] Create or update specs for:
  - [ ] Room management backend service
  - [ ] WebSocket/real-time communication layer
  - [ ] Updated frontend with player name and room UI
  - [ ] Deployment configuration for Google Cloud
- [ ] Get user feedback on specs before building
- [ ] Install any new required dependencies
- [ ] Build specs to generate implementation
- [ ] Fix and test until working
- [ ] Create deployment documentation
