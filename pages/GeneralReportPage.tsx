import React, { useMemo } from 'react';
import type { ProcessedStudentData, GeneralReportStats } from '../types';

// --- Icon Components ---
const CircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
  </svg>
);
const StudentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const AttendanceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);
const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" />
    </svg>
);

// --- StatCard Component ---
interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, description, icon, className = '', style }) => (
  <div
    className={`bg-gradient-to-br from-stone-50 to-stone-100 p-6 rounded-2xl shadow-lg flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-300 border border-stone-200 ${className}`}
    style={style}
  >
    <div className="bg-amber-100 text-amber-600 rounded-full p-4 mb-4 shadow-inner">
      {icon}
    </div>
    <p className="text-base font-semibold text-stone-600 truncate">{label}</p>
    <p className="mt-1 text-4xl font-bold text-stone-800 tracking-tight">{value}</p>
    {description && <p className="text-xs text-stone-500 mt-2 font-medium">{description}</p>}
  </div>
);

// --- Main Page Component ---
const GeneralReportPage: React.FC<{ students: ProcessedStudentData[] }> = ({ students }) => {

  const stats: GeneralReportStats = useMemo(() => {
    if (students.length === 0) {
      return {
        totalCircles: 0, totalStudents: 0, totalMemorization: 0, totalReview: 0,
        totalConsolidation: 0, totalAchievement: 0, avgAttendance: 0,
      };
    }

    const totalCircles = new Set(students.map(s => s.circle)).size;
    const totalStudents = students.length;
    const totalMemorization = students.reduce((sum, s) => sum + s.memorizationPages.achieved, 0);
    const totalReview = students.reduce((sum, s) => sum + s.reviewPages.achieved, 0);
    const totalConsolidation = students.reduce((sum, s) => sum + s.consolidationPages.achieved, 0);
    const totalAchievement = totalMemorization + totalReview + totalConsolidation;
    const avgAttendance = students.reduce((sum, s) => sum + s.attendance, 0) / totalStudents;

    return {
      totalCircles, totalStudents, totalMemorization, totalReview,
      totalConsolidation, totalAchievement, avgAttendance,
    };
  }, [students]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard icon={<CircleIcon />} label="عدد الحلقات" value={stats.totalCircles} />
      <StatCard icon={<StudentIcon />} label="عدد الطلاب" value={stats.totalStudents} />
      <StatCard icon={<AttendanceIcon />} label="متوسط نسبة الحضور" value={`${(stats.avgAttendance * 100).toFixed(1)}%`} />
      
      <StatCard icon={<BookIcon />} label="إجمالي أوجه الحفظ" value={stats.totalMemorization.toFixed(1)} />
      <StatCard icon={<BookIcon />} label="إجمالي أوجه المراجعة" value={stats.totalReview.toFixed(1)} />
      <StatCard icon={<BookIcon />} label="إجمالي أوجه التثبيت" value={stats.totalConsolidation.toFixed(1)} />
      
      <div className="sm:col-span-2 lg:col-span-3">
         <StatCard 
            icon={<StarIcon />}
            label="إجمالي أوجه الإنجاز" 
            value={stats.totalAchievement.toFixed(1)} 
            description="مجموع أوجه الحفظ والمراجعة والتثبيت"
        />
      </div>
    </div>
  );
};

export default GeneralReportPage;