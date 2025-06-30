# API Lens - Complete Feature Documentation

## Current Product Features

### 🔧 Core API Monitoring
- **Multi-client isolation**: Separate monitoring for different clients/sites
- **Configurable endpoints**: JSON-based endpoint configuration per site
- **Retry logic**: Configurable timeout and retry settings per endpoint
- **Health scoring**: 0-100 scoring based on success rate, latency, and response quality
- **Multiple output formats**: JSON logs, HTML reports, CSV exports

### 🖥️ Command Line Interface
- **Site testing**: `apilens test --site <name>`
- **Site creation**: `apilens create-site <name> <url> --template <type>`
- **Endpoint management**: `apilens add-endpoint <site> <path>`
- **Snapshot management**: List, compare, and export test snapshots
- **Template system**: Pre-built templates for webapp and API monitoring

### 📊 Analytics & Reporting
- **Python data processing**: Advanced analytics with health score calculation
- **Historical comparison**: Compare test runs over time
- **Prometheus metrics**: Export metrics for monitoring dashboards
- **Grafana dashboards**: Multi-site visualization with health scores
- **HTML reports**: Professional client reports with visual metrics

### 🔐 Authentication & Security
- **JWT authentication**: Token-based API access
- **Role-based access**: Admin, viewer, and client roles
- **Site-specific permissions**: Users can only access assigned sites
- **API server**: Express.js server with protected endpoints

### 🤖 Automation & CI/CD
- **GitHub Actions**: ✅ Workflow configured for every 2 hours
- **Matrix testing**: ✅ Parallel testing across multiple sites
- **Alert integration**: ⚠️ Slack notifications (needs webhook configuration)
- **Docker deployment**: ✅ Complete containerized stack

### 📧 Alerting System (Requires Configuration)
- **Health score detection**: ✅ Automatically detects when scores drop below 70
- **Database logging**: ✅ All alerts logged to PostgreSQL
- **Email notifications**: ⚠️ Code implemented, needs SMTP configuration
- **Slack integration**: ⚠️ Code implemented, needs webhook URL
- **Alert history**: ✅ Complete tracking in database

## API Discovery & Endpoint Management

### 🔍 Current API Discovery Implementation

#### 1. **Learning-Based Discovery** (`endpoint-learner.js`)
```javascript
// Learns from successful past API calls
class EndpointLearner {
    async learnFromLogs() {
        // Analyzes last 10 test runs
        // Extracts successful endpoints
        // Suggests new endpoints based on patterns
    }
    
    suggestEndpoints(baseUrl) {
        // Suggests common health check endpoints
        // Based on URL patterns (localhost, etc.)
    }
}
```

**Features:**
- Analyzes historical test logs to find successful endpoints
- Learns from the last 10 test runs per site
- Suggests common patterns like `/health`, `/api/health`, `/status`
- Non-intrusive: Only suggests, doesn't automatically add

#### 2. **Template-Based Configuration**

**Web Application Template** (`templates/webapp.json`):
```json
{
  "endpoints": [
    {"path": "/", "method": "GET"},
    {"path": "/health", "method": "GET"}
  ]
}
```

**API Service Template** (`templates/api.json`):
```json
{
  "endpoints": [
    {"path": "/api/health", "method": "GET"},
    {"path": "/api/status", "method": "GET"}
  ]
}
```

**Benefits:**
- Safe defaults: Only tests common, non-destructive endpoints
- No assumptions: Doesn't guess API structure
- Customizable: Easy to modify after creation

#### 3. **Manual Endpoint Management**

**CLI Commands:**
```bash
# Create new site with template
apilens create-site myapp http://localhost:3000 --template webapp

# Add specific endpoints
apilens add-endpoint myapp /api/users --method GET --timeout 5000
apilens add-endpoint myapp /api/products --method GET

# Test the configured endpoints
apilens test --site myapp
```

**Features:**
- Command-line endpoint addition without editing JSON
- Duplicate detection: Won't add existing endpoints
- Flexible configuration: Custom timeouts, methods, retry logic
- Immediate testing: Can test right after adding endpoints

