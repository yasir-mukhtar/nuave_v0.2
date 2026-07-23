export function SeverityIcon({ severity }: Readonly<{ severity: string }>) {
  if (severity === "high") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <rect x="16" y="4" width="4" height="16" rx="2" fill="#FB2C36" />
        <rect x="10" y="8" width="4" height="12" rx="2" fill="#FB2C36" />
        <rect x="4" y="12" width="4" height="8" rx="2" fill="#FB2C36" />
      </svg>
    );
  }

  if (severity === "medium") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <rect x="16" y="4" width="4" height="16" rx="2" fill="#CCCCCC" />
        <rect x="10" y="8" width="4" height="12" rx="2" fill="#FF6900" />
        <rect x="4" y="12" width="4" height="8" rx="2" fill="#FF6900" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect x="16" y="4" width="4" height="16" rx="2" fill="#CCCCCC" />
      <rect x="10" y="8" width="4" height="12" rx="2" fill="#CCCCCC" />
      <rect x="4" y="12" width="4" height="8" rx="2" fill="#F0B100" />
    </svg>
  );
}
