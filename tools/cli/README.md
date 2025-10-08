# Bedrock Chatbot CLI

Node.js CLI tool for managing chatbot configuration via SSM Parameter Store.

## Usage

From project root:

```bash
npm run cli config get
```

Or install globally:

```bash
npm install -g .
bedrock-chatbot config get
```

## Commands

### Get Configuration

Display the current configuration from SSM Parameter Store:

```bash
npm run cli config get
```

### Update Configuration

Update configuration from a JSON file:

```bash
npm run cli config update my-config.json
```

### Set Specific Value

Set a single configuration value:

```bash
npm run cli config set generation.temperature 0.7
npm run cli config set model.modelId "anthropic.claude-3-haiku-20240307-v1:0"
```

### Validate Configuration

Validate a configuration file without updating:

```bash
npm run cli config validate my-config.json
```

### Backup Configuration

Backup current configuration to a file:

```bash
npm run cli config backup backup.json
npm run cli config backup backup-$(date +%Y%m%d).json
```

### Restore Configuration

Restore configuration from a backup (with confirmation):

```bash
npm run cli config restore backup.json
```

### Reset to Defaults

Reset configuration to default values (with confirmation):

```bash
npm run cli config reset
```

## Environment Variables

- `CONFIG_PARAM_NAME` - SSM parameter name (default: `/bedrock-chatbot/config`)
- `AWS_REGION` - AWS region (optional, uses default from AWS config)
- `AWS_PROFILE` - AWS profile (optional, uses default)

Example:

```bash
AWS_REGION=us-west-2 npm run cli config get
CONFIG_PARAM_NAME=/my-custom-param npm run cli config get
```

## Dependencies

- **commander** - CLI framework
- **chalk** - Terminal colors
- **ora** - Spinners and progress indicators
- **@aws-sdk/client-ssm** - AWS SSM integration

## Architecture

```
tools/cli/
├── index.js           # Main CLI entry point
├── lib/
│   └── config.js      # Configuration commands implementation
├── package.json       # Package definition
└── README.md          # This file
```

## Error Handling

The CLI provides helpful error messages:

- **Parameter not found**: Suggests deploying the stack
- **Invalid JSON**: Shows parse errors
- **Validation errors**: Lists all validation failures
- **AWS errors**: Displays AWS SDK error messages

## Testing

```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

### Test Suite

The CLI includes comprehensive tests using Jest:

- **15 tests** covering validation, SSM integration, and command handlers
- **Mocked AWS SDK** for isolated unit testing
- **Test coverage tracking** enabled
- **CI/CD integration** via GitHub Actions

All tests run automatically on:

- Pull requests to `main` branch
- Pushes to `main` branch

### Running Tests Locally

```bash
# From the CLI directory
cd tools/cli
npm test

# From project root
npm run -w tools/cli test
```

## CI/CD

This CLI is tested as part of the project's CI pipeline. The workflow:

1. **Lint** - ESLint checks for code quality
2. **Test** - Jest runs all CLI tests
3. **Build** - CDK build and synth (after tests pass)

See `.github/workflows/ci.yml` for the complete workflow configuration.

## License

MIT
