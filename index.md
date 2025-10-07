---
title: Bedrock Chatbot: From Prompt to Production
layout: default
---

# Bedrock Chatbot: From Prompt to Production

Welcome to **Bedrock Chatbot**, a modern reference architecture for building enterprise-grade generative AI assistants on AWS.

This project combines **Amazon Bedrock**, **Knowledge Bases**, **Cognito**, **API Gateway (HTTP + WebSocket)**, **SQS**, **Lambda**, and **DynamoDB** to deliver **streaming**, **context-grounded** chat experiences.

## Why this matters
- **Real-time streaming** UX using Bedrock’s streaming APIs and WebSockets.
- **RAG** via Bedrock Knowledge Bases for grounded, cited answers.
- **Async scaling** with SQS and Lambda workers.
- **Security & governance**: IAM least privilege, audit with EventBridge, policy store in DynamoDB.

## High-level architecture

```mermaid
graph TD
  subgraph Client
    A[Web UI] --> B[WebSocket]
    A --> C[HTTP /chat]
  end

  subgraph Backend[AWS Backend]
    C --> D[API Gateway HTTP]
    B --> E[API Gateway WebSocket]
    D --> F[SQS]
    F --> G[Lambda Worker]
    G --> H[(Amazon Bedrock)]
    H --> I[(Knowledge Base)]
    G --> E
    G --> J[(DynamoDB)]
    G --> K[(EventBridge)]
  end

  subgraph Data Plane
    I --> L[(S3 Docs)]
    J --> M[(User Sessions & Policies)]
  end

  classDef box fill:#0b1220,stroke:#374151,color:#e5e7eb;
  class A,B,C,D,E,F,G,H,I,J,K,L,M box;
```

## Quick links
- [Architecture Deep Dive](architecture.md)
- [Deployment Guide](deployment.md)
- [Frontend Walkthrough](frontend.md)
- [POC Overview](poc.md)
