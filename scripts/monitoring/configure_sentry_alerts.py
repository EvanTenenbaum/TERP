#!/usr/bin/env python3
"""
Configure Sentry alert rules via API
"""

import requests
import json

# Sentry API configuration
SENTRY_AUTH_TOKEN = "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"
ORG_SLUG = "evan-tenenbaum"
PROJECT_SLUG = "terp"
BASE_URL = "https://sentry.io/api/0"

headers = {
    "Authorization": f"Bearer {SENTRY_AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def get_project_info():
    """Get project information"""
    url = f"{BASE_URL}/projects/{ORG_SLUG}/{PROJECT_SLUG}/"
    response = requests.get(url, headers=headers)
    print(f"Project Info Status: {response.status_code}")
    if response.status_code == 200:
        project = response.json()
        print(f"Project ID: {project['id']}")
        print(f"Project Name: {project['name']}")
        return project
    else:
        print(f"Error: {response.text}")
        return None

def list_existing_rules():
    """List existing alert rules"""
    url = f"{BASE_URL}/projects/{ORG_SLUG}/{PROJECT_SLUG}/rules/"
    response = requests.get(url, headers=headers)
    print(f"\nExisting Rules Status: {response.status_code}")
    if response.status_code == 200:
        rules = response.json()
        print(f"Found {len(rules)} existing rules:")
        for rule in rules:
            print(f"  - {rule['name']} (ID: {rule['id']})")
        return rules
    else:
        print(f"Error: {response.text}")
        return []

def create_alert_rule(name, conditions, actions, action_match="any", filter_match="all", frequency=30):
    """Create a new alert rule"""
    url = f"{BASE_URL}/projects/{ORG_SLUG}/{PROJECT_SLUG}/rules/"
    
    payload = {
        "name": name,
        "conditions": conditions,
        "actions": actions,
        "actionMatch": action_match,
        "filterMatch": filter_match,
        "frequency": frequency  # in minutes
    }
    
    response = requests.post(url, headers=headers, json=payload)
    print(f"\nCreate Rule '{name}' Status: {response.status_code}")
    if response.status_code == 201:
        rule = response.json()
        print(f"✅ Successfully created rule: {rule['name']} (ID: {rule['id']})")
        return rule
    else:
        print(f"❌ Error creating rule: {response.text}")
        return None

def main():
    print("=" * 60)
    print("Sentry Alert Configuration")
    print("=" * 60)
    
    # Get project info
    project = get_project_info()
    if not project:
        print("Failed to get project info. Exiting.")
        return
    
    # List existing rules
    existing_rules = list_existing_rules()
    
    print("\n" + "=" * 60)
    print("Creating New Alert Rules")
    print("=" * 60)
    
    # Alert 1: New Errors (when a new issue is created)
    print("\n1. Creating 'Alert: New Errors' rule...")
    create_alert_rule(
        name="Alert: New Errors",
        conditions=[
            {
                "id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"
            }
        ],
        actions=[
            {
                "id": "sentry.mail.actions.NotifyEmailAction",
                "targetType": "IssueOwners",
                "targetIdentifier": ""
            }
        ],
        frequency=30  # 30 minutes
    )
    
    # Alert 2: High Frequency Errors (when issue is seen more than 100 times in 1 hour)
    print("\n2. Creating 'Alert: High Frequency Errors' rule...")
    create_alert_rule(
        name="Alert: High Frequency Errors",
        conditions=[
            {
                "id": "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
                "value": 100,
                "interval": "1h"
            }
        ],
        actions=[
            {
                "id": "sentry.mail.actions.NotifyEmailAction",
                "targetType": "IssueOwners",
                "targetIdentifier": ""
            }
        ],
        frequency=60  # 1 hour
    )
    
    # Alert 3: Regression (when resolved issue re-appears)
    print("\n3. Creating 'Alert: Error Regression' rule...")
    create_alert_rule(
        name="Alert: Error Regression",
        conditions=[
            {
                "id": "sentry.rules.conditions.regression_event.RegressionEventCondition"
            }
        ],
        actions=[
            {
                "id": "sentry.mail.actions.NotifyEmailAction",
                "targetType": "IssueOwners",
                "targetIdentifier": ""
            }
        ],
        frequency=30  # 30 minutes
    )
    
    print("\n" + "=" * 60)
    print("Alert Configuration Complete!")
    print("=" * 60)
    
    # List all rules again to confirm
    print("\nFinal list of alert rules:")
    list_existing_rules()

if __name__ == "__main__":
    main()
