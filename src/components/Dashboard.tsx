"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GroupMember, Expense, Profile } from "@/types";
import { calculateMemberBalances } from "@/lib/utils/split";
import { fetchGroupMembers } from "@/lib/groupMembers";
import GroupManager from "./GroupManager";
import MembersTab from "./MembersTab";
import ExpensesTab from "./ExpensesTab";
import ExpenseDialog from "./ExpenseDialog";
import SettleUpTab from "./SettleUpTab";
import SettingsTab from "./SettingsTab";

import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HandshakeIcon from "@mui/icons-material/Handshake";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import ReceiptIcon from "@mui/icons-material/Receipt";

interface DashboardProps {
  profile: Profile;
  onLogout: () => void;
  onProfileUpdated: () => void;
}

export default function Dashboard({ profile, onLogout, onProfileUpdated }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Home, 1 = Members, 2 = Expenses, 3 = Settle Up, 4 = Settings
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null);
  const [activeGroupInviteCode, setActiveGroupInviteCode] = useState<string | null>(null);
  const [activeGroupCreatorId, setActiveGroupCreatorId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // States to trigger refreshes
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [dbLoading, setDbLoading] = useState(false);

  // Fetch initial group of user
  useEffect(() => {
    fetchInitialGroup();
  }, [profile.id]);

  // Fetch members and expenses when active group changes
  useEffect(() => {
    if (activeGroupId) {
      fetchGroupData();
    } else {
      setMembers([]);
      setExpenses([]);
    }
  }, [activeGroupId, refreshCounter]);

  const fetchInitialGroup = async () => {
    setDbLoading(true);
    try {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (memberships && memberships.length > 0) {
        const firstGroupId = memberships[0].group_id;
        setActiveGroupId(firstGroupId);

        // Fetch name, invite code, and creator of this group
        const { data: grp } = await supabase
          .from("groups")
          .select("name, invite_code, created_by")
          .eq("id", firstGroupId)
          .single();

        if (grp) {
          setActiveGroupName(grp.name);
          setActiveGroupInviteCode(grp.invite_code);
          setActiveGroupCreatorId(grp.created_by);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDbLoading(false);
    }
  };

  const fetchGroupData = async () => {
    if (!activeGroupId) return;
    try {
      // 1. Fetch group members through a restricted RPC so profiles are not publicly readable.
      const formattedMembers = await fetchGroupMembers(activeGroupId);
      setMembers(formattedMembers);

      // 2. Fetch expenses and splits
      const { data: expData } = await supabase
        .from("expenses")
        .select("*")
        .eq("group_id", activeGroupId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (expData && expData.length > 0) {
        const expenseIds = expData.map((e) => e.id);
        const { data: splitsData } = await supabase
          .from("expense_splits")
          .select("*")
          .in("expense_id", expenseIds);

        const formattedExpenses: Expense[] = expData.map((exp) => {
          const relatedSplits = (splitsData || []).filter((s) => s.expense_id === exp.id);
          return {
            ...exp,
            expense_splits: relatedSplits,
          };
        });
        setExpenses(formattedExpenses);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error("Error fetching group data:", err);
    }
  };

  const handleSelectGroup = async (groupId: string) => {
    setActiveGroupId(groupId);
    setActiveGroupCreatorId(null); // Clear stale creator while fetching new group
    const { data } = await supabase.from("groups").select("name, invite_code, created_by").eq("id", groupId).single();
    if (data) {
      setActiveGroupName(data.name);
      setActiveGroupInviteCode(data.invite_code);
      setActiveGroupCreatorId(data.created_by);
    }
    setRefreshCounter((c) => c + 1);
  };

  const handleGroupUpdated = async () => {
    if (activeGroupId) {
      const { data } = await supabase.from("groups").select("name, invite_code, created_by").eq("id", activeGroupId).single();
      if (data) {
        setActiveGroupName(data.name);
        setActiveGroupInviteCode(data.invite_code);
        setActiveGroupCreatorId(data.created_by);
      }
      setRefreshCounter((c) => c + 1);
    }
  };

  const triggerRefresh = () => {
    setRefreshCounter((c) => c + 1);
  };

  // Balance sheet math
  const getGroupMetrics = () => {
    if (members.length === 0) return { totalExpenses: 0, userShare: 0, netBalance: 0 };
    
    // Find active user's member ID in this group
    const userMember = members.find((m) => m.profile_id === profile.id);
    if (!userMember) return { totalExpenses: 0, userShare: 0, netBalance: 0 };

    const balances = calculateMemberBalances(members, expenses);
    const userBalance = balances[userMember.id] || 0;

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Calculate user's total shares owed across expenses
    let userShare = 0;
    expenses.forEach((expense) => {
      expense.expense_splits?.forEach((split) => {
        if (split.member_id === userMember.id) {
          userShare += Number(split.amount_owed);
        }
      });
    });

    return {
      totalExpenses,
      userShare,
      netBalance: userBalance,
    };
  };

  const metrics = getGroupMetrics();

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", bgcolor: "#090c15" }}>
      {/* Top Header Row (No AppBar) */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.5, pt: 2, pb: 1, flexShrink: 0 }}>
        {/* Top Left: Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <img src="/nix_logo.png" alt="Nix Logo" style={{ width: 26, height: 26, borderRadius: "6px" }} />
          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "Outfit", color: "text.primary", letterSpacing: -0.5 }}>
            Nix
          </Typography>
        </Box>

        {/* Top Right: Switch Group Pill Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={() => setGroupDrawerOpen(true)}
          startIcon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
          sx={{
            borderRadius: "20px",
            borderColor: "rgba(255,255,255,0.08)",
            color: "text.secondary",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8rem",
            px: 2,
            "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: "rgba(99,102,241,0.04)" },
          }}
        >
          Switch Group
        </Button>
      </Box>

      {/* Main Viewport Content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {dbLoading ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : !activeGroupId ? (
          // Empty State: No groups
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", px: 4, textAlign: "center", gap: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Create your first group
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Nix is a group-based splitter. Tap below to create a group for trips, roommates, or dinner splits!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setGroupDrawerOpen(true)}
              size="large"
              sx={{ alignSelf: "center", mt: 1 }}
            >
              Create or Join Group
            </Button>
          </Box>
        ) : (
          // Tabs Controller
          <>
            {activeTab === 0 && (
              // TAB 0: HOME
              <Box sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", gap: 2.5, overflowY: "auto" }}>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "block" }}>
                    {activeGroupName || "No Active Group"}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Hey, {profile.name.split(" ")[0]} ⚡
                  </Typography>
                </Box>

                {/* Balances Board Grid */}
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 4,
                        bgcolor: "rgba(99, 102, 241, 0.05)",
                        borderColor: "rgba(99, 102, 241, 0.15)",
                      }}
                    >
                      <CardContent sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                          YOUR NET BALANCE
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 900,
                            color: metrics.netBalance > 0.01 ? "success.main" : metrics.netBalance < -0.01 ? "error.main" : "text.secondary",
                          }}
                        >
                          {metrics.netBalance > 0.01 ? "+" : ""}
                          ₹{metrics.netBalance.toFixed(2).replace(/\.00$/, "")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, textAlign: "center" }}>
                          {metrics.netBalance > 0.01
                            ? "Friends owe you money"
                            : metrics.netBalance < -0.01
                            ? "You owe your friends money"
                            : "You are fully settled up!"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={6}>
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                      <CardContent sx={{ p: 2, textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          Total Spent
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.5 }}>
                          ₹{metrics.totalExpenses.toFixed(2).replace(/\.00$/, "")}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={6}>
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                      <CardContent sx={{ p: 2, textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          Your Share
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.5 }}>
                          ₹{metrics.userShare.toFixed(2).replace(/\.00$/, "")}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1.5, display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => setExpenseDialogOpen(true)}
                    sx={{ py: 1.3 }}
                  >
                    Add Expense
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setActiveTab(3)}
                    sx={{ py: 1.3, borderColor: "rgba(255,255,255,0.06)", color: "text.primary" }}
                  >
                    Settle Up
                  </Button>
                </Box>

                <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.05)" }} />

                {/* Recent activity list */}
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Recent Group Activity
                </Typography>
                
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {expenses.slice(0, 3).map((exp) => {
                    const payer = members.find((m) => m.id === exp.payer_member_id)?.name || "Someone";
                    return (
                      <Card
                        key={exp.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 3.5,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          bgcolor: "rgba(18, 24, 41, 0.3)",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <ReceiptIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {exp.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              Paid by {payer}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          ₹{Number(exp.amount).toFixed(2).replace(/\.00$/, "")}
                        </Typography>
                      </Card>
                    );
                  })}

                  {expenses.length === 0 && (
                    <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                      Log your first transaction above to see details here.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              // TAB 1: MEMBERS
              <MembersTab
                groupId={activeGroupId}
                currentUserId={profile.id}
                groupCreatorId={activeGroupCreatorId}
                refreshTrigger={refreshCounter}
                onMembersChange={triggerRefresh}
              />
            )}

            {activeTab === 2 && (
              // TAB 2: EXPENSES
              <ExpensesTab
                groupId={activeGroupId}
                members={members}
                currentUserId={profile.id}
                refreshTrigger={refreshCounter}
                onExpensesChange={triggerRefresh}
                onOpenExpenseDialog={() => {
                  setEditingExpense(null);
                  setExpenseDialogOpen(true);
                }}
                onEditExpense={(expense) => {
                  setEditingExpense(expense);
                  setExpenseDialogOpen(true);
                }}
              />
            )}

            {activeTab === 3 && (
              // TAB 3: SETTLE UP
              <SettleUpTab
                groupId={activeGroupId}
                groupName={activeGroupName || "Group"}
                members={members}
                expenses={expenses}
                currentUserId={profile.id}
                currentUserPinHash={profile.pin_hash}
                refreshTrigger={refreshCounter}
                onSettled={triggerRefresh}
              />
            )}

            {activeTab === 4 && (
              // TAB 4: SETTINGS
              <SettingsTab
                profile={profile}
                groupName={activeGroupName}
                groupId={activeGroupId}
                groupInviteCode={activeGroupInviteCode}
                members={members}
                expenses={expenses}
                onProfileUpdated={onProfileUpdated}
                onLogout={onLogout}
                onGroupUpdated={handleGroupUpdated}
              />
            )}
          </>
        )}
      </Box>

      {/* Group manager sidebar/drawer */}
      <GroupManager
        open={groupDrawerOpen}
        onClose={() => setGroupDrawerOpen(false)}
        userId={profile.id}
        activeGroupId={activeGroupId}
        onSelectGroup={handleSelectGroup}
      />

      {/* Add expense modal dialog */}
      {activeGroupId && (
        <ExpenseDialog
          open={expenseDialogOpen}
          onClose={() => {
            setExpenseDialogOpen(false);
            setEditingExpense(null);
          }}
          groupId={activeGroupId}
          groupName={activeGroupName || "Group"}
          members={members}
          currentUserId={profile.id}
          onSave={triggerRefresh}
          editingExpense={editingExpense}
        />
      )}

      {/* Bottom Sticky Navigation */}
      {activeGroupId && (
        <BottomNavigation
          value={activeTab}
          onChange={(_event, newValue) => {
            setActiveTab(newValue);
          }}
          showLabels
          sx={{
            bgcolor: "rgba(18, 24, 41, 0.6)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            height: 64,
          }}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction label="Members" icon={<PeopleIcon />} />
          <BottomNavigationAction label="Transactions" icon={<ReceiptLongIcon />} />
          <BottomNavigationAction label="Settle" icon={<HandshakeIcon />} />
          <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
        </BottomNavigation>
      )}
    </Box>
  );
}
