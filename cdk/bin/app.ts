import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { IdentityStack } from '../lib/identity-stack'
import { DataStack } from '../lib/data-stack'
import { ApiStack } from '../lib/api-stack'
import { FrontendStack } from '../lib/frontend-stack'

const app = new cdk.App()

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }

const identity = new IdentityStack(app, 'IdentityStack', { env })
const data = new DataStack(app, 'DataStack', { env })

const api = new ApiStack(app, 'ApiStack', {
  env,
  userPool: identity.userPool,
  userPoolClient: identity.userPoolClient,
  sessionTable: data.sessionTable,
  policyTable: data.policyTable,
})

new FrontendStack(app, 'FrontendStack', { env })
