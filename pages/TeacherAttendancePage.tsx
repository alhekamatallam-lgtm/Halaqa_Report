
import React, { useState, useEffect } from 'react';
import type { TeacherDailyAttendance, TeacherInfo } from '../types';
import { EnterFullscreenIcon, ExitFullscreenIcon } from '../components/icons';

interface TeacherAttendancePageProps {
  allTeachers: TeacherInfo[];
  attendanceStatus: TeacherDailyAttendance[];
  onSubmit: (teacherId: number, teacherName: string, action: 'حضور' | 'انصراف') => Promise<void>;
  isSubmitting: boolean;
  submittingTeacher: string | null;
}

const TeacherAttendancePage: React.FC<TeacherAttendancePageProps> = ({ allTeachers, attendanceStatus, onSubmit, isSubmitting, submittingTeacher }) => {
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleFullscreenChange = () => {
        const isCurrentlyFullscreen = !!document.fullscreenElement;
        setIsFullscreen(isCurrentlyFullscreen);
    };

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        // Cleanup function
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            // Exit fullscreen if active when leaving the page
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const statusMap: Map<string, TeacherDailyAttendance> = new Map(attendanceStatus.map(s => [s.teacherName, s]));

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(today);
    
    const filteredTeachers = React.useMemo(() => {
        if (!searchQuery) {
            return allTeachers;
        }
        return allTeachers.filter(teacher =>
            teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allTeachers, searchQuery]);


    if (allTeachers.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
                <p className="text-lg text-gray-600">لا يوجد معلمون لعرضهم. الرجاء التأكد من وجود بيانات للطلاب والمعلمين.</p>
            </div>
        );
    }

    return (
        <div className="relative bg-white p-4 sm:p-6 rounded-xl shadow-xl border border-stone-200">
            <div className="relative text-center mb-6 pb-4 border-b border-stone-200">
                <h2 className="text-xl font-bold text-stone-700">تحضير يوم: {formattedDate}</h2>
                <div className="absolute top-1/2 -translate-y-1/2 left-0">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-full text-stone-600 hover:bg-stone-200 hover:text-stone-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        aria-label={isFullscreen ? 'الخروج من وضع ملء الشاشة' : 'الدخول في وضع ملء الشاشة'}
                    >
                        {isFullscreen ? <ExitFullscreenIcon className="w-6 h-6" /> : <EnterFullscreenIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <label htmlFor="teacher-search" className="block text-sm font-medium text-stone-700 mb-2">بحث سريع بالمعلم</label>
                <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        id="teacher-search"
                        className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        placeholder="ادخل اسم المعلم..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {filteredTeachers.map(teacher => {
                    const teacherName = teacher.name;
                    const teacherId = teacher.id;
                    const statusInfo = statusMap.get(teacherName);
                    const isThisTeacherSubmitting = submittingTeacher === teacherName;
                    const notes = statusInfo?.notes;

                    let statusText = 'لم يحضر';
                    let statusColor = 'bg-yellow-500';
                    let borderColor = 'border-yellow-500';
                    let bgColor = 'bg-yellow-50/50';
                    
                    if (isThisTeacherSubmitting) {
                        statusText = 'جاري التحديث...';
                        statusColor = 'bg-indigo-500 animate-pulse';
                        borderColor = 'border-indigo-500';
                        bgColor = 'bg-indigo-50/50';
                    } else if (statusInfo) {
                        switch(statusInfo.status) {
                            case 'حاضر':
                                statusText = 'حاضر';
                                statusColor = 'bg-green-500';
                                borderColor = 'border-green-500';
                                bgColor = 'bg-green-50/50';
                                break;
                            case 'مكتمل الحضور':
                                statusText = 'مكتمل الحضور';
                                statusColor = 'bg-blue-600';
                                borderColor = 'border-blue-600';
                                bgColor = 'bg-blue-50/50';
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
                        <div key={teacherName} className={`${bgColor} p-4 rounded-xl shadow-lg border-l-4 ${borderColor} transition-all hover:shadow-xl hover:border-amber-500 flex flex-col justify-between`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold text-stone-800 text-lg">{teacherName}</h3>
                                        <p className="text-sm text-stone-500">{teacher.circle}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${statusColor}`}>{statusText}</span>
                                </div>
                                {notes && (
                                    <p className="text-xs text-center font-semibold text-red-600 bg-red-100 py-1 px-2 rounded-md my-2">
                                        {notes}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <div className="w-full flex flex-col">
                                    <div className="text-center text-xs text-stone-500 mb-1 h-4 font-mono">
                                        {checkInTime}
                                    </div>
                                    <button 
                                        onClick={() => onSubmit(teacherId, teacherName, 'حضور')}
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
                                        onClick={() => onSubmit(teacherId, teacherName, 'انصراف')}
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
                {filteredTeachers.length === 0 && allTeachers.length > 0 && (
                    <div className="col-span-full text-center py-10">
                        <p className="text-lg text-gray-600">لا يوجد معلمون يطابقون بحثك.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherAttendancePage;