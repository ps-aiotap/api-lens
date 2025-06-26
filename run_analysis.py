#!/usr/bin/env python3
"""
ApiLens Python Analytics Runner
Run from the root of the ApiLens repository
"""

import sys
import os

# Add python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))

from python.analyzer import ApiLensAnalyzer

def main():
    print("🐍 ApiLens Python Analytics")
    print("=" * 40)
    
    analyzer = ApiLensAnalyzer()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "analyze":
            print("📊 Running comparison analysis...")
            output_file = sys.argv[2] if len(sys.argv) > 2 else "analysis_summary.json"
            analyzer.analyze_latest_runs(output_file)
            
        elif command == "server":
            print("🚀 Starting Prometheus metrics server...")
            analyzer.start_prometheus_server()
            
        else:
            print("Usage:")
            print("  python run_analysis.py analyze [output_file]")
            print("  python run_analysis.py server")
    else:
        # Default: run analysis
        print("📊 Running default analysis...")
        analyzer.analyze_latest_runs()

if __name__ == "__main__":
    main()