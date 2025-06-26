# ApiLens - Enhanced with Historical Comparison

## Features

### 📸 Snapshot Management
- Automatic snapshot generation after each run
- JSON and CSV export formats
- Timestamped storage in `/snapshots` folder
- Lightweight API metadata capture

### 📊 Historical Comparison
- Compare latest run with previous run
- Compare any two specific runs
- Baseline comparisons
- Automated insights generation

### 🔧 CLI Tools
- Standalone snapshot management
- Manual comparison triggers
- Export format conversion

## Usage

### Enhanced Daemon
```bash
# Default run with snapshots and comparison
node healthmug_daemon_enhanced.js --interval 5

# Skip export
node healthmug_daemon_enhanced.js --interval 5 --skip-export

# Skip comparison
node healthmug_daemon_enhanced.js --interval 5 --skip-comparison

# Export only JSON
node healthmug_daemon_enhanced.js --interval 5 --format json

# Compare against specific baseline
node healthmug_daemon_enhanced.js --interval 5 --baseline 2025-01-15T10-30-00-000Z
```

### CLI Tool
```bash
# List all snapshots
node cli-tool.js list

# Compare latest with previous
node cli-tool.js compare latest

# Compare specific runs
node cli-tool.js compare 2025-01-15T10-30-00-000Z 2025-01-15T09-15-00-000Z

# Show summary
node cli-tool.js summary latest

# Export in different format
node cli-tool.js export 2025-01-15T10-30-00-000Z csv
```

## File Structure
```
api-lens/
├── snapshots/                    # Historical snapshots
│   ├── snapshot_2025-01-15T10-30-00-000Z.json
│   ├── snapshot_2025-01-15T10-30-00-000Z.csv
│   └── ...
├── snapshot-manager.js           # Snapshot generation & storage
├── comparison-engine.js          # Comparison logic & insights
├── healthmug_daemon_enhanced.js  # Enhanced daemon
├── cli-tool.js                   # Standalone CLI
└── README_ENHANCED.md
```

## Snapshot Format

### JSON Structure
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "runId": "2025-01-15T10-30-00-000Z",
  "summary": {
    "totalAPIs": 1000,
    "failures": 5,
    "emptyResponses": 50,
    "avgLatency": 250
  },
  "apis": [
    {
      "id": "GET_api_products",
      "url": "https://healthmug.com/api/products",
      "method": "GET",
      "status": "pass",
      "statusCode": 200,
      "isEmpty": false,
      "latency": 150,
      "size": 2048
    }
  ]
}
```

## Comparison Insights

The system automatically generates insights like:
- 🔺 7 APIs failed today that didn't yesterday
- 📉 Empty responses up 15% since last scan  
- ⚠️ Avg latency increased by 200ms
- 🐌 3 endpoints showing increased latency
- ✅ 2 APIs recovered from previous failures

## Extensibility

### Adding New Formats
Extend `SnapshotManager.exportSnapshot()` method:
```javascript
else if (format === 'xml') {
    // XML export logic
}
```

### Custom Comparison Logic
Extend `ComparisonEngine.compare()` method:
```javascript
const customComparison = this.compareCustomMetric(current, previous);
details.customMetric = customComparison;
```

### New CLI Commands
Add to `cli-tool.js`:
```javascript
.command('trend <metric>', 'Show trend analysis', {}, (argv) => {
    // Trend analysis logic
})
```