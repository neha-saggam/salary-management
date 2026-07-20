# Monitoring & Logging Integration Guide

**Status**: ✅ Logging infrastructure in place  
**Ready for**: Datadog, Sentry, ELK Stack, CloudWatch, Stackdriver

## Overview

The ACME Salary Management System includes structured JSON logging throughout the application. Logs are designed to be easily ingested by monitoring platforms without additional configuration.

## Current Logging Implementation

### Logger Utility (`backend/src/logger.ts`)
- **Format**: JSON (default) or text (development)
- **Levels**: debug, info, warn, error
- **Context**: Structured data attached to each log entry
- **Request Tracing**: Unique `requestId` for tracking requests through the system

### What Gets Logged

#### Authentication Events
```json
{
  "timestamp": "2026-07-20T10:30:00Z",
  "level": "info",
  "message": "Login successful",
  "requestId": "1721472600000-abc12345",
  "userId": "user-123",
  "email": "user@example.com",
  "role": "HR_ADMIN"
}
```

- ✅ Login attempts (success & failure)
- ✅ Token creation
- ✅ Token validation failures
- ✅ Permission denials (role-based access)
- ✅ Invalid credentials
- ⚠️ No password hashes or sensitive data logged

#### Database Operations
```json
{
  "timestamp": "2026-07-20T10:30:15Z",
  "level": "debug",
  "message": "Fetching employees",
  "requestId": "1721472600000-abc12345",
  "userId": "user-123",
  "email": "user@example.com",
  "page": 1,
  "limit": 50,
  "titleFilter": null,
  "statusFilter": null
}
```

- ✅ Employee queries (list, get, search)
- ✅ Create operations (with audit info)
- ✅ Update operations
- ✅ Delete operations
- ✅ Query filters & pagination params

#### Error Tracking
```json
{
  "timestamp": "2026-07-20T10:30:45Z",
  "level": "error",
  "message": "Failed to fetch employees",
  "requestId": "1721472600000-abc12345",
  "userId": "user-123",
  "email": "user@example.com",
  "error": "Connection timeout"
}
```

- ✅ All errors with stack traces
- ✅ Database errors
- ✅ Validation errors
- ✅ Network errors

### Environment Variables

```bash
# Set log level (default: info)
LOG_LEVEL=debug  # debug, info, warn, error

# Set log format (default: json)
LOG_FORMAT=json  # json or text
```

**Example Development Setup**:
```bash
# Verbose logging for development
LOG_LEVEL=debug LOG_FORMAT=text npm run dev

# Production (minimal logs, JSON format)
LOG_LEVEL=warn LOG_FORMAT=json npm start
```

---

## Integration Guides

### Datadog

**Setup**:
1. Install Datadog agent on your server
2. Configure log forwarder to collect stdout/stderr
3. Set `LOG_FORMAT=json` (already default)

**Configuration** (`datadog.yaml`):
```yaml
logs:
  - type: file
    path: /path/to/app/logs/app.log
    service: salary-management
    source: nodejs
```

**Parser Rules** (Automatic for JSON):
- `timestamp` → Datadog timestamp
- `level` → Severity level
- `requestId` → Trace ID (correlate with frontend)
- `userId` → User ID tag
- `email` → User email tag

**Dashboards to Create**:
- Login success rate (filter: `message:"Login successful"`)
- Failed authentication attempts (filter: `level:warn message:"Invalid credentials"`)
- API latency by endpoint (use `requestId` grouping)
- Error rate by user role
- Employee CRUD operations audit trail

---

### Sentry

**Setup**:
1. Install `@sentry/node`
2. Initialize at app startup
3. Logs flow as events

**Installation**:
```bash
npm install @sentry/node @sentry/tracing
```

**Integration Code** (add to `backend/src/main.ts`):
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Custom Integration** (attach contextual data):
```typescript
// In error logging
logger.error('DB connection failed', {
  error: err.message,
  requestId: (req as any).requestId,
});

// Sentry will capture this with context
```

**Benefits**:
- Automatic error grouping
- Source map support
- Replay on error (if enabled)
- Release tracking
- Team alerts

---

### ELK Stack (Elasticsearch, Logstash, Kibana)

**Setup**: Deploy ELK stack and configure log shipper

