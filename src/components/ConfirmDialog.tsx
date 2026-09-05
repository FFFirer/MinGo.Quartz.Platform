import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isConfirmLoading?: boolean;
  confirmLoadingLabel?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  isConfirmLoading = false,
  confirmLoadingLabel = 'Processing...',
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        {/* Dialog Container */}
        <div className="bg-slate-800 rounded-lg w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <span className="sr-only">Close</span>
              {/* Using 'X' from lucide-react would require import, but we can use times icon or just text */}
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="mb-4 text-slate-400">{message}</p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmLoading}
              className={`btn-primary ${isConfirmLoading ? 'opacity-50' : ''}`}
            >
              {isConfirmLoading ? confirmLoadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;