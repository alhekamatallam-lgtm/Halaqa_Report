
import React from 'react';

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'teacherAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendanceReport';

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NavButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-800 focus:ring-amber-400 ${
      isActive
        ? 'bg-amber-400 text-stone-900 shadow-inner'
        : 'text-stone-200 hover:bg-stone-700'
    }`}
  >
    {label}
  </button>
);

export const Nav: React.FC<NavProps> = ({ currentPage, onNavigate }) => {
  return (
    <div className="flex justify-center items-center mt-4">
      <div className="flex flex-wrap justify-center gap-2 bg-stone-900/30 p-1 rounded-lg">
        <NavButton
          label="التقرير العام"
          isActive={currentPage === 'general'}
          onClick={() => onNavigate('general')}
        />
        <NavButton
          label="متابعة الحلقات"
          isActive={currentPage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />
        <NavButton
          label="متابعة الحلقات (يومي)"
          isActive={currentPage === 'dailyDashboard'}
          onClick={() => onNavigate('dailyDashboard')}
        />
         <NavButton
          label="تميز الحلقات"
          isActive={currentPage === 'excellence'}
          onClick={() => onNavigate('excellence')}
        />
        <NavButton
          label="تقرير الحلقات"
          isActive={currentPage === 'circles'}
          onClick={() => onNavigate('circles')}
        />
        <NavButton
          label="التقرير اليومي (حلقات)"
          isActive={currentPage === 'dailyCircles'}
          onClick={() => onNavigate('dailyCircles')}
        />
        <NavButton
          label="تقرير الطلاب"
          isActive={currentPage === 'students'}
          onClick={() => onNavigate('students')}
        />
        <NavButton
          label="التقرير اليومي (طلاب)"
          isActive={currentPage === 'dailyStudents'}
          onClick={() => onNavigate('dailyStudents')}
        />
        <NavButton
          label="ملاحظات"
          isActive={currentPage === 'notes'}
          onClick={() => onNavigate('notes')}
        />
        <NavButton
          label="تقييم الحلقة"
          isActive={currentPage === 'evaluation'}
          onClick={() => onNavigate('evaluation')}
        />
        <NavButton
          label="حضور المعلمين"
          isActive={currentPage === 'teacherAttendance'}
          onClick={() => onNavigate('teacherAttendance')}
        />
        <NavButton
          label="تقرير الحضور"
          isActive={currentPage === 'teacherAttendanceReport'}
          onClick={() => onNavigate('teacherAttendanceReport')}
        />
        <NavButton
          label="حضور المشرفين"
          isActive={currentPage === 'supervisorAttendanceReport'}
          onClick={() => onNavigate('supervisorAttendanceReport')}
        />
      </div>
    </div>
  );
};
