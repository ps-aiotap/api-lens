# Healthmug API Lens

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start Prometheus and Grafana:
```bash
docker-compose up -d
```

3. Start the API monitoring daemon:
```bash
node healthmug_daemon.js --interval 5
```

## Access

- **Grafana Dashboard**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Metrics Endpoint**: http://localhost:3000/metrics

## Usage

```bash
# Default 15min intervals
node healthmug_daemon.js

# Custom interval (5 minutes)
node healthmug_daemon.js --interval 5

# Limited runs for testing
node healthmug_daemon.js --interval 2 --runs 5
```

## Metrics

- `apilens_api_total`: Total API calls scanned
- `apilens_api_failures`: HTTP failures (4xx/5xx)
- `apilens_api_empty_responses`: Empty response payloads
- `apilens_last_run_duration_seconds`: Last scan duration
- `apilens_last_run_timestamp_seconds`: Last scan timestamp