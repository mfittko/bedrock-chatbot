
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IUserPool, IUserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2-alpha';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { join } from 'path';

export interface ApiProps extends StackProps {
  sessionTable: Table;
  policyTable: Table;
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id, props);

    const q = new Queue(this, 'RequestsQ', {
      encryption: QueueEncryption.KMS_MANAGED,
      visibilityTimeout: Duration.minutes(5),
    });

    const onConnect = new NodejsFunction(this, 'WsOnConnect', {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, '../../lambda/websocket/onconnect/index.js'),
      handler: 'handler',
      architecture: Architecture.ARM_64,
      environment: { SESSION_TABLE: props.sessionTable.tableName },
      bundling: { minify: true, externalModules: [] }
    });
    const onDisconnect = new NodejsFunction(this, 'WsOnDisconnect', {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, '../../lambda/websocket/ondisconnect/index.js'),
      handler: 'handler',
      architecture: Architecture.ARM_64,
      environment: { SESSION_TABLE: props.sessionTable.tableName },
      bundling: { minify: true, externalModules: [] }
    });
    props.sessionTable.grantReadWriteData(onConnect);
    props.sessionTable.grantReadWriteData(onDisconnect);

    const wsApi = new WebSocketApi(this, 'ChatWsApi', {
      connectRouteOptions: { integration: new WebSocketLambdaIntegration('ConnectInt', onConnect) },
      disconnectRouteOptions: { integration: new WebSocketLambdaIntegration('DisconnectInt', onDisconnect) }
    });
    const wsStage = new WebSocketStage(this, 'ProdWsStage', {
      webSocketApi: wsApi, stageName: 'prod', autoDeploy: true
    });

    const enqueueFn = new NodejsFunction(this, 'EnqueueFn', {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, '../../lambda/enqueue/index.js'),
      handler: 'handler',
      architecture: Architecture.ARM_64,
      environment: {
        QUEUE_URL: q.queueUrl,
        SESSION_TABLE: props.sessionTable.tableName,
      },
      bundling: { minify: true, externalModules: [] }
    });
    q.grantSendMessages(enqueueFn);
    props.sessionTable.grantReadWriteData(enqueueFn);

    const httpApi = new HttpApi(this, 'ChatHttpApi');
    httpApi.addRoutes({
      path: '/chat',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('EnqueueInt', enqueueFn)
    });

    const workerFn = new NodejsFunction(this, 'WorkerFn', {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, '../../lambda/worker/index.js'),
      handler: 'handler',
      timeout: Duration.minutes(5),
      memorySize: 1024,
      architecture: Architecture.ARM_64,
      environment: {
        SESSION_TABLE: props.sessionTable.tableName,
        WS_API_ENDPOINT: wsStage.callbackUrl.replace('wss://', 'https://'),
        MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
        KNOWLEDGE_BASE_ID: 'REPLACE_WITH_KB_ID'
      },
      bundling: { minify: true, externalModules: [] }
    });
    q.grantConsumeMessages(workerFn);
    props.sessionTable.grantReadWriteData(workerFn);

    // IAM for WS and Bedrock
    workerFn.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: ['*']
    }));
    workerFn.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream',
        'bedrock:Retrieve', 'bedrock:RetrieveAndGenerate', 'bedrock:RetrieveAndGenerateStream'
      ],
      resources: ['*']
    }));

    new CfnOutput(this, 'WsEndpoint', { value: wsStage.url });
    new CfnOutput(this, 'RestApiUrl', { value: httpApi.apiEndpoint });
  }
}
