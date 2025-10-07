const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb')
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi')
const ddb = new DynamoDBClient({})
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId
  const userId = 'unknown' // TODO: parse from JWT if authorizer attached
  await ddb.send(
    new PutItemCommand({
      TableName: process.env.SESSION_TABLE,
      Item: {
        pk: { S: `CONN#${connectionId}` },
        sk: { S: `USER#${userId}` },
        ttl: { N: `${Math.floor(Date.now() / 1000) + 3600}` },
      },
    }),
  )

  // Send connection-ack with connectionId so clients can POST to REST using it
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  const mgmt = new ApiGatewayManagementApiClient({ endpoint })

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const payload = Buffer.from(JSON.stringify({ event: 'connection-ack', connectionId }))

  let attempt = 0
  const maxAttempts = 3
  let lastErr
  while (attempt < maxAttempts) {
    try {
      await mgmt.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: payload }))
      lastErr = undefined
      break
    } catch (e) {
      lastErr = e
      // 410 Gone can occur if API GW hasn't registered the connection yet. Backoff and retry.
      await sleep(200 * Math.pow(2, attempt))
      attempt++
    }
  }
  if (lastErr) {
    console.log('ack failed after retries', lastErr)
  }

  return { statusCode: 200, body: 'connected' }
}