### 🛡️ Why This Approach is Robust

#### **Problems with Traditional API Discovery:**
1. **Fragile assumptions**: Guesses about API structure
2. **False positives**: Finds endpoints that don't exist
3. **Security risks**: May trigger unintended API calls
4. **Unreliable parsing**: Depends on documentation formats

#### **Our Solution:**
1. **Learning-based**: Only suggests endpoints that previously worked
2. **Manual control**: User decides what to monitor
3. **Safe defaults**: Templates start with minimal, safe endpoints
4. **Incremental growth**: Add endpoints as you discover them
5. **No assumptions**: Only tests explicitly configured endpoints

### 📈 Discovery Workflow

1. **Initial Setup**: Create site with safe template
2. **Manual Addition**: Add known endpoints via CLI
3. **Learning Phase**: System learns from successful tests
4. **Suggestions**: System suggests new endpoints based on patterns
5. **Validation**: User validates and adds suggested endpoints
6. **Continuous Learning**: System improves suggestions over time

## 1. Database Integration for Historical Analysis

### PostgreSQL Schema
- **Sites**: Store client/site configurations
- **Test Runs**: Track each test execution with metadata
- **Endpoint Results**: Detailed results for each API endpoint
- **Alerts**: Alert history and status tracking
- **Users**: Authentication and authorization
- **User Site Access**: Role-based access control

### Usage
```bash
# Setup database
docker-compose up postgres -d
psql -h localhost -U postgres -d apilens -f database/schema.sql

# Historical data is automatically saved during test runs
node cli-tool.js test --site testsite
```

### Database Manager Features
- Automatic test result storage
- Historical data retrieval
- Health score trending
- Alert management

## 2. Authentication for Client-Specific Dashboards

### JWT-Based Authentication
- Secure token-based authentication
- Role-based access control (admin, viewer, client)
- Site-specific access permissions

### API Endpoints
```bash
# Login
POST /api/auth/login
{
  "username": "user@example.com",
  "password": "password"
}

# Register new user (admin only)
POST /api/auth/register
{
  "username": "newuser",
  "email": "newuser@example.com", 
  "password": "password",
  "role": "viewer"
}

# Get accessible sites
GET /api/sites
Authorization: Bearer <token>

# Run tests (requires write access)
POST /api/test/sitename
Authorization: Bearer <token>
```

### User Roles
- **Admin**: Full access to all sites and user management
- **Viewer**: Read-only access to assigned sites
- **Client**: Read/write access to specific client sites

## 3. Automated Alerting Based on Health Scores

### Current Implementation Status
- ✅ **Alert Detection**: Automatically runs after each test
- ✅ **Health Score Calculation**: 0-100 scoring with configurable thresholds
- ✅ **Database Logging**: All alerts stored in PostgreSQL
- ⚠️ **Email/Slack Notifications**: Code complete but requires configuration

### Alert Types
- **Health Score Alerts**: ✅ Triggered when endpoint health drops below threshold (default: 70)
- **Latency Alerts**: 📝 Placeholder implementation
- **Failure Rate Alerts**: 📝 Placeholder implementation

### Notification Channels
- **Email**: ⚠️ SMTP code implemented, needs credentials
- **Slack**: ⚠️ Webhook code implemented, needs URL
- **Database**: ✅ Complete alert history tracking

### Configuration Required
```bash
# Email setup (choose one):
# Option 1: Environment variables
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-app-password

# Option 2: Edit python/alert_manager.py
# Update smtp_config with real credentials

# Slack setup:
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Testing Alerts
```bash
# Create failing endpoint to trigger alerts
apilens create-site failtest http://nonexistent.local --template api
apilens test --site failtest

