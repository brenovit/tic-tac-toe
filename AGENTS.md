# Project

# Tessl & Spec Driven Development <!-- tessl-managed -->

This project uses the [Tessl spec driven development framework](.tessl/framework/agents.md) and toolkit for software development: @.tessl/framework/agents.md

# Agent Rules <!-- tessl-managed -->

@RULES.md follow the [instructions](RULES.md)

# Knowledge Index <!-- tessl-managed -->

Documentation for dependencies and processes can be found in the [Knowledge Index](./KNOWLEDGE.md)

# Plan Files <!-- tessl-managed -->

ALWAYS create [plan files](.tessl/framework/plan-files.md) when planning: @.tessl/framework/plan-files.md

# Project Configuration

## Language and Stack
- **Language**: TypeScript
- **Runtime**: Node.js with ES modules

## Testing Framework
- **Framework**: Vitest
- **Test Command**: `npm test`

## Directory Structure
- **Specs**: `./specs` - Specification files (.md)
- **Source Code**: `./src` - TypeScript source files (.ts)
- **Tests**: `./src` - Test files (co-located with source code)

## Development Environment
- Use npm for package management
- TypeScript configuration should support ES modules
- Vitest for testing with TypeScript support