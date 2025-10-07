# Bedrock Chatbot (CDK + Streaming + RAG)

A production-ready starter for **streaming LLM chat** on AWS with **Amazon Bedrock** and **Knowledge Bases**.

- WebSocket **token streaming**
- **Async** compute via SQS + Lambda
- **RAG** grounding via Bedrock KB
- CDK v2 (TypeScript)
- Docs ready for **GitHub Pages** in `/docs`

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
