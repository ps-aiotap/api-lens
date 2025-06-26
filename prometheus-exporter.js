import express from 'express';

export class PrometheusExporter {
    constructor() {
        this.metrics = new Map();
        this.app = express();
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.get('/metrics', (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(this.generateMetrics());
        });
    }

    updateMetrics(apiData, groupStats) {
        // Clear existing metrics
        this.metrics.clear();
        
        // Global metrics
        this.setMetric('apilens_api_total', apiData.length);
        this.setMetric('apilens_api_failures', apiData.filter(api => api.status >= 400).length);
        this.setMetric('apilens_api_empty_responses', apiData.filter(api => api.isEmpty).length);
        this.setMetric('apilens_last_run_timestamp_seconds', Math.floor(Date.now() / 1000));
        
        // Group-based metrics
        groupStats.forEach(group => {
            const labels = { endpoint_group: this.sanitizeLabel(group.group) };
            
            this.setMetricWithLabels('apilens_api_latency_seconds', group.avgLatency / 1000, labels);
            this.setMetricWithLabels('apilens_api_failures_total', group.failed, labels);
            this.setMetricWithLabels('apilens_api_empty_response_total', group.empty, labels);
            this.setMetricWithLabels('apilens_api_requests_total', group.total, labels);
        });
    }

    setMetric(name, value) {
        this.metrics.set(name, { value, labels: {} });
    }

    setMetricWithLabels(name, value, labels) {
        const key = `${name}_${JSON.stringify(labels)}`;
        this.metrics.set(key, { name, value, labels });
    }

    sanitizeLabel(label) {
        return label.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    generateMetrics() {
        const lines = [];
        
        // Group metrics by name
        const metricGroups = new Map();
        
        this.metrics.forEach((metric, key) => {
            const name = metric.name || key;
            if (!metricGroups.has(name)) {
                metricGroups.set(name, []);
            }
            metricGroups.get(name).push(metric);
        });
        
        // Generate Prometheus format
        metricGroups.forEach((metrics, name) => {
            metrics.forEach(metric => {
                if (Object.keys(metric.labels).length > 0) {
                    const labelStr = Object.entries(metric.labels)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(',');
                    lines.push(`${name}{${labelStr}} ${metric.value}`);
                } else {
                    lines.push(`${name} ${metric.value}`);
                }
            });
        });
        
        return lines.join('\n');
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`📊 Prometheus metrics server running on http://localhost:${port}/metrics`);
        });
    }
}