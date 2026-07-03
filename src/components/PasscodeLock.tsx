"use client";

import React, { useState } from "react";
import { hashPin } from "@/lib/security/crypto";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import LockIcon from "@mui/icons-material/Lock";
import PinIcon from "@mui/icons-material/Pin";

interface PasscodeLockProps {
  pinHash: string;
  userName: string;
  onUnlock: () => void;
  onLogout: () => void;
}

export default function PasscodeLock({ pinHash, userName, onUnlock, onLogout }: PasscodeLockProps) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4) return;
    setError(false);
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 4) {
      // Validate PIN
      const inputHash = await hashPin(newPin);
      if (inputHash === pinHash) {
        onUnlock();
      } else {
        // Trigger shake effect and reset
        setShake(true);
        setError(true);
        setTimeout(() => {
          setShake(false);
          setPin("");
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(false);
    setPin("");
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        px: 4,
        py: 6,
        bgcolor: "#090c15",
        position: "relative",
      }}
    >
      {/* Top Section */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 6, gap: 1 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            bgcolor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.5,
          }}
        >
          <LockIcon sx={{ fontSize: 24, color: error ? "error.main" : "primary.main" }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, textAlign: "center" }}>
          Welcome back, {userName.split(" ")[0]}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem", textAlign: "center" }}>
          {error ? "Incorrect Passcode. Try again." : "Enter your 4-digit security PIN to unlock."}
        </Typography>
      </Box>

      {/* Center Section: Dots Display */}
      <Box
        sx={{
          display: "flex",
          gap: 2.5,
          my: 4,
          animation: shake ? "shake 0.4s ease-in-out" : "none",
          "@keyframes shake": {
            "0%, 100%": { transform: "translateX(0)" },
            "20%, 60%": { transform: "translateX(-8px)" },
            "40%, 80%": { transform: "translateX(8px)" },
          },
        }}
      >
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < pin.length;
          return (
            <Box
              key={index}
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "2.5px solid",
                borderColor: error ? "error.main" : isFilled ? "primary.main" : "text.secondary",
                bgcolor: error ? "error.main" : isFilled ? "primary.main" : "transparent",
                transition: "all 0.1s ease-in-out",
                transform: isFilled ? "scale(1.1)" : "scale(1)",
                boxShadow: isFilled && !error ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
              }}
            />
          );
        })}
      </Box>

      {/* Bottom Section: Keypad */}
      <Box sx={{ width: "100%", maxWidth: 280, mb: 2 }}>
        <Grid container spacing={2}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <Grid key={num} size={4} sx={{ display: "flex", justifyContent: "center" }}>
              <Button
                variant="outlined"
                onClick={() => handleKeyPress(num)}
                sx={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  borderColor: "rgba(255, 255, 255, 0.06)",
                  bgcolor: "rgba(255, 255, 255, 0.01)",
                  color: "text.primary",
                  "&:active": {
                    bgcolor: "rgba(99, 102, 241, 0.1)",
                    borderColor: "primary.main",
                  },
                }}
              >
                {num}
              </Button>
            </Grid>
          ))}
          <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              onClick={handleClear}
              sx={{ color: "text.secondary", fontSize: "0.85rem", fontWeight: 600 }}
            >
              Clear
            </Button>
          </Grid>
          <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="outlined"
              onClick={() => handleKeyPress("0")}
              sx={{
                width: 62,
                height: 62,
                borderRadius: "50%",
                fontSize: "1.4rem",
                fontWeight: 700,
                borderColor: "rgba(255, 255, 255, 0.06)",
                bgcolor: "rgba(255, 255, 255, 0.01)",
                color: "text.primary",
                "&:active": {
                  bgcolor: "rgba(99, 102, 241, 0.1)",
                  borderColor: "primary.main",
                },
              }}
            >
              0
            </Button>
          </Grid>
          <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              onClick={handleBackspace}
              sx={{ color: "text.secondary", fontSize: "0.85rem", fontWeight: 600 }}
            >
              Delete
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Logout button at the very bottom */}
      <Button
        variant="text"
        onClick={onLogout}
        sx={{ color: "error.main", opacity: 0.8, fontSize: "0.8rem", mt: 1 }}
      >
        Sign Out from Account
      </Button>
    </Box>
  );
}
