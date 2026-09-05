interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatsCard({ title, value, subtitle, icon, trend, variant = 'default' }: StatsCardProps) {
  const variantClasses = {
    default: 'border-slate-700',
    success: 'border-green-500/30',
    warning: 'border-amber-500/30',
    danger: 'border-red-500/30',
  };

  const iconBgClasses = {
    default: 'bg-slate-800',
    success: 'bg-green-500/10',
    warning: 'bg-amber-500/10',
    danger: 'bg-red-500/10',
  };

  const iconColorClasses = {
    default: 'text-slate-400',
    success: 'text-green-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  };

  return (
    <div className={`p-4 bg-slate-800 rounded-lg border ${variantClasses[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-50 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${iconBgClasses[variant]} ${iconColorClasses[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsCard;