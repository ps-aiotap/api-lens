import json
import os
import re
from typing import List, Dict, Any
from datetime import datetime

class SnapshotLoader:
    def __init__(self, snapshots_dir: str = "snapshots"):
        self.snapshots_dir = snapshots_dir
    
    def load_snapshot(self, timestamp: str) -> List[Dict[str, Any]]:
        """Load a single snapshot by timestamp"""
        filepath = os.path.join(self.snapshots_dir, f"{timestamp}.json")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Snapshot not found: {filepath}")
        
        with open(filepath, 'r') as f:
            return json.load(f)
    
    def get_latest_snapshots(self, count: int = 2) -> List[str]:
        """Get the latest N snapshot timestamps"""
        if not os.path.exists(self.snapshots_dir):
            return []
        
        files = [f.replace('.json', '') for f in os.listdir(self.snapshots_dir) 
                if f.endswith('.json')]
        return sorted(files, reverse=True)[:count]
    
    def group_apis_by_pattern(self, data: Any) -> Dict[str, List[Dict[str, Any]]]:
        """Group APIs by endpoint pattern"""
        groups = {}
        
        # Handle different JSON structures
        if isinstance(data, dict):
            # If it's a snapshot object with 'apis' field
            if 'apis' in data:
                apis = data['apis']
            else:
                # If it's a single API object, wrap in list
                apis = [data]
        elif isinstance(data, list):
            apis = data
        else:
            print(f"⚠️ Unexpected data structure: {type(data)}")
            return groups
        
        for api in apis:
            if isinstance(api, dict):
                # Handle different field names
                url = api.get('api') or api.get('url') or str(api)
                pattern = self._detect_pattern(url)
                if pattern not in groups:
                    groups[pattern] = []
                groups[pattern].append(api)
            else:
                print(f"⚠️ Unexpected API structure: {api}")
        
        return groups
    
    def _detect_pattern(self, url: str) -> str:
        """Convert URL to pattern by replacing IDs with wildcards"""
        # Remove query parameters
        url = url.split('?')[0]
        
        # Replace numeric IDs
        pattern = re.sub(r'/\d+', '/*', url)
        
        # Replace UUIDs
        pattern = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/*', pattern, flags=re.IGNORECASE)
        
        # Replace long alphanumeric strings (likely IDs)
        pattern = re.sub(r'/[a-zA-Z0-9_-]{20,}', '/*', pattern)
        
        return pattern