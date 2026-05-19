import os
import requests
from dotenv import load_dotenv

load_dotenv()
proxy_url = os.environ.get("WEBSHARE_PROXY_URL")
if not proxy_url:
    print("❌ No WEBSHARE_PROXY_URL found in environment!")
    exit(1)

proxies = {
    "http": proxy_url,
    "https": proxy_url
}

print("🌐 Testing direct connection (No Proxy)...")
try:
    resp = requests.get("https://api.ipify.org?format=json", timeout=5)
    print(f"   Your real IP: {resp.json()['ip']}")
except Exception as e:
    print(f"   Failed: {e}")

print("\n🔒 Testing connection via Webshare Proxy...")
try:
    resp = requests.get("https://api.ipify.org?format=json", proxies=proxies, timeout=10)
    print(f"   Your Proxy IP: {resp.json()['ip']}")
    print("   ✅ SUCCESS: Proxy is actively routing traffic!")
except Exception as e:
    print(f"   ❌ FAILED: {e}")
