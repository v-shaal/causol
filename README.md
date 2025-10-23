# Causal Inference Assistant

> An AI-powered VS Code extension that guides researchers through rigorous causal inference workflows using specialized multi-agent orchestration.

[![CI](https://github.com/causol/causal-inference-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/causol/causal-inference-assistant/actions)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/causol/causal-inference-assistant)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎯 Overview

Causal Inference Assistant is a VS Code extension that democratizes rigorous causal inference by providing an AI assistant specialized in causal methodology. Built with [Mastra AI](https://mastra.ai), it orchestrates specialized agents to guide users through the entire causal analysis workflow—from research question formulation to validated causal estimates.

### Key Features (MVP v0.1)

- 🧠 **5 Specialized Agents**: Formulation, EDA, DAG Construction, Identification, and Estimation
- 📊 **Jupyter Integration**: Execute Python code and analyze outputs directly in your notebooks
- 🔍 **Causal-Aware Analysis**: Automated checks for common pitfalls (colliders, confounding, positivity)
- 🎨 **VS Code Native**: Seamless sidebar chat interface with workflow progress visualization
- 🤖 **Powered by GPT-4**: Leveraging OpenAI's latest models for domain expertise

## 🚀 Quick Start

### Prerequisites

- VS Code 1.85+
- Node.js 18+
- Python 3.8+ with Jupyter
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/causol/causal-inference-assistant.git
cd causal-inference-assistant

# Install dependencies
npm install

# Configure your API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Build the extension
npm run compile

# Launch VS Code Extension Development Host
# Press F5 in VS Code
```

### Usage

1. Open a Jupyter notebook in VS Code
2. Click the Causal Inference icon in the sidebar
3. Start a conversation: "Analyze the effect of exercise on heart disease"
4. Follow the guided workflow through each stage

## 📁 Project Structure

```
causal-inference-assistant/
├── src/
│   ├── extension/          # VS Code extension layer
│   ├── orchestration/      # Workflow orchestration (Mastra)
│   ├── agents/             # Specialized causal inference agents
│   ├── integrations/       # Jupyter, MCP, LLM integrations
│   ├── knowledge/          # Causal inference prompts and validators
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── webview-ui/             # React-based chat interface
├── tests/                  # Unit and integration tests
├── docs/                   # Documentation
└── examples/               # Example notebooks and workflows
```

## 🛠️ Development

### Building

```bash
# Watch mode for extension
npm run watch

# Watch mode for webview (separate terminal)
npm run watch:webview

# Production build
npm run compile
```

### Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Lint
npm run lint

# Format code
npm run format
```

### Debugging

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in your TypeScript code
4. Interact with the extension to trigger breakpoints

## 📚 Documentation

- [Architecture](docs/architecture.md) - System design and components
- [MVP Scope](docs/mvp-scope.md) - MVP features and roadmap
- [Agents](docs/agents.md) - Agent specifications and prompts
- [Workflows](docs/workflows.md) - Workflow stages and orchestration
- [Development Guide](docs/development.md) - Contribution guidelines

## 🗺️ Roadmap

### v0.1 - MVP (Current)
- ✅ Basic chat interface
- ✅ Jupyter integration
- ✅ 5 core agents
- ✅ Sequential workflow

### v0.2 - Enhanced MVP
- 🔄 MCP server integration
- 🔄 Interactive DAG editor
- 🔄 SDK configuration

### v0.3 - Beta
- 🔄 Iterative feedback loops
- 🔄 Enhanced validation

### v0.5 - Feature Complete
- ⏳ Sensitivity analysis agent
- ⏳ Report generation
- ⏳ Workflow templates

See [full PRD](causal-inference-assistant-prd.md) for complete roadmap.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Mastra AI](https://mastra.ai) framework
- Powered by [Anthropic Claude](https://www.anthropic.com)
- Inspired by the causal inference research community

## 📧 Contact

- Issues: [GitHub Issues](https://github.com/causol/causal-inference-assistant/issues)

---

**Note**: This is MVP v0.1. Many features from the full PRD are planned for future releases.