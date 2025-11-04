import React, { useState, useMemo, useEffect } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import type { ProcessedStudentData } from '../types';
import { PrintIcon } from '../components/icons';
import Pagination from '../components/Pagination';

type SortKey = keyof ProcessedStudentData;
const ITEMS_PER_PAGE = 10;

interface DailyStudentReportPageProps {
  students: ProcessedStudentData[];
}

const DailyStudentReportPage: React.FC<DailyStudentReportPageProps> = ({ students }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'totalPoints', direction: 'descending' });
    const [selectedStudent, setSelectedStudent] = useState<ProcessedStudentData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [selectedCircleTime, setSelectedCircleTime] = useState<string>('');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedCircle, setSelectedCircle] = useState<string>('');
    
    // Combined state for active filters to ensure atomic updates
    const [activeFilters, setActiveFilters] = useState({ day: '', circle: '', teacher: '', circleTime: '' });


    useEffect(() => {
        setCurrentPage(1);
    }, [students, activeFilters]);

    const dayOptions = useMemo(() => {
        const days = new Set<string>(students.map(s => s.day).filter((d): d is string => !!d));
        return Array.from(days).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    const timeOptions = useMemo(() => {
        const times = new Set<string>(students.map(s => s.circleTime).filter((t): t is string => !!t));
        return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    const teacherOptions = useMemo(() => {
        const teachers = new Set<string>(students.map(s => s.teacherName).filter((t): t is string => !!t));
        return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    const circleOptions = useMemo(() => {
        const circles = new Set<string>(students.map(s => s.circle).filter((c): c is string => !!c));
        return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    const { paginatedStudents, totalPages, reportTitle, summary, fullFilteredList } = useMemo(() => {
        const { day: activeDayFilter, circle: activeCircleFilter, teacher: activeTeacherFilter, circleTime: activeTimeFilter } = activeFilters;
        
        const filteredList = students.filter(student => {
            const dayMatch = !activeDayFilter || student.day === activeDayFilter;
            const timeMatch = !activeTimeFilter || student.circleTime === activeTimeFilter;
            const teacherMatch = !activeTeacherFilter || student.teacherName === activeTeacherFilter;
            const circleMatch = !activeCircleFilter || student.circle === activeCircleFilter;
            return dayMatch && timeMatch && teacherMatch && circleMatch;
        });
        
        const titleParts = ['التقرير اليومي للطلاب'];
        if (activeDayFilter) titleParts.push(activeDayFilter);
        if (activeTimeFilter) titleParts.push(activeTimeFilter);
        if (activeTeacherFilter) titleParts.push(activeTeacherFilter);
        if (activeCircleFilter) titleParts.push(activeCircleFilter);
        const title = titleParts.join(' - ');

        const sortedList = [...filteredList];
        if (sortConfig !== null) {
            sortedList.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                let comparison = 0;
                if (typeof aValue === 'object' && aValue !== null && 'index' in aValue &&
                    typeof bValue === 'object' && bValue !== null && 'index' in bValue) {
                    comparison = (aValue.index as number) > (bValue.index as number) ? 1 : -1;
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue > bValue ? 1 : -1;
                } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue, 'ar');
                } else {
                  const stringA = String(aValue);
                  const stringB = String(bValue);
                  comparison = stringA.localeCompare(stringB, 'ar');
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        
        const summary = {
            totalMemorizationAchieved: sortedList.reduce((acc, s) => acc + s.memorizationPages.achieved, 0),
            totalMemorizationRequired: sortedList.reduce((acc, s) => acc + s.memorizationPages.required, 0),
            totalReviewAchieved: sortedList.reduce((acc, s) => acc + s.reviewPages.achieved, 0),
            totalReviewRequired: sortedList.reduce((acc, s) => acc + s.reviewPages.required, 0),
            totalConsolidationAchieved: sortedList.reduce((acc, s) => acc + s.consolidationPages.achieved, 0),
            totalConsolidationRequired: sortedList.reduce((acc, s) => acc + s.consolidationPages.required, 0),
            avgAttendance: sortedList.length > 0 ? sortedList.reduce((acc, s) => acc + s.attendance, 0) / sortedList.length : 0,
            totalPoints: sortedList.reduce((acc, s) => acc + s.totalPoints, 0),
        };

        const totalPages = Math.ceil(sortedList.length / ITEMS_PER_PAGE);
        const paginatedStudents = sortedList.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );

        return { paginatedStudents, totalPages, reportTitle: title, summary, fullFilteredList: sortedList };
    }, [students, sortConfig, currentPage, activeFilters]);
    
    const handlePrint = () => {
        const studentsToPrint = fullFilteredList.filter(s => s.circleTime === 'العصر');

        const circles = studentsToPrint.reduce((acc, student) => {
            if (!acc[student.circle]) {
                acc[student.circle] = {
                    teacherName: student.teacherName,
                    students: []
                };
            }
            acc[student.circle].students.push(student);
            return acc;
        }, {} as Record<string, { teacherName: string; students: ProcessedStudentData[] }>);

        const getProgressBarHtml = (value: number) => {
            const numericValue = Number(value);
            const finalValue = isNaN(numericValue) ? 0 : numericValue;
            const actualPercentage = Math.max(finalValue * 100, 0);
            const barPercentage = Math.min(actualPercentage, 100);
            return `
                <div class="print-progress-container">
                    <div class="print-progress-bar" style="width: ${barPercentage.toFixed(0)}%;"></div>
                </div>
                <div class="print-progress-percentage">${actualPercentage.toFixed(0)}%</div>
            `;
        };

        let printContent = '';

        Object.keys(circles).sort((a, b) => a.localeCompare(b, 'ar')).forEach(circleName => {
            const circleData = circles[circleName];
            const dayText = activeFilters.day ? `اليوم: ${activeFilters.day}` : `تاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
            printContent += `
                <div class="page-break">
                    <table class="print-table">
                         <thead>
                            <tr>
                                <th colspan="6" class="print-header-container">
                                    <div class="print-header">
                                        <h1>التقرير اليومي لحلقة: ${circleName}</h1>
                                        <h2>المعلم: ${circleData.teacherName}</h2>
                                        <p>${dayText}</p>
                                    </div>
                                </th>
                            </tr>
                            <tr>
                                <th>اسم الطالب</th>
                                <th>إنجاز الحفظ</th>
                                <th>إنجاز المراجعة</th>
                                <th>إنجاز التثبيت</th>
                                <th>الحضور</th>
                                <th>النقاط</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${circleData.students.map(student => `
                                <tr>
                                    <td>${student.studentName}</td>
                                    <td>
                                        <div class="print-achievement-text">${student.memorizationPages.formatted}</div>
                                        ${getProgressBarHtml(student.memorizationPages.index)}
                                    </td>
                                    <td>
                                        <div class="print-achievement-text">${student.reviewPages.formatted}</div>
                                        ${getProgressBarHtml(student.reviewPages.index)}
                                    </td>
                                    <td>
                                        <div class="print-achievement-text">${student.consolidationPages.formatted}</div>
                                        ${getProgressBarHtml(student.consolidationPages.index)}
                                    </td>
                                    <td>
                                        ${getProgressBarHtml(student.attendance)}
                                    </td>
                                    <td>${student.totalPoints}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="6" class="print-page-footer">
                                    <span>${circleName}</span> - <span>صفحة <span class="page-number"></span></span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        });

        const printContainer = document.createElement('div');
        printContainer.className = 'printable-student-report';
        printContainer.innerHTML = printContent;
        document.body.appendChild(printContainer);
        
        document.body.classList.add('student-print-active');
        window.print();
        document.body.classList.remove('student-print-active');

        document.body.removeChild(printContainer);
    };

    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleApplyFilter = () => {
        setActiveFilters({ day: selectedDay, circle: selectedCircle, teacher: selectedTeacher, circleTime: selectedCircleTime });
    };

    const handleClearFilter = () => {
        setSelectedDay('');
        setSelectedCircleTime('');
        setSelectedTeacher('');
        setSelectedCircle('');
        setActiveFilters({ day: '', circle: '', teacher: '', circleTime: '' });
    };

    return (
        <>
            <div className="flex justify-end mb-4 print-hidden">
                <button
                onClick={handlePrint}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 flex items-center justify-center gap-2"
                >
                <PrintIcon />
                طباعة تقارير العصر
                </button>
            </div>

            <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-stone-200 print-hidden">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label htmlFor="day-filter" className="block text-sm font-medium text-stone-700 mb-2">اليوم</label>
                        <select
                            id="day-filter"
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                        >
                            <option value="">الكل</option>
                            {dayOptions.map((day) => (
                                <option key={day} value={day}>
                                    {day}
                                </option>
                            ))}
                        </select>
                    </div>
                     <div className="md:col-span-1">
                        <label htmlFor="time-filter" className="block text-sm font-medium text-stone-700 mb-2">الوقت</label>
                        <select
                            id="time-filter"
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                            value={selectedCircleTime}
                            onChange={(e) => setSelectedCircleTime(e.target.value)}
                        >
                            <option value="">الكل</option>
                            {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                    {time}
                                </option>
                            ))}
                        </select>
                    </div>
                     <div className="md:col-span-1">
                        <label htmlFor="teacher-filter" className="block text-sm font-medium text-stone-700 mb-2">المعلم</label>
                        <select
                            id="teacher-filter"
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                        >
                            <option value="">الكل</option>
                            {teacherOptions.map((teacher) => (
                                <option key={teacher} value={teacher}>
                                    {teacher}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="circle-filter" className="block text-sm font-medium text-stone-700 mb-2">الحلقة</label>
                        <select
                            id="circle-filter"
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                            value={selectedCircle}
                            onChange={(e) => setSelectedCircle(e.target.value)}
                        >
                            <option value="">الكل</option>
                            {circleOptions.map((circle) => (
                                <option key={circle} value={circle}>
                                    {circle}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <button
                            onClick={handleApplyFilter}
                            className="w-full h-10 px-4 text-sm font-semibold text-white bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150"
                        >
                            تطبيق الفلتر
                        </button>
                    </div>
                    <div className="md:col-span-1">
                        <button
                            onClick={handleClearFilter}
                            className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all duration-150"
                        >
                            مسح الفلتر
                        </button>
                    </div>
                </div>
            </div>

             <div className="mb-4">
                <h4 className="text-lg font-semibold text-stone-700">{reportTitle}</h4>
            </div>
            <ReportTable
                students={paginatedStudents}
                onRowClick={setSelectedStudent}
                sortConfig={sortConfig}
                onSort={handleSort}
                summary={summary}
            />
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </>
    );
};

export default DailyStudentReportPage;