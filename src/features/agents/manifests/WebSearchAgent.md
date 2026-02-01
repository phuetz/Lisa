---
name: WebSearchAgent
version: 1.0.0
domain: integration
priority: high
description: Search the web for real-time information using multiple search providers
author: Lisa Team
homepage: https://github.com/lisa-ai/lisa
permissions:
  - network_access
  - external_api
requirements:
  env:
    - VITE_SERPER_API_KEY
capabilities:
  - web_search
  - news_search
  - image_search
  - scholar_search
inputs:
  - name: query
    type: string
    required: true
    description: The search query to execute
  - name: type
    type: string
    required: false
    default: search
    description: Type of search (search, news, images, scholar)
  - name: limit
    type: number
    required: false
    default: 10
    description: Maximum number of results to return
  - name: language
    type: string
    required: false
    default: fr
    description: Language for search results
outputs:
  - name: results
    type: array
    description: Array of search results with title, url, snippet
  - name: count
    type: number
    description: Total number of results found
tags:
  - search
  - web
  - information
  - realtime
enabled: true
---

# Web Search Agent

The Web Search Agent provides real-time web search capabilities using the Serper API (Google Search).

## Usage

This agent is automatically invoked when the user asks to search for information:

- "Cherche des informations sur..."
- "Trouve-moi..."
- "Quels sont les derniers..."

## Search Types

### Standard Search
Returns web page results with titles, URLs, and snippets.

### News Search
Returns recent news articles on a topic.

### Image Search
Returns image URLs and metadata.

### Scholar Search
Returns academic papers and citations.

## Rate Limits

- Free tier: 100 queries/day
- Results may be cached for up to 1 hour

## Example

```json
{
  "query": "architectes Ile-de-France",
  "type": "search",
  "limit": 10,
  "language": "fr"
}
```

## Fallback Behavior

If the Serper API is unavailable, the agent will:
1. Attempt retry with exponential backoff
2. Return cached results if available
3. Return an error message with suggestions
