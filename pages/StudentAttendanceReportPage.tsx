import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ProcessedStudentData } from '../types';
import { PrintIcon, ExcelIcon } from '../components/icons';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 20;

interface StudentAttendanceRow {
    studentName: string;
    circle: string;
    guardianMobile: string;
    [day: string]: string; // Dynamic properties for attendance status
}


const StudentAttendanceReportPage: React.FC<{ students: ProcessedStudentData[] }> = ({ students }) => {
    const [currentPage, setCurrentPage] = useState(1);
    
    // UI state for filter controls
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
    const dayDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedCircleTime, setSelectedCircleTime] = useState<string>('');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedCircle, setSelectedCircle] = useState<string>('');
    const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState<'all' | 'present' | 'absent'>('all');

    
    // State for applied filters that trigger data processing
    const [activeFilters, setActiveFilters] = useState({
        days: [] as string[],
        circle: '',
        teacher: '',
        circleTime: '',
        status: 'all' as 'all' | 'present' | 'absent',
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dayDropdownRef.current && !dayDropdownRef.current.contains(event.target as Node)) {
                setIsDayDropdownOpen(false);
            }
        };
        if (isDayDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDayDropdownOpen]);

    useEffect(() => {
        setSelectedTeacher('');
        setSelectedCircle('');
    }, [selectedDays, selectedCircleTime]);

    useEffect(() => {
        setSelectedCircle('');
    }, [selectedTeacher]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilters]);

    const dayOptions = useMemo(() => {
        const days = new Set<string>(students.map(s => s.day).filter((d): d is string => !!d));
        return Array.from(days).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);
    
    const timeOptions = useMemo(() => {
        const times = new Set<string>(students.map(s => s.circleTime).filter(Boolean));
        return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    const teacherOptions = useMemo(() => {
        const filtered = students.filter(s =>
            (!selectedCircleTime || s.circleTime === selectedCircleTime)
        );
        const teachers = new Set<string>(filtered.map(s => s.teacherName).filter(Boolean));
        return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students, selectedCircleTime]);

    const circleOptions = useMemo(() => {
        const filtered = students.filter(s =>
            (!selectedCircleTime || s.circleTime === selectedCircleTime) &&
            (!selectedTeacher || s.teacherName === selectedTeacher)
        );
        const circles = new Set<string>(filtered.map(s => s.circle).filter(Boolean));
        return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students, selectedCircleTime, selectedTeacher]);

    const { paginatedData, totalPages, reportTitle, fullFilteredList } = useMemo(() => {
        const { days, circle, teacher, circleTime, status } = activeFilters;

        let filteredStudents = students.filter(student =>
            (!circle || student.circle === circle) &&
            (!teacher || student.teacherName === teacher) &&
            (!circleTime || student.circleTime === circleTime)
        );

        const studentAttendanceMap = new Map<string, StudentAttendanceRow>();
        
        filteredStudents.forEach(student => {
            const key = `${student.studentName}-${student.circle}`;
            if (!studentAttendanceMap.has(key)) {
                studentAttendanceMap.set(key, {
                    studentName: student.studentName,
                    circle: student.circle,
                    guardianMobile: student.guardianMobile,
                });
            }

            const studentRecord = studentAttendanceMap.get(key)!;
            if (student.day && days.includes(student.day)) {
                studentRecord[student.day] = student.attendance > 0 ? 'حاضر' : 'غائب';
            }
        });
        
        let processedList = Array.from(studentAttendanceMap.values()).filter(row => {
            const hasDataForSelectedDays = days.some(day => day in row);
            if (!hasDataForSelectedDays) {
                return false;
            }

            if (status === 'all') {
                return true;
            }
            
            const targetStatus = status === 'present' ? 'حاضر' : 'غائب';
            return days.some(day => row[day] === targetStatus);

        }).sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
        
        const titleParts = ['تقرير حضور الطلاب اليومي'];
        if (days.length > 0) titleParts.push(days.length > 2 ? `${days.length} أيام مختارة` : days.join('، '));
        if (circleTime) titleParts.push(circleTime);
        if (teacher) titleParts.push(teacher);
        if (circle) titleParts.push(circle);

        const total = Math.ceil(processedList.length / ITEMS_PER_PAGE);
        const paginated = processedList.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );

        return {
            paginatedData: paginated,
            totalPages: total,
            reportTitle: titleParts.join(' - '),
            fullFilteredList: processedList,
        };
    }, [students, activeFilters, currentPage]);

    const handleApplyFilter = () => {
        setActiveFilters({ 
            days: selectedDays.sort((a, b) => a.localeCompare(b, 'ar')), 
            circle: selectedCircle, 
            teacher: selectedTeacher, 
            circleTime: selectedCircleTime,
            status: selectedAttendanceStatus,
        });
    };

    const handleClearFilter = () => {
        setSelectedDays([]);
        setSelectedCircleTime('');
        setSelectedTeacher('');
        setSelectedCircle('');
        setSelectedAttendanceStatus('all');
        setActiveFilters({ days: [], circle: '', teacher: '', circleTime: '', status: 'all' });
    };
    
    const handleDaySelection = (day: string) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        // FIX: Replaced `declare` with a constant assigned from the window object to fix scoping issue.
        const XLSX = (window as any).XLSX;
        const dataToExport = fullFilteredList.map(row => {
            const newRow: { [key: string]: any } = {};
            newRow['الطالب'] = row.studentName;
            newRow['الحلقة'] = row.circle;
            newRow['رقم الواتس'] = row.guardianMobile;
            activeFilters.days.forEach(day => {
                newRow[day] = row[day] || '-';
            });
            return newRow;
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'تقرير الحضور');
        XLSX.writeFile(wb, 'تقرير_حضور_الطلاب.xlsx');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end mb-4 print-hidden gap-2">
                 <button onClick={handleExport} className="px-4 py-2 text-sm font-semibold text-green-800 bg-green-100 rounded-md shadow-sm hover:bg-green-200 flex items-center gap-2">
                    <ExcelIcon /> تصدير لإكسل
                </button>
                <button onClick={handlePrint} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 flex items-center gap-2">
                    <PrintIcon /> طباعة التقرير
                </button>
            </div>

            <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-stone-200 print-hidden">
                <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
                    <div className="md:col-span-2 relative" ref={dayDropdownRef}>
                        <label htmlFor="day-filter-btn" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب اليوم</label>
                        <button id="day-filter-btn" type="button" onClick={() => setIsDayDropdownOpen(prev => !prev)} className="h-10 text-right block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white relative">
                            <span className="truncate">{selectedDays.length === 0 ? 'اختر الأيام' : selectedDays.length === 1 ? selectedDays[0] : `${selectedDays.length} أيام مختارة`}</span>
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg></span>
                        </button>
                        {isDayDropdownOpen && (
                            <div className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg border border-stone-200"><ul className="max-h-60 overflow-auto p-2 space-y-1">{dayOptions.map(day => (<li key={day}><label className="flex items-center space-x-2 space-x-reverse px-2 py-1.5 rounded-md hover:bg-stone-100 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500" checked={selectedDays.includes(day)} onChange={() => handleDaySelection(day)} /><span className="text-sm text-stone-700">{day}</span></label></li>))}</ul></div>
                        )}
                    </div>
                     <div className="md:col-span-1"><label htmlFor="time-filter" className="block text-sm font-medium text-stone-700 mb-2">وقت الحلقة</label><select id="time-filter" className="h-10 block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" value={selectedCircleTime} onChange={(e) => setSelectedCircleTime(e.target.value)}><option value="">الكل</option>{timeOptions.map(time => <option key={time} value={time}>{time}</option>)}</select></div>
                     <div className="md:col-span-1"><label htmlFor="teacher-filter" className="block text-sm font-medium text-stone-700 mb-2">المعلم</label><select id="teacher-filter" className="h-10 block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} disabled={teacherOptions.length === 0}><option value="">كل المعلمين</option>{teacherOptions.map(teacher => <option key={teacher} value={teacher}>{teacher}</option>)}</select></div>
                     <div className="md:col-span-1"><label htmlFor="circle-filter" className="block text-sm font-medium text-stone-700 mb-2">الحلقة</label><select id="circle-filter" className="h-10 block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" value={selectedCircle} onChange={(e) => setSelectedCircle(e.target.value)} disabled={circleOptions.length === 0}><option value="">كل الحلقات</option>{circleOptions.map(circle => <option key={circle} value={circle}>{circle}</option>)}</select></div>
                     <div className="md:col-span-1"><label htmlFor="status-filter" className="block text-sm font-medium text-stone-700 mb-2">حالة الحضور</label><select id="status-filter" className="h-10 block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md" value={selectedAttendanceStatus} onChange={(e) => setSelectedAttendanceStatus(e.target.value as any)}><option value="all">الكل</option><option value="present">حاضر</option><option value="absent">غائب</option></select></div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <button onClick={handleApplyFilter} className="w-full h-10 px-4 text-sm font-semibold text-white bg-amber-500 rounded-md shadow-sm hover:bg-amber-600">تطبيق الفلتر</button>
                        <button onClick={handleClearFilter} className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300">مسح الفلتر</button>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-xl border border-stone-200 printable-area">
                <h2 className="print-title text-center text-xl font-bold mb-4">{reportTitle}</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-stone-200">
                        <thead className="bg-stone-100">
                            <tr>
                                <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">الطالب</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">الحلقة</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-stone-700">رقم الواتس</th>
                                {activeFilters.days.map(day => (
                                    <th key={day} className="px-4 py-3 text-center text-sm font-bold text-stone-700">{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-stone-200">
                            {paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-amber-50/50">
                                    <td className="px-4 py-3 text-sm text-center font-medium text-stone-900">{row.studentName}</td>
                                    <td className="px-4 py-3 text-sm text-center text-stone-600">{row.circle}</td>
                                    <td className="px-4 py-3 text-sm text-center text-stone-600 font-mono">{row.guardianMobile || '-'}</td>
                                    {activeFilters.days.map(day => (
                                        <td key={day} className="px-4 py-3 text-sm text-center font-semibold">
                                            <span className={row[day] === 'حاضر' ? 'text-green-600' : row[day] === 'غائب' ? 'text-red-600' : 'text-stone-400'}>
                                                {row[day] || '-'}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </div>
        </div>
    );
};

export default StudentAttendanceReportPage;