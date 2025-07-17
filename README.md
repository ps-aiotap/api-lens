# ApiLens - API Monitoring & Discovery Tool

**ApiLens monitors REST APIs in real-time, learns endpoint patterns from request logs, and provides health insights through CLI and dashboards.**  
**Perfect for agencies managing multiple clients, enterprises tracking API performance, and teams integrating API health checks into CI/CD pipelines.**

## 🚀 Quick Start

### Installation
```bash
# Clone and install
git clone <repository-url>
cd api-lens
npm install
cd python && pip install -r requirements.txt

# Start monitoring stack
docker-compose up -d

# Initialize database
cp .env.example .env
# Edit .env with your database credentials
```

### Basic Usage
```bash
# Create a new site to monitor
apilens create-site myapp http://localhost:3000 --template api

# Add specific endpoints
apilens add-endpoint myapp /api/users --method GET
apilens add-endpoint myapp /api/products --method POST

# Run health checks
apilens test --site myapp

# View results
apilens summary
```

## 📊 Dashboard Access

- **Multi-Site Dashboard**: http://localhost:3000 (admin/admin)
- **Prometheus Metrics**: http://localhost:9090
- **API Server**: http://localhost:3001

## 🔍 Key Features

### Real-time Endpoint Monitoring
- Health scoring algorithm (0-100) based on success rate, latency, and response quality
- Multi-site monitoring from single dashboard
- Automatic endpoint pattern grouping (`/users/123` → `/users/*`)

### Endpoint Learning & Discovery
- Learns successful endpoints from historical test runs
- Suggests new endpoints based on patterns
- Safe template-based configuration (no assumptions about API structure)

### CI/CD Integration
- GitHub Actions workflow included
- Automated testing every 2 hours
- Matrix testing across multiple sites
- Slack notifications on failures

### Alerting System
- Health score alerts (configurable thresholds)
- Email and Slack notifications
- Database alert history tracking
- Prometheus metrics for custom alerting rules

## 📋 Adding New APIs

### Method 1: CLI Templates
```bash
# For web applications
apilens create-site webapp-name http://example.com --template webapp

# For API services
apilens create-site api-name http://api.example.com --template api
```

### Method 2: Manual Configuration
Create `configs/sitename.json`:
```json
{
  "site": "myapi",
  "baseUrl": "https://api.example.com",
  "endpoints": [
    {
      "path": "/health",
      "method": "GET",
      "timeout": 3000,
      "retries": 1
    }
  ],
  "settings": {
    "defaultTimeout": 5000,
    "defaultRetries": 2,
    "userAgent": "ApiLens/2.0"
  }
}
```

## 🚨 How Alerts Work

### Health Score Calculation
```
Health Score = 100
- (Failure Rate × 60)     // Failed requests penalty
- (Empty Response Rate × 30)  // Empty responses penalty  
- (High Latency × 10)     // Latency penalty (max 10 points)
```

### Alert Configuration
Set environment variables in `.env`:
```bash
# Email alerts
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL=admin@company.com

# Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

### Alert Triggers
- Health score drops below 70 (configurable)
- Consecutive failures detected
- Response time exceeds thresholds
- Empty responses from critical endpoints

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Node.js CLI   │───▶│   PostgreSQL     │◀───│  Python Agent   │
│   (Testing)     │    │   (Metadata)     │    │  (Processing)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Prometheus    │◀───│   Metrics Server │◀───│   Log Files     │
│   (Metrics)     │    │   (Port 9879)    │    │   (JSON)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐
│    Grafana      │    │   Alert Manager  │
│   (Dashboard)   │    │  (Email/Slack)   │
└─────────────────┘    └──────────────────┘
```

### Tech Stack
- **Node.js**: CLI tool, API testing, metrics server
- **Python**: Data processing, alert management, analytics
- **PostgreSQL**: Request metadata, historical data, user management
- **Prometheus**: Real-time metrics collection and storage
- **Grafana**: Professional dashboards and visualization
- **Docker**: Containerized monitoring stack

## 🔄 CI/CD Integration

### GitHub Actions
The included workflow (`.github/workflows/api-monitoring.yml`) provides:
- Scheduled API health checks every 2 hours
- Matrix testing across multiple sites
- Automatic database storage of results
- Slack notifications on failures
- Test result artifacts

### Custom Integration
```bash
# Add to your CI pipeline
- name: API Health Check
  run: |
    node cli-tool.js test --site production
    # Exit with error code if health score < 80
```

### Environment Variables for CI
```yaml
env:
  DB_HOST: ${{ secrets.DB_HOST }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## 📁 Project Structure

```
api-lens/
├── cli-tool.js              # Main CLI interface
├── multi-site-runner.js     # Test execution engine
├── simple-metrics-server.js # Prometheus metrics endpoint
├── configs/                 # Site configuration files
├── templates/               # Configuration templates
├── python/                  # Analytics and processing
│   ├── database_manager.py  # PostgreSQL integration
│   ├── alert_manager.py     # Email/Slack alerts
│   └── multi_site_processor.py # Data processing
├── grafana/                 # Dashboard configurations
├── logs/                    # Test results (auto-generated)
└── .github/workflows/       # CI/CD automation
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database
DB_HOST=localhost
DB_NAME=apilens
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432

# Authentication
JWT_SECRET=your_secret_key

# Alerts
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL=admin@company.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

## 🎯 Use Cases

### For Agencies
- Monitor all client APIs from one dashboard
- Professional client reports with health scores
- Early detection of client API issues
- White-label dashboard options

### For Enterprises
- Multi-environment API monitoring (dev/staging/prod)
- Historical performance trending
- Integration with existing monitoring stack
- Custom alerting rules and thresholds

### For Startups
- Cost-effective API monitoring solution
- Quick setup with Docker deployment
- CI/CD integration for automated testing
- Scalable architecture for growth

## 📈 Health Score Examples

- **90-100**: Excellent - APIs performing optimally
- **70-89**: Good - Minor issues, monitor closely  
- **50-69**: Warning - Performance degradation detected
- **0-49**: Critical - Immediate attention required

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Ready to monitor your APIs like a pro?** Start with `apilens create-site` and see your API health in real-time!