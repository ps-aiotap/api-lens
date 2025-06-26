from typing import Dict, List, Any
from datetime import datetime

class ComparisonEngine:
    def __init__(self):
        self.insights = []
    
    def compare_runs(self, current_groups: Dict[str, List[Dict]], 
                    previous_groups: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """Compare two grouped API runs and generate insights"""
        self.insights = []
        
        # Overall comparison
        current_total = sum(len(apis) for apis in current_groups.values())
        previous_total = sum(len(apis) for apis in previous_groups.values())
        
        # Failure analysis
        current_failures = self._count_failures(current_groups)
        previous_failures = self._count_failures(previous_groups)
        
        # Empty response analysis
        current_empty = self._count_empty_responses(current_groups)
        previous_empty = self._count_empty_responses(previous_groups)
        
        # Generate insights
        self._analyze_failures(current_groups, previous_groups)
        self._analyze_empty_responses(current_empty, previous_empty, current_total, previous_total)
        self._analyze_latency_by_group(current_groups, previous_groups)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "current_total": current_total,
                "previous_total": previous_total,
                "current_failures": current_failures,
                "previous_failures": previous_failures,
                "current_empty": current_empty,
                "previous_empty": previous_empty
            },
            "insights": self.insights,
            "group_analysis": self._analyze_groups(current_groups, previous_groups)
        }
    
    def _count_failures(self, groups: Dict[str, List[Dict]]) -> int:
        """Count total failures across all groups"""
        return sum(1 for apis in groups.values() 
                  for api in apis if api.get('status') == 'fail')
    
    def _count_empty_responses(self, groups: Dict[str, List[Dict]]) -> int:
        """Count total empty responses across all groups"""
        return sum(1 for apis in groups.values() 
                  for api in apis if api.get('empty_response', False) or api.get('isEmpty', False))
    
    def _analyze_failures(self, current_groups: Dict, previous_groups: Dict):
        """Analyze failure changes between runs"""
        current_failed_apis = set()
        previous_failed_apis = set()
        
        for group, apis in current_groups.items():
            for api in apis:
                if api.get('status') == 'fail':
                    url = api.get('api') or api.get('url', 'unknown')
                    current_failed_apis.add(url)
        
        for group, apis in previous_groups.items():
            for api in apis:
                if api.get('status') == 'fail':
                    url = api.get('api') or api.get('url', 'unknown')
                    previous_failed_apis.add(url)
        
        new_failures = current_failed_apis - previous_failed_apis
        recovered_apis = previous_failed_apis - current_failed_apis
        
        if new_failures:
            self.insights.append(f"{len(new_failures)} APIs failed today that passed yesterday")
        
        if recovered_apis:
            self.insights.append(f"{len(recovered_apis)} APIs recovered from previous failures")
    
    def _analyze_empty_responses(self, current_empty: int, previous_empty: int, 
                                current_total: int, previous_total: int):
        """Analyze empty response changes"""
        if previous_total == 0:
            return
        
        current_pct = (current_empty / current_total) * 100
        previous_pct = (previous_empty / previous_total) * 100
        change = current_pct - previous_pct
        
        if abs(change) > 5:
            direction = "up" if change > 0 else "down"
            self.insights.append(f"Empty responses {direction} {abs(change):.1f}% since last scan")
    
    def _analyze_latency_by_group(self, current_groups: Dict, previous_groups: Dict):
        """Analyze latency changes by endpoint group"""
        for group in current_groups:
            if group not in previous_groups:
                continue
            
            current_latencies = [api.get('latency_ms', api.get('latency', 0)) for api in current_groups[group]]
            previous_latencies = [api.get('latency_ms', api.get('latency', 0)) for api in previous_groups[group]]
            
            if not current_latencies or not previous_latencies:
                continue
            
            current_avg = sum(current_latencies) / len(current_latencies)
            previous_avg = sum(previous_latencies) / len(previous_latencies)
            
            if previous_avg == 0:
                continue
                
            change_pct = ((current_avg - previous_avg) / previous_avg) * 100
            
            if abs(change_pct) > 20:
                direction = "↑" if change_pct > 0 else "↓"
                self.insights.append(f"Latency {direction} {abs(change_pct):.0f}% in {group}")
    
    def _analyze_groups(self, current_groups: Dict, previous_groups: Dict) -> Dict:
        """Detailed group-by-group analysis"""
        analysis = {}
        
        all_groups = set(current_groups.keys()) | set(previous_groups.keys())
        
        for group in all_groups:
            current_apis = current_groups.get(group, [])
            previous_apis = previous_groups.get(group, [])
            
            analysis[group] = {
                "current_count": len(current_apis),
                "previous_count": len(previous_apis),
                "current_failures": sum(1 for api in current_apis if api.get('status') == 'fail'),
                "previous_failures": sum(1 for api in previous_apis if api.get('status') == 'fail'),
                "avg_latency_current": sum(api.get('latency_ms', api.get('latency', 0)) for api in current_apis) / len(current_apis) if current_apis else 0,
                "avg_latency_previous": sum(api.get('latency_ms', api.get('latency', 0)) for api in previous_apis) / len(previous_apis) if previous_apis else 0
            }
        
        return analysis