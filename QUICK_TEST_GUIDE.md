# API Lens: Quick Testing Guide

This guide provides steps to quickly test all features of the API Lens multi-client stability tracking tool.

## Prerequisites

- Node.js installed
- Python installed with required packages (`pip install -r python/requirements.txt`)
- Docker and Docker Compose (for Prometheus/Grafana)

## 1. Basic CLI Testing

### Test Available Sites
```bash
node cli-tool.js test
```
Expected output: List of available sites (example, healthmug, testsite)

### Test Specific Site
```bash
node cli-tool.js test --site testsite
```
Expected output: 
- Test results for each endpoint
- Summary with success/failure counts
- Log file path

### Check Generated Files
```bash
# Check logs directory structure
dir logs\testsite

# View JSON results
type logs\testsite\<latest-timestamp>.json

# View HTML report
start logs\testsite\<latest-timestamp>.html
```

## 2. Multi-Client Testing

### Test Multiple Sites
```bash
# Run tests for first site
node cli-tool.js test --site testsite

# Run tests for second site
node cli-tool.js test --site healthmug

# Run tests for example site
node cli-tool.js test --site example
```

### Verify Separate Logs
```bash
# Check logs directory structure
dir logs
```
Expected output: Separate directories for each site

## 3. Snapshot Management

### List Snapshots
```bash
node cli-tool.js list
```
Expected output: List of available snapshots

### View Snapshot Summary
```bash
node cli-tool.js summary latest
```
Expected output: Summary of the latest snapshot

### Compare Snapshots
```bash
# First run a test to create a snapshot
node cli-tool.js test --site testsite

# Wait a minute and run another test
node cli-tool.js test --site testsite

# Compare the two latest snapshots
node cli-tool.js compare latest
```
Expected output: Comparison report showing changes between runs

## 4. Metrics Visualization

### Start Metrics Server
```bash
cd python
python multi_site_metrics_server.py
```
Expected output: Server started message with port number

### Start Prometheus and Grafana
```bash
docker-compose up -d
```

### Access Grafana Dashboard
1. Open browser to http://localhost:3000
2. Login with admin/admin
3. Navigate to "Multi-Site API Health Dashboard"
4. Verify metrics from all sites are displayed

## 5. Create Custom Site

### Create Config File
```bash
# Create a new site config
copy configs\example.json configs\mysite.json
```

Edit `configs\mysite.json` to change:
- "site" to "mysite"
- "baseUrl" to "https://jsonplaceholder.typicode.com"
- Add endpoints like "/posts", "/users", "/comments"

### Test Custom Site
```bash
node cli-tool.js test --site mysite
```
Expected output: Test results for your custom site

### Verify in Dashboard
Refresh the Grafana dashboard to see the new site's metrics

## 6. Error Handling Testing

### Test with Invalid Site
```bash
node cli-tool.js test --site nonexistent
```
Expected output: Error message about missing config file

### Test with Unreachable Endpoint
Edit a site config to include an unreachable endpoint, then run tests:
```bash
node cli-tool.js test --site <modified-site>
```
Expected output: Failed test for the unreachable endpoint, but other tests continue

## Troubleshooting

- If metrics don't appear in Grafana, check if the multi_site_metrics_server.py is running
- If HTML reports have encoding issues, ensure they're opened in a browser that supports UTF-8
- If tests fail with network errors, check your internet connection or endpoint URLs