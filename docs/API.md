# API Reference — ObservabilityOS

This document specifies the REST API endpoints of ObservabilityOS. All requests must be authenticated and conform to the schemas detailed below.

---

## 🔒 Authentication

All public telemetry API endpoints require authentication using your Project API Key passed in the request header:

```text
x-api-key: your_project_api_key
```

*If the header is missing, the API returns a `401 Unauthorized` response. If the key is invalid, the API returns a `403 Forbidden` response.*

---

## 🔌 Public Ingestion APIs

### 1. Ingest Log Telemetry
Forward structured application log statements. The API accepts both single JSON log items and arrays of logs (batched).

* **Endpoint**: `POST /api/ingest`
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: <your_api_key>`
* **Request Body Payload**:
```json
{
  "service": "billing-service",
  "environment": "prod",
  "level": "error",
  "message": "Stripe timeout: unable to connect to API endpoint",
  "timestamp": "2026-06-14T14:38:00.000Z",
  "traceId": "tr_stripe_9981",
  "metadata": {
    "userId": "usr_99824",
    "amount": 29.00
  }
}
```
* **Payload Validation Rules (Zod)**:
  * `service` (String, Required): Name of the service emitting the log.
  * `environment` (Enum: `prod`, `staging`, `dev`, Required).
  * `level` (Enum: `error`, `warn`, `info`, `debug`, Required).
  * `message` (String, Required): Text statement.
  * `timestamp` (ISO String, Optional): Auto-generated if not passed.
  * `traceId` (String, Optional): Link request spans.
  * `metadata` (Object, Optional): Arbitrary JSON fields. Sensitive keys are redacted locally.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "count": 1
}
```

---

### 2. Ingest System Metrics
Ship time-series metrics tracking system performance (CPU, Memory, Latencies) to feed anomaly checks and dashboard charts.

* **Endpoint**: `POST /api/metrics/ingest`
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: <your_api_key>`
* **Request Body Payload**:
```json
{
  "service": "auth-service",
  "environment": "prod",
  "cpuUsage": 18.4,
  "memoryUsage": 512.5,
  "memoryLimit": 2048.0,
  "latencyMs": 42.1
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "metricId": "65fc7c88b901a1d120a109a2"
}
```

---

## 🔍 Log Query & SSE Streaming APIs

### 3. Full-text Log Search
Query your logs database. On MongoDB Atlas production clusters, this uses a high-performance Lucene index (`$search`). On local sandbox instances, it falls back to matching regular expressions against indexed database fields.

* **Endpoint**: `POST /api/logs/search`
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: <your_api_key>` (or authenticated session cookie)
* **Request Body Payload**:
```json
{
  "serviceId": "65fc7b16b901a1d120a10991",
  "query": "Stripe timeout",
  "level": "error",
  "environment": "prod",
  "startDate": "2026-06-14T00:00:00.000Z",
  "endDate": "2026-06-14T23:59:59.000Z",
  "limit": 50,
  "skip": 0
}
```
* **Success Response (200 OK)**:
```json
{
  "logs": [
    {
      "_id": "65fc7c88b901a1d120a109c1",
      "serviceId": "65fc7b16b901a1d120a10991",
      "level": "error",
      "message": "Stripe timeout: unable to connect to API endpoint",
      "timestamp": "2026-06-14T14:38:00.000Z",
      "traceId": "tr_stripe_9981",
      "metadata": {
        "userId": "usr_99824",
        "amount": 29.00
      }
    }
  ],
  "total": 1
}
```

---

### 4. Real-time Log Streaming (Server-Sent Events)
Establishes a persistent Server-Sent Events (SSE) channel to stream incoming logs in real-time. This is utilized by the dashboard's "Go Live" feature.

* **Endpoint**: `GET /api/logs/stream?serviceId=<service_id>&environment=<env>`
* **Headers**:
  * `Accept: text/event-stream`
  * `Cache-Control: no-cache`
  * `Connection: keep-alive`
* **Response Stream Format**:
```text
event: log
data: {"_id":"65fc7c88b901a1d120a109c1","level":"info","message":"Transaction completed","timestamp":"2026-06-14T14:40:02.124Z"}

event: log
data: {"_id":"65fc7c88b901a1d120a109c2","level":"error","message":"DB timeout","timestamp":"2026-06-14T14:40:15.981Z"}
```

---

## 🔗 Related Documents
* 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Details on telemetry ingestion pipelines.
* 🗄️ **[DATABASE.md](DATABASE.md)**: Underlying MongoDB indices and schemas.
* 🛡️ **[SECURITY.md](SECURITY.md)**: Ingestion rate limiting and PII scrubbing rules.
