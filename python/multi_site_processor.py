#!/usr/bin/env python3

import json
import sys
import os
from datetime import datetime
from prometheus_client import Gauge, start_http_server, write_to_textfile
from typing import Dict, List, Any
from database_manager import DatabaseManager
from alert_manager import AlertManager

class MultiSiteProcessor:
    def __init__(self):
        # Prometheus metrics
        self.calls_total = Gauge('apilens_calls_total', 'Total API calls', ['site', 'endpoint'])
        self.fails_total = Gauge('apilens_fails_total', 'Failed API calls', ['site', 'endpoint'])
        self.health_score = Gauge('apilens_health_score', 'API health score 0-100', ['site', 'endpoint'])
        self.empty_responses = Gauge('apilens_empty_responses', 'Empty API responses', ['site', 'endpoint'])
        self.avg_latency = Gauge('apilens_avg_latency_ms', 'Average latency in ms', ['site', 'endpoint'])
        
        # Database and alerting
        self.db = DatabaseManager()
        self.alert_mgr = AlertManager()
    
    def process_log_file(self, site: str, log_file: str):
        """Process a single log file and update metrics"""
        print(f"Processing {site} log: {log_file}")
        
        with open(log_file, 'r') as f:
            data = json.load(f)
        
        # Group results by endpoint
        endpoint_stats = {}
        for result in data['results']:
            endpoint = result['endpoint']
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    'calls': 0,
                    'failures': 0,
                    'empty': 0,
                    'latencies': [],
                    'success_rate': 0,
                    'health_score': 0
                }
            
            stats = endpoint_stats[endpoint]
            stats['calls'] += 1
            stats['latencies'].append(result['latency'])
            
            if not result['success']:
                stats['failures'] += 1
            
            if result['isEmpty']:
                stats['empty'] += 1
        
        # Calculate health scores and update metrics
        for endpoint, stats in endpoint_stats.items():
            # Calculate health score (0-100)
            success_rate = (stats['calls'] - stats['failures']) / stats['calls']
            empty_rate = stats['empty'] / stats['calls']
            avg_latency = sum(stats['latencies']) / len(stats['latencies'])
            
            # Health score formula
            health_score = 100
            health_score -= (1 - success_rate) * 60  # Failures penalty
            health_score -= empty_rate * 30          # Empty responses penalty
            health_score -= min(avg_latency / 1000 * 10, 10)  # Latency penalty (max 10 points)
            health_score = max(0, int(health_score))
            
            stats['health_score'] = health_score
            stats['success_rate'] = success_rate
            stats['avg_latency'] = avg_latency
            
            # Update Prometheus metrics
            self.calls_total.labels(site=site, endpoint=endpoint).set(stats['calls'])
            self.fails_total.labels(site=site, endpoint=endpoint).set(stats['failures'])
            self.health_score.labels(site=site, endpoint=endpoint).set(health_score)
            self.empty_responses.labels(site=site, endpoint=endpoint).set(stats['empty'])
            self.avg_latency.labels(site=site, endpoint=endpoint).set(stats['avg_latency'])
        
        # Generate HTML report
        self.generate_html_report(site, data, endpoint_stats, log_file)
        
        # Export metrics to file for Prometheus scraping
        metrics_file = log_file.replace('.json', '.prom')
        from prometheus_client import REGISTRY
        write_to_textfile(metrics_file, REGISTRY)
        
        # Save to database
        try:
            self.db.save_test_run(site, data)
            print(f"Saved test run to database for {site}")
        except Exception as e:
            print(f"Failed to save to database: {e}")
        
        # Check for alerts
        try:
            self.alert_mgr.check_health_alerts(site, 70)
        except Exception as e:
            print(f"Failed to check alerts: {e}")
        
        print(f"Processed {len(endpoint_stats)} endpoints for {site}")
        return endpoint_stats
    
    def generate_html_report(self, site: str, data: Dict, stats: Dict, log_file: str):
        """Generate static HTML dashboard"""
        html_file = log_file.replace('.json', '.html')
        
        total_apis = len(data['results'])
        total_failures = sum(s['failures'] for s in stats.values())
        total_empty = sum(s['empty'] for s in stats.values())
        avg_health = sum(s['health_score'] for s in stats.values()) / len(stats) if stats else 0
        
        # Generate endpoint rows
        endpoint_rows = ""
        for endpoint, s in sorted(stats.items(), key=lambda x: x[1]['health_score']):
            status_color = "green" if s['health_score'] >= 80 else "orange" if s['health_score'] >= 60 else "red"
            endpoint_rows += f"""
            <tr>
                <td>{endpoint}</td>
                <td>{s['calls']}</td>
                <td>{s['failures']}</td>
                <td>{s['empty']}</td>
                <td>{s['avg_latency']:.0f}ms</td>
                <td style="color: {status_color}; font-weight: bold">{s['health_score']}</td>
            </tr>"""
        
        # Error samples
        error_samples = ""
        for result in data['results']:
            if not result['success']:
                error_samples += f"""
                <li><strong>{result['endpoint']}</strong>: {result.get('error', 'HTTP ' + str(result['statusCode']))}</li>"""
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>ApiLens Report - {site}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
        .stat {{ text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px; }}
        .stat-value {{ font-size: 2em; font-weight: bold; color: #007bff; }}
        .stat-label {{ color: #666; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #f8f9fa; }}
        .health-chart {{ margin: 20px 0; }}
        .error-list {{ background: #fff3cd; padding: 15px; border-radius: 5px; }}
        .timestamp {{ color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ApiLens Report</h1>
            <h2>{site}</h2>
            <p class="timestamp">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p class="timestamp">Run ID: {data['runId']}</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">{total_apis}</div>
                <div class="stat-label">APIs Tested</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: {'red' if total_failures > 0 else 'green'}">{total_failures}</div>
                <div class="stat-label">Failures</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: {'orange' if total_empty > 0 else 'green'}">{total_empty}</div>
                <div class="stat-label">Empty Responses</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: {'green' if avg_health >= 80 else 'orange' if avg_health >= 60 else 'red'}">{avg_health:.0f}</div>
                <div class="stat-label">Avg Health Score</div>
            </div>
        </div>
        
        <h3>Endpoint Details</h3>
        <table>
            <thead>
                <tr>
                    <th>Endpoint</th>
                    <th>Calls</th>
                    <th>Failures</th>
                    <th>Empty</th>
                    <th>Avg Latency</th>
                    <th>Health Score</th>
                </tr>
            </thead>
            <tbody>
                {endpoint_rows}
            </tbody>
        </table>
        
        {f'''
        <h3>Errors ({total_failures})</h3>
        <div class="error-list">
            <ul>{error_samples}</ul>
        </div>
        ''' if total_failures > 0 else ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; text-align: center;">
            <p>Generated by ApiLens Multi-Site Runner</p>
        </div>
    </div>
</body>
</html>"""
        
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"HTML report generated: {html_file}")

def main():
    if len(sys.argv) != 3:
        print("Usage: python multi_site_processor.py <site> <log_file>")
        sys.exit(1)
    
    site = sys.argv[1]
    log_file = sys.argv[2]
    
    if not os.path.exists(log_file):
        print(f"Log file not found: {log_file}")
        sys.exit(1)
    
    processor = MultiSiteProcessor()
    processor.process_log_file(site, log_file)

if __name__ == "__main__":
    main()