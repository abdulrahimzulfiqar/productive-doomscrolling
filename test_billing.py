import asyncio
import os
import sys
import uuid
import hmac
import hashlib
import json
from datetime import datetime, timedelta
import httpx
from dotenv import load_dotenv

# Load env variables from root directory
load_dotenv()

# Add workspace root to sys.path so we can import from server
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from fastapi import HTTPException
from server.api.billing import get_user_subscription, increment_user_quota
from server.api.routes import process_video_endpoint
from server.schemas.processing import ProcessVideoRequest

# Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET")

# Setup headers for direct DB manipulation
HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Helper to generate Paddle webhook signature
def generate_paddle_signature(ts: int, body: bytes) -> str:
    message = f"{ts}:{body.decode('utf-8')}"
    h = hmac.new(PADDLE_WEBHOOK_SECRET.encode('utf-8'), message.encode('utf-8'), hashlib.sha256)
    return f"ts={ts};h1={h.hexdigest()}"

async def cleanup_test_user(user_id: str):
    """Deletes test subscription and auth user if exists."""
    async with httpx.AsyncClient() as client:
        # Delete subscription
        sub_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
        await client.delete(sub_url, headers=HEADERS)

async def setup_test_user(user_id: str, tier: str, quota_limit: int, quota_used: int, reset_at: datetime) -> dict:
    """Inserts or updates a test user's subscription details directly in the DB."""
    payload = {
        "user_id": user_id,
        "subscription_tier": tier,
        "subscription_status": "active",
        "quota_limit": quota_limit,
        "quota_used": quota_used,
        "quota_reset_at": reset_at.isoformat()
    }
    async with httpx.AsyncClient() as client:
        # We perform an upsert
        url = f"{SUPABASE_URL}/rest/v1/user_subscriptions"
        headers_upsert = {**HEADERS, "Prefer": "resolution=merge-duplicates"}
        res = await client.post(url, json=payload, headers=headers_upsert)
        if res.status_code not in (200, 201):
            print(f"Upsert failed: {res.status_code} {res.text}")
            # Try patch
            patch_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
            res = await client.patch(patch_url, json=payload, headers=HEADERS)
        return payload

async def test_dynamic_quota_reset():
    print("\n--- Test 1: Dynamic Quota Anniversary Reset ---")
    
    # We need a valid UUID format, let's create a random one
    # Note: user_subscriptions has a foreign key to auth.users. 
    # Wait! Because of the foreign key constraint:
    # "user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY"
    # We must insert a user in auth.users first, or disable check temporarily.
    # Wait, we cannot easily insert directly into auth.users without creating auth account,
    # but we can fetch an existing user ID from auth.users or create a temporary auth user.
    # Let's query auth.users to get a real user ID!
    # Let's run a query to get a user ID from the database first.
    user_id = None
    async with httpx.AsyncClient() as client:
        url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?limit=1"
        res = await client.get(url, headers=HEADERS)
        if res.status_code == 200 and res.json():
            user_id = res.json()[0]['user_id']
            print(f"Using existing database user_id for test: {user_id}")
            
    if not user_id:
        print("❌ Skip Test 1 & 3: No user exists in database to perform foreign key referenced operations.")
        return

    # Store original subscription details to restore later
    orig_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
    async with httpx.AsyncClient() as client:
        orig_res = await client.get(orig_url, headers=HEADERS)
        orig_sub = orig_res.json()[0] if orig_res.status_code == 200 and orig_res.json() else None

    try:
        # Setup quota reset date in the past (e.g. 5 days ago)
        past_reset = datetime.utcnow() - timedelta(days=5)
        await setup_test_user(
            user_id=user_id,
            tier="plus",
            quota_limit=25,
            quota_used=18,
            reset_at=past_reset
        )
        
        # Call get_user_subscription (this should trigger dynamic reset)
        sub = await get_user_subscription(user_id)
        
        # Verify
        assert sub["quota_used"] == 0, f"Expected quota_used to be 0, got {sub['quota_used']}"
        assert sub["subscription_tier"] == "plus", f"Expected tier to be plus, got {sub['subscription_tier']}"
        
        # Parse reset date and verify it is in the future
        reset_str = sub["quota_reset_at"]
        if reset_str.endswith("Z"):
            reset_str = reset_str[:-1] + "+00:00"
        reset_dt = datetime.fromisoformat(reset_str)
        assert reset_dt > datetime.now(reset_dt.tzinfo), f"Expected reset date to be in the future, got {reset_str}"
        
        print("✅ Dynamic Quota Reset Test: PASSED")
        
    finally:
        # Restore original subscription
        if orig_sub:
            async with httpx.AsyncClient() as client:
                # remove read-only fields
                for k in ["updated_at", "created_at"]:
                    if k in orig_sub:
                        del orig_sub[k]
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/user_subscriptions",
                    json=orig_sub,
                    headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}
                )

