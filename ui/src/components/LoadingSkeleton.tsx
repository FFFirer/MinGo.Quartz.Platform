interface LoadingSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  lines = 1 
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-700';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...getStyle(),
              height: height || '16px',
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={getStyle()}
    />
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <LoadingSkeleton width="80px" height="14px" />
          <LoadingSkeleton width="60px" height="28px" className="mt-2" />
          <LoadingSkeleton width="100px" height="12px" className="mt-2" />
        </div>
        <LoadingSkeleton variant="circular" width="40px" height="40px" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex items-center gap-3 mb-3">
        <LoadingSkeleton variant="circular" width="32px" height="32px" />
        <div className="flex-1">
          <LoadingSkeleton width="120px" height="16px" />
          <LoadingSkeleton width="80px" height="12px" className="mt-1" />
        </div>
      </div>
      <LoadingSkeleton height="12px" lines={2} />
      <div className="flex gap-2 mt-3">
        <LoadingSkeleton width="60px" height="24px" />
        <LoadingSkeleton width="60px" height="24px" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-700">
      <td className="py-3 px-4"><LoadingSkeleton width="100px" height="16px" /></td>
      <td className="py-3 px-4"><LoadingSkeleton width="80px" height="16px" /></td>
      <td className="py-3 px-4"><LoadingSkeleton variant="circular" width="24px" height="24px" /></td>
      <td className="py-3 px-4"><LoadingSkeleton width="120px" height="16px" /></td>
      <td className="py-3 px-4"><LoadingSkeleton width="80px" height="16px" /></td>
    </tr>
  );
}

export default LoadingSkeleton;