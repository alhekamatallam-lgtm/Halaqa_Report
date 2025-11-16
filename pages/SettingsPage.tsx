import React, { useState, useEffect, useMemo } from 'react';
import type { ProcessedSettingsData, ProcessedStudentData } from '../types';

interface SettingsPageProps {
  settings: ProcessedSettingsData;
  onSave: (newSettings: ProcessedSettingsData) => Promise<void>;
  isSubmitting: boolean;
  dailyStudents: ProcessedStudentData[];
}

const parseDateFromDayString = (dayString: string): Date => {
    const match = dayString.match(/(\d{2})-(\d{2})/);
    if (!match) return new Date(0);
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    return new Date(new Date().getFullYear(), month - 1, day);
};

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, isSubmitting, dailyStudents }) => {
  const [localSettings, setLocalSettings] = useState<ProcessedSettingsData>({
    default_student_count_day: '',
    teacher_late_checkin_time: '',
    teacher_early_checkout_time: '',
    supervisor_late_checkin_time: '',
    supervisor_early_checkout_time: '',
  });

  useEffect(() => {
    setLocalSettings({
      default_student_count_day: settings.default_student_count_day || '',
      teacher_late_checkin_time: settings.teacher_late_checkin_time || '15:25',
      teacher_early_checkout_time: settings.teacher_early_checkout_time || '16:50',
      supervisor_late_checkin_time: settings.supervisor_late_checkin_time || '15:20',
      supervisor_early_checkout_time: settings.supervisor_early_checkout_time || '17:00',
    });
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
  };

  const dayOptions = useMemo(() => {
      const days = new Set<string>(dailyStudents.map(s => s.day).filter((d): d is string => !!d));
      return Array.from(days).sort((a, b) => {
          const dateA = parseDateFromDayString(a);
          const dateB = parseDateFromDayString(b);
          return dateB.getTime() - dateA.getTime();
      });
  }, [dailyStudents]);

  return (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-stone-800">الإعدادات الافتراضية</h2>
                <p className="text-stone-500 mt-2">إدارة الإعدادات العامة لبطاقات التقارير وحضور المعلمين والمشرفين.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label htmlFor="default_day_select" className="block text-sm font-medium text-stone-700 mb-2">
                        اليوم الافتراضي لبطاقات (عدد الطلاب) و (متوسط الحضور)
                    </label>
                    <select
                        id="default_day_select"
                        value={localSettings.default_student_count_day}
                        onChange={(e) => handleChange('default_student_count_day', e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-stone-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                    >
                        <option value="">-- اختر يوماً --</option>
                        {dayOptions.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="late_time_input" className="block text-sm font-medium text-stone-700 mb-2">وقت بدء احتساب تأخر المعلمين</label>
                        <input 
                            type="time" 
                            id="late_time_input" 
                            value={localSettings.teacher_late_checkin_time} 
                            onChange={(e) => handleChange('teacher_late_checkin_time', e.target.value)} 
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="early_time_input" className="block text-sm font-medium text-stone-700 mb-2">وقت بدء احتساب انصراف مبكر للمعلمين</label>
                        <input 
                            type="time" 
                            id="early_time_input" 
                            value={localSettings.teacher_early_checkout_time} 
                            onChange={(e) => handleChange('teacher_early_checkout_time', e.target.value)} 
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="supervisor_late_time_input" className="block text-sm font-medium text-stone-700 mb-2">وقت بدء احتساب تأخر المشرفين</label>
                        <input 
                            type="time" 
                            id="supervisor_late_time_input" 
                            value={localSettings.supervisor_late_checkin_time} 
                            onChange={(e) => handleChange('supervisor_late_checkin_time', e.target.value)} 
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="supervisor_early_time_input" className="block text-sm font-medium text-stone-700 mb-2">وقت بدء احتساب انصراف مبكر للمشرفين</label>
                        <input 
                            type="time" 
                            id="supervisor_early_time_input" 
                            value={localSettings.supervisor_early_checkout_time} 
                            onChange={(e) => handleChange('supervisor_early_checkout_time', e.target.value)} 
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-stone-200">
                     <button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-12 px-8 text-base font-semibold text-stone-900 bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 disabled:bg-amber-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default SettingsPage;
