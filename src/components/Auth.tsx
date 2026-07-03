"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

export default function Auth() {
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Login, 1 = Signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue as 0 | 1);
    setError(null);
    setInfo(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (activeTab === 1) {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        
        if (data.user && data.session === null) {
          setInfo("Sign up successful! Please check your email for the confirmation link.");
        } else if (data.user && data.session) {
          setInfo("Account created successfully! Loading profile...");
        }
      } else {
        // Login
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        px: 3,
        py: 4,
        background: "radial-gradient(circle at top, rgba(99, 102, 241, 0.08) 0%, rgba(9, 12, 21, 0) 60%)",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 4, gap: 1 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: "18px",
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
          }}
        >
          <AccountBalanceWalletIcon sx={{ fontSize: 32, color: "#fff" }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
          Nix
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Nix intermediate debts, pay directly via UPI
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ border: "1px solid rgba(255, 255, 255, 0.06)", bgcolor: "rgba(22, 28, 47, 0.55)" }}>
        <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.06)" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Login" sx={{ fontWeight: 600 }} />
            <Tab label="Sign Up" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleAuth}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {error && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: 3 }}>
                  {error}
                </Alert>
              )}

              {info && (
                <Alert severity="success" variant="outlined" sx={{ borderRadius: 3 }}>
                  {info}
                </Alert>
              )}

              <TextField
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.5,
                  fontSize: "1rem",
                  boxShadow: "0 6px 20px rgba(99, 102, 241, 0.2)",
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : activeTab === 0 ? (
                  "Log In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
