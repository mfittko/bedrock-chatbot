
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockAgentRuntimeClient, RetrieveCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

const ws = new ApiGatewayManagementApiClient({ endpoint: process.env.WS_API_ENDPOINT });
const bedrock = new BedrockRuntimeClient({});
const agentRt = new BedrockAgentRuntimeClient({});

exports.handler = async (event) => {
  for (const rec of event.Records) {
    const job = JSON.parse(rec.body);
    const { prompt, connectionId } = job;

    // Retrieve from Knowledge Base
    let ctx = '';
    try {
      const retrieved = await agentRt.send(new RetrieveCommand({
        knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
        retrievalQuery: { text: prompt },
        retrievalConfiguration: { vectorSearchConfiguration: { numberOfResults: 6 } }
      }));
      const items = (retrieved.retrievalResults || []);
      ctx = items.map((x, i) => `[S${i+1}] ${x.content?.text?.slice(0,1000)}`).join('\n');
    } catch (e) {
      console.log('KB retrieve failed', e);
    }

    const system = "You are a helpful assistant. Use only the CONTEXT to answer and cite as [S#]. If unknown, say you don't know.";
    const user = `CONTEXT:\n${ctx}\n\nUSER: ${prompt}`;

    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 800,
      temperature: 0.2,
      messages: [{ role: 'user', content: `${system}\n\n${user}` }]
    };

    const cmd = new InvokeModelWithResponseStreamCommand({
      modelId: process.env.MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body)
    });

    const resp = await bedrock.send(cmd);
    let seq = 0;
    for await (const evt of resp.body) {
      if (evt.chunk && evt.chunk.bytes) {
        try {
          const payload = JSON.parse(Buffer.from(evt.chunk.bytes).toString('utf-8'));
          const delta = payload.delta?.text || payload.output_text || '';
          if (delta) {
            await ws.send(new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: Buffer.from(JSON.stringify({ event: 'delta', seq: seq++, content: delta }))
            }));
          }
        } catch (e) {
          console.log('stream parse error', e);
        }
      }
    }
    await ws.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify({ event: 'complete' }))
    }));
  }
};
