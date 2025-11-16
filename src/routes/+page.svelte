<script lang="ts">
  import { goto } from '$app/navigation';

  let playerName = '';
  let roomId = '';
  let isCreatingRoom = false;
  let errors: { playerName?: string; roomId?: string; connection?: string } = {};

  // Form validation functions
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
    if (!/^[A-Za-z0-9]{6}$/.test(trimmed)) {
      return 'Room ID must be exactly 6 alphanumeric characters';
    }
    return null;
  }

  // Reactive validation
  $: errors.playerName = validatePlayerName(playerName) || undefined;
  $: errors.roomId = roomId ? validateRoomId(roomId) || undefined : undefined;

  // Computed properties
  $: canCreateRoom = !errors.playerName && playerName.trim() !== '' && !isCreatingRoom;
  $: canJoinRoom = !errors.playerName && !errors.roomId && playerName.trim() !== '' && roomId.trim() !== '';

  // API operations
  async function createRoom(playerName: string): Promise<{ roomId: string; playerId: string }> {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ playerName: playerName.trim() })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create room' }));
      throw new Error(errorData.message || 'Failed to create room');
    }

    return response.json();
  }

  // Navigation helper
  function navigateToRoom(roomId: string, playerName: string, playerId?: string): void {
    const params = new URLSearchParams();
    params.set('playerName', playerName);
    if (playerId) {
      params.set('playerId', playerId);
    }
    goto(`/room/${roomId}?${params.toString()}`);
  }

  // Event handlers
  async function handleCreateRoom(): Promise<void> {
    if (!canCreateRoom) return;
    isCreatingRoom = true;
    errors.connection = undefined;

    try {
      const result = await createRoom(playerName);
      navigateToRoom(result.roomId, playerName.trim(), result.playerId);
    } catch (error) {
      errors.connection = error instanceof Error ? error.message : 'Failed to create room';
    } finally {
      isCreatingRoom = false;
    }
  }

  function handleJoinRoom(): void {
    if (!canJoinRoom) return;
    navigateToRoom(roomId.trim(), playerName.trim());
  }

  function handleFormSubmit(event: Event): void {
    event.preventDefault();
  }
</script>

<svelte:head>
  <title>Tic-Tac-Toe - Multiplayer Game</title>
</svelte:head>

<main class="landing-container">
  <div class="content">
    <h1 class="title">TIC-TAC-TOE</h1>
    <p class="subtitle">Multiplayer Online Game</p>

    <form class="form" on:submit={handleFormSubmit}>
      <div class="input-group">
        <label for="playerName" class="label">Your Name</label>
        <input
          id="playerName"
          type="text"
          bind:value={playerName}
          placeholder="Enter your display name"
          class="input {errors.playerName ? 'error' : ''}"
          maxlength="20"
          autocomplete="off"
          autofocus
        />
        {#if errors.playerName}
          <span class="error-message">{errors.playerName}</span>
        {/if}
      </div>

      <div class="actions">
        <div class="create-room-section">
          <h2 class="section-title">Start New Game</h2>
          <button
            type="button"
            class="primary-button {!canCreateRoom ? 'disabled' : ''}"
            disabled={!canCreateRoom}
            on:click={handleCreateRoom}
          >
            {#if isCreatingRoom}
              <span class="loading-spinner"></span>
              Creating Room...
            {:else}
              Create Room
            {/if}
          </button>
        </div>

        <div class="divider">
          <span>OR</span>
        </div>

        <div class="join-room-section">
          <h2 class="section-title">Join Existing Game</h2>
          <div class="input-group">
            <label for="roomId" class="label">Room ID</label>
            <input
              id="roomId"
              type="text"
              bind:value={roomId}
              placeholder="Enter 6-character room ID"
              class="input {errors.roomId ? 'error' : ''}"
              maxlength="6"
              autocomplete="off"
              style="text-transform: uppercase;"
            />
            {#if errors.roomId}
              <span class="error-message">{errors.roomId}</span>
            {/if}
          </div>
          <button
            type="button"
            class="secondary-button {!canJoinRoom ? 'disabled' : ''}"
            disabled={!canJoinRoom}
            on:click={handleJoinRoom}
          >
            Join Room
          </button>
        </div>
      </div>

      {#if errors.connection}
        <div class="connection-error">
          {errors.connection}
        </div>
      {/if}
    </form>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%);
    color: #00ffff;
    font-family: Arial, sans-serif;
    min-height: 100vh;
  }

  .landing-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .content {
    max-width: 500px;
    width: 100%;
    text-align: center;
  }

  .title {
    font-size: 3rem;
    color: #00ffff;
    text-shadow:
      0 0 20px #00ffff,
      0 0 40px #00ffff,
      0 0 60px #00ffff;
    margin: 0 0 0.5rem 0;
    letter-spacing: 0.2em;
  }

  .subtitle {
    font-size: 1.2rem;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
    margin: 0 0 3rem 0;
    opacity: 0.8;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;
  }

  .label {
    font-size: 1rem;
    color: #00ffff;
    text-shadow: 0 0 5px #00ffff;
    font-weight: bold;
  }

  .input {
    padding: 12px 16px;
    font-size: 1rem;
    background: #000;
    border: 2px solid #333;
    border-radius: 5px;
    color: #fff;
    transition: all 0.3s ease;
  }

  .input:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  }

  .input.error {
    border-color: #ff0080;
    box-shadow: 0 0 15px rgba(255, 0, 128, 0.3);
  }

  .error-message {
    font-size: 0.875rem;
    color: #ff0080;
    text-shadow: 0 0 5px #ff0080;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .create-room-section,
  .join-room-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-title {
    font-size: 1.3rem;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
    margin: 0;
  }

  .primary-button,
  .secondary-button {
    padding: 12px 24px;
    font-size: 1.1rem;
    font-weight: bold;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 48px;
  }

  .primary-button {
    background: #00ffff;
    border-color: #00ffff;
    color: #000;
    text-shadow: none;
  }

  .primary-button:hover:not(.disabled) {
    background: #00cccc;
    border-color: #00cccc;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  }

  .secondary-button {
    background: #000;
    border-color: #00ffff;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
  }

  .secondary-button:hover:not(.disabled) {
    background: #00ffff;
    color: #000;
    text-shadow: none;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  }

  .primary-button.disabled,
  .secondary-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .primary-button.disabled:hover,
  .secondary-button.disabled:hover {
    background: #000;
    color: #666;
    border-color: #666;
    text-shadow: none;
  }

  .primary-button.disabled:hover {
    background: #666;
    color: #000;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid #000;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #666;
    font-size: 0.9rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #333;
  }

  .connection-error {
    padding: 1rem;
    background: rgba(255, 0, 128, 0.1);
    border: 1px solid #ff0080;
    border-radius: 5px;
    color: #ff0080;
    text-shadow: 0 0 5px #ff0080;
    font-size: 0.9rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 480px) {
    .landing-container {
      padding: 1rem;
    }

    .title {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }

    .section-title {
      font-size: 1.1rem;
    }

    .primary-button,
    .secondary-button {
      font-size: 1rem;
      padding: 10px 20px;
    }

    .input {
      font-size: 0.9rem;
      padding: 10px 14px;
    }
  }
</style>
