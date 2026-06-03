-- Migration to setup billing schema and tracking quotas

-- Drop existing table if exists
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- Create table to track subscriptions and processing quotas
CREATE TABLE public.user_subscriptions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus', 'pro')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'paused', 'cancelled', 'inactive')),
    paddle_customer_id TEXT,
    paddle_subscription_id TEXT,
    ends_at TIMESTAMP WITH TIME ZONE,
    quota_limit INT NOT NULL DEFAULT 5,
    quota_used INT NOT NULL DEFAULT 0,
    quota_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own subscription data
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a function to automatically initialize subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_subscriptions (user_id, subscription_tier, quota_limit)
    VALUES (NEW.id, 'free', 5);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user_subscription when a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Backfill existing users (if any)
INSERT INTO public.user_subscriptions (user_id, subscription_tier, quota_limit)
SELECT id, 'free', 5
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
