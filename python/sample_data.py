#!/usr/bin/env python3
"""
Generate sample snapshot data for testing
"""

import json
import os
from datetime import datetime, timedelta

def generate_sample_snapshots():
    """Generate two sample snapshots for testing"""
    
    # Ensure snapshots directory exists
    os.makedirs("../snapshots", exist_ok=True)
    
    # Sample API data for first run
    snapshot1 = [
        {"api": "/api/products/123", "status": "pass", "latency_ms": 240, "empty_response": False, "response_size": 1345, "timestamp": "2024-06-25T14:30:00Z"},
        {"api": "/api/products/456", "status": "pass", "latency_ms": 180, "empty_response": False, "response_size": 2100, "timestamp": "2024-06-25T14:30:01Z"},
        {"api": "/api/cart/add", "status": "fail", "latency_ms": 1200, "empty_response": True, "response_size": 0, "timestamp": "2024-06-25T14:30:02Z"},
        {"api": "/api/cart/remove", "status": "pass", "latency_ms": 300, "empty_response": False, "response_size": 150, "timestamp": "2024-06-25T14:30:03Z"},
        {"api": "/api/search?q=medicine", "status": "pass", "latency_ms": 450, "empty_response": False, "response_size": 5600, "timestamp": "2024-06-25T14:30:04Z"},
        {"api": "/api/user/profile", "status": "pass", "latency_ms": 120, "empty_response": False, "response_size": 800, "timestamp": "2024-06-25T14:30:05Z"}
    ]
    
    # Sample API data for second run (with some changes)
    snapshot2 = [
        {"api": "/api/products/123", "status": "fail", "latency_ms": 280, "empty_response": False, "response_size": 1345, "timestamp": "2024-06-25T15:30:00Z"},
        {"api": "/api/products/789", "status": "pass", "latency_ms": 200, "empty_response": False, "response_size": 1800, "timestamp": "2024-06-25T15:30:01Z"},
        {"api": "/api/cart/add", "status": "pass", "latency_ms": 400, "empty_response": False, "response_size": 200, "timestamp": "2024-06-25T15:30:02Z"},
        {"api": "/api/cart/remove", "status": "pass", "latency_ms": 350, "empty_response": False, "response_size": 150, "timestamp": "2024-06-25T15:30:03Z"},
        {"api": "/api/search?q=health", "status": "pass", "latency_ms": 600, "empty_response": True, "response_size": 0, "timestamp": "2024-06-25T15:30:04Z"},
        {"api": "/api/user/profile", "status": "pass", "latency_ms": 140, "empty_response": False, "response_size": 850, "timestamp": "2024-06-25T15:30:05Z"},
        {"api": "/api/orders/list", "status": "fail", "latency_ms": 800, "empty_response": False, "response_size": 300, "timestamp": "2024-06-25T15:30:06Z"}
    ]
    
    # Generate timestamps
    time1 = datetime.now() - timedelta(hours=1)
    time2 = datetime.now()
    
    timestamp1 = time1.strftime("%Y-%m-%dT%H-%M-%S-000Z")
    timestamp2 = time2.strftime("%Y-%m-%dT%H-%M-%S-000Z")
    
    # Save snapshots
    with open(f"../snapshots/{timestamp1}.json", 'w') as f:
        json.dump(snapshot1, f, indent=2)
    
    with open(f"../snapshots/{timestamp2}.json", 'w') as f:
        json.dump(snapshot2, f, indent=2)
    
    print(f"📸 Generated sample snapshots:")
    print(f"   {timestamp1}.json")
    print(f"   {timestamp2}.json")
    print(f"🧪 Ready for testing!")

if __name__ == "__main__":
    generate_sample_snapshots()