"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchGroupMembers } from "@/lib/groupMembers";
import { GroupMember } from "@/types";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContactlessIcon from "@mui/icons-material/Contactless";
import DialogContentText from "@mui/material/DialogContentText";
import StarsIcon from "@mui/icons-material/Stars";

interface MembersTabProps {
  groupId: string | null;
  currentUserId: string;
  groupCreatorId: string | null;
  refreshTrigger: number;
  onMembersChange: () => void;
}

export default function MembersTab({
  groupId,
  currentUserId,
  groupCreatorId,
  refreshTrigger,
  onMembersChange,
}: MembersTabProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [addTab, setAddTab] = useState<0 | 1>(0);
  const [email, setEmail] = useState("");
  const [offlineName, setOfflineName] = useState("");
  const [offlineUpi, setOfflineUpi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<GroupMember | null>(null);

  const normalizedCurrentUserId = currentUserId?.trim();
  const normalizedGroupCreatorId = groupCreatorId?.trim() || null;
  const isGroupCreator =
    !!normalizedGroupCreatorId && normalizedCurrentUserId === normalizedGroupCreatorId;

  useEffect(() => {
    if (groupId) {
      fetchMembers();
    }
  }, [groupId, refreshTrigger]);

  const fetchMembers = async () => {
    if (!groupId) return;

    try {
      setMembers(await fetchGroupMembers(groupId));
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const handleAddRegistered = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (!groupId) throw new Error("No active group selected.");

      const { data, error: addError } = await supabase.rpc("add_registered_member_by_upi", {
        target_group_id: groupId,
        target_upi_id: email.trim(),
      });

      if (addError) throw addError;

      const addedProfile = Array.isArray(data) ? data[0] : null;
      if (!addedProfile) {
        setError("No registered user found with this UPI ID. You can add them as an offline member instead.");
        setLoading(false);
        return;
      }

      setEmail("");
      setOpenAddDialog(false);
      onMembersChange();
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to add member.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffline = async () => {
    if (!offlineName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Validate unique dummy name in group
      const nameExists = members.some(
        (m) => m.name.toLowerCase() === offlineName.trim().toLowerCase()
      );
      if (nameExists) {
        setError(`A member named "${offlineName}" already exists in this group.`);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("group_members").insert({
        group_id: groupId,
        dummy_name: offlineName.trim(),
        dummy_upi_id: offlineUpi.trim() || null,
      });

      if (insertError) throw insertError;

      setOfflineName("");
      setOfflineUpi("");
      setOpenAddDialog(false);
      onMembersChange();
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to add offline member.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!isGroupCreator) {
      setConfirmDeleteMember(null);
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (deleteError) throw deleteError;

      setConfirmDeleteMember(null);
      onMembersChange();
      await fetchMembers();
    } catch (err) {
      console.error("Error deleting member:", err);
    }
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
          Group Members ({members.length})
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={() => {
            setError(null);
            setOpenAddDialog(true);
          }}
          sx={{ borderRadius: 3 }}
        >
          Add Friend
        </Button>
      </Box>

      <List sx={{ flex: 1, overflowY: "auto" }}>
        {members.map((member) => {
          const isCurrentUser = member.profile_id === normalizedCurrentUserId;
          const isRegistered = member.profile_id !== null;
          const canDeleteMember = isGroupCreator && !isCurrentUser;
          
          return (
            <React.Fragment key={member.id}>
              <ListItem
                secondaryAction={
                  canDeleteMember ? (
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => setConfirmDeleteMember(member)}
                      sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  ) : null
                }
                sx={{ py: 1.5 }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: isCurrentUser
                        ? "primary.main"
                        : isRegistered
                        ? "secondary.main"
                        : "rgba(255, 255, 255, 0.05)",
                      color: isCurrentUser || isRegistered ? "#fff" : "text.secondary",
                      border: !isRegistered ? "1px dashed rgba(255, 255, 255, 0.15)" : "none",
                      fontWeight: 700,
                    }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  disableTypography
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {member.name}
                      </Typography>
                      {isCurrentUser && (
                        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                          (You)
                        </Typography>
                      )}
                      {isRegistered && !isCurrentUser && (
                        <CheckCircleIcon sx={{ color: "secondary.main", fontSize: 14 }} />
                      )}
                      {/* Crown = group creator */}
                      {!!normalizedGroupCreatorId && member.profile_id === normalizedGroupCreatorId && (
                        <StarsIcon sx={{ fontSize: 14, color: "#f59e0b" }} titleAccess="Group Creator" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.2 }}>
                      <ContactlessIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {member.upi_id || "No UPI added"}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" sx={{ borderColor: "rgba(255,255,255,0.05)" }} />
            </React.Fragment>
          );
        })}
      </List>

      {/* Add Member Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add Friend to Group</DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.06)" }}>
          <Tabs
            value={addTab}
            onChange={(_e, v) => {
              setAddTab(v);
              setError(null);
            }}
            variant="fullWidth"
          >
            <Tab label="Search UPI ID" sx={{ fontWeight: 600 }} />
            <Tab label="Offline Placeholder" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>
        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          {addTab === 0 ? (
            // Search UPI
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Add another Nix user by entering their registered UPI ID.
              </Typography>
              <TextField
                autoFocus
                label="Friend's UPI ID"
                placeholder="name@okaxis"
                fullWidth
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AlternateEmailIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          ) : (
            // Offline Member
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                For friends who aren't on Nix yet. You can split bills with them, and pay them via their UPI ID.
              </Typography>
              <TextField
                autoFocus
                label="Friend's Name"
                placeholder="e.g. Rohit Sharma"
                fullWidth
                variant="outlined"
                value={offlineName}
                onChange={(e) => setOfflineName(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="UPI ID (Optional)"
                placeholder="rohit@paytm"
                fullWidth
                variant="outlined"
                value={offlineUpi}
                onChange={(e) => setOfflineUpi(e.target.value)}
                disabled={loading}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)} disabled={loading} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={addTab === 0 ? handleAddRegistered : handleAddOffline}
            variant="contained"
            disabled={loading || (addTab === 0 ? !email.trim() : !offlineName.trim())}
          >
            Add Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Member Dialog */}
      <Dialog
        open={!!confirmDeleteMember}
        onClose={() => setConfirmDeleteMember(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Remove Member?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>
            Are you sure you want to remove{" "}
            <strong style={{ color: "white" }}>{confirmDeleteMember?.name}</strong> from this group?
            {confirmDeleteMember?.profile_id === null && (
              <> All their expense splits will remain, but they won't be selectable for new expenses.</>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmDeleteMember(null)} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => confirmDeleteMember && handleDeleteMember(confirmDeleteMember.id)}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


