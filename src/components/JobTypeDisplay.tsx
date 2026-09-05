import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { JobTypeQualifiedName } from '../types';

interface JobTypeDisplayProps {
  jobType: JobTypeQualifiedName;
  /** Tooltip truncation threshold (default: 60) */
  maxLength?: number;
  /** Show copy button (default: true) */
  showCopy?: boolean;
  /** Size variant (default: 'md') */
  size?: 'sm' | 'md';
}

/**
 * Full-width JobTypeDisplay with:
 * - Assembly tag (dark bg, left)
 * - TypeName with right-ellipsis (namespace ellipsed, class name always visible)
 * - Copy button (right)
 * - Hover tooltip with full "fullName, assembly" string
 */
const JobTypeDisplay: React.FC<JobTypeDisplayProps> = ({
  jobType,
  maxLength = 60,
  showCopy = true,
  size = 'md',
}) => {
  const [copied, setCopied] = useState(false);

  if (!jobType || !jobType.fullName) {
    return <span className="text-slate-500 italic text-sm">unknown</span>;
  }

  const { fullName, assembly } = jobType;

  // Split fullName into namespace prefix and class name (last segment)
  const lastDot = fullName.lastIndexOf('.');
  const namespace = lastDot > 0 ? fullName.slice(0, lastDot + 1) : '';
  const className = lastDot > 0 ? fullName.slice(lastDot + 1) : fullName;

  // Composed string for tooltip and copy
  const composedString = assembly ? `${fullName}, ${assembly}` : fullName;

  // Tooltip display with middle-truncation
  const tooltipName = composedString.length > maxLength
    ? `${composedString.slice(0, Math.floor((maxLength - 3) / 2))}...${composedString.slice(-Math.ceil((maxLength - 3) / 2))}`
    : composedString;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(composedString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = composedString;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Size classes
  const tagSizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const typeSizeClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const copySize = size === 'sm' ? 10 : 12;

  return (
    <span className="flex w-full items-center gap-1.5 group relative min-w-0">
      {/* Assembly tag */}
      {assembly && (
        <span
          className={`${tagSizeClass} bg-slate-700 text-slate-300 rounded shrink-0 leading-none`}
          title={composedString}
        >
          {assembly}
        </span>
      )}

      {/* TypeName: namespace (right-ellipsis) + className (always visible) */}
      <span
        className={`flex-1 min-w-0 flex overflow-hidden ${typeSizeClass} text-slate-50 leading-none`}
        title={composedString}
      >
        {namespace && (
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-slate-500">
            {namespace}
          </span>
        )}
        <span className="shrink-0 font-medium">{className}</span>
      </span>

      {/* Copy button */}
      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="Copy full type name"
        >
          {copied ? <Check size={copySize} className="text-green-400" /> : <Copy size={copySize} />}
        </button>
      )}

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-slate-700 text-slate-200 text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-md overflow-hidden text-ellipsis">
        {tooltipName}
      </div>
    </span>
  );
};

export default JobTypeDisplay;
