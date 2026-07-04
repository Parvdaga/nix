"use client";

import React, { useMemo, useState } from "react";
import { simplifyDebts } from "@/lib/utils/split";
import { buildUpiLink } from "@/lib/payments/upi";
import { hashPin } from "@/lib/security/crypto";
import { supabase } from "@/lib/supabaseClient";
import { GroupMember, Expense, Transaction } from "@/types";
import { triggerPushNotifications } from "@/lib/pushNotifications";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Drawer from "@mui/material/Drawer";
import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CallMadeIcon from "@mui/icons-material/CallMade";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

interface SettleUpTabProps {
  groupId: string;
  groupName: string;
  members: GroupMember[];
  expenses: Expense[];
  currentUserId: string;
  currentUserPinHash: string;
  refreshTrigger: number;
  onSettled: () => void;
}

export default function SettleUpTab({
  groupId,
  groupName,
  members,
  expenses,
  currentUserId,
  currentUserPinHash,
  onSettled,
}: SettleUpTabProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // UPI QR states
  const [upiUrl, setUpiUrl] = useState("");
  const [selectedUpiId, setSelectedUpiId] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Settlement security PIN states
  const [pinMode, setPinMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentUserMember = members.find((member) => member.profile_id === currentUserId);
  const currentUserMemberId = currentUserMember?.id ?? null;
  const transactions = useMemo(
    () => (members.length > 0 ? simplifyDebts(members, expenses) : []),
    [members, expenses]
  );

  // Generate UPI payment URL and QR Code
  const generateUpiData = async (tx: Transaction, upiAddress: string) => {
    const upiLink = buildUpiLink({
      amount: tx.amount,
      payeeAddress: upiAddress,
      payeeName: tx.toMember.name,
      transactionNote: `Nix Settlement - ${tx.fromMember.name}`,
    });

    setUpiUrl(upiLink);

    try {
      const qrUrl = await QRCode.toDataURL(upiLink, {
        margin: 1.5,
        width: 200,
        color: {
          dark: "#0b0f19",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(qrUrl);
    } catch (err) {
      console.error("QR Code generation error:", err);
    }
  };

  // Open drawer and generate QR Code
  const handleOpenSettleDrawer = async (tx: Transaction) => {
    setSelectedTx(tx);
    setDrawerOpen(true);
    setPinMode(false);
    setPinInput("");
    setPinError(null);
    setCopiedUpi(false);

    // Get list of UPI IDs (split by comma)
    const upiList = tx.toMember.upi_id
      ? tx.toMember.upi_id.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const defaultUpi = upiList[0] || "";
    setSelectedUpiId(defaultUpi);

    // Build UPI deep link and QR data
    await generateUpiData(tx, defaultUpi);
  };

  const handleSelectUpiIdChange = async (upiAddress: string) => {
    setSelectedUpiId(upiAddress);
    if (selectedTx) {
      await generateUpiData(selectedTx, upiAddress);
    }
  };

  const handleCopyUpi = () => {
    if (selectedUpiId) {
      navigator.clipboard.writeText(selectedUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handlePinKeyPress = (num: string) => {
    setPinError(null);
    if (pinInput.length >= 4) return;
    setPinInput((prev) => prev + num);
  };

  const handlePinBackspace = () => {
    setPinError(null);
    setPinInput((prev) => prev.slice(0, -1));
  };

  // Execute settlement in database
  const handleConfirmSettlement = async () => {
    if (!selectedTx) return;

    setLoading(true);
    setPinError(null);

    try {
      // Validate PIN
      const inputHash = await hashPin(pinInput);
      if (inputHash !== currentUserPinHash) {
        setPinError("Incorrect security PIN. Access denied.");
        setPinInput("");
        setLoading(false);
        return;
      }

      // Record settlement expense
      // Payer is the debtor (selectedTx.fromMember.id)
      // Split recipient is the creditor (selectedTx.toMember.id) who "owes" the split
      const { data: expData, error: expError } = await supabase
        .from("expenses")
        .insert({
          group_id: groupId,
          title: `Settled: ${selectedTx.fromMember.name} ➜ ${selectedTx.toMember.name}`,
          amount: selectedTx.amount,
          payer_member_id: selectedTx.fromMember.id,
          category: "Others",
          date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (expError) throw expError;

      const { error: splitError } = await supabase.from("expense_splits").insert({
        expense_id: expData.id,
        member_id: selectedTx.toMember.id,
        amount_owed: selectedTx.amount,
      });

      if (splitError) throw splitError;

      // Trigger push notification to other group members
      triggerPushNotifications(
        groupId,
        `Debt Settled in ${groupName}`,
        `${selectedTx.fromMember.name} settled ₹${selectedTx.amount} with ${selectedTx.toMember.name}`,
        currentUserId
      );

      // Blast Confetti!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#6366f1", "#10b981", "#ffeb3b"],
      });

      setDrawerOpen(false);
      onSettled();
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : "Failed to log settlement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
        Netted Settlements
      </Typography>

      <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {transactions.map((tx, idx) => {
          const isCurrentUserDebtor = tx.fromMember.id === currentUserMemberId;
          const isCurrentUserCreditor = tx.toMember.id === currentUserMemberId;
          
          return (
            <Card
              key={idx}
              variant="outlined"
              onClick={() => isCurrentUserDebtor ? handleOpenSettleDrawer(tx) : undefined}
              sx={{
                p: 2.5,
                borderRadius: 4,
                cursor: isCurrentUserDebtor ? "pointer" : "default",
                borderColor: isCurrentUserDebtor
                  ? "rgba(244, 63, 94, 0.25)"
                  : isCurrentUserCreditor
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(255, 255, 255, 0.05)",
                bgcolor: isCurrentUserDebtor
                  ? "rgba(244, 63, 94, 0.03)"
                  : isCurrentUserCreditor
                  ? "rgba(16, 185, 129, 0.03)"
                  : "rgba(18, 24, 41, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                  {tx.fromMember.name}
                </Typography>
                <ArrowForwardIcon sx={{ color: "text.secondary", fontSize: 16 }} />
                <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                  {tx.toMember.name}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 850, color: isCurrentUserDebtor ? "error.main" : "success.main" }}>
                  ₹{tx.amount}
                </Typography>
                {isCurrentUserDebtor ? (
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderRadius: 3,
                      borderColor: "error.main",
                      color: "error.main",
                    }}
                  >
                    Pay
                  </Button>
                ) : null}
              </Box>
            </Card>
          );
        })}

        {transactions.length === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 1.5 }}>
            <CheckCircleIcon sx={{ fontSize: 54, color: "success.main", opacity: 0.8 }} />
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Group is fully settled. No debts!
            </Typography>
          </Box>
        )}
      </Box>

      {/* Settle Up Slider Drawer */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              bgcolor: "#121829",
              maxHeight: "92%",
              overflowY: "auto",
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            },
          },
        }}
      >
        <Box sx={{ width: 42, height: 4, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, mb: 3 }} />

        {selectedTx && (
          <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Confirm Payment
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedTx.fromMember.name}</Typography>
              <ArrowForwardIcon sx={{ color: "text.secondary" }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedTx.toMember.name}</Typography>
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 900, color: "primary.main" }}>
              ₹{selectedTx.amount}
            </Typography>

            {!pinMode ? (
              // STEP 1: UPI links and QR code display
              <>
                {selectedTx.toMember.upi_id ? (
                  <>
                    {/* Display QR Code */}
                    {qrCodeDataUrl && (
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: "#fff",
                          borderRadius: 4,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        }}
                      >
                        <img src={qrCodeDataUrl} alt="UPI QR Code" style={{ width: 170, height: 170, display: "block" }} />
                      </Box>
                    )}

                    <Typography variant="caption" sx={{ color: "text.secondary", mt: -0.5 }}>
                      Scan QR code using GPay, PhonePe, or Paytm
                    </Typography>

                    {/* Mobile Deep link intent */}
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<CallMadeIcon />}
                      onClick={() => {
                        window.location.href = upiUrl;
                      }}
                      sx={{ py: 1.5, mt: 1 }}
                    >
                      Pay via Mobile UPI App
                    </Button>

                    <Box sx={{ width: "100%", mt: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                        Recipient UPI ID:
                      </Typography>
                      {selectedTx.toMember.upi_id && selectedTx.toMember.upi_id.includes(",") ? (
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedUpiId}
                              onChange={(e) => handleSelectUpiIdChange(e.target.value)}
                              sx={{ borderRadius: 3.5, bgcolor: "rgba(255,255,255,0.02)" }}
                            >
                              {selectedTx.toMember.upi_id.split(",").map((upi) => {
                                const trimmedUpi = upi.trim();
                                return (
                                  <MenuItem key={trimmedUpi} value={trimmedUpi}>
                                    {trimmedUpi}
                                  </MenuItem>
                                );
                              })}
                            </Select>
                          </FormControl>
                          <Button
                            variant="outlined"
                            size="medium"
                            onClick={handleCopyUpi}
                            sx={{ minWidth: 0, px: 1.5, py: 1, borderRadius: 3.5, borderColor: "rgba(255,255,255,0.12)" }}
                          >
                            {copiedUpi ? "Copied" : "Copy"}
                          </Button>
                        </Box>
                      ) : (
                        <Card
                          variant="outlined"
                          sx={{
                            px: 2.5,
                            py: 1.5,
                            borderRadius: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            bgcolor: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                            {selectedUpiId}
                          </Typography>
                          <Button
                            size="small"
                            onClick={handleCopyUpi}
                            startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                            sx={{ minWidth: 0, px: 1, py: 0.5 }}
                          >
                            {copiedUpi ? "Copied" : "Copy"}
                          </Button>
                        </Card>
                      )}
                    </Box>
                  </>
                ) : (
                  <Alert severity="warning" sx={{ width: "100%", borderRadius: 3 }}>
                    This member does not have a registered UPI ID. Please copy details or ask them to add their UPI ID in settings.
                  </Alert>
                )}

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setPinMode(true)}
                  sx={{ py: 1.2, mt: 1, borderColor: "rgba(255,255,255,0.12)", color: "text.primary" }}
                >
                  Mark as Settled manually
                </Button>
              </>
            ) : (
              // STEP 2: Verify PIN keypad
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5, width: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LockOpenIcon sx={{ color: "primary.main" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Enter your 4-digit PIN to confirm settlement
                  </Typography>
                </Box>

                {pinError && (
                  <Alert severity="error" variant="outlined" sx={{ width: "100%", borderRadius: 3 }}>
                    {pinError}
                  </Alert>
                )}

                {/* Dot fields */}
                <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = index < pinInput.length;
                    return (
                      <Box
                        key={index}
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "2px solid",
                          borderColor: isFilled ? "primary.main" : "text.secondary",
                          bgcolor: isFilled ? "primary.main" : "transparent",
                          transition: "all 0.1s ease",
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Digital PIN Pad */}
                <Box sx={{ width: "100%", maxSquare: 250 }}>
                  <Grid container spacing={1.5}>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <Grid key={num} size={4} sx={{ display: "flex", justifyContent: "center" }}>
                        <Button
                          variant="outlined"
                          onClick={() => handlePinKeyPress(num)}
                          disabled={loading}
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            fontSize: "1.2rem",
                            fontWeight: 700,
                            color: "text.primary",
                            borderColor: "rgba(255, 255, 255, 0.05)",
                          }}
                        >
                          {num}
                        </Button>
                      </Grid>
                    ))}
                    <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                      <Button onClick={() => setPinMode(false)} disabled={loading} sx={{ color: "text.secondary" }}>
                        Back
                      </Button>
                    </Grid>
                    <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                      <Button
                        variant="outlined"
                        onClick={() => handlePinKeyPress("0")}
                        disabled={loading}
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          fontSize: "1.2rem",
                          fontWeight: 700,
                          color: "text.primary",
                          borderColor: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        0
                      </Button>
                    </Grid>
                    <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                      <Button onClick={handlePinBackspace} disabled={loading} sx={{ color: "text.secondary" }}>
                        Del
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  disabled={loading || pinInput.length < 4}
                  onClick={handleConfirmSettlement}
                  sx={{ py: 1.5, mt: 1 }}
                >
                  Confirm & Settle Up
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
