<script lang="ts">
  import { goto } from '$app/navigation';
  import type { CreateRoomMessage } from '$lib/types/game-types.js';

  let playerName: string = '';
  let roomId: string = '';
  let isCreatingRoom: boolean = false;
  let errors: {
    playerName?: string;
    roomId?: string;
    connection?: string;
  } = {};

  function validatePlayerName(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Player name is required';
    }
    if (trimmed.length > 20) {
      return 'Player name must be 20 characters or less';
    }
    return null;
  }

  function validateRoomId(id: string): string | null {
    const trimmed = id.trim();
    if (!trimmed) {
      return 'Room ID is required';
    }
    if (!/^[a-zA-Z0-9]{6}$/.test(trimmed)) {
      return 'Room ID must be exactly 6 alphanumeric characters';
    }
    return null;
  }

  async function createRoom(playerName: string): Promise<{ roomId: string; playerId: string }> {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ playerName })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create room');
    }

    return await response.json();
  }

  function navigateToRoom(roomId: string, playerName: string, playerId?: string): void {
    const params = new URLSearchParams({
      name: playerName.trim()
    });
    
    if (playerId) {
      params.set('playerId', playerId);
    }

    goto(`/room/${roomId}?${params.toString()}`);
  }

  function handlePlayerNameInput(): void {
    const error = validatePlayerName(playerName);
    if (error) {
      errors.playerName = error;
    } else {
      delete errors.playerName;
    }
    errors = { ...errors };
  }

  function handleRoomIdInput(): void {
    const error = validateRoomId(roomId);
    if (error) {
      errors.roomId = error;
    } else {
      delete errors.roomId;
    }
    errors = { ...errors };
  }

  async function handleCreateRoom(): Promise<void> {
    const nameError = validatePlayerName(playerName);
    if (nameError) {
      errors.playerName = nameError;
      errors = { ...errors };
      return;
    }

    isCreatingRoom = true;
    delete errors.connection;
    errors = { ...errors };

    try {
      const result = await createRoom(playerName.trim());
      navigateToRoom(result.roomId, playerName.trim(), result.playerId);
    } catch (error) {
      errors.connection = error instanceof Error ? error.message : 'Failed to create room';
      errors = { ...errors };
    } finally {
      isCreatingRoom = false;
    }
  }

  function handleJoinRoom(): void {
    const nameError = validatePlayerName(playerName);
    const idError = validateRoomId(roomId);
    
    if (nameError) {
      errors.playerName = nameError;
    }
    if (idError) {
      errors.roomId = idError;
    }
    
    if (nameError || idError) {
      errors = { ...errors };
      return;
    }

    navigateToRoom(roomId.trim(), playerName.trim());
  }

  $: canCreateRoom = !validatePlayerName(playerName) && !isCreatingRoom;
  $: canJoinRoom = !validatePlayerName(playerName) && !validateRoomId(roomId);
</script>

<svelte:head>
  <title>Tic-Tac-Toe - Multiplayer Online</title>
</svelte:head>

