import { GroupMember, Expense, Transaction } from "@/types";

/**
 * Calculates the net balances of all members in a group.
 * Positive balance = member is owed money.
 * Negative balance = member owes money.
 */
export function calculateMemberBalances(
  members: GroupMember[],
  expenses: Expense[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize all members with 0 balance
  members.forEach((m) => {
    balances[m.id] = 0;
  });

  // Calculate balances based on expenses and their splits
  expenses.forEach((expense) => {
    const payerId = expense.payer_member_id;
    const amount = Number(expense.amount);

    // Add paid amount to the payer's balance
    if (balances[payerId] !== undefined) {
      balances[payerId] += amount;
    }

    // Subtract owed amounts from each split member
    if (expense.expense_splits) {
      expense.expense_splits.forEach((split) => {
        const splitMemberId = split.member_id;
        const owedAmount = Number(split.amount_owed);

        if (balances[splitMemberId] !== undefined) {
          balances[splitMemberId] -= owedAmount;
        }
      });
    }
  });

  return balances;
}

/**
 * Debt Simplification (Netting) Algorithm.
 * Matches debtors and creditors to minimize transactions.
 */
export function simplifyDebts(
  members: GroupMember[],
  expenses: Expense[]
): Transaction[] {
  const balances = calculateMemberBalances(members, expenses);
  const transactions: Transaction[] = [];

  const memberMap = new Map<string, GroupMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  // Separate debtors and creditors
  // We use 0.01 tolerance to avoid floating point precision issues
  const debtors: { memberId: string; balance: number }[] = [];
  const creditors: { memberId: string; balance: number }[] = [];

  Object.entries(balances).forEach(([memberId, balance]) => {
    if (balance < -0.01) {
      debtors.push({ memberId, balance });
    } else if (balance > 0.01) {
      creditors.push({ memberId, balance });
    }
  });

  // Sort debtors ascending (most negative first) and creditors descending (most positive first)
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amountOwed = Math.abs(debtor.balance);
    const amountCredited = creditor.balance;

    const settlementAmount = Math.min(amountOwed, amountCredited);

    const fromMember = memberMap.get(debtor.memberId);
    const toMember = memberMap.get(creditor.memberId);

    if (fromMember && toMember && settlementAmount > 0.01) {
      transactions.push({
        fromMember,
        toMember,
        amount: Number(settlementAmount.toFixed(2)),
      });
    }

    // Update balances
    debtor.balance += settlementAmount;
    creditor.balance -= settlementAmount;

    // Check if debtor is fully settled
    if (Math.abs(debtor.balance) < 0.01) {
      i++;
    }
    // Check if creditor is fully settled
    if (Math.abs(creditor.balance) < 0.01) {
      j++;
    }
  }

  return transactions;
}
