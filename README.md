# ApiLens - Advanced API Monitoring & Analysis

## 🚀 Features

### 🔍 **API Monitoring**
- Automated login and site navigation
- Real-time API call interception
- HTTP failure and empty response detection
- Latency and performance tracking

### 📊 **Endpoint Grouping**
- **Auto-pattern detection**: `/users/123` → `/users/*`
- **OpenAPI integration**: Import endpoint patterns from Swagger specs
- **Custom grouping rules**: Define your own patterns
- **Wildcard clustering**: Group similar URLs automatically

### 📈 **Prometheus & Grafana**
- **Labeled metrics**: `endpoint_group="api/products/*"`
- **Group-based dashboards**: Latency, failures, and trends per group
- **Visual analytics**: Pie charts, time series, summary tables

### 📸 **Historical Analysis**
- Snapshot generation with grouping
- JSON/CSV/HTML reports
- Comparison insights

## 🏁 Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Start monitoring stack:**
```bash
docker-compose up -d
```

3. **Run grouped daemon:**
```bash
node healthmug-daemon-grouped.js --interval 5
```

## 📊 Usage Examples

### Grouped Daemon
```bash
# Basic grouped analysis
node healthmug-daemon-grouped.js --interval 5

# With OpenAPI spec
node healthmug-daemon-grouped.js --openapi example-openapi.json

# Generate reports
node healthmug-daemon-grouped.js --json-report report.json --html-report report.html

# Export patterns
node healthmug-daemon-grouped.js --export-patterns patterns.json
```

### Example CLI Output
```
📊 API LENS - GROUPED ANALYSIS REPORT
============================================================

📈 OVERALL SUMMARY:
   Total APIs: 1247
   Endpoint Groups: 8
   Total Failures: 12
   Empty Responses: 45

🔍 ENDPOINT GROUP ANALYSIS:

✅ /api/products/*
   📦 156 passed, 2 failed (158 total)
   ⏱️  Avg latency: 245ms

❌ /api/cart/*
   📦 89 passed, 8 failed (97 total)
   ⏱️  Avg latency: 1250ms ⚠️
   📭 Empty responses: 12

✅ /api/search*
   📦 234 passed, 0 failed (234 total)
   ⏱️  Avg latency: 180ms
```

## 📊 Prometheus Metrics

### Labeled Metrics
- `apilens_api_latency_seconds{endpoint_group="api/products/*"}`
- `apilens_api_failures_total{endpoint_group="api/cart/*"}`
- `apilens_api_empty_response_total{endpoint_group="api/search/*"}`
- `apilens_api_requests_total{endpoint_group="api/user/*"}`

## 🎯 Access Points

- **Grouped Dashboard**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Metrics Endpoint**: http://localhost:3000/metrics

## 🏗️ File Structure
```
api-lens/
├── endpoint-grouper.js           # Core grouping logic
├── prometheus-exporter.js        # Labeled metrics export
├── report-generator.js           # CLI/JSON/HTML reports
├── healthmug-daemon-grouped.js   # Main grouped daemon
├── grafana/
│   └── provisioning/dashboards/
│       └── grouped-dashboard.json # Endpoint group dashboard
├── example-openapi.json          # Sample OpenAPI spec
└── README.md                     # This file
```

## 🔧 Configuration

### Custom Groups
```javascript
const grouper = new EndpointGrouper({
  customGroups: {
    'api/products/*': '/api/products/',
    'api/cart/*': '/api/cart/',
    'graphql/*': '/graphql'
  }
});
```

### OpenAPI Integration
```bash
# Load patterns from OpenAPI spec
node healthmug-daemon-grouped.js --openapi swagger.json
```

## 🐍 Python Analytics Integration

### Setup
```bash
# Install Python dependencies
cd python
pip install -r requirements.txt
```

### Usage
```bash
# Run comparison analysis
python run_analysis.py analyze

# Start Prometheus metrics server (port 9877)
python run_analysis.py server

# Generate sample data for testing
cd python
python sample_data.py
```

### Python Modules
- **snapshot_loader.py**: Load and group API snapshots
- **comparison_engine.py**: Generate insights between runs
- **prometheus_server.py**: Expose metrics on port 9877
- **analyzer.py**: Main orchestration module

### Example Output
```
🧠 API LENS PYTHON ANALYSIS
============================================================

📈 SUMMARY:
   Current APIs: 7
   Previous APIs: 6
   Current Failures: 2
   Previous Failures: 1

💡 INSIGHTS:
   • 1 APIs failed today that passed yesterday
   • Empty responses up 14.3% since last scan
   • Latency ↑ 33% in /api/search*

📊 GROUP ANALYSIS:
   ❌ /api/products/*: 2 APIs, 1 failures (latency ↑17%)
   ✅ /api/cart/*: 2 APIs, 0 failures
   ✅ /api/search*: 1 APIs, 0 failures (latency ↑33%)
   ✅ /api/user/*: 1 APIs, 0 failures
   ❌ /api/orders/*: 1 APIs, 1 failures
```

## 🚀 Extensibility

- **GraphQL support**: Add custom grouping for GraphQL operations
- **Config files**: Define grouping rules via JSON/YAML
- **Custom metrics**: Extend Prometheus exporter
- **Report formats**: Add XML, PDF, or other formats
- **Python integration**: Analytics and comparison in Python
- **Dual language**: Node.js for testing, Python for analytics