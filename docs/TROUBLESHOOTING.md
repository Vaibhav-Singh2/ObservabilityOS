# Troubleshooting Guide — ObservabilityOS

This guide lists common problems developers face when running, deploying, or integrating ObservabilityOS, along with steps to resolve them.

---

## 💻 1. Next.js Hydration Mismatch Errors

### Symptom:

A console error appears on landing or dashboard pages:

```text
Uncaught Error: Hydration failed because the server rendered text didn't match the client.
```

### Cause:

Usually occurs when formatting dates or numeric metrics using `toLocaleString()` without specifying a locale. The Node server renders in one format (e.g. `1,450,280` using US grouping), but your local browser formats it differently based on your operating system locale (e.g. `14,50,280` using Indian numbering).

### Fix:

Always specify the formatting locale explicitly to keep server and client strings identical during hydration:

```typescript
// Avoid:
value.toLocaleString();

// Use:
value.toLocaleString("en-US");
```

---

## 🗄️ 2. MongoDB & Ingestion API Timeouts

### Symptom:

The API returns a `504 Gateway Timeout` or the terminal displays Mongoose connection errors:

```text
MongooseServerSelectionError: connection timed out
```

### Cause:

1. Local MongoDB container is stopped.
2. In production, your MongoDB Atlas cluster network settings block Vercel's serverless IP addresses.

### Fix:

- **Local**: Restart your Docker containers:
  ```bash
  docker-compose down
  docker-compose up -d
  ```
- **Production**: Navigate to MongoDB Atlas $\rightarrow$ **Security** $\rightarrow$ **Network Access**. Ensure the IP whitelist is configured correctly. For serverless hosting environments like Vercel, you may need to whitelist `0.0.0.0/0` (Access from Anywhere) or provision VPC peering.

---

## ⚡ 3. Redis Connection Refused

### Symptom:

API logs show:

```text
Redis connection to localhost:6379 failed - Connection refused
```

### Cause:

The Redis cache server is not running or is listening on a different port.

### Fix:

- Verify that Redis is running locally:
  ```bash
  docker ps | grep redis
  ```
- Ensure `REDIS_URL` in `apps/web/.env` points to the correct host and port:
  `REDIS_URL=redis://localhost:6379`

---

## 📦 4. SDK Buffer Memory Leak Warnings

### Symptom:

Client applications using our Winston/TypeScript logger SDK log memory warnings:

```text
[ObservabilityOS SDK] Memory queue size limit exceeded. Dropping logs.
```

### Cause:

The Winston SDK holds logs in an in-memory buffer before flushing them in batches. If your Ingestion API is down or unreachable for an extended period, logs compile in memory.

### Fix:

1. Ensure the ObservabilityOS ingestion server is online.
2. Adjust the logger's `batchSize` and `flushIntervalMs` settings to release memory buffers faster:
   ```typescript
   const logger = new Logger({
     apiKey: "key",
     batchSize: 5, // Flush smaller batches
     flushIntervalMs: 1000, // Flush every second
   });
   ```

---

## 🐋 5. Docker Port Conflicts (27017 or 6379 Already in Use)

### Symptom:

Running `docker-compose up -d` prints errors about port bind failures:

```text
Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:27017 -> 0.0.0.0:0: listen tcp 0.0.0.0:27017: bind: address already in use
```

### Cause:

You have a native installation of MongoDB or Redis running directly on your host machine as a background service, blocking the Docker daemon from mapping the container ports.

### Fix:

1. **Identify and stop the host service**:
   - **Windows**: Open Services (`services.msc`), search for "MongoDB Server" or "Redis", click Stop, and disable automatic startup. Alternatively, run in admin PowerShell:
     ```powershell
     Stop-Service -Name "MongoDB" -ErrorAction SilentlyContinue
     ```
   - **macOS**: Stop brew service:
     ```bash
     brew services stop mongodb-community
     brew services stop redis
     ```
2. **Re-run the containers**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```
3. **Change mapping port (alternative)**:
   If you must run the host service, modify your local `docker-compose.yml` to map to alternative ports (e.g. `27018:27017` and `6380:6379`) and adjust `MONGODB_URI` / `REDIS_URL` in `apps/web/.env` accordingly.

---

## 🔗 Related Documents

- ⏱️ **[QUICKSTART.md](QUICKSTART.md)**: Boot local instances.
- 🛠️ **[DEVELOPMENT.md](DEVELOPMENT.md)**: Sandbox billing bypasses and testing tools.
- 🗄️ **[DATABASE.md](DATABASE.md)**: Database schemas and collection indexes.
