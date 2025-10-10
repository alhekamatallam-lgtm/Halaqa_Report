import React from 'react';
import type { TeacherDailyAttendance, TeacherInfo } from '../types';

interface TeacherAttendancePageProps {
  allTeachers: TeacherInfo[];
  attendanceStatus: TeacherDailyAttendance[];
  onSubmit: (teacherName: string, action: 'حضور' | 'انصراف') => Promise<void>;
  isSubmitting: boolean;
  submittingTeacher: string | null;
}

const TeacherAttendancePage: React.FC<TeacherAttendancePageProps> = ({ allTeachers, attendanceStatus, onSubmit, isSubmitting, submittingTeacher }) => {
    
    const statusMap: Map<string, TeacherDailyAttendance> = new Map(attendanceStatus.map(s => [s.teacherName, s]));

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(today);

    if (allTeachers.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
                <p className="text-lg text-gray-600">لا يوجد معلمون لعرضهم. الرجاء التأكد من وجود بيانات للطلاب والمعلمين.</p>
            </div>
        );
    }

    return (
        <div className="relative bg-white p-4 sm:p-6 rounded-xl shadow-xl border border-stone-200">
            <div className="text-center mb-6 pb-4 border-b border-stone-200">
                <h2 className="text-xl font-bold text-stone-700">تحضير يوم: {formattedDate}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allTeachers.map(teacher => {
                    const teacherName = teacher.name;
                    const statusInfo = statusMap.get(teacherName);
                    const isThisTeacherSubmitting = submittingTeacher === teacherName;

                    let statusText = 'لم يحضر';
                    let statusColor = 'bg-yellow-500';
                    let borderColor = 'border-yellow-500';
                    
                    if (isThisTeacherSubmitting) {
                        statusText = 'جاري التحديث...';
                        statusColor = 'bg-indigo-500 animate-pulse';
                        borderColor = 'border-indigo-500';
                    } else if (statusInfo) {
                        switch(statusInfo.status) {
                            case 'حاضر':
                                statusText = 'حاضر';
                                statusColor = 'bg-green-500';
                                borderColor = 'border-green-500';
                                break;
                            case 'مكتمل الحضور':
                                statusText = 'مكتمل الحضور';
                                statusColor = 'bg-blue-600';
                                borderColor = 'border-blue-600';
                                break;
                            default:
                                break;
                        }
                    }

                    const timeFormatOptions: Intl.DateTimeFormatOptions = {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Riyadh'
                    };

                    const checkInTime = statusInfo?.checkIn ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(statusInfo.checkIn) : '';
                    const checkOutTime = statusInfo?.checkOut ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(statusInfo.checkOut) : '';
                    
                    const canCheckIn = !statusInfo?.checkIn;
                    const canCheckOut = !!statusInfo?.checkIn && !statusInfo?.checkOut;

                    return (
                        <div key={teacherName} className={`bg-stone-50 p-4 rounded-xl shadow-lg border-l-4 ${borderColor} transition-all hover:shadow-xl hover:border-amber-500 flex flex-col justify-between`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold text-stone-800 text-lg">{teacherName}</h3>
                                        <p className="text-sm text-stone-500">{teacher.circle}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${statusColor}`}>{statusText}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <div className="w-full flex flex-col">
                                    <div className="text-center text-xs text-stone-500 mb-1 h-4 font-mono">
                                        {checkInTime}
                                    </div>
                                    <button 
                                        onClick={() => onSubmit(teacherName, 'حضور')}
                                        disabled={!canCheckIn || isSubmitting}
                                        className="w-full h-10 px-4 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 disabled:bg-stone-300 disabled:cursor-not-allowed"
                                    >
                                        تسجيل حضور
                                    </button>
                                </div>
                                <div className="w-full flex flex-col">
                                     <div className="text-center text-xs text-stone-500 mb-1 h-4 font-mono">
                                        {checkOutTime}
                                    </div>
                                    <button 
                                        onClick={() => onSubmit(teacherName, 'انصراف')}
                                        disabled={!canCheckOut || isSubmitting}
                                        className="w-full h-10 px-4 text-sm font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-150 disabled:bg-stone-300 disabled:cursor-not-allowed"
                                    >
                                        تسجيل انصراف
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TeacherAttendancePage;