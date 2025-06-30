# Alerting Setup Guide

## Current Status: PARTIALLY IMPLEMENTED ⚠️

The alerting system is coded and integrated but requires configuration to send actual notifications.

## What's Working:
- ✅ Health score calculation and alert detection
- ✅ Database alert logging
- ✅ Alert manager integration in test pipeline
- ✅ Alert threshold checking (default: health score < 70)

## What Needs Configuration:

### 1. Email Alerts Setup

#### Option A: Gmail SMTP
```bash
# Set environment variables
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-app-password
export ALERT_EMAIL=admin@company.com
```

#### Option B: Update alert_manager.py
```python
self.smtp_config = {
    'host': 'smtp.gmail.com',
    'port': 587,
    'username': 'your-actual-email@gmail.com',
    'password': 'your-actual-app-password'
}
```

### 2. Slack Alerts Setup

#### Get Slack Webhook URL:
1. Go to https://api.slack.com/apps
2. Create new app or use existing
3. Add "Incoming Webhooks" feature
4. Create webhook for your channel
5. Copy webhook URL

#### Configure:
```bash
# Set environment variable
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

Or update `alert_manager.py`:
```python
self.slack_webhook = 'https://hooks.slack.com/services/YOUR/ACTUAL/WEBHOOK'
```

## Test Alerting:

### 1. Trigger Low Health Score
```bash
# Create a site with unreachable endpoint to trigger alerts
apilens create-site failtest http://nonexistent.local --template api
apilens test --site failtest
```

### 2. Check Alert Logs
```bash
# Check if alerts were created in database
psql -h localhost -U postgres -d apilens -c "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 5;"
```

### 3. Verify Notifications
- Check email inbox for alert emails
- Check Slack channel for alert messages

## Alert Configuration Options:

### Health Score Threshold
```python
# In multi_site_processor.py, change threshold:
self.alert_mgr.check_health_alerts(site, 80)  # Alert when < 80 instead of < 70
```

### Custom Alert Recipients
```python
# In alert_manager.py, customize recipients:
msg['To'] = 'alerts@yourcompany.com,manager@yourcompany.com'
```

## Current Alert Trigger Logic:
```python
# Alerts trigger when:
health_score = 100
health_score -= (1 - success_rate) * 60    # Failures reduce score
health_score -= empty_rate * 30            # Empty responses reduce score  
health_score -= min(avg_latency/1000*10, 10)  # High latency reduces score

if health_score < 70:  # Default threshold
    send_alert()
```

## Quick Fix for Testing:
```bash
# 1. Set up basic email (Gmail)
export SMTP_USER=your-gmail@gmail.com
export SMTP_PASSWORD=your-app-password

# 2. Update alert_manager.py to use env vars
# 3. Test with failing endpoint
apilens test --site nonexistent-site
```