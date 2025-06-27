# API Lens Enhanced Features

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

### Alert Types
- **Health Score Alerts**: Triggered when endpoint health drops below threshold (default: 70)
- **Latency Alerts**: High response time warnings
- **Failure Rate Alerts**: Excessive failure rate notifications

### Notification Channels
- **Email**: SMTP-based email notifications
- **Slack**: Webhook-based Slack alerts
- **Database**: Alert history tracking

### Configuration
```python
# Alert thresholds can be configured per site
alert_mgr = AlertManager()
alert_mgr.check_health_alerts('sitename', health_threshold=70)
```

### Alert Management
- Automatic alert creation and resolution
- Alert history tracking in database
- Configurable notification channels

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

### 6. Run Tests with Database Storage
```bash
node cli-tool.js test --site testsite
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