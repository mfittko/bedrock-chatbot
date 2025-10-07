
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

export class DataStack extends Stack {
  public readonly sessionTable: Table;
  public readonly policyTable: Table;
  public readonly feedbackBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.sessionTable = new Table(this, 'Sessions', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.RETAIN
    });

    this.policyTable = new Table(this, 'Policies', {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN
    });

    this.feedbackBucket = new Bucket(this, 'FeedbackStore', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true
    });
  }
}
