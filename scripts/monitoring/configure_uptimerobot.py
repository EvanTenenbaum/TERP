#!/usr/bin/env python3
"""
Configure UptimeRobot monitor for TERP app health endpoint
Using UptimeRobot v3 API
"""

import requests
import json

# UptimeRobot API configuration
UPTIMEROBOT_API_KEY = "u3183829-bd5bb0d188513f19f76e56ff"
BASE_URL = "https://api.uptimerobot.com/v3"

# TERP app configuration
TERP_HEALTH_URL = "https://terp-app-qkqhc.ondigitalocean.app/health"
MONITOR_NAME = "TERP App Health Check"

headers = {
    "Authorization": f"Bearer {UPTIMEROBOT_API_KEY}",
    "Content-Type": "application/json"
}

def get_existing_monitors():
    """Get list of existing monitors"""
    url = f"{BASE_URL}/monitors"
    response = requests.get(url, headers=headers)
    print(f"Get Monitors Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        monitors = data.get('data', [])
        print(f"Found {len(monitors)} existing monitors:")
        for monitor in monitors:
            print(f"  - {monitor.get('friendly_name')} ({monitor.get('url')})")
        return monitors
    else:
        print(f"Error: {response.text}")
        return []

def create_http_monitor(name, url, interval=300):
    """
    Create a new HTTP monitor
    
    Args:
        name: Friendly name for the monitor
        url: URL to monitor
        interval: Check interval in seconds (default: 300 = 5 minutes)
    """
    api_url = f"{BASE_URL}/monitors"
    
    payload = {
        "type": "HTTP",
        "friendlyName": name,
        "url": url,
        "interval": interval,
        "timeout": 30,  # 30 seconds timeout
        "httpMethodType": "GET",
        "gracePeriod": 0  # No grace period
    }
    
    response = requests.post(api_url, headers=headers, json=payload)
    print(f"\nCreate Monitor '{name}' Status: {response.status_code}")
    if response.status_code in [200, 201]:
        monitor = response.json()
        print(f"✅ Successfully created monitor!")
        print(f"   Name: {name}")
        print(f"   URL: {url}")
        print(f"   Interval: {interval} seconds ({interval//60} minutes)")
        print(f"   Monitor ID: {monitor.get('data', {}).get('id')}")
        return monitor
    else:
        print(f"❌ Error creating monitor: {response.text}")
        return None

def main():
    print("=" * 60)
    print("UptimeRobot Monitor Configuration")
    print("=" * 60)
    
    # Get existing monitors
    print("\nChecking existing monitors...")
    existing_monitors = get_existing_monitors()
    
    # Check if TERP monitor already exists
    terp_monitor_exists = any(
        m.get('url') == TERP_HEALTH_URL 
        for m in existing_monitors
    )
    
    if terp_monitor_exists:
        print(f"\n⚠️  Monitor for {TERP_HEALTH_URL} already exists!")
        print("   Skipping creation.")
    else:
        print("\n" + "=" * 60)
        print("Creating TERP Health Monitor")
        print("=" * 60)
        
        # Create the monitor
        create_http_monitor(
            name=MONITOR_NAME,
            url=TERP_HEALTH_URL,
            interval=300  # 5 minutes
        )
    
    print("\n" + "=" * 60)
    print("UptimeRobot Configuration Complete!")
    print("=" * 60)
    
    # List all monitors again
    print("\nFinal list of monitors:")
    get_existing_monitors()

if __name__ == "__main__":
    main()
