type BuildUpiLinkParams = {
  amount: number;
  payeeAddress: string;
  payeeName: string;
  transactionNote?: string;
};

function formatAmount(amount: number) {
  // Format amount to 2 decimal places
  return amount.toFixed(2);
}

export function buildUpiLink({
  amount,
  payeeAddress,
  payeeName,
  transactionNote = "Nix Settlement",
}: BuildUpiLinkParams) {
  const formattedAmount = amount.toFixed(2);
  
  // URL encode payeeName
  const encodedName = encodeURIComponent(payeeName.trim());
  
  // Keep the UPI ID VPA address unencoded so the '@' is a literal '@'
  const cleanAddress = payeeAddress.trim();

  // Generate a unique transaction reference (e.g. NIX_<timestamp>_<random>)
  const tr = `NIX_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Temporarily remove 'tn' (transaction note) as some receiving UPI apps fail / cancel payments when it is included
  return `upi://pay?pa=${cleanAddress}&pn=${encodedName}&tr=${tr}&am=${formattedAmount}&cu=INR`;
}
