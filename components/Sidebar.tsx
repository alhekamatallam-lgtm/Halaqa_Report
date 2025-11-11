import React from 'react';
import { 
    HomeIcon, 
    TrophyIcon, 
    LayoutDashboardIcon, 
    ChartPieIcon, 
    UsersIcon, 
    ClipboardListIcon, 
    ClipboardCheckIcon, 
    CalendarDaysIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    StudentFollowUpIcon,
    StudentAttendanceIcon,
    StudentAbsenceIcon,
    SettingsIcon,
    IdentificationIcon,
} from './icons';

type AuthenticatedUser = { role: 'admin' | 'supervisor' | 'exam_teacher', name: string, circles: string[] };
type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'teacherAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendance' | 'supervisorAttendanceReport' | 'exam' | 'examReport' | 'studentFollowUp' | 'studentAttendanceReport' | 'studentAbsenceReport' | 'settings' | 'teacherList';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  authenticatedUser: AuthenticatedUser | null;
}

const NavSection: React.FC<{ title: string; isCollapsed: boolean; children: React.ReactNode }> = ({ title, isCollapsed, children }) => (
    <div className="px-3 py-2">
        <h3 className={`px-3 text-xs font-semibold uppercase text-stone-500 tracking-wider transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>{!isCollapsed ? title : ''}</h3>
        <div className="mt-2 space-y-1">
            {children}
        </div>
    </div>
);

const NavLink: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, isCollapsed, onClick }) => (
    <button
        onClick={onClick}
        title={isCollapsed ? label : ''}
        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 group relative ${
            isActive
                ? 'bg-amber-100 text-amber-800 font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
        } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
    >
        <div className="flex-shrink-0">{icon}</div>
        <span className={`flex-1 mr-3 transition-all duration-200 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>{label}</span>
        {isActive && !isCollapsed && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isCollapsed, onToggle, authenticatedUser }) => {
    return (
        <aside className={`flex-shrink-0 bg-stone-50 border-l border-stone-200 flex flex-col h-full print-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`h-24 flex items-center px-4 border-b border-stone-200 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                <img src="https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png" alt="شعار المجمع" className={`transition-all duration-300 ${isCollapsed ? 'h-12' : 'h-16'}`} />
                <h2 className={`text-xl font-bold text-stone-800 mr-2 whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>التقرير</h2>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-3 py-2">
                   <NavLink 
                        label="التقرير العام" 
                        icon={<HomeIcon className="w-5 h-5" />} 
                        isActive={currentPage === 'general'} 
                        isCollapsed={isCollapsed} 
                        onClick={() => onNavigate('general')} 
                    />
                </div>

                 <NavSection title="متابعة الحلقات" isCollapsed={isCollapsed}>
                    <NavLink label="تميز الحلقات" icon={<TrophyIcon className="w-5 h-5" />} isActive={currentPage === 'excellence'} isCollapsed={isCollapsed} onClick={() => onNavigate('excellence')} />
                    <NavLink label="متابعة الحلقات" icon={<LayoutDashboardIcon className="w-5 h-5" />} isActive={currentPage === 'dashboard'} isCollapsed={isCollapsed} onClick={() => onNavigate('dashboard')} />
                    <NavLink label="تقرير الحلقات" icon={<ChartPieIcon className="w-5 h-5" />} isActive={currentPage === 'circles'} isCollapsed={isCollapsed} onClick={() => onNavigate('circles')} />
                    <NavLink label="تقرير الطلاب" icon={<UsersIcon className="w-5 h-5" />} isActive={currentPage === 'students'} isCollapsed={isCollapsed} onClick={() => onNavigate('students')} />
                 </NavSection>
                 
                 <NavSection title="التقرير اليومي" isCollapsed={isCollapsed}>
                    <NavLink label="متابعة الحلقات (يومي)" icon={<LayoutDashboardIcon className="w-5 h-5" />} isActive={currentPage === 'dailyDashboard'} isCollapsed={isCollapsed} onClick={() => onNavigate('dailyDashboard')} />
                    <NavLink label="التقرير اليومي (حلقات)" icon={<ChartPieIcon className="w-5 h-5" />} isActive={currentPage === 'dailyCircles'} isCollapsed={isCollapsed} onClick={() => onNavigate('dailyCircles')} />
                    <NavLink label="التقرير اليومي (طلاب)" icon={<UsersIcon className="w-5 h-5" />} isActive={currentPage === 'dailyStudents'} isCollapsed={isCollapsed} onClick={() => onNavigate('dailyStudents')} />
                    <NavLink label="متابعة طالب" icon={<StudentFollowUpIcon className="w-5 h-5" />} isActive={currentPage === 'studentFollowUp'} isCollapsed={isCollapsed} onClick={() => onNavigate('studentFollowUp')} />
                    <NavLink label="تقرير حضور الطلاب اليومي" icon={<StudentAttendanceIcon className="w-5 h-5" />} isActive={currentPage === 'studentAttendanceReport'} isCollapsed={isCollapsed} onClick={() => onNavigate('studentAttendanceReport')} />
                    <NavLink label="تقرير غياب الطلاب" icon={<StudentAbsenceIcon className="w-5 h-5" />} isActive={currentPage === 'studentAbsenceReport'} isCollapsed={isCollapsed} onClick={() => onNavigate('studentAbsenceReport')} />
                    <NavLink label="ملاحظات" icon={<ClipboardListIcon className="w-5 h-5" />} isActive={currentPage === 'notes'} isCollapsed={isCollapsed} onClick={() => onNavigate('notes')} />
                 </NavSection>

                 <NavSection title="التقييم والاختبارات" isCollapsed={isCollapsed}>
                    <NavLink label="زيارة معلم حلقة" icon={<ClipboardCheckIcon className="w-5 h-5" />} isActive={currentPage === 'evaluation'} isCollapsed={isCollapsed} onClick={() => onNavigate('evaluation')} />
                    <NavLink label="إدخال الاختبارات" icon={<ClipboardCheckIcon className="w-5 h-5" />} isActive={currentPage === 'exam'} isCollapsed={isCollapsed} onClick={() => onNavigate('exam')} />
                    <NavLink label="تقرير الاختبارات" icon={<ClipboardListIcon className="w-5 h-5" />} isActive={currentPage === 'examReport'} isCollapsed={isCollapsed} onClick={() => onNavigate('examReport')} />
                 </NavSection>
                 
                 <NavSection title="الحضور والإنصراف" isCollapsed={isCollapsed}>
                    <NavLink label="حضور المعلمين" icon={<CalendarDaysIcon className="w-5 h-5" />} isActive={currentPage === 'teacherAttendance'} isCollapsed={isCollapsed} onClick={() => onNavigate('teacherAttendance')} />
                    <NavLink label="تقرير حضور المعلمين" icon={<CalendarDaysIcon className="w-5 h-5" />} isActive={currentPage === 'teacherAttendanceReport'} isCollapsed={isCollapsed} onClick={() => onNavigate('teacherAttendanceReport')} />
                    <NavLink label="حضور المشرفين" icon={<CalendarDaysIcon className="w-5 h-5" />} isActive={currentPage === 'supervisorAttendance'} isCollapsed={isCollapsed} onClick={() => onNavigate('supervisorAttendance')} />
                    <NavLink label="تقرير حضور المشرفين" icon={<CalendarDaysIcon className="w-5 h-5" />} isActive={currentPage === 'supervisorAttendanceReport'} isCollapsed={isCollapsed} onClick={() => onNavigate('supervisorAttendanceReport')} />
                    <NavLink label="قائمة المعلمين" icon={<IdentificationIcon className="w-5 h-5" />} isActive={currentPage === 'teacherList'} isCollapsed={isCollapsed} onClick={() => onNavigate('teacherList')} />
                 </NavSection>

                <NavSection title="الإدارة" isCollapsed={isCollapsed}>
                    <NavLink label="الإعدادات" icon={<SettingsIcon className="w-5 h-5" />} isActive={currentPage === 'settings'} isCollapsed={isCollapsed} onClick={() => onNavigate('settings')} />
                </NavSection>

            </nav>
            <div className="hidden lg:block p-3 border-t border-stone-200">
                <button
                    onClick={onToggle}
                    aria-label={isCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
                    className="w-full flex items-center justify-center p-2 text-sm font-semibold text-amber-900 rounded-md bg-amber-200 hover:bg-amber-300 transition-colors duration-200"
                >
                    {isCollapsed ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                </button>
            </div>
        </aside>
    );
};