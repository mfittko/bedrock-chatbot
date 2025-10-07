# POC Guide

## Deploy

```
cd cdk
npm install
npm run deploy
```

Take note of the outputs:

- `RestApiUrl` (append `/chat`)
- `WsEndpoint`

## Configure the frontend

Upload the `frontend/` folder to an S3 static site or serve locally. Create `frontend/config.json` with your endpoints:

```json
{
  "rest": "https://<rest-id>.execute-api.<region>.amazonaws.com/chat",
  "ws": "wss://<ws-id>.execute-api.<region>.amazonaws.com/prod"
}
```

Open `index.html` in a browser, click **Connect**, then type a prompt and click **Send**.
You should see token-by-token streaming.

> Ensure your AWS account has Bedrock access to the selected model and that the Knowledge Base ID is set in `cdk/lib/api-stack.ts`.
