# Room API

SvelteKit API route endpoint for HTTP-based room management operations.

## Target

[@generate](../../src/routes/api/rooms/+server.ts)

## Capabilities

### Room Creation

Handles POST requests to create new game rooms with player validation.

- Accepts JSON body with playerName field
- Validates playerName is required and between 1-20 characters
- Creates room using room manager
- Returns JSON with roomId and playerId
- Returns 400 status for validation errors
- Returns 500 status for server errors

## API

```typescript { .api }
export async function POST(event: RequestEvent): Promise<Response>;
```

## Dependencies

### Room Manager

Room management functionality for creating rooms and managing players.
[@use](../../room-manager.spec.md)

### SvelteKit

Web framework for handling HTTP requests and responses.
[@use](@sveltejs/kit)