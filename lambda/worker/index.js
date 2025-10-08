const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi')
const {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} = require('@aws-sdk/client-bedrock-runtime')
const { SignatureV4 } = require('@aws-sdk/signature-v4')
const { Sha256 } = require('@aws-crypto/sha256-js')
const { HttpRequest } = require('@aws-sdk/protocol-http')
const { defaultProvider } = require('@aws-sdk/credential-provider-node')
const {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} = require('@aws-sdk/client-bedrock-agent-runtime')
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm')
const { defaultConfig } = require('../config-schema')

const ws = new ApiGatewayManagementApiClient({ endpoint: process.env.WS_API_ENDPOINT })
const bedrock = new BedrockRuntimeClient({})
const agentRt = new BedrockAgentRuntimeClient({})
const ssm = new SSMClient({})

// Configuration cache (with TTL)
let configCache = null
let configCacheTime = 0
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetches configuration from SSM Parameter Store with caching
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig() {
  const now = Date.now()

  // Return cached config if still valid
  if (configCache && now - configCacheTime < CONFIG_CACHE_TTL_MS) {
    return configCache
  }

  // Try to fetch from SSM, fall back to default config
  try {
    const paramName = process.env.CONFIG_PARAM_NAME || '/bedrock-chatbot/config'
    const response = await ssm.send(
      new GetParameterCommand({
        Name: paramName,
        WithDecryption: true,
      }),
    )

    if (response.Parameter && response.Parameter.Value) {
      const config = JSON.parse(response.Parameter.Value)
      configCache = config
      configCacheTime = now
      console.log('Configuration loaded from SSM')
      return config
    }
  } catch (error) {
    console.warn('Failed to load config from SSM, using defaults:', error.message)
  }

  // Fall back to default configuration
  configCache = defaultConfig
  configCacheTime = now
  return defaultConfig
}

async function streamMock({ connectionId, prompt }) {
  const demo = `Here's a streaming demo for your prompt: "${prompt}"\n\n- This is a mock response.\n- It streams tokens over WebSocket.\n- Deployed via CDK, served via CloudFront.\n\nEnjoy the demo!`
  let seq = 0
  for (const ch of demo.split('')) {
    await ws.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({ event: 'delta', seq: seq++, content: ch })),
      }),
    )
    await new Promise((r) => setTimeout(r, 10))
  }
  await ws.send(
    new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify({ event: 'complete' })),
    }),
  )
}

exports.handler = async (event) => {
  // Load configuration (cached)
  const config = await getConfig()

  for (const rec of event.Records) {
    const job = JSON.parse(rec.body)
    const { prompt, connectionId } = job

    // Determine Knowledge Base ID: config takes precedence over env var
    const knowledgeBaseId = config.knowledgeBase.enabled
      ? config.knowledgeBase.knowledgeBaseId
      : process.env.KNOWLEDGE_BASE_ID || ''

    // If explicitly forced to MOCK, stream mock data; otherwise use Bedrock.
    if (knowledgeBaseId === 'MOCK') {
      await streamMock({ connectionId, prompt })
      continue
    }

    // Optional KB retrieval when enabled and KB ID is provided
    let ctx = ''
    if (config.knowledgeBase.enabled && knowledgeBaseId) {
      try {
        const retrieved = await agentRt.send(
          new RetrieveCommand({
            knowledgeBaseId: knowledgeBaseId,
            retrievalQuery: { text: prompt },
            retrievalConfiguration: {
              vectorSearchConfiguration: {
                numberOfResults: config.retrieval.numberOfResults,
              },
            },
          }),
        )
        const items = retrieved.retrievalResults || []
        ctx = items
          .map(
            (x, i) => `[S${i + 1}] ${x.content?.text?.slice(0, config.retrieval.maxContextLength)}`,
          )
          .join('\n')
      } catch (e) {
        console.log('KB retrieve failed', e)
      }
    }

    // Use configured prompts
    const system = ctx ? config.prompts.systemWithContext : config.prompts.systemWithoutContext
    const user = ctx
      ? config.prompts.contextTemplate.replace('{context}', ctx).replace('{prompt}', prompt)
      : prompt

    const body = {
      anthropic_version: config.model.anthropicVersion,
      max_tokens: config.generation.maxTokens,
      temperature: config.generation.temperature,
      top_p: config.generation.topP,
      top_k: config.generation.topK,
      messages: [{ role: 'user', content: `${system}\n\n${user}` }],
    }

    const base = {
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    }
    const useProfile = process.env.INFERENCE_PROFILE_ARN && process.env.INFERENCE_PROFILE_ARN.trim()

    if (!useProfile) {
      // Regular streaming with modelId
      const cmd = new InvokeModelWithResponseStreamCommand({
        ...base,
        modelId: config.model.modelId,
      })
      const resp = await bedrock.send(cmd)
      let seq = 0
      for await (const evt of resp.body) {
        if (evt.chunk && evt.chunk.bytes) {
          try {
            const payload = JSON.parse(Buffer.from(evt.chunk.bytes).toString('utf-8'))
            const delta = payload.delta?.text || payload.output_text || ''
            if (delta) {
              await ws.send(
                new PostToConnectionCommand({
                  ConnectionId: connectionId,
                  Data: Buffer.from(JSON.stringify({ event: 'delta', seq: seq++, content: delta })),
                }),
              )
            }
          } catch (e) {
            console.log('stream parse error', e)
          }
        }
      }
      await ws.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify({ event: 'complete' })),
        }),
      )
    } else {
      // Fallback: non-streaming invoke via inference profile, then stream chunks to client
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1'
      const endpoint = `https://bedrock-runtime.${region}.amazonaws.com`
      const path = `/inference-profiles/${encodeURIComponent(process.env.INFERENCE_PROFILE_ARN)}/invoke-model`

      const request = new HttpRequest({
        protocol: 'https:',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        hostname: `bedrock-runtime.${region}.amazonaws.com`,
        path,
        body: JSON.stringify(body),
      })

      const signer = new SignatureV4({
        service: 'bedrock',
        region,
        sha256: Sha256,
        credentials: defaultProvider(),
      })
      const signed = await signer.sign(request)

      const res = await fetch(`${endpoint}${path}`, {
        method: 'POST',
        headers: signed.headers,
        body: request.body,
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.log('profile invoke error', res.status, errText)
        throw new Error(`Bedrock profile invoke failed: ${res.status}`)
      }
      const txt = await res.text()
      let json
      try {
        json = JSON.parse(txt)
      } catch {
        json = {}
      }
      const out = json.output_text || json.completion || JSON.stringify(json)
      // stream the output in small chunks
      let seq = 0
      for (const ch of out.split('')) {
        await ws.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify({ event: 'delta', seq: seq++, content: ch })),
          }),
        )
        await new Promise((r) => setTimeout(r, 5))
      }
      await ws.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify({ event: 'complete' })),
        }),
      )
    }
  }
}
