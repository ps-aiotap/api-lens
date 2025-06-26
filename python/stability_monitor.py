#!/usr/bin/env python3
"""
API Stability Monitor - Real-time monitoring integration
"""

from api_stability_tracker import ApiStabilityTracker
from datetime import datetime
import json
import sys

class StabilityMonitor:
    def __init__(self):
        self.tracker = ApiStabilityTracker()
    
    def load_from_snapshots(self, snapshot_dir: str = "../snapshots"):
        """Load API logs from existing snapshots"""
        import os
        import glob
        
        snapshot_files = glob.glob(os.path.join(snapshot_dir, "*.json"))
        logs = []
        
        for file_path in snapshot_files:
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                # Handle the actual snapshot structure from your Node.js files
                if isinstance(data, dict) and 'apis' in data:
                    # Extract timestamp from filename or data
                    snapshot_timestamp = data.get('timestamp', datetime.now().isoformat())
                    
                    for api_call in data['apis']:
                        logs.append({
                            "endpoint": api_call.get('url', 'unknown'),
                            "timestamp": snapshot_timestamp,
                            "status_code": api_call.get('statusCode', 200),
                            "response_size": api_call.get('size', 0)
                        })
                
            except Exception as e:
                print(f"⚠️ Error loading {file_path}: {e}")
        
        if logs:
            self.tracker.add_logs(logs)
            print(f"📊 Loaded {len(logs)} API calls from {len(snapshot_files)} snapshots")
        else:
            print("⚠️ No valid API logs found in snapshots")
        
        return len(logs)
    
    def generate_report(self):
        """Generate and display stability report"""
        results = self.tracker.compute_stability_scores()
        
        if not results:
            print("❌ No data available for analysis")
            return
        
        print("\n🎯 API STABILITY REPORT")
        print("=" * 50)
        print(f"📅 Analysis Period: Last 7 days")
        print(f"🔍 Endpoints Analyzed: {len(results)}")
        
        # Sort by score (worst first)
        sorted_results = sorted(results.items(), key=lambda x: x[1]['score'])
        
        print("\n📊 ENDPOINT RANKINGS:")
        print("-" * 30)
        
        for i, (endpoint, metrics) in enumerate(sorted_results, 1):
            score = metrics['score']
            
            if score >= 90:
                status = "🟢 EXCELLENT"
            elif score >= 80:
                status = "🟡 GOOD"
            elif score >= 60:
                status = "🟠 WARNING"
            else:
                status = "🔴 CRITICAL"
            
            print(f"{i:2d}. {endpoint}")
            print(f"    {status} (Score: {score}/100)")
            print(f"    Calls: {metrics['total_calls']}, Failures: {metrics['failures']}, Empty: {metrics['empty_responses']}")
            
            if metrics['call_volume_drop']:
                print(f"    ⚠️ Volume dropped significantly")
            
            if metrics['volatility'] > 0.1:
                print(f"    📈 High volatility: {metrics['volatility']}")
        
        # Export summary
        summary_file = f"stability_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        self.tracker.export_summary(summary_file)
        print(f"\n💾 Detailed report saved to {summary_file}")
        
        return results

def main():
    monitor = StabilityMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Run with test data
        print("🧪 Running with test data...")
        from test_api_stability import generate_mock_data
        mock_logs = generate_mock_data()
        monitor.tracker.add_logs(mock_logs)
    else:
        # Load from real snapshots
        print("📂 Loading from snapshots...")
        log_count = monitor.load_from_snapshots()
        if log_count == 0:
            print("💡 No snapshots found. Run with 'test' argument to use mock data:")
            print("   python stability_monitor.py test")
            return
    
    monitor.generate_report()

if __name__ == "__main__":
    main()