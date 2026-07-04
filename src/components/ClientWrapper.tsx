"use client";

import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MobileFriendlyIcon from "@mui/icons-material/MobileFriendly";
import { NotificationProvider } from "./NotificationProvider";

// Create custom premium dark theme
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1", // Indigo
      light: "#818cf8",
      dark: "#4f46e5",
    },
    secondary: {
      main: "#10b981", // Emerald
      light: "#34d399",
      dark: "#059669",
    },
    error: {
      main: "#f43f5e", // Rose
      light: "#fb7185",
      dark: "#e11d48",
    },
    warning: {
      main: "#f59e0b", // Amber
      light: "#fbbf24",
      dark: "#d97706",
    },
    background: {
      default: "#090c15", // Deep dark slate
      paper: "#121829", // Glass/Card color
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 20px",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
          },
          "&.MuiButton-containedPrimary": {
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          },
          "&.MuiButton-containedSecondary": {
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "rgba(18, 24, 41, 0.65)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#121829",
          backgroundImage: "none",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 20,
        },
      },
    },
  },
});

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully with scope:", reg.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  }, []);

  if (!mounted) {
    return (
      <div style={{ backgroundColor: "#090c15", minHeight: "100vh" }} />
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      {/* Outer wrapper: Centered on desktop, full-width on mobile */}
      <Box
        sx={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          justifyContent: "center",
          background: {
            xs: "none",
            md: "radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, rgba(9, 12, 21, 0) 50%)"
          },
          bgcolor: "background.default",
          p: { xs: 0, md: 4 },
          gap: { xs: 0, md: 6 },
        }}
      >
        {/* Left panel: Landing description - hidden on mobile */}
        <Box
          sx={{
            maxWidth: 450,
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 36, color: "primary.main" }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary" }}>
              Nix
            </Typography>
          </Box>
          
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.2, color: "text.primary" }}>
            Nix intermediate debts. <br />
            <span style={{ color: "#6366f1" }}>Pay directly.</span>
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary", fontSize: "1.1rem" }}>
            Tired of Splitwise bugs? Nix calculates the net balance between friends and simplifies transactions.
            Open custom UPI deep links with auto-filled amounts directly on your phone, or scan instant QR codes.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}>
            <MobileFriendlyIcon sx={{ color: "secondary.main", fontSize: 28 }} />
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Designed exclusively for mobile. Install as a PWA from your phone's browser!
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 4,
              bgcolor: "rgba(255, 255, 255, 0.02)",
              border: "1px dashed rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
              💻 Desktop Simulation Mode
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              You are viewing the desktop landing page. Use the interactive simulated iPhone frame on the right to test Nix directly, or open this URL on your smartphone browser to install it.
            </Typography>
          </Box>
        </Box>

        {/* Right panel: iPhone Emulator Frame - fills screen on mobile */}
        <Box
          sx={{
            position: "relative",
            width: { xs: "100%", md: 390 },
            height: { xs: "100dvh", md: 844 },
            borderRadius: { xs: 0, md: "50px" },
            border: { xs: "none", md: "12px solid #1f2937" },
            boxShadow: {
              xs: "none",
              md: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 2px rgba(255, 255, 255, 0.05)"
            },
            overflow: "hidden",
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* Dynamic Island Notch: hidden on mobile */}
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 110,
              height: 30,
              borderRadius: "15px",
              bgcolor: "#000000",
              zIndex: 9999,
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
            }}
          >
            {/* Speaker capsule and camera elements */}
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#111", border: "1px solid #222" }} />
            <Box sx={{ width: 45, height: 4, borderRadius: "2px", bgcolor: "#1a1a1a" }} />
          </Box>

          {/* Inner App Container: spacing offset for Dynamic Island notch on desktop only */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", pt: { xs: 0, md: 6 } }}>
            <NotificationProvider>{children}</NotificationProvider>
          </Box>

          {/* iOS Home Indicator Bar: hidden on mobile */}
          <Box
            sx={{
              height: 20,
              width: "100%",
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              alignItems: "center",
              bgcolor: "transparent",
              zIndex: 999,
              pb: 1,
            }}
          >
            <Box sx={{ width: 140, height: 5, borderRadius: "2.5px", bgcolor: "rgba(255, 255, 255, 0.3)" }} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
