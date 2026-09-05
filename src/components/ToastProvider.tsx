import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        className: '',
        duration: 3000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#22c55e',
            secondary: '#1e293b',
          },
          style: {
            border: '1px solid #22c55e',
          },
        },
        error: {
          duration: 0,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#1e293b',
          },
          style: {
            border: '1px solid #ef4444',
          },
        },
        loading: {
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#1e293b',
          },
          style: {
            border: '1px solid #3b82f6',
          },
        },
      }}
    />
  );
}

export default ToastProvider;