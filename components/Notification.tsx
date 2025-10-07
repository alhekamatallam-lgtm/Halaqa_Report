import React from 'react';

interface NotificationProps {
  notification: { message: string; type: 'success' | 'error' } | null;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-xl z-[100] flex items-center gap-4 transition-transform transform animate-slide-in";
  const typeClasses = {
    success: 'bg-amber-50 border border-amber-300 text-amber-900',
    error: 'bg-red-100 border border-red-400 text-red-800',
  };
  
  const icon = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };
  
  return (
    <div className={`${baseClasses} ${typeClasses[notification.type]}`} role="alert">
      {icon[notification.type]}
      <span className="font-semibold">{notification.message}</span>
      <button onClick={onClose} className="text-xl font-bold opacity-70 hover:opacity-100" aria-label="إغلاق">
        &times;
      </button>
    </div>
  );
};

export default Notification;