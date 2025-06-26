from prometheus_client import Gauge, start_http_server
from api_stability_tracker import ApiStabilityTracker
import time

class StabilityPrometheusExporter:
    def __init__(self, port=9878):
        self.port = port
        self.tracker = ApiStabilityTracker()
        
        # Define Prometheus metrics
        self.stability_score = Gauge('apilens_stability_score', 'API endpoint stability score (0-100)', ['endpoint'])
        self.total_calls = Gauge('apilens_stability_calls_total', 'Total API calls in 7d window', ['endpoint'])
        self.failures = Gauge('apilens_stability_failures_total', 'Failed API calls in 7d window', ['endpoint'])
        self.empty_responses = Gauge('apilens_stability_empty_total', 'Empty responses in 7d window', ['endpoint'])
        self.volatility = Gauge('apilens_stability_volatility', 'Failure rate volatility', ['endpoint'])
        self.volume_drop = Gauge('apilens_stability_volume_drop', 'Volume drop indicator (0/1)', ['endpoint'])
    
    def update_metrics(self, logs):
        """Update Prometheus metrics from API logs"""
        self.tracker.logs = []  # Reset logs
        self.tracker.add_logs(logs)
        
        results = self.tracker.compute_stability_scores()
        
        for endpoint, metrics in results.items():
            # Clean endpoint name for Prometheus label
            clean_endpoint = endpoint.replace('/', '_').replace('-', '_').lstrip('_')
            
            self.stability_score.labels(endpoint=clean_endpoint).set(metrics['score'])
            self.total_calls.labels(endpoint=clean_endpoint).set(metrics['total_calls'])
            self.failures.labels(endpoint=clean_endpoint).set(metrics['failures'])
            self.empty_responses.labels(endpoint=clean_endpoint).set(metrics['empty_responses'])
            self.volatility.labels(endpoint=clean_endpoint).set(metrics['volatility'])
            self.volume_drop.labels(endpoint=clean_endpoint).set(1 if metrics['call_volume_drop'] else 0)
        
        print(f"📊 Updated stability metrics for {len(results)} endpoints")
    
    def start_server(self):
        """Start Prometheus metrics server"""
        start_http_server(self.port)
        print(f"📈 Stability metrics server started on http://localhost:{self.port}/metrics")
    
    def run_with_snapshots(self):
        """Load snapshots and expose metrics"""
        from stability_monitor import StabilityMonitor
        
        monitor = StabilityMonitor()
        log_count = monitor.load_from_snapshots()
        
        if log_count > 0:
            self.update_metrics(monitor.tracker.logs)
        else:
            print("⚠️ No snapshots found, using test data")
            from test_api_stability import generate_mock_data
            mock_logs = generate_mock_data()
            self.update_metrics(mock_logs)
        
        self.start_server()
        
        try:
            while True:
                time.sleep(60)  # Update every minute
        except KeyboardInterrupt:
            print("\n🛑 Stability metrics server stopped")

if __name__ == "__main__":
    exporter = StabilityPrometheusExporter()
    exporter.run_with_snapshots()