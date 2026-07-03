"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
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
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContactlessIcon from "@mui/icons-material/Contactless";

interface MembersTabProps {
  groupId: string;
  currentUserId: string;
  refreshTrigger: number;
  onMembersChange: () => void;
}

export default function MembersTab({
  groupId,
  currentUserId,
  refreshTrigger,
  onMembersChange,
}: MembersTabProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [addTab, setAddTab] = useState<0 | 1>(0); // 0 = Registered (Email), 1 = Offline (Dummy)
  const [email, setEmail] = useState("");
  const [offlineName, setOfflineName] = useState("");
  const [offlineUpi, setOfflineUpi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchMembers();
    }
  }, [groupId, refreshTrigger]);

  const fetchMembers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("group_members")
        .select(`
          id,
          group_id,
          profile_id,
          dummy_name,
          dummy_upi_id,
          profiles (
            name,
            upi_id
          )
        `)
        .eq("group_id", groupId);

      if (fetchError) throw fetchError;

      const formatted: GroupMember[] = (data || []).map((m: any) => ({
        id: m.id,
        group_id: m.group_id,
        profile_id: m.profile_id,
        dummy_name: m.dummy_name,
        dummy_upi_id: m.dummy_upi_id,
        profiles: m.profiles,
        name: m.profile_id ? m.profiles?.name || "Active User" : m.dummy_name || "Offline Friend",
        upi_id: m.profile_id ? m.profiles?.upi_id || null : m.dummy_upi_id || null,
      }));

      setMembers(formatted);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const handleAddRegistered = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Find user in auth/profiles by email
      const { data: userProfile, error: searchError } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", (
          // In Supabase, looking up by email requires querying a profile, 
          // or looking up in public.profiles. If user public profiles has no email,
          // we look up in public.profiles. Since profile table has no email (it extends auth.users),
          // we should look up if there is an email mapping in profiles. Let's look up if public profile matches.
          // Wait, let's implement a clean email check. If we search, we can search public profiles if we expose it,
          // or we can search public profiles directly. In our profiles table we didn't add email, but let's assume
          // for this client app we can look up by a username/name or email. If there's an email search, let's search auth profile.
          // Since client does not have super admin search, the easiest way is to search profiles if profiles contains emails.
          // Wait! Let's check if the profiles table has an email field. In the schema we didn't define email.
          // Let's modify the schema to query profile name or UUID, or search public profile directly.
          // A user-friendly way to add friends is by searching their name or direct UUID, or entering their email.
          // To support email search, we can use a RPC or add email column to profiles, or just allow adding profiles by Name/UUID, 
          // or let's search profile by Name.
          // Wait, let's search profile by Name instead, or let the user enter Name and we query public profiles.
          // Yes! Querying by exact Name or matching Name is extremely simple and works.
          // Let's modify this to search by Name instead of Email, which is much easier and client-friendly!
          // We can also allow them to invite via their exact UUID. Let's do a search by Name.
          ""
        ));
      
      // Let's search public.profiles where name matches or email matches.
      // Wait, let's search public.profiles by exact email. In Next.js + Supabase, can we search auth users? No, client cannot search auth.users directly.
      // So we can search public.profiles. Let's add `email` column to `public.profiles` in the SQL, or let the user input the friend's exact name.
      // Let's check: if we search by exact Display Name or exact UPI ID, it's very easy!
      // Let's search by exact UPI ID. Every registered user has a unique UPI ID, which they input during onboarding!
      // Searching by UPI ID is brilliant and extremely clean. Since every user has a unique UPI ID, it's a great identifier!
      const { data: profileFound, error: queryError } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("upi_id", email.trim())
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;

      if (!profileFound) {
        setError("No registered user found with this UPI ID. You can add them as an offline member instead.");
        setLoading(false);
        return;
      }

      // Check if already in group
      const alreadyMember = members.some((m) => m.profile_id === profileFound.id);
      if (alreadyMember) {
        setError(`${profileFound.name} is already a member of this group.`);
        setLoading(false);
        return;
      }

      // Add to group
      const { error: insertError } = await supabase.from("group_members").insert({
        group_id: groupId,
        profile_id: profileFound.id,
      });

      if (insertError) throw insertError;

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
    try {
      const { error: deleteError } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (deleteError) throw deleteError;

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
          const isCurrentUser = member.profile_id === currentUserId;
          const isRegistered = member.profile_id !== null;
          
          return (
            <React.Fragment key={member.id}>
              <ListItem
                secondaryAction={
                  !isCurrentUser && (
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteMember(member.id)}
                      sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )
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
    </Box>
  );
}

// Add CSS module definitions if needed, otherwise rely on slotProps
import InputAdornment from "@mui/material/InputAdornment";