async def test_webhook_idempotency():
    print("\n--- Test 2: Webhook Idempotency (Event Deduplication) ---")
    
    # We will simulate calling the webhook endpoint
    # First, make sure the processed_webhook_events is cleared for our test event id
    test_event_id = f"test-event-{uuid.uuid4()}"
    
    async with httpx.AsyncClient() as client:
        del_url = f"{SUPABASE_URL}/rest/v1/processed_webhook_events?event_id=eq.{test_event_id}"
        await client.delete(del_url, headers=HEADERS)

    # Let's craft a paddle webhook payload
    payload = {
        "event_id": test_event_id,
        "event_type": "subscription.updated",
        "data": {
            "id": "sub_test_12345",
            "status": "active",
            "custom_data": {
                "user_id": "00000000-0000-0000-0000-000000000000"
            },
            "items": [
                {
                    "price": {
                        "id": "pri_01kt4e1rqxnxb0yhxr1bv22jqv" # Plus Monthly
                    }
                }
            ]
        }
    }
    
    body = json.dumps(payload).encode('utf-8')
    ts = int(datetime.utcnow().timestamp())
    sig = generate_paddle_signature(ts, body)
    
    webhook_url = "http://localhost:8000/api/v1/billing/webhook"
    
    headers = {
        "Paddle-Signature": sig,
        "Content-Type": "application/json"
    }
    
    # Post first time
    async with httpx.AsyncClient() as client:
        try:
            res1 = await client.post(webhook_url, content=body, headers=headers)
            print(f"First webhook call response: {res1.status_code} {res1.text}")
            assert res1.status_code == 200, f"Expected 200, got {res1.status_code}"
            
            # Post second time with exact same event_id
            res2 = await client.post(webhook_url, content=body, headers=headers)
            print(f"Second webhook call response: {res2.status_code} {res2.text}")
            assert res2.status_code == 200, f"Expected 200, got {res2.status_code}"
            
            res_data = res2.json()
            assert res_data.get("status") == "ignored", "Expected status to be ignored"
            assert "Duplicate" in res_data.get("message", ""), "Expected Duplicate message"
            
            print("✅ Webhook Idempotency Test: PASSED")
            
        except Exception as e:
            print(f"❌ Webhook Idempotency Test failed: {str(e)}")
            print("Note: Make sure your FastAPI server is running on http://localhost:8000")
            
        finally:
            # Clean up
            async with httpx.AsyncClient() as client:
                del_url = f"{SUPABASE_URL}/rest/v1/processed_webhook_events?event_id=eq.{test_event_id}"
                await client.delete(del_url, headers=HEADERS)

