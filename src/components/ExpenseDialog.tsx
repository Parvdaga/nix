"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GroupMember, CategoryOption, Expense } from "@/types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import FastfoodIcon from "@mui/icons-material/Fastfood";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import HomeIcon from "@mui/icons-material/Home";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

const CATEGORIES: CategoryOption[] = [
  { value: "Food", label: "Food 🍔", icon: "Food", color: "#10b981" },
  { value: "Groceries", label: "Groceries 🛒", icon: "Groceries", color: "#22c55e" },
  { value: "Drinks", label: "Drinks 🍹", icon: "Drinks", color: "#06b6d4" },
  { value: "Coffee", label: "Coffee ☕", icon: "Coffee", color: "#b45309" },

  { value: "Travel", label: "Travel ✈️", icon: "Travel", color: "#3b82f6" },
  { value: "Transport", label: "Transport 🚕", icon: "Transport", color: "#0ea5e9" },
  { value: "Fuel", label: "Fuel ⛽", icon: "Fuel", color: "#f97316" },
  { value: "Parking", label: "Parking 🅿️", icon: "Parking", color: "#6366f1" },
  { value: "Tolls", label: "Tolls 🛣️", icon: "Tolls", color: "#64748b" },

  { value: "Rent", label: "Rent 🏠", icon: "Rent", color: "#f59e0b" },
  { value: "Utilities", label: "Utilities 💡", icon: "Utilities", color: "#eab308" },
  { value: "Internet", label: "Internet 🌐", icon: "Internet", color: "#0284c7" },
  { value: "Electricity", label: "Electricity ⚡", icon: "Electricity", color: "#facc15" },
  { value: "Water", label: "Water 💧", icon: "Water", color: "#38bdf8" },
  { value: "Gas", label: "Gas 🔥", icon: "Gas", color: "#ea580c" },

  { value: "Entertainment", label: "Entertainment 🎬", icon: "Entertainment", color: "#8b5cf6" },
  { value: "Movies", label: "Movies 🍿", icon: "Movies", color: "#7c3aed" },
  { value: "Games", label: "Games 🎮", icon: "Games", color: "#a855f7" },
  { value: "Party", label: "Party 🎉", icon: "Party", color: "#ec4899" },
  { value: "Shopping", label: "Shopping 🛍️", icon: "Shopping", color: "#f43f5e" },

  { value: "Hotel", label: "Hotel 🏨", icon: "Hotel", color: "#0f766e" },
  { value: "Accommodation", label: "Accommodation 🛏️", icon: "Accommodation", color: "#14b8a6" },

  { value: "Healthcare", label: "Healthcare 🏥", icon: "Healthcare", color: "#ef4444" },
  { value: "Medicine", label: "Medicine 💊", icon: "Medicine", color: "#dc2626" },

  { value: "Subscription", label: "Subscription 📺", icon: "Subscription", color: "#9333ea" },
  { value: "Gift", label: "Gift 🎁", icon: "Gift", color: "#d946ef" },
  { value: "Pets", label: "Pets 🐶", icon: "Pets", color: "#ca8a04" },
  { value: "Office", label: "Office 💼", icon: "Office", color: "#475569" },

  { value: "Others", label: "Others ⚙️", icon: "Others", color: "#6b7280" },
];

interface ExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
  onSave: () => void;
  editingExpense?: Expense | null;
}

