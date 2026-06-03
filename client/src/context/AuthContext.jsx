import React, { createContext, useState, useCallback, useEffect, useContext } from "react";
import { supabase } from "../supabaseClient";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const fetchSubscription = useCallback(async (userId) => {
    if (!userId) {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }
    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
      }
      setSubscription(data ?? {
        subscription_tier: "free",
        subscription_status: "active",
        quota_limit: 5,
        quota_used: 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (user) {
      await fetchSubscription(user.id);
    }
  }, [user, fetchSubscription]);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchSubscription(currentUser.id);
      } else {
        setSubscriptionLoading(false);
      }
      setAuthLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchSubscription(currentUser.id);
        } else {
          setSubscription(null);
          setSubscriptionLoading(false);
        }
      }
    );

    return () => authSub.unsubscribe();
  }, [fetchSubscription]);

  const signInWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = {
    user,
    authLoading,
    subscription,
    subscriptionLoading,
    refreshSubscription,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
