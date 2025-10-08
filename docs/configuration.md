---
title: Configuration Management
layout: default
---

# Configuration Management

The chatbot uses AWS Systems Manager (SSM) Parameter Store for dynamic configuration. Update system prompts, model settings, and generation parameters without redeploying Lambda functions.

## Overview

- **Storage**: JSON document in SSM Parameter Store (`/bedrock-chatbot/config`)
- **Caching**: 5-minute TTL for performance
- **Updates**: Changes take effect within 5 minutes
- **Default**: Created automatically during CDK deployment

## Configuration Structure

The configuration is defined in `/lambda/config-schema.js` with the following structure:

```json
{
  "model": {
    "modelId": "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropicVersion": "bedrock-2023-05-31"
  },
  "prompts": {
    "systemWithContext": "You are a helpful assistant. Use only the CONTEXT to answer and cite as [S#]. If unknown, say you don't know.",
    "systemWithoutContext": "You are a helpful assistant. Answer clearly and concisely.",
    "contextTemplate": "CONTEXT:\n{context}\n\nUSER: {prompt}"
  },
  "retrieval": {
    "numberOfResults": 6,
    "maxContextLength": 1000
  },
  "generation": {
    "maxTokens": 800,
    "temperature": 0.2,
    "topP": 0.9,
    "topK": 250
  }
}
```

## Configuration Parameters

### Model Settings (`model`)

- **`modelId`**: The Bedrock model identifier to use for generation
  - Example: `anthropic.claude-3-5-sonnet-20240620-v1:0`
  - Other options: `anthropic.claude-3-haiku-20240307-v1:0`, `anthropic.claude-3-opus-20240229-v1:0`

- **`anthropicVersion`**: The Anthropic API version
  - Default: `bedrock-2023-05-31`

### Knowledge Base Settings (`knowledgeBase`)

- **`enabled`**: Enable or disable Knowledge Base retrieval
  - Type: `boolean`
  - Default: `false`
  - When `true`, the system will retrieve context from the Knowledge Base

- **`knowledgeBaseId`**: The Bedrock Knowledge Base ID
  - Type: `string`
  - Default: `""` (empty string)
  - Example: `"ABCDEFGH12"`
  - **Note**: Config takes precedence over `KNOWLEDGE_BASE_ID` environment variable

### Prompt Configuration (`prompts`)

- **`systemWithContext`**: System prompt used when Knowledge Base context is available
  - This prompt should instruct the model on how to use the context and cite sources
  - Default includes citation instructions using `[S#]` format

- **`systemWithoutContext`**: System prompt used when no Knowledge Base context is available
  - A more general assistant prompt for queries that don't retrieve context

- **`contextTemplate`**: Template for formatting the user message when context is available
  - Use `{context}` placeholder for retrieved documents
  - Use `{prompt}` placeholder for the user's query
  - Default: `"CONTEXT:\n{context}\n\nUSER: {prompt}"`

### Retrieval Settings (`retrieval`)

- **`numberOfResults`**: Number of documents to retrieve from Knowledge Base
  - Default: `6`
  - Range: 1-100 (depending on your KB configuration)

- **`maxContextLength`**: Maximum length of each context snippet in characters
  - Default: `1000`
  - Helps control the total context size sent to the model

### Generation Parameters (`generation`)

- **`maxTokens`**: Maximum number of tokens to generate
  - Default: `800`
  - Range: 1-4096 (model dependent)

- **`temperature`**: Controls randomness in generation
  - Default: `0.2`
  - Range: 0.0 (deterministic) to 1.0 (creative)

- **`topP`**: Nucleus sampling parameter
  - Default: `0.9`
  - Range: 0.0 to 1.0

- **`topK`**: Top-K sampling parameter
  - Default: `250`
  - Range: 0-500

## CLI Tool

The project includes a Node.js CLI for configuration management:

```bash
# View configuration
npm run cli config get

# Update from file
npm run cli config update my-config.json

# Set specific value
npm run cli config set generation.temperature 0.7

# Validate file
npm run cli config validate my-config.json

# Backup
npm run cli config backup backup.json

# Reset to defaults
npm run cli config reset
```

### Environment Variables

- `CONFIG_PARAM_NAME` - SSM parameter name (default: `/bedrock-chatbot/config`)
- `AWS_REGION` - AWS region
- `AWS_PROFILE` - AWS profile

## AWS Console

1. Go to **Systems Manager** → **Parameter Store**
2. Find `/bedrock-chatbot/config`
3. Click **Edit** → Modify JSON → **Save**

Changes take effect within 5 minutes.

## Examples

### Enable Knowledge Base

```bash
npm run cli config set knowledgeBase.enabled true
npm run cli config set knowledgeBase.knowledgeBaseId "YOUR_KB_ID"
```

### Disable Knowledge Base

```bash
npm run cli config set knowledgeBase.enabled false
```

### Switch Models

```bash
npm run cli config set model.modelId "anthropic.claude-3-haiku-20240307-v1:0"
```

### Adjust Creativity

```bash
npm run cli config set generation.temperature 0.7
npm run cli config set generation.maxTokens 1500
```

### Customize Prompts

Edit a config file and update:

```json
{
  "prompts": {
    "systemWithContext": "You are a technical advisor. Use CONTEXT and cite as [S#].",
    "systemWithoutContext": "You are a technical advisor.",
    "contextTemplate": "Reference:\n{context}\n\nQuestion: {prompt}"
  }
}
```

```bash
npm run cli config update my-prompts.json
```

## Monitoring

Check CloudWatch Logs for:

- `Configuration loaded from SSM` - Success
- `Failed to load config from SSM, using defaults` - Fallback active

## Troubleshooting

**Changes not applying?**

- Wait 5 minutes for cache to expire
- Check CloudWatch Logs for errors

**JSON validation errors?**

```bash
npm run cli config validate my-config.json
```

**Access denied?**

- Verify Lambda IAM role has `ssm:GetParameter` permission
- Check parameter exists: `/bedrock-chatbot/config`
