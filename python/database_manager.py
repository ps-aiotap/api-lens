#!/usr/bin/env python3

import psycopg2
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any
from dotenv import load_dotenv

# Load environment variables from .env file in the project root
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path)

class DatabaseManager:
    def __init__(self, db_config=None):
        # Use provided config or load from environment variables
        self.db_config = db_config or {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME', 'apilens'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'password'),
            'port': os.getenv('DB_PORT', '5432')
        }
        self.init_database()
    
    def init_database(self):
        """Initialize database and tables if they don't exist"""
        try:
            # First try to connect to the database
            conn = psycopg2.connect(**self.db_config)
            conn.close()
        except psycopg2.OperationalError:
            # Database doesn't exist, create it
            temp_config = self.db_config.copy()
            temp_config['database'] = 'postgres'  # Connect to default database
            
            conn = psycopg2.connect(**temp_config)
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(f"CREATE DATABASE {self.db_config['database']}")
            conn.close()
        
        # Now create tables if they don't exist
        self.create_tables()
    
    def create_tables(self):
        """Create database tables if they don't exist"""
        schema_sql = """
        CREATE TABLE IF NOT EXISTS sites (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            base_url VARCHAR(500) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS test_runs (
            id SERIAL PRIMARY KEY,
            site_id INTEGER REFERENCES sites(id),
            run_id VARCHAR(100) NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            total_endpoints INTEGER,
            total_failures INTEGER,
            total_empty_responses INTEGER,
            avg_health_score DECIMAL(5,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS endpoint_results (
            id SERIAL PRIMARY KEY,
            test_run_id INTEGER REFERENCES test_runs(id),
            endpoint VARCHAR(500) NOT NULL,
            method VARCHAR(10) NOT NULL,
            status_code INTEGER,
            latency INTEGER,
            response_size INTEGER,
            is_empty BOOLEAN,
            success BOOLEAN,
            health_score INTEGER,
            error_message TEXT,
            timestamp TIMESTAMP NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            site_id INTEGER REFERENCES sites(id),
            endpoint VARCHAR(500),
            alert_type VARCHAR(50) NOT NULL,
            threshold_value DECIMAL(10,2),
            current_value DECIMAL(10,2),
            message TEXT,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'viewer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS user_site_access (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            site_id INTEGER REFERENCES sites(id),
            access_level VARCHAR(50) DEFAULT 'read',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, site_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_test_runs_site_timestamp ON test_runs(site_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_endpoint_results_test_run ON endpoint_results(test_run_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_site_status ON alerts(site_id, status);
        """
        
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(schema_sql)
            conn.commit()
    
    def get_connection(self):
        return psycopg2.connect(**self.db_config)
    
    def save_test_run(self, site: str, run_data: Dict) -> int:
        """Save test run data to database"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Get or create site
                base_url = ''
                if 'config' in run_data and isinstance(run_data['config'], dict):
                    base_url = run_data['config'].get('baseUrl', '')
                elif 'config' in run_data and isinstance(run_data['config'], str):
                    base_url = run_data['config']
                    
                cur.execute("INSERT INTO sites (name, base_url) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING", 
                           (site, base_url))
                
                cur.execute("SELECT id FROM sites WHERE name = %s", (site,))
                site_id = cur.fetchone()[0]
                
                # Calculate summary stats
                results = run_data.get('results', [])
                total_endpoints = len(results)
                total_failures = sum(1 for r in results if not r.get('success', False))
                total_empty = sum(1 for r in results if r.get('isEmpty', False))
                
                # Insert test run
                cur.execute("""
                    INSERT INTO test_runs (site_id, run_id, timestamp, total_endpoints, total_failures, total_empty_responses)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                """, (site_id, run_data['runId'], run_data['timestamp'], total_endpoints, total_failures, total_empty))
                
                test_run_id = cur.fetchone()[0]
                
                # Insert endpoint results
                for result in results:
                    cur.execute("""
                        INSERT INTO endpoint_results 
                        (test_run_id, endpoint, method, status_code, latency, response_size, is_empty, success, error_message, timestamp)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        test_run_id, result['endpoint'], result['method'], result['statusCode'],
                        result['latency'], result['responseSize'], result['isEmpty'], result['success'],
                        result.get('error'), result['timestamp']
                    ))
                
                conn.commit()
                return test_run_id
    
    def get_historical_data(self, site: str, days: int = 30) -> List[Dict]:
        """Get historical test data for a site"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT tr.run_id, tr.timestamp, tr.total_endpoints, tr.total_failures, tr.total_empty_responses,
                           COUNT(er.id) as endpoint_count, AVG(er.health_score) as avg_health_score
                    FROM test_runs tr
                    JOIN sites s ON tr.site_id = s.id
                    LEFT JOIN endpoint_results er ON tr.id = er.test_run_id
                    WHERE s.name = %s AND tr.timestamp >= NOW() - INTERVAL '%s days'
                    GROUP BY tr.id, tr.run_id, tr.timestamp, tr.total_endpoints, tr.total_failures, tr.total_empty_responses
                    ORDER BY tr.timestamp DESC
                """, (site, days))
                
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in cur.fetchall()]
    
    def check_health_alerts(self, site: str, health_threshold: int = 70) -> List[Dict]:
        """Check for health score alerts"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT s.name, er.endpoint, er.health_score, er.timestamp
                    FROM endpoint_results er
                    JOIN test_runs tr ON er.test_run_id = tr.id
                    JOIN sites s ON tr.site_id = s.id
                    WHERE s.name = %s AND er.health_score < %s
                    AND er.timestamp >= NOW() - INTERVAL '1 hour'
                    ORDER BY er.health_score ASC
                """, (site, health_threshold))
                
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in cur.fetchall()]
    
    def create_alert(self, site: str, endpoint: str, alert_type: str, threshold: float, current: float, message: str):
        """Create an alert record"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM sites WHERE name = %s", (site,))
                site_id = cur.fetchone()[0]
                
                cur.execute("""
                    INSERT INTO alerts (site_id, endpoint, alert_type, threshold_value, current_value, message)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (site_id, endpoint, alert_type, threshold, current, message))