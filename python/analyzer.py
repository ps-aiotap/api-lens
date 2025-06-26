#!/usr/bin/env python3

import json
import sys
import os
from datetime import datetime
from snapshot_loader import SnapshotLoader
from comparison_engine import ComparisonEngine
from prometheus_server import PrometheusServer

class ApiLensAnalyzer:
    def __init__(self):
        self.loader = SnapshotLoader()
        self.comparator = ComparisonEngine()
        self.prometheus = PrometheusServer()
    
    def analyze_latest_runs(self, output_file: str = None):
        """Analyze the two most recent runs"""
        timestamps = self.loader.get_latest_snapshots(2)
        
        if len(timestamps) < 2:
            print("❌ Need at least 2 snapshots for comparison")
            return None
        
        print(f"📊 Comparing runs: {timestamps[0]} vs {timestamps[1]}")
        
        # Load snapshots
        current_apis = self.loader.load_snapshot(timestamps[0])
        previous_apis = self.loader.load_snapshot(timestamps[1])
        
        # Group by patterns
        current_groups = self.loader.group_apis_by_pattern(current_apis)
        previous_groups = self.loader.group_apis_by_pattern(previous_apis)
        
        # Compare and generate insights
        comparison = self.comparator.compare_runs(current_groups, previous_groups)
        
        # Print insights
        self._print_insights(comparison)
        
        # Save to file if requested
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(comparison, f, indent=2)
            print(f"💾 Analysis saved to {output_file}")
        
        # Update Prometheus metrics
        self.prometheus.update_metrics(current_groups)
        
        return comparison
    
    def _print_insights(self, comparison: dict):
        """Print comparison insights to console"""
        print("\n" + "="*60)
        print("🧠 API LENS PYTHON ANALYSIS")
        print("="*60)
        
        summary = comparison['summary']
        print(f"\n📈 SUMMARY:")
        print(f"   Current APIs: {summary['current_total']}")
        print(f"   Previous APIs: {summary['previous_total']}")
        print(f"   Current Failures: {summary['current_failures']}")
        print(f"   Previous Failures: {summary['previous_failures']}")
        
        if comparison['insights']:
            print(f"\n💡 INSIGHTS:")
            for insight in comparison['insights']:
                print(f"   • {insight}")
        else:
            print(f"\n✅ No significant changes detected")
        
        print(f"\n📊 GROUP ANALYSIS:")
        for group, analysis in comparison['group_analysis'].items():
            status = "❌" if analysis['current_failures'] > 0 else "✅"
            latency_change = ""
            if analysis['avg_latency_previous'] > 0:
                change_pct = ((analysis['avg_latency_current'] - analysis['avg_latency_previous']) / analysis['avg_latency_previous']) * 100
                if abs(change_pct) > 10:
                    latency_change = f" (latency {'↑' if change_pct > 0 else '↓'}{abs(change_pct):.0f}%)"
            
            print(f"   {status} {group}: {analysis['current_count']} APIs, {analysis['current_failures']} failures{latency_change}")
        
        print("="*60)
    
    def start_prometheus_server(self):
        """Start Prometheus server and keep it running"""
        self.prometheus.start_server()
        
        # Do initial analysis to populate metrics
        try:
            self.analyze_latest_runs()
        except Exception as e:
            print(f"⚠️ Initial analysis failed: {e}")
            print("📊 Server will still run with empty metrics")
        
        print("🔄 Server running... Press Ctrl+C to stop")
        try:
            self.prometheus.run_forever()
        except Exception as e:
            print(f"❌ Server error: {e}")

def main():
    analyzer = ApiLensAnalyzer()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "server":
            analyzer.start_prometheus_server()
        elif sys.argv[1] == "analyze":
            output_file = sys.argv[2] if len(sys.argv) > 2 else "analysis_summary.json"
            analyzer.analyze_latest_runs(output_file)
        else:
            print("Usage: python analyzer.py [analyze|server] [output_file]")
    else:
        # Default: analyze and print
        analyzer.analyze_latest_runs()

if __name__ == "__main__":
    main()