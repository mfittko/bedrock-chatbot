# Bedrock Chatbot (CDK + Streaming + RAG)

[![CI](https://github.com/mfittko/bedrock-chatbot/actions/workflows/ci.yml/badge.svg)](https://github.com/mfittko/bedrock-chatbot/actions/workflows/ci.yml) • Docs: https://mfittko.github.io/bedrock-chatbot/

A production-ready starter for **streaming LLM chat** on AWS with **Amazon Bedrock** and **Knowledge Bases**.

- WebSocket **token streaming**
- **Async** compute via SQS + Lambda
- **RAG** grounding via Bedrock KB
- CDK v2 (TypeScript)
- Docs ready for **GitHub Pages** in `/docs`

## Live docs

- GitHub Pages: https://mfittko.github.io/bedrock-chatbot/

Note: The first-time GitHub Pages publish can take a couple of minutes to provision. If the link 404s, wait ~2 minutes, hard-refresh, or ensure repository Settings → Pages is set to “Deploy from a branch” with Branch: `gh-pages`, Folder: `/`.

## Quick start

```bash
cd cdk
npm install
# Edit lib/api-stack.ts -> set KNOWLEDGE_BASE_ID and (optionally) MODEL_ID
npm run deploy
```

Grab outputs:

- `RestApiUrl` (append `/chat`)
- `WsEndpoint`

Then configure `frontend/config.json` and open `frontend/index.html`.

## Documentation

- Public intro: `docs/index.md`
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Frontend](docs/frontend.md)
- [POC](docs/poc.md)

## License

MIT
