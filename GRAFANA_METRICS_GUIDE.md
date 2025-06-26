# Viewing Multi-Client API Metrics in Grafana

The API Lens product already includes a multi-site dashboard for Grafana that will automatically display metrics from all client sites. Here's how to use it:

## 1. Start the Multi-Site Metrics Server

The multi-site metrics server collects metrics from all client sites and exposes them for Prometheus to scrape:

```bash
# Navigate to the python directory
cd python

# Start the multi-site metrics server
python multi_site_metrics_server.py
```

This will:
- Scan the `/logs/<site>/` directories for all JSON log files
- Process metrics from each site
- Expose them on port 9879 (configured in prometheus.yml)

## 2. Start Prometheus and Grafana

If you're using Docker Compose:

```bash
docker-compose up -d
```

## 3. Access the Multi-Site Dashboard

1. Open Grafana at http://localhost:3000
2. Log in with your credentials (default: admin/admin)
3. Navigate to Dashboards
4. Select "Multi-Site API Health Dashboard"

## Dashboard Features

The multi-site dashboard includes:

- **Health Scores by Site & Endpoint**: Bar gauge showing health scores (0-100) for each endpoint across all sites
- **API Calls by Site**: Pie chart showing distribution of API calls across different sites
- **Multi-Site API Summary**: Table with detailed metrics for all endpoints across all sites
- **Average Latency by Endpoint**: Time series graph showing latency trends
- **Failures by Site**: Pie chart showing distribution of failures across sites

## Filtering by Site

You can filter the dashboard to focus on specific sites:
1. Click the "Add variable" button (gear icon) in the dashboard
2. Add a new variable with:
   - Name: site
   - Type: Query
   - Query: label_values(apilens_health_score, site)
3. Apply the variable to dashboard panels

## Automatic Updates

The dashboard will automatically update as new test runs are completed. The metrics server scans for new log files every 30 seconds.

## Manual Testing

To generate new metrics for a specific site:

```bash
# Run tests for a specific site
apilens test --site <site-name>
```

This will:
1. Run the tests for the specified site
2. Save results to `/logs/<site>/<timestamp>.json`
3. Process metrics and make them available for Grafana