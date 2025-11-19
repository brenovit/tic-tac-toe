# Tic-Tac-Toe

An online multiplayer tic-tac-toe game with a black neon design aesthetic, built with SvelteKit and TypeScript using spec-driven development with Tessl.

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm (or pnpm/yarn)

### Installation

```sh
npm install
```

### Development

Start the development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

The application will be available at `http://localhost:5173`

### Building

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Spec-Driven Development with Tessl

This project is developed using **Tessl**, a spec-driven development framework that places specifications at the center of the software development lifecycle.

### What is Spec-Driven Development?

In spec-driven development:

- **Specs are the source of truth** - They capture user intent, requirements, and test cases
- **Code is generated from specs** - Implementation is reliably regenerated from specifications
- **Specs and code stay in sync** - Changes flow from specs to code (and vice versa when documenting)

### Project Structure

```
tic-tac-toe/
├── specs/                    # Specification files (.spec.md)
│   └── tic-tac-toe-game.spec.md
├── src/                      # Generated TypeScript source code
│   ├── routes/              # SvelteKit routes
│   └── *.test.ts            # Test files (co-located with source)
├── .tessl/                  # Tessl framework and usage specs
├── AGENTS.md                # Project configuration for Tessl
├── KNOWLEDGE.md             # Knowledge index with dependency docs
└── plans/                   # Plan files for tracking development tasks
```

### How to Use Tessl

#### Working with Specs

1. **View existing specs**: Check the `specs/` directory to see current specifications
   ```sh
   ls specs/
   ```

2. **Create a new spec**: Use Tessl to create a spec from a natural language prompt
   ```sh
   tessl create "Create a scoreboard component"
   ```

3. **Edit a spec**: Modify existing specs or code with natural language
   ```sh
   tessl edit --file specs/tic-tac-toe-game.spec.md --prompt "Add sound effects when players make moves"
   ```

4. **Build from specs**: Generate or update code from specifications
   ```sh
   tessl build specs/tic-tac-toe-game.spec.md
   ```

5. **Document code changes**: Sync code changes back to specs
   ```sh
   tessl document --spec specs/tic-tac-toe-game.spec.md --code src/routes/+page.svelte
   ```

#### Running Tests

Generate and run tests defined in specs:

```sh
tessl build-tests specs/tic-tac-toe-game.spec.md
```

Or run tests directly:

```sh
npm test
```

#### Check Project Status

View the overall project status and any issues:

```sh
tessl status
```

View status for a specific spec:

```sh
tessl status --spec specs/tic-tac-toe-game.spec.md
```

### Development Workflow

The typical development cycle with Tessl:

1. **Plan** - Create a plan file in `plans/` to organize your tasks
2. **Specify** - Create or edit specs to capture requirements
3. **Build** - Generate code and tests from specs
4. **Test** - Run tests to verify implementation
5. **Fix** - Iterate on code/specs until tests pass
6. **Document** - Sync any manual code changes back to specs

### Key Tessl Concepts

- **[@generate]** links in specs point to code files that should be generated
- **[@test]** links define test cases that verify implementation
- **[@use]** links declare dependencies used by the implementation
- **.impl sections** capture implementation details that should be locked
- **Draft tests** are generated but not validated
- **Locked tests** are confirmed requirements that must pass

### Learn More

- [Tessl Documentation](.tessl/framework/agents.md)
- [Spec Format](.tessl/framework/docs/spec-format.md)
- [Knowledge Index](KNOWLEDGE.md)
- [Agent Rules](AGENTS.md)

## Features

- **Interactive Gameplay** - Click cells to place X or O marks
- **Win Detection** - Automatic detection of winning combinations
- **Draw Detection** - Recognizes when the board is full without a winner
- **Black Neon Design** - Cyberpunk-inspired aesthetic with glowing effects
- **Responsive Layout** - Adapts to mobile and desktop screens
- **Type-Safe** - Full TypeScript integration for reliability

## Deployment

To deploy this app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Contributing

When contributing to this project:

1. Follow the spec-driven development workflow
2. Create plan files for non-trivial changes
3. Update specs before or after code changes
4. Ensure tests pass before submitting changes
5. Keep specs and code in sync

## License

MIT
