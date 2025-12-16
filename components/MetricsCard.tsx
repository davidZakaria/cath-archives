'use client';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

export default function MetricsCard({ title, value, subtitle, color = 'blue' }: MetricsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium opacity-80 mb-2">{title}</h3>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {subtitle && <p className="text-sm opacity-70">{subtitle}</p>}
    </div>
  );
}

