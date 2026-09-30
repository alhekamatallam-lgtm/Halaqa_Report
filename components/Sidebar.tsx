
import React from 'react';
import { 
    ClipboardListIcon, 
    ClipboardCheckIcon, 
    CalendarDaysIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
} from './icons';
import type { AuthenticatedUser } from '../types';

export type Page = 'combinedAttendance' | 'teacherAttendanceReport' | 'supervisorAttendanceReport' | 'evaluation' | 'evaluationReport';

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
        className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 group relative ${
            isActive
                ? 'bg-amber-100 text-amber-800 font-bold shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
        } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
    >
        <div className="flex-shrink-0">{icon}</div>
        <span className={`flex-1 mr-3 text-right transition-all duration-200 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>{label}</span>
        {isActive && !isCollapsed && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isCollapsed, onToggle }) => {
    return (
        <aside className={`flex-shrink-0 bg-stone-50 border-l border-stone-200 flex flex-col h-full print-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`h-24 flex items-center px-4 border-b border-stone-200 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                <img src="https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png" alt="شعار المجمع" className={`transition-all duration-300 ${isCollapsed ? 'h-12' : 'h-16'}`} />
                <h2 className={`text-lg font-bold text-stone-800 mr-2 whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>منصة الحلقات</h2>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 space-y-2">
                <NavSection title="الحضور والانصراف" isCollapsed={isCollapsed}>
                    <NavLink
                        label="حضور المعلمين والمشرفين"
                        icon={<CalendarDaysIcon className="w-5 h-5" />}
                        isActive={currentPage === 'combinedAttendance'}
                        isCollapsed={isCollapsed}
                        onClick={() => onNavigate('combinedAttendance')}
                    />
                    <NavLink
                        label="تقرير حضور المعلمين"
                        icon={<ClipboardListIcon className="w-5 h-5" />}
                        isActive={currentPage === 'teacherAttendanceReport'}
                        isCollapsed={isCollapsed}
                        onClick={() => onNavigate('teacherAttendanceReport')}
                    />
                    <NavLink
                        label="تقرير حضور المشرفين"
                        icon={<ClipboardListIcon className="w-5 h-5" />}
                        isActive={currentPage === 'supervisorAttendanceReport'}
                        isCollapsed={isCollapsed}
                        onClick={() => onNavigate('supervisorAttendanceReport')}
                    />
                </NavSection>

                <NavSection title="زيارة معلم حلقة" isCollapsed={isCollapsed}>
                    <NavLink
                        label="زيارة معلم حلقة"
                        icon={<ClipboardCheckIcon className="w-5 h-5" />}
                        isActive={currentPage === 'evaluation'}
                        isCollapsed={isCollapsed}
                        onClick={() => onNavigate('evaluation')}
                    />
                    <NavLink
                        label="تقارير زيارات المعلمين"
                        icon={<ClipboardListIcon className="w-5 h-5" />}
                        isActive={currentPage === 'evaluationReport'}
                        isCollapsed={isCollapsed}
                        onClick={() => onNavigate('evaluationReport')}
                    />
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
