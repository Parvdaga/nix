"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hashPin } from "@/lib/security/crypto";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ContactlessIcon from "@mui/icons-material/Contactless";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

export default function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Info, Step 2: PIN Setup
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"set" | "confirm">("set");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNextStep = () => {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your display name.");
      return;
    }
    if (!upiId.trim() || !upiId.includes("@")) {
      setError("Please enter a valid UPI ID (e.g. name@bank).");
      return;
    }
    setStep(2);
  };

  const handleKeyPress = (num: string) => {
    setError(null);
    const target = pinStep === "set" ? pin : confirmPin;
    if (target.length >= 4) return;
    
    if (pinStep === "set") {
      setPin((prev) => prev + num);
    } else {
      setConfirmPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (pinStep === "set") {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (pinStep === "set") {
      setPin("");
    } else {
      setConfirmPin("");
    }
  };

  const handlePinSubmit = async () => {
    setError(null);
    if (pin.length < 4) {
      setError("PIN must be 4 digits.");
      return;
    }

    if (pinStep === "set") {
      setPinStep("confirm");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match. Try again.");
      setConfirmPin("");
      setPinStep("set");
      setPin("");
      return;
    }

    // Hash PIN and submit profile to Supabase
    setLoading(true);
    try {
      const pinHash = await hashPin(pin);
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        name: name.trim(),
        upi_id: upiId.trim(),
        pin_hash: pinHash,
      });

      if (profileError) throw profileError;


      onComplete();
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding.");
      setLoading(false);
      setStep(1);
      setPin("");
      setConfirmPin("");
      setPinStep("set");
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
      <Card variant="outlined" sx={{ border: "1px solid rgba(255, 255, 255, 0.06)" }}>
        <CardContent sx={{ p: 4 }}>
          {step === 1 ? (
            // STEP 1: Basic Profile Info
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Create Profile
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Please fill in your details to get started with splitting bills.
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                label="Your Name"
                fullWidth
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircleIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Your UPI ID"
                placeholder="name@okaxis"
                fullWidth
                variant="outlined"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                helperText="Required so friends can settle up with you directly."
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <ContactlessIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                variant="contained"
                onClick={handleNextStep}
                size="large"
                sx={{
                  py: 1.5,
                  fontSize: "1rem",
                  boxShadow: "0 6px 20px rgba(99, 102, 241, 0.25)",
                }}
              >
                Continue to PIN Lock
              </Button>
            </Box>
          ) : (
            // STEP 2: PIN Selection (Interactive Keypad)
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5 }}>
              <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  onClick={() => setStep(1)}
                  sx={{ minWidth: 0, p: 1, borderRadius: "50%", color: "text.secondary" }}
                >
                  <KeyboardBackspaceIcon />
                </Button>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {pinStep === "set" ? "Set Security PIN" : "Confirm Security PIN"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {pinStep === "set"
                      ? "Create a 4-digit passcode to lock payments and settings."
                      : "Re-enter your 4-digit passcode to verify."}
                  </Typography>
                </Box>
              </Box>

              {error && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: 3, width: "100%" }}>
                  {error}
                </Alert>
              )}

              {/* Dots display */}
              <Box sx={{ display: "flex", gap: 2, my: 2 }}>
                {[0, 1, 2, 3].map((index) => {
                  const currentLength = pinStep === "set" ? pin.length : confirmPin.length;
                  const isFilled = index < currentLength;
                  return (
                    <Box
                      key={index}
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: isFilled ? "primary.main" : "text.secondary",
                        bgcolor: isFilled ? "primary.main" : "transparent",
                        transition: "all 0.1s ease-in-out",
                        transform: isFilled ? "scale(1.1)" : "scale(1)",
                        boxShadow: isFilled ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none",
                      }}
                    />
                  );
                })}
              </Box>

              {/* Interactive Keypad */}
              <Box sx={{ width: "100%", maxWidth: 280, mt: 1 }}>
                <Grid container spacing={2}>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <Grid key={num} size={4} sx={{ display: "flex", justifyContent: "center" }}>
                      <Button
                        variant="outlined"
                        onClick={() => handleKeyPress(num)}
                        disabled={loading}
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          fontSize: "1.3rem",
                          fontWeight: 700,
                          borderColor: "rgba(255, 255, 255, 0.08)",
                          color: "text.primary",
                        }}
                      >
                        {num}
                      </Button>
                    </Grid>
                  ))}
                  <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                    <Button
                      onClick={handleClear}
                      disabled={loading}
                      sx={{ color: "error.main", fontWeight: 600 }}
                    >
                      Clear
                    </Button>
                  </Grid>
                  <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                    <Button
                      variant="outlined"
                      onClick={() => handleKeyPress("0")}
                      disabled={loading}
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        color: "text.primary",
                      }}
                    >
                      0
                    </Button>
                  </Grid>
                  <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                    <Button
                      onClick={handleBackspace}
                      disabled={loading}
                      sx={{ color: "text.secondary" }}
                    >
                      Delete
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Button
                variant="contained"
                onClick={handlePinSubmit}
                disabled={loading || (pinStep === "set" ? pin.length : confirmPin.length) < 4}
                fullWidth
                size="large"
                sx={{ mt: 2 }}
              >
                {pinStep === "set" ? "Next" : "Complete Signup"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
