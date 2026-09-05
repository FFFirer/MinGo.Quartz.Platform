import React from 'react';

interface StatusBadgeProps {
  status: 
    | 'Online' | 'Warning' | 'Offline' | 'Pending' | 'Deleted'
    | 'normal' | 'paused' | 'blocked'
    | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'dot' | 'badge' | 'inline';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
  variant = 'dot',
}) => {
  // Status to color mapping
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Online':
      case 'normal':
        return 'bg-green-500';
      case 'Warning':
      case 'paused':
        return 'bg-amber-500';
      case 'Offline':
        return 'bg-slate-500';
      case 'blocked':
        return 'bg-red-500';
      case 'Pending':
        return 'bg-blue-500';
      case 'Deleted':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const sizeClass = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }[size];

  const statusColor = getStatusColor(status);
  const textColor = statusColor.replace('bg-', 'text-');

  // For dot variant, we only show the dot
  if (variant === 'dot') {
    return (
      <span className={`inline-flex items-center ${sizeClass} rounded-full ${statusColor}`} />
    );
  }

  // For badge and inline variants, we show dot and label
  return (
    <span className="inline-flex items-center space-x-1.5">
      <span className={`${sizeClass} rounded-full ${statusColor}`} />
      {showLabel && (
        <span className={`text-xs font-medium ${textColor} capitalize`}>
          {status}
        </span>
      )}
    </span>
  );
};

export default StatusBadge;