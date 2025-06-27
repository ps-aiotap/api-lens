#!/usr/bin/env python3

import smtplib
import json
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database_manager import DatabaseManager
from typing import Dict, List

class AlertManager:
    def __init__(self):
        self.db = DatabaseManager()
        self.smtp_config = {
            'host': 'smtp.gmail.com',
            'port': 587,
            'username': 'your-email@gmail.com',
            'password': 'your-app-password'
        }
        self.slack_webhook = 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        
    def check_health_alerts(self, site: str, health_threshold: int = 70):
        """Check for health score alerts and send notifications"""
        alerts = self.db.check_health_alerts(site, health_threshold)
        
        for alert in alerts:
            message = f"Health Alert: {alert['endpoint']} on {alert['name']} has health score {alert['health_score']}"
            
            # Create alert record
            self.db.create_alert(
                site=alert['name'],
                endpoint=alert['endpoint'],
                alert_type='health_score',
                threshold=health_threshold,
                current=alert['health_score'],
                message=message
            )
            
            # Send notifications
            self.send_email_alert(alert['name'], message)
            self.send_slack_alert(alert['name'], message)
    
    def send_email_alert(self, site: str, message: str):
        """Send email alert"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_config['username']
            msg['To'] = 'admin@company.com'
            msg['Subject'] = f'API Lens Alert - {site}'
            
            msg.attach(MIMEText(message, 'plain'))
            
            server = smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port'])
            server.starttls()
            server.login(self.smtp_config['username'], self.smtp_config['password'])
            server.send_message(msg)
            server.quit()
            
            print(f"Email alert sent for {site}")
        except Exception as e:
            print(f"Failed to send email alert: {e}")
    
    def send_slack_alert(self, site: str, message: str):
        """Send Slack alert"""
        try:
            payload = {
                'text': f'🚨 API Lens Alert',
                'attachments': [{
                    'color': 'danger',
                    'fields': [{
                        'title': f'Site: {site}',
                        'value': message,
                        'short': False
                    }]
                }]
            }
            
            response = requests.post(self.slack_webhook, json=payload)
            if response.status_code == 200:
                print(f"Slack alert sent for {site}")
            else:
                print(f"Failed to send Slack alert: {response.status_code}")
        except Exception as e:
            print(f"Failed to send Slack alert: {e}")
    
    def check_latency_alerts(self, site: str, latency_threshold: int = 5000):
        """Check for high latency alerts"""
        # Implementation for latency-based alerts
        pass
    
    def check_failure_rate_alerts(self, site: str, failure_threshold: float = 0.1):
        """Check for high failure rate alerts"""
        # Implementation for failure rate alerts
        pass