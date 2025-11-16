// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../../../specs/server/room-api.spec.md
// (spec:b6ac32ee) (code:3c472403)

import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createRoom } from '$lib/server/room-manager';

export async function POST(event: RequestEvent): Promise<Response> {
  try {
    const body = await event.request.json();
    const { playerName } = body;

    // Validate playerName is required and between 1 and 20 characters
    const name = typeof playerName === 'string' ? playerName.trim() : '';
    if (name.length === 0 || name.length > 20) {
      return json(
        { error: 'playerName must be a non-empty string between 1 and 20 characters' },
        { status: 400 }
      );
    }

    const { roomId, playerId } = createRoom(name);

    return json({ roomId, playerId });
  } catch (error) {
    console.error('Error creating room:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