**Filebeat Configuration** (`filebeat.yml`):
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /path/to/app/logs/*.log
  json.message_key: message
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "salary-mgmt-%{+yyyy.MM.dd}"

processors:
  - add_docker_metadata:
  - add_kubernetes_metadata:
```

**Kibana Queries**:
```
# All login attempts
message: "Login*"

# Errors in last 24 hours
level: error AND @timestamp: [now-24h TO now]

# User activity audit
userId: "user-123"

# API performance (using requestId)
message: "Employees fetched" AND page: 1
```

---

### AWS CloudWatch

**Setup**: Configure CloudWatch agent or use `/dev/stdout`

**CloudWatch Logs Agent Config**:
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/app/logs/app.log",
            "log_group_name": "/aws/salary-management/api",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

**Metric Filters**:
```
# Failed logins
[level = "warn", message = "*Invalid credentials*"]
# Subscription count: 1

# Database errors
[level = "error", message = "*DB*" || message = "*database*"]
# Subscription count: 1
```

**Alarms**:
```
Alert when failed_logins > 5 in 5 minutes
Alert when error_count > 10 in 1 minute
```

---

### Google Cloud Logging (Stackdriver)

**Setup**:
1. Install `@google-cloud/logging`
2. Configure GCP credentials
3. Logs auto-ingested

**Installation**:
```bash
npm install @google-cloud/logging
```

**Code**:
```typescript
import {Logging} from '@google-cloud/logging';
const logging = new Logging();

app.use((req, res, next) => {
  const log = logging.log('salary-management');
  const metadata = {
    severity: 'DEFAULT',
    resource: {
      type: 'global',
    },
  };
  
  log.write(log.entry(metadata, JSON.stringify(logData)));
  next();
});
```

---

## Recommended Monitoring Setup

### Development Environment
```bash
LOG_LEVEL=debug LOG_FORMAT=text npm run dev

# Output in terminal:
# [2026-07-20T10:30:00Z] INFO: Login successful {userId: "user-123", ...}
```

### Production Environment
```bash
# In docker-compose.yml or K8s manifests
env:
  - LOG_LEVEL=warn
  - LOG_FORMAT=json

# Output goes to stdout → Container logs → Datadog/ELK/CloudWatch
```

### Typical Integration Path

1. **Start**: Console logging (default)
2. **Add**: Request tracing with `requestId` ✅ (implemented)
3. **Integrate**: Datadog/Sentry (push logs to external service)
4. **Scale**: Add ELK or CloudWatch for log storage
5. **Optimize**: Set up dashboards and alerts

---

## Log Retention & Cost

### Recommended Settings by Tool

| Tool | Retention | Cost/month (1M events) |
|------|-----------|----------------------|
| Datadog | 15 days (standard) | ~$50 |
| Sentry | 30 days (free) / 90 days (paid) | Free/$29 |
| ELK (self-hosted) | Custom | ~$200-500 |
| CloudWatch | Custom | ~$0.50 per GB |
| Stackdriver | 30 days (free) | Free/$0.50/GB |

---

## What to Monitor

### Critical Alerts
- ❌ Authentication failures > 5 in 5 min
- ❌ API errors > 1% of requests
- ❌ Database connection timeout
- ❌ Unauthorized access attempts

### Performance Monitoring
- ✅ API response times (p50, p95, p99)
- ✅ Database query latency
- ✅ Request rate per user
- ✅ Memory usage per request

### Audit Trail
- ✅ User logins/logouts
- ✅ Data modifications (creates/updates/deletes)
- ✅ Permission denials
- ✅ Failed validation attempts

---

## Best Practices

1. **Always include requestId** - Enables tracing across services
2. **Log at appropriate level** - debug (too verbose), info (normal), warn (potential issues), error (failures)
3. **Never log secrets** - No passwords, API keys, JWT tokens
4. **Include user context** - userId, email for audit trails
5. **Add structured data** - Use objects, not string concatenation
6. **Set retention policies** - Balance cost with compliance needs
7. **Create runbooks** - Document how to respond to alerts

---

## Next Steps

1. **Choose monitoring platform** (Datadog recommended for simplicity)
2. **Add integration code** (follow guide above)
3. **Set up dashboards** (login success rate, error rate, latency)
4. **Configure alerts** (critical errors, failed auth attempts)
5. **Create runbooks** (how to respond to alerts)
6. **Test integration** (verify logs appear in external service)

---

## File References

- Logger implementation: [backend/src/logger.ts](../backend/src/logger.ts)
- Auth logging: [backend/src/auth.ts](../backend/src/auth.ts)
- App logging: [backend/src/app.ts](../backend/src/app.ts)
- Environment config: [.env.example](../.env.example)

**Status**: Ready to integrate with any monitoring platform ✅
