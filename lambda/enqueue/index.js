const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs')
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb')
const sqs = new SQSClient({})
const ddb = new DynamoDBClient({})

exports.handler = async (event) => {
  const body = JSON.parse(event.body || '{}')
  const { prompt, sessionId } = body
  // Accept legacy alias wsConnectionId as well
  let connectionId = body.connectionId || body.wsConnectionId || ''
  if (typeof connectionId !== 'string') connectionId = ''
  connectionId = connectionId.trim()

  if (!prompt || !connectionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'connectionId and prompt are required' }),
    }
  }

  const userId = event.requestContext?.authorizer?.jwt?.claims?.email || 'anonymous'

  const msg = { userId, sessionId, prompt, connectionId, ts: Date.now() }

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify(msg),
    }),
  )

  // store simple session heartbeat (optional)
  try {
    await ddb.send(
      new PutItemCommand({
        TableName: process.env.SESSION_TABLE,
        Item: {
          pk: { S: `USER#${userId}` },
          sk: { S: `SESSION#${sessionId}#${Date.now()}` },
          ttl: { N: `${Math.floor(Date.now() / 1000) + 86400}` },
        },
      }),
    )
  } catch (e) {
    console.log('DDB put failed', e)
  }

  return { statusCode: 202, body: JSON.stringify({ ok: true }) }
}
