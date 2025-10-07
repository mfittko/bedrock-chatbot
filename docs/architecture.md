---
title: Architecture Deep Dive
layout: default
---

# Architecture Deep Dive

This document explains the end-to-end system, focusing on the **async streaming** flow and **RAG** integration.

## Component view

```mermaid
flowchart LR
  UI[Web UI] -->|POST /chat| HTTP[API Gateway HTTP]
  UI -- WebSocket --> WS[API Gateway WebSocket]

  HTTP --> Q[SQS Queue]
  Q --> W[Worker Lambda]

  W -->|Retrieve| KB[Bedrock Knowledge Base]
  W -->|Stream tokens| BR[Amazon Bedrock]
  BR -->|deltas| W
  W -->|postToConnection| WS
  W --> DDB[(DynamoDB)]
  W --> EB[(EventBridge)]
```

### Why async?
- Avoids HTTP timeouts for long generations.
- Smoothly scales consumers with Lambda concurrency.
- Enables **token streaming** to clients over WS while work continues in the background.

## Streaming sequence

```mermaid
sequenceDiagram
  autonumber
  participant UI
  participant HTTP as API GW (HTTP)
  participant SQS
  participant L as Lambda Worker
  participant BR as Bedrock
  participant WS as API GW (WS)

  UI->>HTTP: POST /chat {prompt, sessionId, connectionId}
  HTTP-->>UI: 202 Accepted
  HTTP->>SQS: enqueue job

  SQS->>L: trigger lambda (job)
  L->>BR: InvokeModelWithResponseStream (streaming)
  BR-->>L: token events (delta)
  L->>WS: postToConnection {event: 'delta', content}
  L->>WS: postToConnection {event: 'complete'}
```

## Knowledge Bases integration
Two modes:
1. **Managed RAG**: `RetrieveAndGenerate(Stream)` (fast path).
2. **Custom RAG**: `Retrieve` (KB) + craft prompt + `InvokeModelWithResponseStream` (more control).

We implement **Custom RAG** in the POC for stricter prompts and consistent citations.

## Security and governance
- **IAM**: limit Bedrock to specific model ARNs + KB ARN; DDB table-level perms; SQS send/consume.
- **Network**: optionally add VPC + VPC endpoints for Bedrock, S3, and vector store.
- **Audit**: publish events to EventBridge (who asked what, retrieved which docs, latencies).
- **Rate Limiting**: throttle REST POSTs; consider WAF on CloudFront when public.

## Observability
- Track **first-token latency**, Bedrock TPS/throttles, SQS Age, and Lambda cold starts.
- Use CloudWatch dashboards + alarms.
