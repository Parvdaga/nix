"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Group } from "@/types";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import GroupIcon from "@mui/icons-material/Group";
import AddHomeWorkIcon from "@mui/icons-material/AddHomeWork";
import AddIcon from "@mui/icons-material/Add";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

interface GroupManagerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export default function GroupManager({
  open,
  onClose,
  userId,
  activeGroupId,
  onSelectGroup,
}: GroupManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Join Group States
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchGroups();
    }
  }, [userId]);

  const fetchGroups = async () => {
    try {
      // First fetch group memberships of the user
      const { data: memberships, error: memError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("profile_id", userId);

      if (memError) throw memError;

      if (!memberships || memberships.length === 0) {
        setGroups([]);
        return;
      }

      // Fetch groups details
      const groupIds = memberships.map((m) => m.group_id);
      const { data: grpDetails, error: grpError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("created_at", { ascending: false });

      if (grpError) throw grpError;
      setGroups(grpDetails || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Insert Group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroupName.trim(),
          created_by: userId,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Add current user as member in junction table
      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: groupData.id,
        profile_id: userId,
      });

      if (memberError) throw memberError;

      setNewGroupName("");
      setCreateDialogOpen(false);
      await fetchGroups();
      onSelectGroup(groupData.id);
      onClose();
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError(err.message || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCodeInput.trim()) return;
    setJoinLoading(true);
    setError(null);

    try {
      // 1. Search group by invite code
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", inviteCodeInput.trim())
        .maybeSingle();

      if (groupError) throw groupError;
      if (!groupData) {
        setError("Invalid invite code. Please check and try again.");
        setJoinLoading(false);
        return;
      }

      // 2. Check if already a member
      const { data: existingMember, error: memberQueryError } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupData.id)
        .eq("profile_id", userId)
        .maybeSingle();

      if (memberQueryError) throw memberQueryError;
      if (existingMember) {
        setError("You are already a member of this group!");
        setJoinLoading(false);
        return;
      }

      // 3. Add current user as member
      const { error: joinError } = await supabase.from("group_members").insert({
        group_id: groupData.id,
        profile_id: userId,
      });

      if (joinError) throw joinError;

      setInviteCodeInput("");
      setJoinDialogOpen(false);
      await fetchGroups();
      onSelectGroup(groupData.id);
      onClose();
    } catch (err: any) {
      console.error("Error joining group:", err);
      setError(err.message || "Failed to join group.");
    } finally {
      setJoinLoading(false);
    }
  };

  const listContent = (
    <Box sx={{ width: 280, p: 3, display: "flex", flexDirection: "column", height: "100%", bgcolor: "#121829" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <AccountTreeIcon sx={{ color: "primary.main", fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          My Groups
        </Typography>
      </Box>

      <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.06)" }} />

      <List sx={{ flex: 1, overflowY: "auto", mb: 2 }}>
        {groups.map((group) => (
          <ListItemButton
            key={group.id}
            selected={group.id === activeGroupId}
            onClick={() => {
              onSelectGroup(group.id);
              onClose();
            }}
            sx={{
              borderRadius: 3,
              mb: 1,
              "&.Mui-selected": {
                bgcolor: "rgba(99, 102, 241, 0.15)",
                color: "primary.main",
                fontWeight: 700,
                "&:hover": {
                  bgcolor: "rgba(99, 102, 241, 0.2)",
                },
              },
            }}
          >
            <ListItemIcon>
              <GroupIcon sx={{ color: group.id === activeGroupId ? "primary.main" : "text.secondary" }} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: group.id === activeGroupId ? 700 : 500,
                    fontSize: "0.95rem",
                  }}
                >
                  {group.name}
                </Typography>
              }
            />
          </ListItemButton>
        ))}

        {groups.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}>
            No groups found. Create one to begin!
          </Typography>
        )}
      </List>

      <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={() => {
            setError(null);
            setInviteCodeInput("");
            setJoinDialogOpen(true);
          }}
          fullWidth
          sx={{ py: 1.2, borderColor: "rgba(255, 255, 255, 0.08)", color: "text.primary" }}
        >
          Join Group
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setError(null);
            setNewGroupName("");
            setCreateDialogOpen(true);
          }}
          fullWidth
          sx={{ py: 1.2 }}
        >
          New Group
        </Button>
      </Box>

      {/* Group Creation Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Group</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 3, mt: 1 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g. Flatmates 🏠, Goa Trip 🏖️"
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={loading} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={loading || !newGroupName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Join Group via Code</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 3, mt: 1 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="8-Character Invite Code"
            fullWidth
            variant="outlined"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4"
            disabled={joinLoading}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setJoinDialogOpen(false)} disabled={joinLoading} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={handleJoinGroup}
            variant="contained"
            disabled={joinLoading || !inviteCodeInput.trim() || inviteCodeInput.trim().length !== 8}
          >
            Join Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      slotProps={{
        paper: {
          sx: {
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          },
        },
      }}
    >
      {listContent}
    </SwipeableDrawer>
  );
}
