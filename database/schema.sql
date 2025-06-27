-- API Lens PostgreSQL Schema
CREATE DATABASE apilens;

\c apilens;

-- Sites table
CREATE TABLE sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test runs table
CREATE TABLE test_runs (
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

-- Endpoint results table
CREATE TABLE endpoint_results (
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

-- Alerts table
CREATE TABLE alerts (
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

-- Users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User site access table
CREATE TABLE user_site_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    site_id INTEGER REFERENCES sites(id),
    access_level VARCHAR(50) DEFAULT 'read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, site_id)
);

-- Indexes for performance
CREATE INDEX idx_test_runs_site_timestamp ON test_runs(site_id, timestamp);
CREATE INDEX idx_endpoint_results_test_run ON endpoint_results(test_run_id);
CREATE INDEX idx_alerts_site_status ON alerts(site_id, status);