import os
import hmac
import hashlib
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Header
import httpx

router = APIRouter()
logger = logging.getLogger("billing")

# Webhook Secret from Paddle Dashboard
PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET", "")

# Supabase details
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Price IDs (configured via env variables)
PRICE_ID_PLUS_MONTHLY = os.getenv("PADDLE_PRICE_ID_PLUS_MONTHLY", "")
PRICE_ID_PLUS_ANNUAL = os.getenv("PADDLE_PRICE_ID_PLUS_ANNUAL", "")
PRICE_ID_PRO_MONTHLY = os.getenv("PADDLE_PRICE_ID_PRO_MONTHLY", "")
PRICE_ID_PRO_ANNUAL = os.getenv("PADDLE_PRICE_ID_PRO_ANNUAL", "")

def add_months(sourcedate, months):
    import calendar
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return sourcedate.replace(year=year, month=month, day=day)


def get_tier_from_price_id(price_id: str) -> str:
    """Maps a Paddle Price ID to the app subscription tier."""
    if price_id in (PRICE_ID_PLUS_MONTHLY, PRICE_ID_PLUS_ANNUAL):
        return "plus"
    elif price_id in (PRICE_ID_PRO_MONTHLY, PRICE_ID_PRO_ANNUAL):
        return "pro"
    return "free"

def get_quota_limit_from_tier(tier: str) -> int:
    """Maps tier to monthly video processing quota limit."""
    if tier == "plus":
        return 25
    elif tier == "pro":
        return 50
    return 5 # Free tier standard limit

