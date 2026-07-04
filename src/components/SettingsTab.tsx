"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNotification } from "./NotificationProvider";
import { requestNotificationPermission } from "@/lib/pushNotifications";
import Switch from "@mui/material/Switch";
import { hashPin } from "@/lib/security/crypto";
import { buildUpiLink } from "@/lib/payments/upi";
import { simplifyDebts } from "@/lib/utils/split";
import { GroupMember, Expense, Profile } from "@/types";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ContactlessIcon from "@mui/icons-material/Contactless";
import ShareIcon from "@mui/icons-material/Share";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LockIcon from "@mui/icons-material/Lock";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import EditIcon from "@mui/icons-material/Edit";

interface SettingsTabProps {
  profile: Profile;
  groupName: string | null;
  groupId: string | null;
  groupInviteCode: string | null;
  members: GroupMember[];
  onProfileUpdated: () => void;
  onLogout: () => void;
  onGroupUpdated?: () => void;
}

export default function SettingsTab({
  profile,
  groupName,
  groupId,
  groupInviteCode,
  members,
  expenses,
  onProfileUpdated,
  onLogout,
  onGroupUpdated,
}: SettingsTabProps & { expenses: Expense[] }) {
  const { showNotification } = useNotification();

  // Push Notifications state and handler
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleTogglePush = async () => {
    try {
      if (pushEnabled) {
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("profile_id", profile.id);
        if (error) throw error;
        setPushEnabled(false);
        showNotification("Push notifications disabled.", "info");
      } else {
        await requestNotificationPermission(profile.id);
        setPushEnabled(true);
        showNotification("Push notifications enabled successfully!", "success");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to update notification settings.", "error");
    }
  };

  // Profile edit states
  const [name, setName] = useState(profile.name);
  const [upiIds, setUpiIds] = useState<string[]>(
    profile.upi_id ? profile.upi_id.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  const [newUpiInput, setNewUpiInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // PIN change states
  const [changePin, setChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  
  // PIN security verification states
  const [pinVerifyOpen, setPinVerifyOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // General messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group name edit states
  const [groupNameInput, setGroupNameInput] = useState(groupName || "");
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupSaveLoading, setGroupSaveLoading] = useState(false);

  useEffect(() => {
    setGroupNameInput(groupName || "");
  }, [groupName]);

  const handleStartEdit = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setPinInput("");
    setPinError(null);
    setPinVerifyOpen(true);
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

  const handleVerifyPinForEdit = async () => {
    try {
      const inputHash = await hashPin(pinInput);
      if (inputHash === profile.pin_hash) {
        setPinVerifyOpen(false);
        setName(profile.name);
        setUpiIds(profile.upi_id ? profile.upi_id.split(",").map((s) => s.trim()).filter(Boolean) : []);
        setNewUpiInput("");
        setChangePin(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
        setEditing(true);
      } else {
        setPinError("Incorrect security PIN passcode.");
        setPinInput("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUpiId = () => {
    const trimmed = newUpiInput.trim();
    if (!trimmed) return;
    if (!trimmed.includes("@")) {
      setErrorMsg("Invalid UPI ID format. Must contain '@'.");
      return;
    }
    if (upiIds.includes(trimmed)) {
      setErrorMsg("UPI ID already added.");
      return;
    }
    setUpiIds((prev) => [...prev, trimmed]);
    setNewUpiInput("");
    setErrorMsg(null);
  };

  const handleRemoveUpiId = (index: number) => {
    setUpiIds((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setErrorMsg("Name cannot be empty.");
      return;
    }
    if (upiIds.length === 0) {
      setErrorMsg("Please add at least one UPI ID.");
      return;
    }

    setSaveLoading(true);
    setErrorMsg(null);

    try {
      const updates: any = {
        name: name.trim(),
        upi_id: upiIds.join(","),
      };

      if (changePin) {
        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
          setErrorMsg("New PIN must be exactly 4 digits.");
          setSaveLoading(false);
          return;
        }
        if (newPin !== confirmNewPin) {
          setErrorMsg("New PIN and confirmation do not match.");
          setSaveLoading(false);
          return;
        }
        const currentPinHash = await hashPin(currentPin);
        if (currentPinHash !== profile.pin_hash) {
          setErrorMsg("Current security PIN is incorrect.");
          setSaveLoading(false);
          return;
        }
        updates.pin_hash = await hashPin(newPin);
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);

      if (error) throw error;

      setEditing(false);
      showNotification("Profile details updated successfully", "success");
      onProfileUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
      showNotification(err.message || "Failed to update profile.", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveGroupName = async () => {
    if (!groupNameInput.trim() || !groupId) return;
    setGroupSaveLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase
        .from("groups")
        .update({ name: groupNameInput.trim() })
        .eq("id", groupId);

      if (error) throw error;
      setEditingGroupName(false);
      showNotification("Group name updated successfully", "success");
      if (onGroupUpdated) onGroupUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update group name.");
      showNotification(err.message || "Failed to update group name.", "error");
    } finally {
      setGroupSaveLoading(false);
    }
  };

  // Export JSON backup of the active group
  const handleExportData = () => {
    if (!groupId) return;
    
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        groupName: groupName,
        members: members.map((m) => ({
          dummy_name: m.dummy_name,
          dummy_upi_id: m.dummy_upi_id,
          profile_id: m.profile_id,
        })),
        expenses: expenses.map((e) => ({
          title: e.title,
          amount: e.amount,
          payerName: members.find((m) => m.id === e.payer_member_id)?.name || "Unknown",
          category: e.category,
          date: e.date,
          splits: e.expense_splits?.map((s) => ({
            memberName: members.find((m) => m.id === s.member_id)?.name || "Unknown",
            amount_owed: s.amount_owed,
          })),
        })),
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `nix_backup_${groupName?.replace(/\s+/g, "_")}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification("Group data exported successfully", "success");
    } catch (err) {
      console.error(err);
      showNotification("Failed to export data", "error");
    }
  };

  // WhatsApp summary share text generator
  const handleShareWhatsApp = () => {
    if (members.length === 0 || !groupId) return;

    try {
      const netted = simplifyDebts(members, expenses);
      if (netted.length === 0) {
        navigator.clipboard.writeText(`📊 *Nix Balance sheet: ${groupName}*\n\n✅ Everything is settled up! No outstanding debts.`);
        setSuccessMsg("Balance summary copied to clipboard.");
        return;
      }

      let text = `📊 *Nix Balance Summary - ${groupName}*\n\n`;
      netted.forEach((tx) => {
        text += `💸 *${tx.fromMember.name}* owes *${tx.toMember.name}*: *₹${tx.amount}*\n`;
        if (tx.toMember.upi_id) {
          const upiLink = buildUpiLink({
            amount: tx.amount,
            payeeAddress: tx.toMember.upi_id,
            payeeName: tx.toMember.name,
            transactionNote: `Nix Settle - ${tx.fromMember.name}`,
          });
          text += `👉 Pay: ${upiLink}\n`;
        } else {
          text += `⚠️ Recipient has no UPI ID added.\n`;
        }
        text += `\n`;
      });

      text += `_Settled with Nix App ⚡_`;

      navigator.clipboard.writeText(text);
      showNotification("WhatsApp share text copied to clipboard!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Failed to generate share summary", "error");
    }
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2.5, gap: 3, overflowY: "auto" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        Settings & Settings Profile
      </Typography>

      {successMsg && (
        <Alert severity="success" variant="outlined" onClose={() => setSuccessMsg(null)} sx={{ borderRadius: 3 }}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" variant="outlined" onClose={() => setErrorMsg(null)} sx={{ borderRadius: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Profile Section */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
            My Account
          </Typography>

          {editing ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saveLoading}
                fullWidth
              />

              <Divider sx={{ my: 0.5, borderColor: "rgba(255,255,255,0.06)" }} />

              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                REGISTERED UPI HANDLES
              </Typography>

              {upiIds.map((upi, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "rgba(255,255,255,0.02)",
                    p: 1,
                    px: 2,
                    borderRadius: 3.5,
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {upi}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveUpiId(index)}>
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              ))}

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Add UPI ID"
                  size="small"
                  value={newUpiInput}
                  onChange={(e) => setNewUpiInput(e.target.value)}
                  placeholder="e.g. name@okhdfc"
                  fullWidth
                />
                <Button variant="outlined" onClick={handleAddUpiId} sx={{ borderRadius: 3.5 }}>
                  Add
                </Button>
              </Box>

              <Divider sx={{ my: 0.5, borderColor: "rgba(255,255,255,0.06)" }} />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={changePin}
                    onChange={(e) => {
                      setChangePin(e.target.checked);
                      setCurrentPin("");
                      setNewPin("");
                      setConfirmNewPin("");
                    }}
                  />
                }
                label="Change Security PIN Passcode"
                sx={{ mb: 1 }}
              />

              {changePin && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pl: 2, borderLeft: "2px solid #6366f1" }}>
                  <TextField
                    label="Current 4-Digit PIN"
                    type="password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    fullWidth
                    slotProps={{
                      htmlInput: { maxLength: 4, inputMode: "numeric" }
                    }}
                  />
                  <TextField
                    label="New 4-Digit PIN"
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    fullWidth
                    slotProps={{
                      htmlInput: { maxLength: 4, inputMode: "numeric" }
                    }}
                  />
                  <TextField
                    label="Confirm New 4-Digit PIN"
                    type="password"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    fullWidth
                    slotProps={{
                      htmlInput: { maxLength: 4, inputMode: "numeric" }
                    }}
                  />
                </Box>
              )}

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 2 }}>
                <Button onClick={() => setEditing(false)} disabled={saveLoading} sx={{ color: "text.secondary" }}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleSaveProfile} disabled={saveLoading}>
                  Save Details
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  Display Name
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {profile.name}
                </Typography>
              </Box>

              <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    Registered UPI Handles
                  </Typography>
                  {profile.upi_id ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
                      {profile.upi_id.split(",").map((upi, index) => (
                        <Typography key={index} variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                          {upi.trim()}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Not configured
                    </Typography>
                  )}
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={handleStartEdit}
                sx={{ borderRadius: 3, alignSelf: "flex-start", mt: 1 }}
              >
                Edit Profile
              </Button>

              <Box
                sx={{
                  mt: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: "rgba(255,255,255,0.02)",
                  p: 2,
                  borderRadius: 3.5,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Push Notifications
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                    Get notified when friends log expenses or settle up.
                  </Typography>
                </Box>
                <Switch
                  checked={pushEnabled}
                  onChange={handleTogglePush}
                  color="primary"
                />
              </Box>
            </Box>
        )}
      </Box>

      {groupId && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {editingGroupName ? (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  size="small"
                  label="Rename Group"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  disabled={groupSaveLoading}
                  fullWidth
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveGroupName}
                  disabled={groupSaveLoading || !groupNameInput.trim()}
                  sx={{ minWidth: 0, px: 2 }}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingGroupName(false);
                    setGroupNameInput(groupName || "");
                  }}
                  disabled={groupSaveLoading}
                  sx={{ color: "text.secondary", minWidth: 0, px: 1.5 }}
                >
                  Cancel
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
                  Active Group: {groupName}
                </Typography>
                <IconButton size="small" onClick={() => setEditingGroupName(true)}>
                  <EditIcon sx={{ fontSize: 16, color: "primary.main" }} />
                </IconButton>
              </Box>
            )}

            {groupInviteCode && (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: "rgba(255, 255, 255, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  GROUP INVITE CODE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "monospace", color: "secondary.main" }}>
                    {groupInviteCode.toUpperCase()}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(groupInviteCode.toUpperCase());
                      showNotification("Invite code copied to clipboard!", "success");
                    }}
                    startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                    sx={{ minWidth: 0, px: 1.5, py: 0.5 }}
                  >
                    Copy
                  </Button>
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Share this code with friends so they can join your group.
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShareWhatsApp}
                fullWidth
                sx={{ py: 1.2, justifyContent: "flex-start", px: 2, borderColor: "rgba(255,255,255,0.06)", color: "text.primary" }}
              >
                Copy WhatsApp Settlement Text
              </Button>

              <Button
                variant="outlined"
                startIcon={<CloudDownloadIcon />}
                onClick={handleExportData}
                fullWidth
                sx={{ py: 1.2, justifyContent: "flex-start", px: 2, borderColor: "rgba(255,255,255,0.06)", color: "text.primary" }}
              >
                Export Group Backup (.json)
              </Button>
            </Box>
        </Box>
      )}

      {/* Logout button */}
      <Button
        variant="outlined"
        color="error"
        onClick={onLogout}
        fullWidth
        sx={{ py: 1.5, mt: "auto", borderRadius: 4 }}
      >
        Sign Out from Nix
      </Button>

      {/* PIN Verification Dialog for editing */}
      <Dialog
        open={pinVerifyOpen}
        onClose={() => setPinVerifyOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, textAlign: "center" }}>Enter Security PIN</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LockIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Enter passcode to unlock profile edits.
            </Typography>
          </Box>

          {pinError && (
            <Alert severity="error" variant="outlined" sx={{ width: "100%", borderRadius: 3 }}>
              {pinError}
            </Alert>
          )}

          {/* Dots */}
          <Box sx={{ display: "flex", gap: 2 }}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < pinInput.length;
              return (
                <Box
                  key={index}
                  sx={{
                    width: 14,
                    height: 14,
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

          {/* Custom keypad grid */}
          <Box sx={{ width: "100%", maxSquare: 230 }}>
            <Grid container spacing={1.5}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <Grid key={num} size={4} sx={{ display: "flex", justifyContent: "center" }}>
                  <Button
                    variant="outlined"
                    onClick={() => handlePinKeyPress(num)}
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "text.primary",
                      borderColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    {num}
                  </Button>
                </Grid>
              ))}
              <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                <Button onClick={() => setPinVerifyOpen(false)} sx={{ color: "text.secondary" }}>
                  Cancel
                </Button>
              </Grid>
              <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  variant="outlined"
                  onClick={() => handlePinKeyPress("0")}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "text.primary",
                    borderColor: "rgba(255, 255, 255, 0.05)",
                  }}
                >
                  0
                </Button>
              </Grid>
              <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
                <Button onClick={handlePinBackspace} sx={{ color: "text.secondary" }}>
                  Del
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Button
            variant="contained"
            fullWidth
            disabled={pinInput.length < 4}
            onClick={handleVerifyPinForEdit}
            sx={{ py: 1.2 }}
          >
            Verify & Unlock
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