<main class="landing-container">
  <h1 class="title">TIC-TAC-TOE</h1>
  <p class="subtitle">Multiplayer Online</p>

  <div class="form-container">
    <div class="input-group">
      <label for="playerName">Your Name:</label>
      <input
        id="playerName"
        type="text"
        bind:value={playerName}
        on:input={handlePlayerNameInput}
        placeholder="Enter your name"
        maxlength="20"
        class:error={errors.playerName}
        autocomplete="off"
        autofocus
        aria-describedby={errors.playerName ? 'playerName-error' : undefined}
      />
      {#if errors.playerName}
        <span id="playerName-error" class="error-message">{errors.playerName}</span>
      {/if}
    </div>

    <div class="actions">
      <div class="create-section">
        <h3>Create New Game</h3>
        <button
          class="create-button"
          disabled={!canCreateRoom}
          on:click={handleCreateRoom}
          aria-label={isCreatingRoom ? 'Creating room...' : 'Create new room'}
        >
          {#if isCreatingRoom}
            Creating...
          {:else}
            Create Room
          {/if}
        </button>
      </div>

      <div class="divider">OR</div>

      <div class="join-section">
        <h3>Join Existing Game</h3>
        <div class="input-group">
          <label for="roomId">Room ID:</label>
          <input
            id="roomId"
            type="text"
            bind:value={roomId}
            on:input={handleRoomIdInput}
            placeholder="Enter 6-character room ID"
            maxlength="6"
            class:error={errors.roomId}
            autocomplete="off"
            aria-describedby={errors.roomId ? 'roomId-error' : undefined}
          />
          {#if errors.roomId}
            <span id="roomId-error" class="error-message">{errors.roomId}</span>
          {/if}
        </div>
        <button
          class="join-button"
          disabled={!canJoinRoom}
          on:click={handleJoinRoom}
          aria-label="Join existing room"
        >
          Join Room
        </button>
      </div>
    </div>

    {#if errors.connection}
      <div class="connection-error" role="alert" aria-live="polite">
        {errors.connection}
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%);
    font-family: 'Arial', sans-serif;
    color: #00ffff;
    min-height: 100vh;
  }

  .landing-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    min-height: 100vh;
  }

  .title {
    font-size: clamp(2rem, 5vw, 3rem);
    color: #00ffff;
    text-shadow:
      0 0 20px #00ffff,
      0 0 40px #00ffff,
      0 0 60px #00ffff;
    letter-spacing: 0.2em;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: clamp(1rem, 2.5vw, 1.2rem);
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
    margin-bottom: 2rem;
    opacity: 0.8;
  }

  .form-container {
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid #00ffff;
    border-radius: 10px;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }

  .input-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #00ffff;
    font-weight: bold;
    text-align: left;
  }

  input {
    width: 100%;
    padding: 0.8rem;
    font-size: 1rem;
    background: #000;
    border: 2px solid #00ffff;
    color: #00ffff;
    border-radius: 5px;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    box-shadow: 0 0 15px #00ffff;
  }

  input.error {
    border-color: #ff0080;
    box-shadow: 0 0 10px rgba(255, 0, 128, 0.5);
  }

  .error-message {
    display: block;
    color: #ff0080;
    font-size: 0.9rem;
    margin-top: 0.5rem;
    text-align: left;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .create-section,
  .join-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    color: #00ffff;
    font-size: 1.1rem;
  }

  button {
    padding: 0.8rem 1.5rem;
    font-size: 1rem;
    background: #000;
    border: 2px solid #00ffff;
    color: #00ffff;
    cursor: pointer;
    border-radius: 5px;
    transition: all 0.3s ease;
    text-shadow: 0 0 5px #00ffff;
    min-height: 48px;
    touch-action: manipulation;
  }

  button:hover:not(:disabled) {
    background: #00ffff;
    color: #000;
    box-shadow:
      0 0 20px rgba(0, 255, 255, 0.5),
      0 0 40px rgba(0, 255, 255, 0.3);
    text-shadow: none;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #000;
    color: #666;
    border-color: #666;
    text-shadow: none;
  }

  .create-button {
    background: #000;
    border-color: #00ff80;
    color: #00ff80;
    text-shadow: 0 0 5px #00ff80;
  }

  .create-button:hover:not(:disabled) {
    background: #00ff80;
    color: #000;
    box-shadow:
      0 0 20px rgba(0, 255, 128, 0.5),
      0 0 40px rgba(0, 255, 128, 0.3);
  }

  .divider {
    text-align: center;
    color: #666;
    font-weight: bold;
    position: relative;
  }

  .divider::before,
  .divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background: #666;
  }

  .divider::before {
    left: 0;
  }

  .divider::after {
    right: 0;
  }

  .connection-error {
    margin-top: 1rem;
    padding: 0.8rem;
    background: rgba(255, 0, 128, 0.1);
    border: 1px solid #ff0080;
    border-radius: 5px;
    color: #ff0080;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    .landing-container {
      padding: 1.5rem;
    }

    .form-container {
      padding: 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .landing-container {
      padding: 1rem;
    }

    .form-container {
      padding: 1rem;
    }

    input,
    button {
      font-size: 0.9rem;
      padding: 0.7rem;
    }

    button {
      min-height: 44px;
    }
  }
</style>
