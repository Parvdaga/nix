type BuildUpiLinkParams = {
  amount: number;
  payeeAddress: string;
  payeeName: string;
  transactionNote?: string;
};

function formatAmount(amount: number) {
  // Format amount to 2 decimal places, and strip trailing decimals if .00
  return amount.toFixed(2).replace(/\.00$/, "");
}

export function buildUpiLink({
  amount,
  payeeAddress,
  payeeName,
  transactionNote = "Nix Settlement",
}: BuildUpiLinkParams) {
  const formattedAmount = amount.toFixed(2).replace(/\.00$/, "");
  
  // URL encode payeeName and transactionNote, preserving standard %20 for spaces
  const encodedName = encodeURIComponent(payeeName.trim());
  const encodedNote = encodeURIComponent(transactionNote.trim());
  
  // Keep the UPI ID VPA address unencoded so the '@' is a literal '@'
  const cleanAddress = payeeAddress.trim();
  
  return `upi://pay?pa=${cleanAddress}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
}
