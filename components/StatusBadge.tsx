const CONFIG: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#F0FDF6', text: '#2E9E6B' },
  completed: { bg: '#F5F5F5', text: '#6B6478' },
  pending: { bg: '#FFFBEB', text: '#E8922A' },
  cancelled: { bg: '#FEF2F2', text: '#D94F4F' },
  refunded: { bg: '#FEF2F2', text: '#D94F4F' },
  active: { bg: '#F0FDF6', text: '#2E9E6B' },
  inactive: { bg: '#F5F5F5', text: '#6B6478' },
  suspended: { bg: '#FEF2F2', text: '#D94F4F' },
  verified: { bg: '#FFF8E7', text: '#C9A84C' },
};

export function StatusBadge({ status }: { status: string }) {
  const c = CONFIG[status.toLowerCase()] || CONFIG.pending;
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}
