interface StatCardProps {
  label: string;
  value: string | number;
  detail: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <section className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}
