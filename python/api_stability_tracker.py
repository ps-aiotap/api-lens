from datetime import datetime, timedelta
from typing import List, Dict, Any
import json

class ApiStabilityTracker:
    def __init__(self):
        self.logs = []
    
    def add_logs(self, logs: List[Dict[str, Any]]):
        """Accept streaming or batched API call logs"""
        for log in logs:
            # Ensure timestamp is datetime object with timezone
            if isinstance(log['timestamp'], str):
                timestamp_str = log['timestamp'].replace('Z', '+00:00')
                log['timestamp'] = datetime.fromisoformat(timestamp_str)
            elif isinstance(log['timestamp'], datetime) and log['timestamp'].tzinfo is None:
                # Make timezone-aware if it's naive
                from datetime import timezone
                log['timestamp'] = log['timestamp'].replace(tzinfo=timezone.utc)
            self.logs.append(log)
    
    def compute_stability_scores(self) -> Dict[str, Dict[str, Any]]:
        """Compute stability scores for all endpoints"""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        current_window_start = now - timedelta(days=7)
        previous_window_start = now - timedelta(days=14)
        
        # Group logs by endpoint
        endpoint_logs = {}
        for log in self.logs:
            endpoint = log['endpoint']
            if endpoint not in endpoint_logs:
                endpoint_logs[endpoint] = []
            endpoint_logs[endpoint].append(log)
        
        results = {}
        for endpoint, logs in endpoint_logs.items():
            results[endpoint] = self._analyze_endpoint(logs, current_window_start, previous_window_start)
        
        return results
    
    def _analyze_endpoint(self, logs: List[Dict], current_start: datetime, previous_start: datetime) -> Dict[str, Any]:
        """Analyze a single endpoint's stability"""
        # Filter logs for current and previous windows
        current_logs = [log for log in logs if log['timestamp'] >= current_start]
        previous_logs = [log for log in logs if previous_start <= log['timestamp'] < current_start]
        
        # Current window metrics
        total_calls = len(current_logs)
        failures = sum(1 for log in current_logs if log['status_code'] >= 500)
        empty_responses = sum(1 for log in current_logs if log['response_size'] == 0)
        
        # Previous window metrics for comparison
        prev_total = len(previous_logs)
        prev_failures = sum(1 for log in previous_logs if log['status_code'] >= 500)
        prev_empty = sum(1 for log in previous_logs if log['response_size'] == 0)
        
        # Calculate rates
        current_failure_rate = (failures + empty_responses) / total_calls if total_calls > 0 else 0
        prev_failure_rate = (prev_failures + prev_empty) / prev_total if prev_total > 0 else 0
        
        # Calculate volatility (rate of change in failure rate)
        volatility = abs(current_failure_rate - prev_failure_rate) if prev_failure_rate > 0 else current_failure_rate
        
        # Check for call volume drop
        call_volume_drop = prev_total > 0 and total_calls < (prev_total * 0.5)  # 50% drop threshold
        
        # Calculate score
        score = self._calculate_score(current_failure_rate, volatility, call_volume_drop)
        
        return {
            "score": score,
            "total_calls": total_calls,
            "failures": failures,
            "empty_responses": empty_responses,
            "volatility": round(volatility, 3),
            "call_volume_drop": call_volume_drop
        }
    
    def _calculate_score(self, failure_rate: float, volatility: float, volume_drop: bool) -> int:
        """Calculate stability score (0-100)"""
        score = 100
        
        # Subtract up to 40 points for failure/empty rate (linear scale)
        failure_penalty = min(40, failure_rate * 100)  # 1% failure = 1 point penalty
        score -= failure_penalty
        
        # Subtract up to 30 points for volatility (sudden spikes)
        volatility_penalty = min(30, volatility * 100)  # 1% volatility = 1 point penalty
        score -= volatility_penalty
        
        # Subtract up to 30 points if call volume dropped drastically
        if volume_drop:
            score -= 30
        
        return max(0, int(score))
    
    def export_summary(self, filepath: str = None) -> str:
        """Export stability summary as JSON"""
        summary = self.compute_stability_scores()
        json_output = json.dumps(summary, indent=2)
        
        if filepath:
            with open(filepath, 'w') as f:
                f.write(json_output)
        
        return json_output