# Check alert database
psql -h localhost -U postgres -d apilens -c "SELECT * FROM alerts;"
```

### Alert Management
- ✅ Automatic alert creation after each test run
- ✅ Alert history tracking in database
- ⚠️ Email/Slack notifications need configuration
- 📝 Alert resolution tracking (placeholder)

## 4. CI/CD Integration for Continuous API Monitoring

### GitHub Actions Workflow
- **Scheduled Runs**: Every 2 hours automatic testing
- **Multi-Site Matrix**: Parallel testing across all sites
- **Database Integration**: Results stored in PostgreSQL
- **Alert Processing**: Automatic health checks and notifications
- **Artifact Upload**: Test results and reports saved

### Workflow Features
```yaml
# Triggers
- schedule: '0 */2 * * *'  # Every 2 hours
- push to main branch
- pull requests
- manual dispatch

# Matrix Strategy
strategy:
  matrix:
    site: [testsite, healthmug, example]
```

### Environment Setup
- PostgreSQL service container
- Node.js and Python environment setup
- Dependency installation and caching
- Database schema initialization

### Notifications
- Slack notifications on test failures
- Test result artifacts uploaded
- Dashboard deployment on main branch

## Quick Setup Guide

### 1. Install Dependencies
```bash
npm install
cd python && pip install -r requirements.txt
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Initialize Database
```bash
psql -h localhost -U postgres -d apilens -f database/schema.sql
```

### 4. Create Admin User
```bash
node -e "
import { AuthManager } from './auth/auth_middleware.js';
AuthManager.createUser('admin', 'admin@example.com', 'password', 'admin');
"
```

### 5. Start API Server
```bash
node api-server.js
```

### 6. Create and Test a Site
```bash
# Create new site from template
apilens create-site myapp http://localhost:3000 --template webapp

# Add custom endpoints
apilens add-endpoint myapp /api/users --method GET

# Run tests
apilens test --site myapp
```

### 7. Configure Alerting (Optional)
```bash
# For email alerts - update python/alert_manager.py with real SMTP credentials
# For Slack alerts - update python/alert_manager.py with real webhook URL
# Test alerts by creating failing endpoints
```

## Implementation Status Summary

### ✅ Fully Working Features
- Multi-client API monitoring
- Health score calculation (0-100)
- CLI interface with site/endpoint management
- Template-based configuration
- Learning-based endpoint suggestions
- Database integration (PostgreSQL)
- HTML/JSON/CSV reporting
- Prometheus metrics export
- Grafana dashboard integration
- Alert detection and database logging

### ⚠️ Requires Configuration
- **Email alerts**: Code complete, needs SMTP credentials
- **Slack alerts**: Code complete, needs webhook URL
- **JWT authentication**: Code complete, needs user creation
- **CI/CD pipeline**: Code complete, needs GitHub secrets

### 📝 Placeholder/Incomplete
- Latency-based alerting (basic structure only)
- Failure rate alerting (basic structure only)
- Alert resolution tracking
- Advanced user management UI

## File Structure

```
api-lens/
├── configs/           # Site configuration files
├── templates/         # Configuration templates
├── logs/             # Test results by site
├── python/           # Analytics and processing
├── auth/             # Authentication middleware
├── database/         # PostgreSQL schema
├── grafana/          # Dashboard configurations
├── cli-tool.js       # Main CLI interface
├── multi-site-runner.js  # Test execution engine
├── endpoint-learner.js   # Learning-based discovery
└── api-server.js     # Authentication API server
```e Structure

```
api-lens/
├── configs/           # Site configuration files
├── templates/         # Configuration templates
├── logs/             # Test results by site
├── python/           # Analytics and processing
├── auth/             # Authentication middleware
├── database/         # PostgreSQL schema
├── grafana/          # Dashboard configurations
├── cli-tool.js       # Main CLI interface
├── multi-site-runner.js  # Test execution engine
├── endpoint-learner.js   # Learning-based discovery
└── api-server.js     # Authentication API server
```

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_NAME=apilens
DB_USER=postgres
DB_PASSWORD=password
DB_PORT=5432

# Authentication
JWT_SECRET=your-secret-key

# Alerts
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```