async def test_quota_limits_enforcement():
    print("\n--- Test 3: Processing Quota Limit Enforcement ---")
    
    user_id = None
    async with httpx.AsyncClient() as client:
        url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?limit=1"
        res = await client.get(url, headers=HEADERS)
        if res.status_code == 200 and res.json():
            user_id = res.json()[0]['user_id']
            
    if not user_id:
        print("❌ Skip Test 3: No user exists in database to perform quota enforcement test.")
        return

    # Store original subscription details to restore later
    orig_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
    async with httpx.AsyncClient() as client:
        orig_res = await client.get(orig_url, headers=HEADERS)
        orig_sub = orig_res.json()[0] if orig_res.status_code == 200 and orig_res.json() else None

    try:
        # Setup quota limit exceeded (5/5)
        await setup_test_user(
            user_id=user_id,
            tier="free",
            quota_limit=5,
            quota_used=5,
            reset_at=datetime.utcnow() + timedelta(days=25)
        )
        
        # Request object
        req = ProcessVideoRequest(
            url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            user_id=user_id
        )
        
        try:
            await process_video_endpoint(req)
            print("❌ Processing Quota enforcement test: FAILED (did not raise 403)")
        except HTTPException as http_err:
            assert http_err.status_code == 403
            assert "monthly processing limit" in http_err.detail
            print("✅ Processing Quota enforcement test: PASSED")
        except Exception as e:
            print(f"❌ Unexpected exception type: {type(e)} {str(e)}")
        
    finally:
        # Restore original subscription
        if orig_sub:
            async with httpx.AsyncClient() as client:
                for k in ["updated_at", "created_at"]:
                    if k in orig_sub:
                        del orig_sub[k]
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/user_subscriptions",
                    json=orig_sub,
                    headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}
                )

async def test_grace_period_cancellation():
    print("\n--- Test 4: Grace Period Cancellation & Expiration ---")
    
    user_id = None
    async with httpx.AsyncClient() as client:
        url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?limit=1"
        res = await client.get(url, headers=HEADERS)
        if res.status_code == 200 and res.json():
            user_id = res.json()[0]['user_id']
            
    if not user_id:
        print("❌ Skip Test 4: No user exists in database to perform grace period test.")
        return

    # Store original subscription details to restore later
    orig_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
    async with httpx.AsyncClient() as client:
        orig_res = await client.get(orig_url, headers=HEADERS)
        orig_sub = orig_res.json()[0] if orig_res.status_code == 200 and orig_res.json() else None

    try:
        # Case A: Active Canceled Subscription (Grace Period)
        # Tier is Pro, Status is cancelled, but ends_at is 5 days in the future
        future_end = datetime.utcnow() + timedelta(days=5)
        payload_active = {
            "user_id": user_id,
            "subscription_tier": "pro",
            "subscription_status": "cancelled",
            "quota_limit": 50,
            "quota_used": 12,
            "quota_reset_at": (datetime.utcnow() + timedelta(days=20)).isoformat(),
            "ends_at": future_end.isoformat()
        }
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/user_subscriptions",
                json=payload_active,
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}
            )

        sub_active = await get_user_subscription(user_id)
        assert sub_active["subscription_tier"] == "pro", f"Expected active tier to remain pro, got {sub_active['subscription_tier']}"
        assert sub_active["subscription_status"] == "cancelled", f"Expected active status to remain cancelled, got {sub_active['subscription_status']}"
        
        # Case B: Expired Canceled Subscription
        # Tier is Pro, Status is cancelled, but ends_at was 5 minutes ago
        past_end = datetime.utcnow() - timedelta(minutes=5)
        payload_expired = {
            "user_id": user_id,
            "subscription_tier": "pro",
            "subscription_status": "cancelled",
            "quota_limit": 50,
            "quota_used": 12,
            "quota_reset_at": (datetime.utcnow() + timedelta(days=20)).isoformat(),
            "ends_at": past_end.isoformat()
        }
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/user_subscriptions",
                json=payload_expired,
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}
            )
            
        sub_expired = await get_user_subscription(user_id)
        assert sub_expired["subscription_tier"] == "free", f"Expected expired subscription to downgrade to free, got {sub_expired['subscription_tier']}"
        assert sub_expired["subscription_status"] == "active", f"Expected expired status to reset to active, got {sub_expired['subscription_status']}"
        
        print("✅ Grace Period Cancellation Test: PASSED")
        
    finally:
        # Restore original subscription
        if orig_sub:
            async with httpx.AsyncClient() as client:
                for k in ["updated_at", "created_at"]:
                    if k in orig_sub:
                        del orig_sub[k]
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/user_subscriptions",
                    json=orig_sub,
                    headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}
                )

async def main():
    print("🚀 Starting Production-Grade Billing Integration Tests...")
    await test_dynamic_quota_reset()
    await test_webhook_idempotency()
    await test_quota_limits_enforcement()
    await test_grace_period_cancellation()
    print("\n🏁 All tests completed.")

if __name__ == "__main__":
    asyncio.run(main())
