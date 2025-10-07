const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi')

exports.handler = async (event) => {
  const { connectionId, domainName, stage } = event.requestContext
  const endpoint = `https://${domainName}/${stage}`
  const mgmt = new ApiGatewayManagementApiClient({ endpoint })

  const payload = Buffer.from(JSON.stringify({ event: 'connection-ack', connectionId }))
  try {
    await mgmt.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: payload }))
  } catch (e) {
    console.log('default route ack failed', e)
  }

  return { statusCode: 200, body: 'ok' }
}
