// GENERATED FROM SPEC - DO NOT EDIT
// @generated with Tessl v0.28.0 from ../../../../specs/server/room-api.spec.md
// (spec:2ec73f6d) (code:5468c050)

import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createRoom } from '$lib/room-manager';

export async function POST(event: RequestEvent): Promise<Response> {
  try {
    const body = await event.request.json();
    const { playerName } = body;

    if (
      typeof playerName !== 'string' ||
      playerName.trim().length === 0 ||
      playerName.length > 20
    ) {
      return json(
        { error: 'playerName must be a non-empty string between 1 and 20 characters' },
        { status: 400 }
      );
    }

    const { roomId, playerId } = await createRoom(playerName);

    return json({ roomId, playerId });
  } catch (error) {
    console.error('Error creating room:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
