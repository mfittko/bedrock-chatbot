import { Stack, StackProps, Duration } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { UserPool, UserPoolClient, AccountRecovery, OAuthScope } from 'aws-cdk-lib/aws-cognito'

export class IdentityStack extends Stack {
  public readonly userPool: UserPool
  public readonly userPoolClient: UserPoolClient

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
    })

    this.userPoolClient = this.userPool.addClient('WebClient', {
      authFlows: { userSrp: true },
      oAuth: { scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE] },
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
    })
  }
}