async def update_user_subscription(
    user_id: str,
    tier: str,
    status: str,
    customer_id: str,
    subscription_id: str,
    ends_at: str = None,
    cancel_url: str = None
):
    """Securely updates the user's subscription metadata in Supabase."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.error("Supabase config is missing in backend env.")
        return False

    url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # Map Paddle status to DB status
    db_status = "active"
    if status == "canceled":
        db_status = "cancelled"
    elif status in ("paused", "past_due", "trialing", "inactive", "cancelled"):
        db_status = status

    quota_limit = get_quota_limit_from_tier(tier)

    payload = {
        "subscription_tier": tier,
        "subscription_status": db_status,
        "paddle_customer_id": customer_id,
        "paddle_subscription_id": subscription_id,
        "quota_limit": quota_limit,
        "updated_at": datetime.utcnow().isoformat()
    }

    if ends_at:
        payload["ends_at"] = ends_at
    if cancel_url:
        payload["cancel_url"] = cancel_url

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Sending Supabase update for user {user_id} -> {tier} ({db_status})")
            response = await client.patch(url, json=payload, headers=headers)
            if response.status_code >= 400:
                logger.error(f"Supabase patch failed: {response.status_code} - {response.text}")
                return False
            logger.info(f"Successfully updated Supabase user_subscriptions for {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error communicating with Supabase API: {str(e)}")
            return False

@router.post("/webhook")
async def paddle_webhook_endpoint(request: Request, paddle_signature: str = Header(None)):
    """Receives, verifies, and processes Paddle webhook events."""
    if not paddle_signature:
        logger.warning("Rejected webhook: missing Paddle-Signature header.")
        raise HTTPException(status_code=400, detail="Missing signature header")

    if not PADDLE_WEBHOOK_SECRET:
        logger.error("PADDLE_WEBHOOK_SECRET is not configured.")
        raise HTTPException(status_code=500, detail="Server webhook signing key misconfigured")

    # 1. Capture raw body
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    # 2. Parse signature components
    try:
        parts = dict(item.split("=") for item in paddle_signature.split(";"))
        ts = parts["ts"]
        h1 = parts["h1"]
    except (ValueError, KeyError):
        logger.warning(f"Rejected webhook: invalid signature format: {paddle_signature}")
        raise HTTPException(status_code=400, detail="Invalid signature format")

    # 3. Verify signature validity
    signed_payload = f"{ts}:{body_str}"
    expected_hmac = hmac.new(
        key=PADDLE_WEBHOOK_SECRET.encode("utf-8"),
        msg=signed_payload.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hmac, h1):
        logger.warning("Rejected webhook: Signature mismatch.")
        raise HTTPException(status_code=401, detail="Invalid signature verification")

    # 4. Parse event details
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = event.get("event_type")
    data = event.get("data", {})
    event_id = event.get("event_id")
    
    logger.info(f"Verified Paddle Webhook Event: {event_type} (ID: {event_id})")

    # Webhook Idempotency (Event Deduplication)
    if event_id:
        check_url = f"{SUPABASE_URL}/rest/v1/processed_webhook_events?event_id=eq.{event_id}"
        chk_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient() as client:
            try:
                check_res = await client.get(check_url, headers=chk_headers)
                if check_res.status_code == 200 and check_res.json():
                    logger.info(f"Duplicate webhook event ignored: {event_id}")
                    return {"status": "ignored", "message": "Duplicate event ID"}
                
                # Insert event_id to prevent duplicates
                insert_url = f"{SUPABASE_URL}/rest/v1/processed_webhook_events"
                await client.post(insert_url, json={"event_id": event_id}, headers=chk_headers)
            except Exception as chk_err:
                logger.error(f"Error checking/logging webhook event id: {str(chk_err)}")


    # Process subscription lifecycle events
    if event_type in ("subscription.created", "subscription.updated", "subscription.activated", "subscription.past_due"):
        custom_data = data.get("custom_data", {})
        user_id = custom_data.get("user_id")

        if not user_id:
            logger.warning(f"Paddle event {event_type} lacks user_id custom data. Ignoring.")
            return {"status": "ignored", "message": "No user_id provided"}

        sub_id = data.get("id")
        cust_id = data.get("customer_id")
        status = data.get("status")
        
        # Get active price ID
        items = data.get("items", [])
        price_id = ""
        if items:
            price_id = items[0].get("price", {}).get("id", "")

        tier = get_tier_from_price_id(price_id)
        
        # End date formatting
        ends_at = None
        billing_period = data.get("current_billing_period")
        if billing_period:
            ends_at = billing_period.get("ends_at")

        cancel_url = data.get("management_urls", {}).get("cancel")

        success = await update_user_subscription(
            user_id=user_id,
            tier=tier,
            status=status,
            customer_id=cust_id,
            subscription_id=sub_id,
            ends_at=ends_at,
            cancel_url=cancel_url
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to sync subscription status to DB")

    elif event_type == "subscription.canceled":
        custom_data = data.get("custom_data", {})
        user_id = custom_data.get("user_id")

        if user_id:
            sub_id = data.get("id")
            cust_id = data.get("customer_id")
            
            # Subscriptions that are cancelled immediately should be set to free.
            # If the user cancelled renewal, we keep them as Pro/Plus until the end of current cycle.
            # Paddle reports status='canceled' when the subscription actually expires.
            success = await update_user_subscription(
                user_id=user_id,
                tier="free",
                status="cancelled",
                customer_id=cust_id,
                subscription_id=sub_id,
                ends_at=datetime.utcnow().isoformat()
            )
            if not success:
                raise HTTPException(status_code=500, detail="Failed to mark subscription as cancelled")

    return {"status": "success", "message": "Webhook processed successfully"}


async def get_user_subscription(user_id: str) -> dict:
    """Fetches user subscription details. Defaults to Free tier if not found or on error."""
    default_sub = {
        "subscription_tier": "free",
        "subscription_status": "active",
        "quota_limit": 5,
        "quota_used": 0
    }
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not user_id:
        return default_sub

    url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data:
                    sub = data[0]
                    
                    # Dynamic quota anniversary reset check
                    reset_str = sub.get("quota_reset_at")
                    if reset_str:
                        if reset_str.endswith("Z"):
                            reset_str = reset_str[:-1] + "+00:00"
                        elif "+" not in reset_str and "-" not in reset_str[10:]:
                            reset_str = reset_str + "+00:00"
                        if " " in reset_str:
                            reset_str = reset_str.replace(" ", "T")
                            
                        try:
                            quota_reset_at = datetime.fromisoformat(reset_str)
                            now = datetime.now(quota_reset_at.tzinfo)
                            if now >= quota_reset_at:
                                new_reset = quota_reset_at
                                while now >= new_reset:
                                    new_reset = add_months(new_reset, 1)
                                
                                # Update database to reset quota
                                update_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
                                update_payload = {
                                    "quota_used": 0,
                                    "quota_reset_at": new_reset.isoformat(),
                                    "updated_at": datetime.utcnow().isoformat()
                                }
                                await client.patch(update_url, json=update_payload, headers=headers)
                                
                                # Update local dictionary reference to return the reset values
                                sub["quota_used"] = 0
                                sub["quota_reset_at"] = new_reset.isoformat()
                                logger.info(f"Anniversary quota reset triggered for user {user_id}. Next reset: {new_reset.isoformat()}")
                        except Exception as reset_err:
                            logger.error(f"Error executing dynamic quota reset check: {str(reset_err)}")

                    # Active cancelled subscription grace period expiration check
                    ends_at_str = sub.get("ends_at")
                    status = sub.get("subscription_status")
                    tier = sub.get("subscription_tier", "free")
                    
                    if ends_at_str and status in ("cancelled", "paused") and tier != "free":
                        if ends_at_str.endswith("Z"):
                            ends_at_str = ends_at_str[:-1] + "+00:00"
                        elif "+" not in ends_at_str and "-" not in ends_at_str[10:]:
                            ends_at_str = ends_at_str + "+00:00"
                        if " " in ends_at_str:
                            ends_at_str = ends_at_str.replace(" ", "T")
                        try:
                            ends_at_dt = datetime.fromisoformat(ends_at_str)
                            now = datetime.now(ends_at_dt.tzinfo)
                            if now >= ends_at_dt:
                                downgrade_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
                                downgrade_payload = {
                                    "subscription_tier": "free",
                                    "subscription_status": "active",
                                    "quota_limit": 5,
                                    "cancel_url": None,
                                    "updated_at": datetime.utcnow().isoformat()
                                }
                                await client.patch(downgrade_url, json=downgrade_payload, headers=headers)
                                sub["subscription_tier"] = "free"
                                sub["subscription_status"] = "active"
                                sub["quota_limit"] = 5
                                sub["cancel_url"] = None
                                logger.info(f"Grace period ended. Downgraded user {user_id} to Free tier.")
                        except Exception as grace_err:
                            logger.error(f"Error executing grace period expiration check: {str(grace_err)}")
                            
                    return sub
                else:
                    # Create default row if missing
                    create_url = f"{SUPABASE_URL}/rest/v1/user_subscriptions"
                    headers_prefer = {**headers, "Prefer": "return=representation"}
                    await client.post(create_url, json={"user_id": user_id, "subscription_tier": "free", "quota_limit": 5}, headers=headers_prefer)
            return default_sub

        except Exception as e:
            logger.error(f"Error fetching user subscription: {str(e)}")
            return default_sub

async def increment_user_quota(user_id: str, current_quota: int) -> bool:
    """Increments the quota_used counter for the user."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not user_id:
        return False

    url = f"{SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.{user_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.patch(url, json={"quota_used": current_quota + 1}, headers=headers)
            return response.status_code < 400
        except Exception as e:
            logger.error(f"Error incrementing user quota: {str(e)}")
            return False
