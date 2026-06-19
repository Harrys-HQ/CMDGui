import React from 'react';
import { useToast, ToastType } from '../hooks/useToast';

const getToastColor = (type: ToastType) => {
  switch (type) {
    case 'success':
      return '#4caf50';
    case 'error':
      return '#f44336';
    case 'warning':
      return '#ff9800';
    case 'info':
    default:
      return '#007acc';
  }
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{ borderLeft: `4px solid ${getToastColor(toast.type)}` }}
          onClick={() => removeToast(toast.id)}
        >
          <div className="toast-content">{toast.message}</div>
          <div className="toast-close">×</div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
