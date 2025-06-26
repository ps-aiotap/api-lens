#!/usr/bin/env python3

from datetime import datetime, timedelta
from api_stability_tracker import ApiStabilityTracker
import json

def generate_mock_data():
    """Generate mock API logs for testing"""
    now = datetime.now()
    logs = []
    
    # Healthy endpoint: /api/featured-products
    # Generate logs for past 14 days with low failure rate
    for day in range(14):
        date = now - timedelta(days=day)
        # 100-120 calls per day, 1-2% failure rate
        daily_calls = 100 + (day % 20)
        failures = max(1, int(daily_calls * 0.01))  # 1% failure rate
        
        for call in range(daily_calls):
            status_code = 500 if call < failures else 200
            response_size = 0 if call < failures else 1500 + (call % 500)
            
            logs.append({
                "endpoint": "/api/featured-products",
                "timestamp": date - timedelta(hours=call % 24),
                "status_code": status_code,
                "response_size": response_size
            })
    
    # Unhealthy endpoint: /api/user-profile
    # Generate logs showing degrading performance
    for day in range(14):
        date = now - timedelta(days=day)
        
        if day < 7:  # Current week - high failure rate
            daily_calls = 80 - (day * 5)  # Decreasing volume
            failure_rate = 0.15 + (day * 0.02)  # Increasing failure rate 15-29%
        else:  # Previous week - was healthy
            daily_calls = 120
            failure_rate = 0.03  # 3% failure rate
        
        failures = int(daily_calls * failure_rate)
        empty_responses = int(daily_calls * 0.05)  # 5% empty responses
        
        for call in range(daily_calls):
            if call < failures:
                status_code = 500
                response_size = 1200
            elif call < failures + empty_responses:
                status_code = 200
                response_size = 0  # Empty response
            else:
                status_code = 200
                response_size = 800 + (call % 400)
            
            logs.append({
                "endpoint": "/api/user-profile",
                "timestamp": date - timedelta(hours=call % 24),
                "status_code": status_code,
                "response_size": response_size
            })
    
    return logs

def test_api_stability():
    """Test the API stability tracker with mock data"""
    print("🧪 Testing API Stability Tracker")
    print("=" * 50)
    
    # Create tracker and add mock data
    tracker = ApiStabilityTracker()
    mock_logs = generate_mock_data()
    tracker.add_logs(mock_logs)
    
    print(f"📊 Loaded {len(mock_logs)} API call logs")
    print(f"📅 Data spans 14 days for stability analysis")
    
    # Compute stability scores
    results = tracker.compute_stability_scores()
    
    print("\n🎯 STABILITY ANALYSIS RESULTS:")
    print("-" * 30)
    
    for endpoint, metrics in results.items():
        status_emoji = "✅" if metrics['score'] >= 80 else "⚠️" if metrics['score'] >= 60 else "❌"
        
        print(f"\n{status_emoji} {endpoint}")
        print(f"   Score: {metrics['score']}/100")
        print(f"   Total Calls (7d): {metrics['total_calls']}")
        print(f"   Failures: {metrics['failures']}")
        print(f"   Empty Responses: {metrics['empty_responses']}")
        print(f"   Volatility: {metrics['volatility']}")
        print(f"   Volume Drop: {metrics['call_volume_drop']}")
        
        # Calculate failure rate for display
        failure_rate = (metrics['failures'] + metrics['empty_responses']) / metrics['total_calls'] * 100 if metrics['total_calls'] > 0 else 0
        print(f"   Failure Rate: {failure_rate:.1f}%")
    
    # Export JSON summary
    json_summary = tracker.export_summary("api_stability_summary.json")
    print(f"\n💾 Summary exported to api_stability_summary.json")
    
    print("\n📋 JSON OUTPUT:")
    print(json_summary)
    
    return results

def analyze_results(results):
    """Analyze and explain the results"""
    print("\n🔍 ANALYSIS EXPLANATION:")
    print("-" * 30)
    
    for endpoint, metrics in results.items():
        print(f"\n📈 {endpoint}:")
        
        if endpoint == "/api/featured-products":
            print("   ✅ HEALTHY: Low failure rate (~1%), stable volume, minimal volatility")
            print("   💡 This endpoint shows consistent performance over time")
        
        elif endpoint == "/api/user-profile":
            print("   ❌ UNHEALTHY: High failure rate (~20%), declining volume, high volatility")
            print("   💡 This endpoint shows degrading performance and needs attention")
            print("   🚨 Recommendations:")
            print("      - Investigate recent changes or deployments")
            print("      - Check server resources and database performance")
            print("      - Consider implementing circuit breakers")

if __name__ == "__main__":
    results = test_api_stability()
    analyze_results(results)