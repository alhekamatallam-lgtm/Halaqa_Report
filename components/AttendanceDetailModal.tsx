import React from 'react';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  dates: string[];
}

const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({ isOpen, onClose, title, dates }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900 bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-50 rounded-2xl shadow-2xl w-full max-w-md mx-auto transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-stone-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {dates.length > 0 ? (
            <ul className="space-y-2">
              {dates.map((date, index) => (
                <li key={index} className="bg-stone-100 p-3 rounded-md text-stone-700 text-center text-sm font-medium">
                  {date}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-stone-500">لا توجد تواريخ لعرضها.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;
