<script lang="ts">
	import { goto } from '$app/navigation';

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

	let state = $state<LandingPageState>({
		playerName: '',
		roomId: '',
		isCreatingRoom: false,
		errors: {}
	});

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
		if (!id) {
			return 'Room ID is required';
		}
		if (!/^[a-zA-Z0-9]{6}$/.test(id)) {
			return 'Room ID must be exactly 6 alphanumeric characters';
		}
		return null;
	}

	function updatePlayerName(name: string) {
		state.playerName = name;
		const error = validatePlayerName(name);
		if (error) {
			state.errors.playerName = error;
		} else {
			state.errors.playerName = undefined;
		}
	}

	function updateRoomId(id: string) {
		state.roomId = id;
		const error = validateRoomId(id);
		if (error) {
			state.errors.roomId = error;
		} else {
			state.errors.roomId = undefined;
		}
	}

	async function createRoom(playerName: string): Promise<{ roomId: string; playerId: string }> {
		const response = await fetch('/api/rooms', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ playerName: playerName.trim() })
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(error || 'Failed to create room');
		}

		return await response.json();
	}

	function navigateToRoom(roomId: string, playerName: string, playerId: string): void {
		const params = new URLSearchParams();
		params.set('name', playerName.trim());
		if (playerId) {
			params.set('playerId', playerId);
		}
		goto(`/room/${roomId}?${params.toString()}`);
	}

	async function handleCreateRoom() {
		const nameError = validatePlayerName(state.playerName);
		if (nameError) {
			state.errors.playerName = nameError;
			return;
		}

		state.isCreatingRoom = true;
		state.errors.connection = undefined;

		try {
			const { roomId, playerId } = await createRoom(state.playerName.trim());
			navigateToRoom(roomId, state.playerName.trim(), playerId);
		} catch (error) {
			state.errors.connection = error instanceof Error ? error.message : 'Failed to create room. Please try again.';
		} finally {
			state.isCreatingRoom = false;
		}
	}

	function handleJoinRoom() {
		const nameError = validatePlayerName(state.playerName);
		const roomError = validateRoomId(state.roomId);

		if (nameError) {
			state.errors.playerName = nameError;
		}
		if (roomError) {
			state.errors.roomId = roomError;
		}

		if (!nameError && !roomError) {
			navigateToRoom(state.roomId.toUpperCase(), state.playerName.trim(), '');
		}
	}

	$effect(() => {
		// Clear connection error when form values change
		if (state.errors.connection && (state.playerName || state.roomId)) {
			state.errors.connection = undefined;
		}
	});
</script>

<svelte:head>
	<title>Tic-Tac-Toe Multiplayer</title>
</svelte:head>

<main class="container">
	<div class="content">
		<h1>Tic-Tac-Toe Multiplayer</h1>
		
		<form class="form" on:submit|preventDefault>
			<div class="field">
				<label for="playerName">Your Name</label>
				<input
					id="playerName"
					type="text"
					placeholder="Enter your name"
					bind:value={state.playerName}
					oninput={(e) => updatePlayerName(e.target.value)}
					maxlength="20"
					required
					aria-describedby={state.errors.playerName ? 'playerName-error' : undefined}
					autofocus
				/>
				{#if state.errors.playerName}
					<div class="error" id="playerName-error" role="alert">{state.errors.playerName}</div>
				{/if}
			</div>

			<div class="actions">
				<div class="section">
					<h2>Create New Room</h2>
					<p>Start a new game and share the room code with a friend</p>
					<button
						type="button"
						onclick={handleCreateRoom}
						disabled={state.isCreatingRoom || !!state.errors.playerName}
						class="primary"
						aria-describedby="create-room-help"
					>
						{state.isCreatingRoom ? 'Creating Room...' : 'Create Room'}
					</button>
					<div id="create-room-help" class="sr-only">Creates a new game room and provides a room code to share</div>
				</div>

				<div class="divider">OR</div>

				<div class="section">
					<h2>Join Existing Room</h2>
					<p>Enter the room code shared by your friend</p>
					<div class="field">
						<label for="roomId">Room Code</label>
						<input
							id="roomId"
							type="text"
							placeholder="Enter 6-character code"
							bind:value={state.roomId}
							oninput={(e) => updateRoomId(e.target.value.toUpperCase())}
							maxlength="6"
							style="text-transform: uppercase;"
							aria-describedby={state.errors.roomId ? 'roomId-error' : 'roomId-help'}
						/>
						<div id="roomId-help" class="help-text">Room codes are 6 alphanumeric characters</div>
						{#if state.errors.roomId}
							<div class="error" id="roomId-error" role="alert">{state.errors.roomId}</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={handleJoinRoom}
						disabled={!!state.errors.playerName || !!state.errors.roomId}
						aria-describedby="join-room-help"
					>
						Join Room
					</button>
					<div id="join-room-help" class="sr-only">Joins an existing game room using the provided room code</div>
				</div>
			</div>

			{#if state.errors.connection}
				<div class="error connection-error" role="alert">{state.errors.connection}</div>
			{/if}
		</form>
	</div>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.content {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		width: 100%;
		max-width: 400px;
	}

	h1 {
		text-align: center;
		color: #374151;
		margin-bottom: 2rem;
		font-size: 1.875rem;
		font-weight: bold;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
	}

	input {
		padding: 0.75rem;
		border: 2px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	input:invalid {
		border-color: #ef4444;
	}

	.help-text {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.section p {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
	}

	.divider {
		text-align: center;
		color: #9ca3af;
		font-weight: 600;
		position: relative;
		padding: 0 1rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: calc(50% - 1rem);
		height: 1px;
		background: #d1d5db;
	}

	.divider::before {
		left: 0;
	}

	.divider::after {
		right: 0;
	}

	button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		min-height: 44px;
		background: #f3f4f6;
		color: #374151;
	}

	button:hover:not(:disabled) {
		background: #e5e7eb;
		transform: translateY(-1px);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	button.primary {
		background: #667eea;
		color: white;
	}

	button.primary:hover:not(:disabled) {
		background: #5a67d8;
	}

	.error {
		color: #ef4444;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.connection-error {
		text-align: center;
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
	}

	@media (max-width: 768px) {
		.content {
			max-width: 90vw;
		}
		
		.section {
			gap: 1rem;
		}
	}

	@media (max-width: 480px) {
		.container {
			padding: 0.5rem;
		}
		
		.content {
			padding: 1.5rem;
			border-radius: 8px;
		}

		h1 {
			font-size: 1.5rem;
			margin-bottom: 1.5rem;
		}

		button {
			min-height: 48px;
			font-size: 1.125rem;
		}

		input {
			padding: 1rem;
			font-size: 1.125rem;
		}

		.actions {
			gap: 2rem;
		}
	}
</style>