export default function ExpenseDialog({
  open,
  onClose,
  groupId,
  members,
  currentUserId,
  onSave,
  editingExpense,
}: ExpenseDialogProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [splitTab, setSplitTab] = useState<0 | 1>(0); // 0 = Equally, 1 = Custom
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Split calculations state
  const [equalChecked, setEqualChecked] = useState<Record<string, boolean>>({});
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  // Initialize defaults
  useEffect(() => {
    if (open) {
      if (editingExpense) {
        setTitle(editingExpense.title);
        setAmount(String(editingExpense.amount));
        setCategory(editingExpense.category);
        setDate(editingExpense.date);
        setPayerId(editingExpense.payer_member_id);

        const splitsList = editingExpense.expense_splits || [];
        const initialChecked: Record<string, boolean> = {};
        const initialShares: Record<string, string> = {};

        // Detect if it was custom
        let isCustom = false;
        if (splitsList.length > 0) {
          const firstShare = splitsList[0].amount_owed;
          const isAllEqual = splitsList.every((s) => Math.abs(s.amount_owed - firstShare) < 0.1);
          isCustom = !isAllEqual;

          members.forEach((m) => {
            const split = splitsList.find((s) => s.member_id === m.id);
            initialChecked[m.id] = !!split;
            initialShares[m.id] = split ? String(split.amount_owed) : "";
          });
        } else {
          members.forEach((m) => {
            initialChecked[m.id] = true;
            initialShares[m.id] = "";
          });
        }

        setEqualChecked(initialChecked);
        setCustomShares(initialShares);
        setSplitTab(isCustom ? 1 : 0);
      } else {
        setTitle("");
        setAmount("");
        setCategory("Food");
        setDate(new Date().toISOString().split("T")[0]);
        if (members.length > 0) {
          const userMember = members.find((m) => m.profile_id === currentUserId);
          setPayerId(userMember ? userMember.id : members[0].id);

          const defaultChecked: Record<string, boolean> = {};
          const defaultShares: Record<string, string> = {};
          members.forEach((m) => {
            defaultChecked[m.id] = true;
            defaultShares[m.id] = "";
          });
          setEqualChecked(defaultChecked);
          setCustomShares(defaultShares);
        }
        setSplitTab(0);
      }
    }
  }, [members, currentUserId, open, editingExpense]);

  const parsedAmount = parseFloat(amount) || 0;

  // Compute live equal split share
  const activeEqualCount = Object.values(equalChecked).filter(Boolean).length;
  const equalShare = activeEqualCount > 0 ? Number((parsedAmount / activeEqualCount).toFixed(2)) : 0;

  // Compute live custom split sum
  const customSum = Object.values(customShares)
    .map((v) => parseFloat(v) || 0)
    .reduce((sum, current) => sum + current, 0);

  const isCustomMismatch = splitTab === 1 && Math.abs(customSum - parsedAmount) > 0.05;

  const handleEqualCheckboxChange = (memberId: string) => {
    setEqualChecked((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const handleCustomShareChange = (memberId: string, val: string) => {
    setCustomShares((prev) => ({
      ...prev,
      [memberId]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (parsedAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (!payerId) {
      setError("Please select a payer.");
      return;
    }

    // Build splits array
    let splits: { member_id: string; amount_owed: number }[] = [];

    if (splitTab === 0) {
      // EQUAL SPLIT
      if (activeEqualCount === 0) {
        setError("Please select at least one person to split with.");
        return;
      }
      
      let runningSum = 0;
      const checkedIds = Object.keys(equalChecked).filter((id) => equalChecked[id]);
      
      checkedIds.forEach((id, idx) => {
        // Handle floating point division rounding on the last member
        const amt = idx === checkedIds.length - 1 
          ? Number((parsedAmount - runningSum).toFixed(2)) 
          : equalShare;
        
        splits.push({ member_id: id, amount_owed: amt });
        runningSum += amt;
      });
    } else {
      // CUSTOM SPLIT
      if (isCustomMismatch) {
        setError(`Total custom split sum (₹${customSum.toFixed(2)}) must equal the total amount (₹${parsedAmount.toFixed(2)}).`);
        return;
      }

      members.forEach((m) => {
        const amt = parseFloat(customShares[m.id]) || 0;
        if (amt > 0) {
          splits.push({ member_id: m.id, amount_owed: Number(amt.toFixed(2)) });
        }
      });

      if (splits.length === 0) {
        setError("Please assign custom shares to at least one person.");
        return;
      }
    }

    setLoading(true);

    try {
      if (editingExpense) {
        // Update mode
        const { error: expenseError } = await supabase
          .from("expenses")
          .update({
            title: title.trim(),
            amount: parsedAmount,
            payer_member_id: payerId,
            category,
            date,
          })
          .eq("id", editingExpense.id);

        if (expenseError) throw expenseError;

        // Delete old splits
        const { error: deleteSplitsError } = await supabase
          .from("expense_splits")
          .delete()
          .eq("expense_id", editingExpense.id);

        if (deleteSplitsError) throw deleteSplitsError;

        // Insert new splits
        const splitPayload = splits.map((s) => ({
          expense_id: editingExpense.id,
          member_id: s.member_id,
          amount_owed: s.amount_owed,
        }));

        const { error: splitError } = await supabase
          .from("expense_splits")
          .insert(splitPayload);

        if (splitError) throw splitError;
      } else {
        // Insert mode
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            group_id: groupId,
            title: title.trim(),
            amount: parsedAmount,
            payer_member_id: payerId,
            category,
            date,
          })
          .select()
          .single();

        if (expenseError) throw expenseError;

        const splitPayload = splits.map((s) => ({
          expense_id: expenseData.id,
          member_id: s.member_id,
          amount_owed: s.amount_owed,
        }));

        const { error: splitError } = await supabase
          .from("expense_splits")
          .insert(splitPayload);

        if (splitError) throw splitError;
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.06)" }}>
        <Tabs value={splitTab} onChange={(_e, v) => setSplitTab(v)} variant="fullWidth">
          <Tab label="Equally" sx={{ fontWeight: 600 }} />
          <Tab label="Custom Shares" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 3 }}>
          {error && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            label="What was this for?"
            placeholder="e.g. Dinner, Cab, Groceries"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            fullWidth
            required
          />

          <Grid container spacing={2}>
            <Grid size={7}>
              <TextField
                label="Amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  },
                }}
              />
            </Grid>
            <Grid size={5}>
              <TextField
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                required
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Paid By</InputLabel>
                <Select
                  value={payerId}
                  label="Paid By"
                  onChange={(e) => setPayerId(e.target.value)}
                  disabled={loading}
                >
                  {members.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  label="Category"
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

          {/* SPLITTING INPUTS */}
          {splitTab === 0 ? (
            // Tab 0: Equal Split
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                Splitting equally among selected friends. Each owes: 
                <span style={{ color: "#10b981", fontWeight: 700, marginLeft: 6 }}>
                  ₹{equalShare.toFixed(2)}
                </span>
              </Typography>
              <Box sx={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {members.map((m) => (
                  <FormControlLabel
                    key={m.id}
                    control={
                      <Checkbox
                        checked={!!equalChecked[m.id]}
                        onChange={() => handleEqualCheckboxChange(m.id)}
                        disabled={loading}
                      />
                    }
                    label={m.name}
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Box>
            </Box>
          ) : (
            // Tab 1: Custom split
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: isCustomMismatch ? "error.main" : "secondary.main",
                  display: "block",
                  mb: 1.5,
                  fontWeight: 600,
                }}
              >
                Sum of custom splits: ₹{customSum.toFixed(2)} / ₹{parsedAmount.toFixed(2)}
                {isCustomMismatch && ` (mismatch: ₹${(parsedAmount - customSum).toFixed(2)})`}
              </Typography>
              <Box sx={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, pr: 0.5 }}>
                {members.map((m) => (
                  <Box key={m.id} sx={{ display: "flex", alignItems: "center", justifySpaceBetween: "space-between", gap: 2 }}>
                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                      {m.name}
                    </Typography>
                    <TextField
                      size="small"
                      placeholder="0.00"
                      type="number"
                      value={customShares[m.id] || ""}
                      onChange={(e) => handleCustomShareChange(m.id, e.target.value)}
                      disabled={loading}
                      sx={{ width: 100 }}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start" sx={{ fontSize: "0.8rem" }}>₹</InputAdornment>,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} disabled={loading} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (splitTab === 1 && isCustomMismatch)}
          >
            Save Expense
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
