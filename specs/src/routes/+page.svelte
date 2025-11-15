<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Player, RoomState, CellValue, GameResult, ClientToServerMessage, ServerToClientMessage } from '$lib/types/game-types';

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

	async function createRoom(playerName: string): Promise<{ roomId: string }> {
		return new Promise((resolve, reject) => {
			try {
				const ws = new WebSocket('ws://localhost:3001');
				
				ws.onopen = () => {
					const message: ClientToServerMessage = {
						type: 'createRoom',
						playerName: playerName.trim()
					};
					ws.send(JSON.stringify(message));
				};

				ws.onmessage = (event) => {
					const message: ServerToClientMessage = JSON.parse(event.data);
					
					if (message.type === 'roomCreated') {
						ws.close();
						resolve({ roomId: message.roomState.id });
					} else if (message.type === 'error') {
						ws.close();
						reject(new Error(message.message));
					}
				};

				ws.onerror = () => {
					ws.close();
					reject(new Error('WebSocket connection failed'));
				};

				ws.onclose = (event) => {
					if (event.code !== 1000) {
						reject(new Error('Connection closed unexpectedly'));
					}
				};

				// Timeout after 10 seconds
				setTimeout(() => {
					if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
						ws.close();
						reject(new Error('Connection timeout'));
					}
				}, 10000);

			} catch (error) {
				reject(error);
			}
		});
	}

	function navigateToRoom(roomId: string, playerName: string): void {
		const params = new URLSearchParams();
		params.set('name', playerName.trim());
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
			const { roomId } = await createRoom(state.playerName.trim());
			navigateToRoom(roomId, state.playerName.trim());
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
			navigateToRoom(state.roomId.toUpperCase(), state.playerName.trim());
		}
	}

	$effect(() => {
		// Clear connection error when form values change
		if (state.errors.connection) {
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
				/>
				{#if state.errors.playerName}
					<div class="error" id="playerName-error">{state.errors.playerName}</div>
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
					>
						{state.isCreatingRoom ? 'Creating Room...' : 'Create Room'}
					</button>
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
							aria-describedby={state.errors.roomId ? 'roomId-error' : undefined}
						/>
						{#if state.errors.roomId}
							<div class="error" id="roomId-error">{state.errors.roomId}</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={handleJoinRoom}
						disabled={!!state.errors.playerName || !!state.errors.roomId}
					>
						Join Room
					</button>
				</div>
			</div>

			{#if state.errors.connection}
				<div class="error connection-error">{state.errors.connection}</div>
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
	}

	.divider::before,
	.divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
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

	@media (max-width: 480px) {
		.content {
			padding: 1.5rem;
		}

		h1 {
			font-size: 1.5rem;
		}

		button {
			min-height: 48px;
		}
	}
</style>
