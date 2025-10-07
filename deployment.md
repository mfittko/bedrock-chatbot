# Deployment Guide

## Prerequisites
- Node.js 18+ and npm
- AWS CLI configured with an account that has access to **Amazon Bedrock**
- CDK bootstrap (`cdk bootstrap`) if not done in your account

## CDK deploy
```bash
cd cdk
npm install
# Set your Knowledge Base ID in lib/api-stack.ts (KNOWLEDGE_BASE_ID)
npm run deploy
```

Outputs:
- `RestApiUrl` (append `/chat` for the POST)
- `WsEndpoint` (use as WebSocket URL)

## Frontend config
Copy `frontend/config.sample.json` to `frontend/config.json` and paste your endpoints:
```json
{
  "rest": "https://<rest-id>.execute-api.<region>.amazonaws.com/chat",
  "ws": "wss://<ws-id>.execute-api.<region>.amazonaws.com/prod"
}
```

Open `frontend/index.html` locally or host it via S3+CloudFront.

## GitHub Pages for docs
Create a repo and push. Then enable GitHub Pages (source: `docs/` folder) or use Actions:

`.github/workflows/gh-pages.yml`:
```yaml
name: Publish Docs
on:
  push:
    branches: [ main ]
permissions:
  contents: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy docs to gh-pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```
