import { Stack, StackProps, CfnOutput, Fn } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3'
import {
  Distribution,
  ViewerProtocolPolicy,
  ResponseHeadersPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { join } from 'path'

export interface FrontendProps extends StackProps {}

export class FrontendStack extends Stack {
  public readonly siteUrl: string

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id, props)

    const bucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    })

    const dist = new Distribution(this, 'SiteDist', {
      defaultBehavior: {
        origin: new S3Origin(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      defaultRootObject: 'index.html',
    })

    const sitePath = join(__dirname, '../../site')

    const rest = Fn.importValue('BedrockChatbot-RestApiUrl')
    const ws = Fn.importValue('BedrockChatbot-WsEndpoint')

    new BucketDeployment(this, 'DeploySite', {
      destinationBucket: bucket,
      distribution: dist,
      distributionPaths: ['/*'],
      sources: [Source.asset(sitePath)],
    })

    this.siteUrl = `https://${dist.domainName}`
    new CfnOutput(this, 'SiteUrl', { value: this.siteUrl })
  }
}
