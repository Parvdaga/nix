"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Profile } from "@/types";
import Auth from "@/components/Auth";
import Onboarding from "@/components/Onboarding";
import PasscodeLock from "@/components/PasscodeLock";
import Dashboard from "@/components/Dashboard";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);

  // Monitor Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        fetchUserProfile(initialSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchUserProfile(newSession.user.id);
      } else {
        setProfile(null);
        setIsLocked(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, upi_id, pin_hash, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
      } else {
        // No profile found, user needs onboarding
        setProfile(null);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const handleOnboardingComplete = () => {
    if (session?.user) {
      setLoading(true);
      fetchUserProfile(session.user.id);
    }
  };

  const handleProfileUpdated = () => {
    if (session?.user) {
      fetchUserProfile(session.user.id);
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  // Rendering States
  if (loading) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          minHeight: "100%",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  // 1. User not logged in ➜ Auth Screen
  if (!session) {
    return <Auth />;
  }

  // 2. Logged in but profile doesn't exist ➜ Onboarding Wizard
  if (!profile) {
    return <Onboarding userId={session.user.id} onComplete={handleOnboardingComplete} />;
  }

  // 3. Profile exists but app is locked ➜ Security Passcode Lock
  if (isLocked) {
    return (
      <PasscodeLock
        pinHash={profile.pin_hash}
        userName={profile.name}
        onUnlock={handleUnlock}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Logged in, profile configured, unlocked ➜ Main Dashboard
  return (
    <Dashboard
      profile={profile}
      onLogout={handleLogout}
      onProfileUpdated={handleProfileUpdated}
    />
  );
}
