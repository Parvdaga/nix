"use client";

import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Expense, GroupMember } from "@/types";
import { useNotification } from "./NotificationProvider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CategoryIcon from "@mui/icons-material/Category";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { styled } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import FastfoodIcon from "@mui/icons-material/Fastfood";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import HomeIcon from "@mui/icons-material/Home";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

// New icons for the added categories
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore";
import LocalBarIcon from "@mui/icons-material/LocalBar";
import CoffeeIcon from "@mui/icons-material/Coffee";
import FlightIcon from "@mui/icons-material/Flight";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import LanguageIcon from "@mui/icons-material/Language";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import MovieIcon from "@mui/icons-material/Movie";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import CelebrationIcon from "@mui/icons-material/Celebration";
import HotelIcon from "@mui/icons-material/Hotel";
import BedIcon from "@mui/icons-material/Bed";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MedicationIcon from "@mui/icons-material/Medication";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import RedeemIcon from "@mui/icons-material/Redeem";
import PetsIcon from "@mui/icons-material/Pets";
import WorkIcon from "@mui/icons-material/Work";

const ExpandMore = styled((props: { expand: boolean; [key: string]: any }) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? "rotate(0deg)" : "rotate(180deg)",
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
}));

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  // Food & Drinks
  Food: { icon: <FastfoodIcon />, color: "#10b981" },
  Groceries: { icon: <LocalGroceryStoreIcon />, color: "#22c55e" },
  Drinks: { icon: <LocalBarIcon />, color: "#06b6d4" },
  Coffee: { icon: <CoffeeIcon />, color: "#b45309" },

  // Transport & Travel
  Travel: { icon: <FlightIcon />, color: "#3b82f6" },
  Transport: { icon: <LocalTaxiIcon />, color: "#0ea5e9" },
  Fuel: { icon: <LocalGasStationIcon />, color: "#f97316" },
  Parking: { icon: <LocalParkingIcon />, color: "#6366f1" },
  Tolls: { icon: <AltRouteIcon />, color: "#64748b" },

  // Rent & Bills
  Rent: { icon: <HomeIcon />, color: "#f59e0b" },
  Utilities: { icon: <LightbulbIcon />, color: "#eab308" },
  Internet: { icon: <LanguageIcon />, color: "#0284c7" },
  Electricity: { icon: <ElectricBoltIcon />, color: "#facc15" },
  Water: { icon: <WaterDropIcon />, color: "#38bdf8" },
  Gas: { icon: <WhatshotIcon />, color: "#ea580c" },

  // Fun & Shopping
  Entertainment: { icon: <ConfirmationNumberIcon />, color: "#8b5cf6" },
  Movies: { icon: <MovieIcon />, color: "#7c3aed" },
  Games: { icon: <SportsEsportsIcon />, color: "#a855f7" },
  Party: { icon: <CelebrationIcon />, color: "#ec4899" },
  Shopping: { icon: <ShoppingBagIcon />, color: "#f43f5e" },

  // Accommodation
  Hotel: { icon: <HotelIcon />, color: "#0f766e" },
  Accommodation: { icon: <BedIcon />, color: "#14b8a6" },

  // Health
  Healthcare: { icon: <LocalHospitalIcon />, color: "#ef4444" },
  Medicine: { icon: <MedicationIcon />, color: "#dc2626" },

  // Others
  Subscription: { icon: <SubscriptionsIcon />, color: "#9333ea" },
  Gift: { icon: <RedeemIcon />, color: "#d946ef" },
  Pets: { icon: <PetsIcon />, color: "#ca8a04" },
  Office: { icon: <WorkIcon />, color: "#475569" },
  Others: { icon: <MoreHorizIcon />, color: "#6b7280" },
};

const DATE_FILTERS = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const;

type DateFilter = (typeof DATE_FILTERS)[number]["value"];

const parseExpenseDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatExpenseDate = (date: string) =>
  parseExpenseDate(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatDateGroupLabel = (date: string) => {
  const expenseDate = startOfDay(parseExpenseDate(date));
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (expenseDate.getTime() === today.getTime()) return "Today";
  if (expenseDate.getTime() === yesterday.getTime()) return "Yesterday";
  return formatExpenseDate(date);
};

interface ExpensesTabProps {
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
  refreshTrigger: number;
  onExpensesChange: () => void;
  onOpenExpenseDialog: () => void;
  onEditExpense: (expense: Expense) => void;
}

export default function ExpensesTab({
  groupId,
  members,
  currentUserId,
  refreshTrigger,
  onExpensesChange,
  onOpenExpenseDialog,
  onEditExpense,
}: ExpensesTabProps) {
  const { showNotification } = useNotification();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [payerFilter, setPayerFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => {
    if (groupId) {
      fetchExpenses();
    }
  }, [groupId, refreshTrigger]);

  const fetchExpenses = async () => {
    try {
      // Fetch expenses
      const { data: expData, error: expError } = await supabase
        .from("expenses")
        .select(`
          id,
          group_id,
          title,
          amount,
          payer_member_id,
          category,
          date,
          created_by,
          created_at
        `)
        .eq("group_id", groupId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (expError) throw expError;

      if (!expData || expData.length === 0) {
        setExpenses([]);
        return;
      }

      // Fetch splits for these expenses
      const expenseIds = expData.map((e) => e.id);
      const { data: splitsData, error: splitsError } = await supabase
        .from("expense_splits")
        .select("*")
        .in("expense_id", expenseIds);

      if (splitsError) throw splitsError;

      const formatted: Expense[] = expData.map((exp) => {
        const relatedSplits = (splitsData || []).filter((s) => s.expense_id === exp.id);
        return {
          ...exp,
          expense_splits: relatedSplits,
        };
      });

      setExpenses(formatted);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  };

  const handleExpandClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDeleteExpense = async (expenseId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;
      showNotification("Expense deleted successfully", "success");
      onExpensesChange();
      await fetchExpenses();
    } catch (err: any) {
      console.error("Error deleting expense:", err);
      showNotification(err.message || "Failed to delete expense", "error");
    }
  };

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member ? member.name : "Unknown Friend";
  };

  const categoryOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.category))).sort(),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    const today = startOfDay(new Date());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return expenses.filter((expense) => {
      if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
      if (payerFilter !== "all" && expense.payer_member_id !== payerFilter) return false;

      const expenseDate = startOfDay(parseExpenseDate(expense.date));
      if (dateFilter === "today") return expenseDate.getTime() === today.getTime();
      if (dateFilter === "week") return expenseDate >= weekStart;
      if (dateFilter === "month") return expenseDate >= monthStart;
      return true;
    });
  }, [categoryFilter, dateFilter, expenses, payerFilter]);

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, Expense[]>();

    filteredExpenses.forEach((expense) => {
      const currentGroup = groups.get(expense.date) || [];
      currentGroup.push(expense);
      groups.set(expense.date, currentGroup);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      label: formatDateGroupLabel(date),
      total: items.reduce((sum, expense) => sum + Number(expense.amount), 0),
      expenses: items,
    }));
  }, [filteredExpenses]);

  const hasActiveFilters =
    categoryFilter !== "all" || payerFilter !== "all" || dateFilter !== "all";

  const handleClearFilters = () => {
    setCategoryFilter("all");
    setPayerFilter("all");
    setDateFilter("all");
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Transactions
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onOpenExpenseDialog}
          sx={{ borderRadius: 3 }}
        >
          Add Expense
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1,
          mb: 2,
        }}
      >
        <FormControl size="small">
          <InputLabel id="expense-date-filter-label">Date</InputLabel>
          <Select
            labelId="expense-date-filter-label"
            label="Date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            sx={{ borderRadius: 3 }}
          >
            {DATE_FILTERS.map((filter) => (
              <MenuItem key={filter.value} value={filter.value}>
                {filter.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="expense-category-filter-label">Category</InputLabel>
          <Select
            labelId="expense-category-filter-label"
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ borderRadius: 3 }}
          >
            <MenuItem value="all">All</MenuItem>
            {categoryOptions.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="expense-payer-filter-label">Payer</InputLabel>
          <Select
            labelId="expense-payer-filter-label"
            label="Payer"
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            sx={{ borderRadius: 3 }}
          >
            <MenuItem value="all">All</MenuItem>
            {members.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {member.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {hasActiveFilters && (
        <Button
          variant="text"
          size="small"
          onClick={handleClearFilters}
          sx={{ alignSelf: "flex-start", color: "text.secondary", mb: 1, px: 0 }}
        >
          Clear filters
        </Button>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {groupedExpenses.map((group) => (
          <Box key={group.date} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 0.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800 }}>
                  {group.label}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  {group.expenses.length} expense{group.expenses.length === 1 ? "" : "s"}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 800 }}>
                &#8377;{group.total.toFixed(2).replace(/\.00$/, "")}
              </Typography>
            </Box>

            {group.expenses.map((expense) => {
          const isSettlement = expense.title.startsWith("Settled:");
          const cat = isSettlement
            ? { icon: <SwapHorizIcon />, color: "#10b981" }
            : (CATEGORY_ICONS[expense.category] || CATEGORY_ICONS.Others);
          const isExpanded = expandedId === expense.id;
          const payerName = getMemberName(expense.payer_member_id);
          
          return (
            <Card
              key={expense.id}
              variant="outlined"
              sx={{
                borderRadius: 2,
                cursor: "pointer",
                borderColor: isExpanded ? "rgba(99, 102, 241, 0.3)" : "rgba(255, 255, 255, 0.05)",
                bgcolor: isExpanded ? "rgba(22, 28, 47, 0.7)" : "rgba(18, 24, 41, 0.45)",
                transition: "all 0.2s ease",
              }}
              onClick={() => handleExpandClick(expense.id)}
            >
              <Box sx={{ display: "flex", alignItems: "center", p: 2, gap: 1.5 }}>
                <Avatar sx={{ bgcolor: `${cat.color}15`, color: cat.color }}>
                  {cat.icon}
                </Avatar>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {expense.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {isSettlement ? "Settlement" : `Paid by ${payerName}`} • {new Date(expense.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                    ₹{Number(expense.amount).toFixed(2).replace(/\.00$/, "")}
                  </Typography>
                  <ExpandMore expand={isExpanded} size="small" sx={{ color: "text.secondary" }}>
                    <ExpandMoreIcon />
                  </ExpandMore>
                </Box>
              </Box>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <CardContent sx={{ pt: 0, px: 3, pb: 2.5 }}>
                  <Divider sx={{ mb: 2, borderColor: "rgba(255, 255, 255, 0.05)" }} />
                  
                  {!isSettlement && (
                    <>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
                        Split breakdown:
                      </Typography>
                      
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                        {expense.expense_splits?.map((split) => {
                          const name = getMemberName(split.member_id);
                          return (
                            <Box key={split.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                {name}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                                ₹{Number(split.amount_owed).toFixed(2).replace(/\.00$/, "")}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}

                  {expense.created_by === currentUserId && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: isSettlement ? 0 : 2, gap: 1.5 }}>
                      {!isSettlement && (
                        <Button
                          variant="text"
                          color="primary"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditExpense(expense);
                          }}
                        >
                          Edit Expense
                        </Button>
                      )}
                      <Button
                        variant="text"
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={(e) => handleDeleteExpense(expense.id, e)}
                      >
                        {isSettlement ? "Delete Settlement" : "Delete Expense"}
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          );
            })}
          </Box>
        ))}

        {expenses.length === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyCenter: "center", py: 8, gap: 1.5 }}>
            <CategoryIcon sx={{ fontSize: 48, color: "rgba(255, 255, 255, 0.06)" }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No expenses recorded yet.
            </Typography>
          </Box>
        )}

        {expenses.length > 0 && groupedExpenses.length === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 1.5 }}>
            <CategoryIcon sx={{ fontSize: 48, color: "rgba(255, 255, 255, 0.06)" }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No expenses match these filters.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
