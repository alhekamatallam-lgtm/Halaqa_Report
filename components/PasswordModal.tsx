import React, { useState } from 'react';
import type { SupervisorData, ProductorData } from '../types';

type AuthenticatedUser = { role: 'admin' | 'supervisor' | 'exam_teacher', name: string, circles: string[] };

interface PasswordModalProps {
  onSuccess: (user: AuthenticatedUser) => void;
  onClose: () => void;
  supervisors: SupervisorData[];
  productors: ProductorData[];
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onSuccess, onClose, supervisors, productors }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === 'admin123') {
      onSuccess({ role: 'admin', name: 'الإدارة', circles: [] });
      return;
    }

    const foundSupervisor = supervisors.find(s => s.password === password);
    if (foundSupervisor) {
      onSuccess({
        role: 'supervisor',
        name: foundSupervisor.supervisorName,
        circles: foundSupervisor.circles
      });
      return;
    }

    const foundProductor = productors.find(p => p.password === password);
    if (foundProductor && foundProductor.role === 'معلم اختبارات') {
      onSuccess({
        role: 'exam_teacher',
        name: foundProductor.name,
        circles: []
      });
      return;
    }
    
    setError('كلمة المرور غير صحيحة. حاول مرة أخرى.');
    setPassword('');
  };

  return (
    <div
      className="fixed inset-0 bg-stone-900 bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-50 rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-8 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-stone-800 text-center mb-4">يتطلب إذن دخول</h3>
        <p className="text-center text-sm text-stone-600 mb-6">الرجاء إدخال كلمة المرور لعرض هذه الصفحة.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password-input" className="block text-sm font-medium text-stone-700 mb-2">كلمة المرور</label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className="block w-full px-3 py-2 text-base border border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          <div className="mt-6 flex justify-between gap-4">
             <button
              type="button"
              onClick={onClose}
              className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all duration-150"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="w-full h-10 px-4 text-sm font-semibold text-stone-900 bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150"
            >
              دخول
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;