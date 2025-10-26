import React from 'react';

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'teacherAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendanceReport';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NavSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="px-3 py-2">
        <h3 className="px-3 text-xs font-semibold uppercase text-stone-500 tracking-wider">{title}</h3>
        <div className="mt-2 space-y-1">
            {children}
        </div>
    </div>
);

const NavLink: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-right flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 group ${
            isActive
                ? 'bg-amber-100 text-amber-800 font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
        }`}
    >
        <span className="flex-1">{label}</span>
         {isActive && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
    return (
        <aside className="w-64 flex-shrink-0 bg-stone-50 border-l border-stone-200 flex flex-col print-hidden">
            <div className="h-24 flex items-center justify-center px-4 border-b border-stone-200">
                <h2 className="text-xl font-bold text-stone-800 text-center">لوحة التحكم</h2>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-3 py-2">
                   <NavLink label="التقرير العام" isActive={currentPage === 'general'} onClick={() => onNavigate('general')} />
                </div>

                 <NavSection title="متابعة الحلقات">
                    <NavLink label="تميز الحلقات" isActive={currentPage === 'excellence'} onClick={() => onNavigate('excellence')} />
                    <NavLink label="متابعة الحلقات" isActive={currentPage === 'dashboard'} onClick={() => onNavigate('dashboard')} />
                    <NavLink label="تقرير الحلقات" isActive={currentPage === 'circles'} onClick={() => onNavigate('circles')} />
                    <NavLink label="تقرير الطلاب" isActive={currentPage === 'students'} onClick={() => onNavigate('students')} />
                 </NavSection>
                 
                 <NavSection title="التقرير اليومي">
                    <NavLink label="متابعة الحلقات (يومي)" isActive={currentPage === 'dailyDashboard'} onClick={() => onNavigate('dailyDashboard')} />
                    <NavLink label="التقرير اليومي (حلقات)" isActive={currentPage === 'dailyCircles'} onClick={() => onNavigate('dailyCircles')} />
                    <NavLink label="التقرير اليومي (طلاب)" isActive={currentPage === 'dailyStudents'} onClick={() => onNavigate('dailyStudents')} />
                    <NavLink label="ملاحظات" isActive={currentPage === 'notes'} onClick={() => onNavigate('notes')} />
                 </NavSection>

                 <NavSection title="التقييم">
                    <NavLink label="تقييم الحلقة" isActive={currentPage === 'evaluation'} onClick={() => onNavigate('evaluation')} />
                 </NavSection>
                 
                 <NavSection title="الحضور والإنصراف">
                    <NavLink label="حضور المعلمين" isActive={currentPage === 'teacherAttendance'} onClick={() => onNavigate('teacherAttendance')} />
                    <NavLink label="تقرير حضور المعلمين" isActive={currentPage === 'teacherAttendanceReport'} onClick={() => onNavigate('teacherAttendanceReport')} />
                    <NavLink label="تقرير حضور المشرفين" isActive={currentPage === 'supervisorAttendanceReport'} onClick={() => onNavigate('supervisorAttendanceReport')} />
                 </NavSection>
            </nav>
        </aside>
    );
};
