# API Documentation

## Base URL
```
Development: http://localhost:8000
Production: https://api.yourdomain.com
```

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require JWT authentication.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### POST /api/v1/auth/register
Register a new user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### POST /api/v1/auth/login
Authenticate user and get JWT token.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** (200):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

#### GET /api/v1/auth/me
Get current user information.

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z",
  "settings": {}
}
```

### Projects

#### GET /api/v1/projects/
List all projects for current user.

**Query Parameters**:
- `limit` (int, default: 50): Number of results
- `offset` (int, default: 0): Pagination offset

**Response** (200):
```json
[
  {
    "id": "uuid",
    "name": "Work Projects",
    "description": "AI conversations for work",
    "color": "#667eea",
    "created_at": "2024-01-01T00:00:00Z",
    "conversation_count": 42
  }
]
```

#### POST /api/v1/projects/
Create a new project.

**Request**:
```json
{
  "name": "Personal Research",
  "description": "AI conversations for personal learning",
  "color": "#10b981"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "name": "Personal Research",
  "description": "AI conversations for personal learning",
  "color": "#10b981",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Conversations

#### POST /api/v1/conversations/
Create a new conversation.

**Request**:
```json
{
  "agent_id": "uuid",
  "project_id": "uuid",
  "external_id": "chatgpt-conv-123",
  "title": "How to implement authentication",
  "messages": [
    {
      "role": "user",
      "content": "How do I implement JWT authentication in FastAPI?",
      "sequence_number": 0
    },
    {
      "role": "assistant",
      "content": "Here's how to implement JWT authentication...",
      "sequence_number": 1
    }
  ],
  "metadata": {
    "source": "chatgpt",
    "url": "https://chat.openai.com/c/..."
  }
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "title": "How to implement authentication",
  "created_at": "2024-01-01T00:00:00Z",
  "message_count": 2,
  "agent": {
    "name": "chatgpt",
    "display_name": "ChatGPT"
  }
}
```

#### POST /api/v1/conversations/batch
Batch create multiple conversations (for extension sync).

**Request**:
```json
{
  "conversations": [
    {
      "agent_id": "uuid",
      "external_id": "conv-1",
      "title": "Conversation 1",
      "messages": [...]
    },
    {
      "agent_id": "uuid",
      "external_id": "conv-2",
      "title": "Conversation 2",
      "messages": [...]
    }
  ]
}
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "title": "Conversation 1",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "uuid",
    "title": "Conversation 2",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /api/v1/conversations/{conversation_id}
Get conversation with all messages.

**Response** (200):
```json
{
  "id": "uuid",
  "title": "How to implement authentication",
  "created_at": "2024-01-01T00:00:00Z",
  "agent": {
    "name": "chatgpt",
    "display_name": "ChatGPT"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "How do I implement JWT authentication?",
      "sequence_number": 0,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Search

#### POST /api/v1/search/semantic
Semantic search using vector embeddings.

**Request**:
```json
{
  "query": "How to implement authentication in FastAPI",
  "project_ids": ["uuid"],
  "agent_ids": ["uuid"],
  "limit": 20,
  "similarity_threshold": 0.5
}
```

**Response** (200):
```json
{
  "query": "How to implement authentication in FastAPI",
  "results": [
    {
      "message_id": "uuid",
      "content": "Here's how to implement JWT authentication...",
      "role": "assistant",
      "conversation_id": "uuid",
      "conversation_title": "Authentication Guide",
      "agent_name": "ChatGPT",
      "similarity": 0.87
    }
  ],
  "total": 15,
  "search_type": "semantic"
}
```

#### POST /api/v1/search/keyword
Full-text keyword search.

**Request**:
```json
{
  "query": "FastAPI authentication JWT",
  "limit": 20
}
```

**Response** (200):
```json
{
  "query": "FastAPI authentication JWT",
  "results": [...],
  "total": 8,
  "search_type": "keyword"
}
```

#### POST /api/v1/search/hybrid
Hybrid search combining semantic + keyword.

**Request**:
```json
{
  "query": "authentication implementation",
  "limit": 20
}
```

**Response** (200):
```json
{
  "query": "authentication implementation",
  "results": [...],
  "total": 23,
  "search_type": "hybrid"
}
```

### Analytics

#### GET /api/v1/analytics/overview
Get analytics overview.

**Query Parameters**:
- `start_date` (ISO date): Start date for analytics
- `end_date` (ISO date): End date for analytics

**Response** (200):
```json
{
  "total_conversations": 156,
  "total_messages": 892,
  "conversations_by_agent": {
    "chatgpt": 89,
    "claude": 45,
    "gemini": 22
  },
  "conversations_over_time": [
    {"date": "2024-01-01", "count": 12},
    {"date": "2024-01-02", "count": 15}
  ]
}
```

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message",
  "status_code": 400
}
```

### Common Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

## Rate Limiting

- 60 requests per minute per user
- 429 status code when exceeded
- `Retry-After` header indicates wait time

## Pagination

List endpoints support pagination:
- `limit`: Number of results (max 100)
- `offset`: Skip N results

Response includes:
```json
{
  "items": [...],
  "total": 156,
  "limit": 50,
  "offset": 0
}
```
