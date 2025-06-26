from prometheus_client import start_http_server, Gauge, Counter
from typing import Dict, List, Any
import time

class PrometheusServer:
    def __init__(self, port: int = 9877):
        self.port = port
        
        # Define metrics
        self.api_failures = Gauge('apilens_api_failures_total', 'API failures by group', ['endpoint_group'])
        self.api_latency = Gauge('apilens_api_latency_seconds', 'API latency by group', ['endpoint_group'])
        self.api_empty_responses = Gauge('apilens_api_empty_responses_total', 'Empty responses by group', ['endpoint_group'])
        self.api_requests = Gauge('apilens_api_requests_total', 'Total requests by group', ['endpoint_group'])
        
        # Global metrics
        self.total_apis = Gauge('apilens_total_apis', 'Total API calls')
        self.total_failures = Gauge('apilens_total_failures', 'Total failures')
        self.last_update = Gauge('apilens_last_update_timestamp', 'Last update timestamp')
    
    def update_metrics(self, grouped_apis: Dict[str, List[Dict[str, Any]]]):
        """Update Prometheus metrics from grouped API data"""
        total_count = 0
        total_failures = 0
        
        for group, apis in grouped_apis.items():
            # Count metrics for this group
            group_failures = sum(1 for api in apis if api.get('status') == 'fail')
            group_empty = sum(1 for api in apis if api.get('empty_response', False) or api.get('isEmpty', False))
            group_latencies = [api.get('latency_ms', api.get('latency', 0)) for api in apis]
            avg_latency = sum(group_latencies) / len(group_latencies) if group_latencies else 0
            
            # Update group metrics
            self.api_failures.labels(endpoint_group=group).set(group_failures)
            self.api_empty_responses.labels(endpoint_group=group).set(group_empty)
            self.api_latency.labels(endpoint_group=group).set(avg_latency / 1000)  # Convert to seconds
            self.api_requests.labels(endpoint_group=group).set(len(apis))
            
            # Accumulate totals
            total_count += len(apis)
            total_failures += group_failures
        
        # Update global metrics
        self.total_apis.set(total_count)
        self.total_failures.set(total_failures)
        self.last_update.set(time.time())
        
        print(f"📊 Updated metrics for {len(grouped_apis)} endpoint groups")
    
    def start_server(self):
        """Start the Prometheus metrics server"""
        start_http_server(self.port)
        print(f"📈 Prometheus server started on http://localhost:{self.port}/metrics")
    
    def run_forever(self):
        """Keep the server running"""
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Prometheus server stopped")