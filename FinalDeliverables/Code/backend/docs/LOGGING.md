# Backend Logging & Error Tracking

This guide covers how to monitor logs, debug errors, and track issues in the TradeUp backend.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `docker logs tradeup-backend` | View all logs |
| `docker logs -f tradeup-backend` | Stream logs live |
| `docker logs --tail 50 tradeup-backend` | Last 50 lines |
| `docker compose logs -f` | All services live |

---

## Docker Compose Logs

### View All Backend Logs
```bash
docker logs tradeup-backend
```

### Stream Logs in Real-Time
```bash
docker logs -f tradeup-backend
```
Press `Ctrl+C` to stop streaming.

### View Last N Lines
```bash
docker logs --tail 100 tradeup-backend
```

### View Logs with Timestamps
```bash
docker logs -t tradeup-backend
```

### View Both Services (Database + Backend)
```bash
cd Prototype/backend
docker compose logs -f
```

### View Only Database Logs
```bash
docker logs tradeup-db
```

---

## Filtering Logs

### Find Errors Only
```bash
docker logs tradeup-backend 2>&1 | grep -i error
```

### Find Warnings
```bash
docker logs tradeup-backend 2>&1 | grep -i warn
```

### Find Specific Text
```bash
docker logs tradeup-backend 2>&1 | grep "Failed to fetch"
```

### Find Logs from a Specific Time
```bash
docker logs --since 1h tradeup-backend    # Last hour
docker logs --since 30m tradeup-backend   # Last 30 minutes
docker logs --since 2024-01-09 tradeup-backend  # Since date
```

---

## Common Error Patterns

### External API Failures
```
Failed to fetch tick for HBL: connect ETIMEDOUT
Failed to fetch tick for HBL: Request failed with status code 503
```
**Cause:** PSX API (`psxterminal.com`) is down or unreachable.
**Impact:** Stock data will be `null`, app continues working.

### Database Connection Issues
```
Error: P1001: Can't reach database server
```
**Cause:** PostgreSQL container isn't running or DATABASE_URL is wrong.
**Fix:** Check `docker ps` and verify `tradeup-db` is healthy.

### JWT Authentication Errors
```
JsonWebTokenError: invalid signature
JsonWebTokenError: jwt expired
```
**Cause:** Token signed with different secret or expired.
**Fix:** User needs to log in again.

### Prisma Errors
```
PrismaClientKnownRequestError: Foreign key constraint failed
```
**Cause:** Trying to reference a record that doesn't exist.
**Fix:** Check the data relationships.

---

## Debugging Protocol

### Step 1: Check Container Status
```bash
docker ps
```
Verify both `tradeup-backend` and `tradeup-db` are running and healthy.

### Step 2: Check Recent Logs
```bash
docker logs --tail 50 tradeup-backend
```

### Step 3: Look for Errors
```bash
docker logs tradeup-backend 2>&1 | grep -i error | tail -20
```

### Step 4: Test API Endpoint
```bash
curl -s http://localhost:3001/
# Should return: Hello World!

curl -s http://localhost:3001/stocks/featured
# Should return JSON array of stock data
```

### Step 5: Check Database Connection
```bash
docker exec -it tradeup-db psql -U tradeup -d tradeup -c "SELECT 1"
```

---

## Restart Protocol

### Soft Restart (keeps data)
```bash
cd Prototype/backend
docker compose restart
```

### Hard Restart (rebuilds image)
```bash
cd Prototype/backend
docker compose down
docker compose up --build -d
```

### Nuclear Option (removes volumes/data)
```bash
cd Prototype/backend
docker compose down -v
docker compose up --build -d
```
⚠️ **Warning:** This deletes all database data!

---

## Log Levels in NestJS

The backend uses NestJS logging with these levels:

| Level | Usage |
|-------|-------|
| `LOG` | General info (startup, routes) |
| `ERROR` | Exceptions and failures |
| `WARN` | Non-critical issues |
| `DEBUG` | Detailed debugging (if enabled) |

To see more verbose logs, you can modify the NestJS bootstrap in `main.ts`.

---

## Health Checks

### Backend Health
```bash
curl http://localhost:3001/
```

### Database Health
```bash
docker exec tradeup-db pg_isready -U tradeup -d tradeup
```

### Full System Check
```bash
# Check containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check backend responds
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/

# Check database
docker exec tradeup-db pg_isready -U tradeup -d tradeup && echo "DB OK"
```

---

## Exporting Logs

### Save to File
```bash
docker logs tradeup-backend > backend.log 2>&1
```

### Save with Timestamp
```bash
docker logs -t tradeup-backend > backend_$(date +%Y%m%d_%H%M%S).log 2>&1
```

---

## Related Documentation

- [Docker Compose Config](../docker-compose.yml)
- [Dockerfile](../Dockerfile)
- [Backend README](../README.md)
