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
  const searchParams = new URLSearchParams({
    pa: payeeAddress,
    pn: payeeName,
    am: formatAmount(amount),
    tn: transactionNote,
    cu: "INR",
  });

  return `upi://pay?${searchParams.toString()}`;
}
