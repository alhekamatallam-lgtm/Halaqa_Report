import React, { useState, useEffect } from 'react';
import TeacherAttendancePage from './TeacherAttendancePage';
import SupervisorAttendancePage from './SupervisorAttendancePage';
import type { TeacherDailyAttendance, TeacherInfo, SupervisorDailyAttendance, SupervisorInfo, AuthenticatedUser } from '../types';

interface CombinedAttendancePageProps {
  // Teacher Props
  allTeachers: TeacherInfo[];
  teacherAttendanceStatus: TeacherDailyAttendance[];
  onTeacherSubmit: (teacherId: number, teacherName: string, action: 'حضور' | 'انصراف') => Promise<void>;
  submittingTeacher: string | null;
  // Supervisor Props
  allSupervisors: SupervisorInfo[];
  supervisorAttendanceStatus: SupervisorDailyAttendance[];
  onSupervisorSubmit: (supervisorId: string, action: 'حضور' | 'انصراف') => Promise<void>;
  submittingSupervisor: string | null;
  // Shared Props
  isSubmitting: boolean;
  authenticatedUser: AuthenticatedUser | null;
}

const CombinedAttendancePage: React.FC<CombinedAttendancePageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'supervisors'>('teachers');

  // Automatically select tab based on role if specific role is logged in
  useEffect(() => {
      if (props.authenticatedUser?.role === 'supervisor') {
          setActiveTab('supervisors');
      } else if (props.authenticatedUser?.role === 'teacher') {
          setActiveTab('teachers');
      }
  }, [props.authenticatedUser]);

  // Show tabs if user is NOT logged in (public view) OR if user is Admin
  // Hide tabs only if user is specifically a Teacher or Supervisor (locked view)
  const showTabs = !props.authenticatedUser || props.authenticatedUser.role === 'admin';

  return (
    <div className="space-y-6">
      {showTabs && (
        <div className="flex flex-wrap justify-center sm:justify-start gap-3 p-1 mb-4">
            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shadow-sm ${
                activeTab === 'teachers'
                  ? 'bg-amber-500 text-white shadow-md transform scale-105'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              تحضير المعلمين
            </button>
            <button
              onClick={() => setActiveTab('supervisors')}
              className={`px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shadow-sm ${
                activeTab === 'supervisors'
                  ? 'bg-amber-500 text-white shadow-md transform scale-105'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              تحضير المشرفين
            </button>
        </div>
      )}

      <div className="transition-opacity duration-300 ease-in-out">
        {activeTab === 'teachers' && (
          <TeacherAttendancePage 
            allTeachers={props.allTeachers}
            attendanceStatus={props.teacherAttendanceStatus}
            onSubmit={props.onTeacherSubmit}
            isSubmitting={props.isSubmitting}
            submittingTeacher={props.submittingTeacher}
            authenticatedUser={props.authenticatedUser}
          />
        )}
        {activeTab === 'supervisors' && (
          <SupervisorAttendancePage 
            allSupervisors={props.allSupervisors}
            attendanceStatus={props.supervisorAttendanceStatus}
            onSubmit={props.onSupervisorSubmit}
            isSubmitting={props.isSubmitting}
            submittingSupervisor={props.submittingSupervisor}
            authenticatedUser={props.authenticatedUser}
          />
        )}
      </div>
    </div>
  );
};

export default CombinedAttendancePage;