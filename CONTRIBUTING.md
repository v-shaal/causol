# Contributing to Causal Inference Assistant

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/causal-inference-assistant.git`
3. Add upstream remote: `git remote add upstream https://github.com/causol/causal-inference-assistant.git`
4. Install dependencies: `npm install`
5. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Setting Up Your Environment

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run watch           # Terminal 1: Watch extension
npm run watch:webview   # Terminal 2: Watch webview

# Press F5 in VS Code to launch Extension Development Host
```

### Making Changes

1. Write your code following the project structure
2. Add tests for new functionality
3. Run linter: `npm run lint`
4. Run formatter: `npm run format`
5. Run tests: `npm run test`
6. Commit your changes using conventional commits

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): brief description

Longer description if needed

type: feat, fix, docs, style, refactor, test, chore
scope: extension, agents, orchestration, integrations, webview, etc.
```

Examples:
- `feat(agents): add sensitivity analysis agent`
- `fix(jupyter): handle kernel connection errors`
- `docs(readme): update installation instructions`

## Code Style

- TypeScript with strict mode
- ESLint + Prettier configuration
- 100 character line limit
- Single quotes for strings
- 2-space indentation

Run `npm run format` before committing.

## Testing

- Write unit tests for all new functions
- Add integration tests for agent workflows
- Maintain >70% code coverage
- Run `npm run test` before submitting PR

## Pull Request Process

1. Update documentation for any changed functionality
2. Add tests for new features
3. Ensure all tests pass and linting is clean
4. Update CHANGELOG.md with your changes
5. Submit PR with clear description of changes
6. Link related issues

### PR Checklist

- [ ] Tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Commits follow conventional format
- [ ] Branch is up to date with main

## Project Structure

```
src/
├── extension/          # VS Code extension layer
├── orchestration/      # Workflow orchestration
├── agents/             # Specialized agents
├── integrations/       # External integrations
├── knowledge/          # Prompts and validators
└── types/              # Type definitions
```

## Areas for Contribution

### High Priority
- Agent prompt improvements
- Jupyter integration enhancements
- Test coverage
- Documentation

### Medium Priority
- UI/UX improvements
- Error handling
- Performance optimization

### Future Features
- MCP integration
- Interactive DAG editor
- Sensitivity analysis
- Report generation

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
