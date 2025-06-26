# Multi-Client API Stability Tracking

## New Features

### CLI with --site Flag
Run tests for specific clients/sites using the enhanced CLI:

```bash
# List available sites
apilens test

# Run tests for a specific site
apilens test --site <site-name>
apilens test -s <site-name>
```

### Per-Site Configuration
Each client/site has its own configuration file in `configs/<site>.json`:

```json
{
  "site": "example",
  "baseUrl": "https://api.example.com",
  "endpoints": [
    {
      "path": "/users",
      "method": "GET",
      "timeout": 3000,
      "retries": 1
    }
  ],
  "settings": {
    "defaultTimeout": 3000,
    "defaultRetries": 1,
    "userAgent": "ApiLens/2.0"
  }
}
```

### Organized Log Structure
Logs are organized by site and date: `/logs/<site>/<date>.json`

Example structure:
```
logs/
├── healthmug/
│   ├── 2025-06-26T13-57-40-325Z.json
│   ├── 2025-06-26T13-57-40-325Z.html
│   └── 2025-06-26T13-57-40-325Z.prom
└── testsite/
    ├── 2025-06-26T13-55-53-482Z.json
    ├── 2025-06-26T13-55-53-482Z.html
    └── 2025-06-26T13-55-53-482Z.prom
```

### Python Data Processing
Each test run automatically triggers Python processing that:
- Calculates health scores (0-100) for each endpoint
- Generates HTML reports with detailed metrics
- Exports Prometheus metrics for monitoring
- Provides stability scoring and reporting

### Available Sites
Current configured sites:
- `example` - Example configuration template
- `healthmug` - HealthMug API endpoints
- `testsite` - Test configuration using httpbin.org

## Usage Examples

```bash
# Run tests for HealthMug
apilens test --site healthmug

# Run tests for test site
apilens test --site testsite

# List all available sites
apilens test
```

Each run generates:
- JSON log with detailed results
- HTML report with visual dashboard
- Prometheus metrics file for monitoring integration