export interface Profile {
  id: string;
  name: string;
  upi_id: string | null;
  pin_hash: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string | null; // NULL if offline dummy member
  dummy_name: string | null;  // NULL if registered user profile
  dummy_upi_id: string | null;// NULL if registered user profile
  profiles?: {
    name: string;
    upi_id: string | null;
  } | null;
  
  // Computed client-side fields for easier access
  name: string;
  upi_id: string | null;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  payer_member_id: string; // references group_members.id
  category: string;
  date: string;
  created_at: string;
  expense_splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string; // references group_members.id
  amount_owed: number;
}

export interface Transaction {
  fromMember: GroupMember;
  toMember: GroupMember;
  amount: number;
}

export interface CategoryOption {
  value: string;
  label: string;
  icon: string;
  color: string;
}
