#!/usr/bin/env python3

import os
import glob
import time
from prometheus_client import start_http_server, REGISTRY
from multi_site_processor import MultiSiteProcessor

class MultiSiteMetricsServer:
    def __init__(self, port=9879):
        self.port = port
        self.processor = MultiSiteProcessor()
        self.logs_dir = "../logs"
        self.processed_files = set()
    
    def scan_and_process_logs(self):
        """Scan for new log files and process them"""
        if not os.path.exists(self.logs_dir):
            return
        
        # Find all log files
        pattern = os.path.join(self.logs_dir, "*", "*.json")
        log_files = glob.glob(pattern)
        
        new_files = 0
        for log_file in log_files:
            if log_file not in self.processed_files:
                try:
                    # Extract site from path
                    site = os.path.basename(os.path.dirname(log_file))
                    
                    print(f"🔄 Processing new log: {site} - {os.path.basename(log_file)}")
                    self.processor.process_log_file(site, log_file)
                    self.processed_files.add(log_file)
                    new_files += 1
                    
                except Exception as e:
                    print(f"⚠️ Error processing {log_file}: {e}")
        
        if new_files > 0:
            print(f"✅ Processed {new_files} new log files")
    
    def start_server(self):
        """Start Prometheus metrics server"""
        start_http_server(self.port)
        print(f"📈 Multi-site metrics server started on http://localhost:{self.port}/metrics")
        
        # Initial scan
        self.scan_and_process_logs()
        
        print("🔄 Monitoring for new log files... Press Ctrl+C to stop")
        
        try:
            while True:
                time.sleep(30)  # Check every 30 seconds
                self.scan_and_process_logs()
        except KeyboardInterrupt:
            print("\n🛑 Multi-site metrics server stopped")

if __name__ == "__main__":
    server = MultiSiteMetricsServer()
    server.start_server()