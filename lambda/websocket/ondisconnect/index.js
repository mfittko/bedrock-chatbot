const { DynamoDBClient, DeleteItemCommand } = require('@aws-sdk/client-dynamodb')
const ddb = new DynamoDBClient({})
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId
  try {
    await ddb.send(
      new DeleteItemCommand({
        TableName: process.env.SESSION_TABLE,
        Key: { pk: { S: `CONN#${connectionId}` }, sk: { S: `USER#unknown` } },
      }),
    )
  } catch (e) {
    console.log('disconnect cleanup', e)
  }
  return { statusCode: 200, body: 'disconnected' }
}
