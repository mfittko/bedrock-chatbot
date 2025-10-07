
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const ddb = new DynamoDBClient({});
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = 'unknown'; // TODO: parse from JWT if authorizer attached
  await ddb.send(new PutItemCommand({
    TableName: process.env.SESSION_TABLE,
    Item: {
      pk: { S: `CONN#${connectionId}` },
      sk: { S: `USER#${userId}` },
      ttl: { N: `${Math.floor(Date.now()/1000)+3600}` }
    }
  }));
  return { statusCode: 200, body: 'connected' };
};
