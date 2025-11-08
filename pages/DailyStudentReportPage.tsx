import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import type { ProcessedStudentData, Achievement } from '../types';
import { PrintIcon, ExcelIcon } from '../components/icons';
import Pagination from '../components/Pagination';

type SortKey = keyof ProcessedStudentData;
const ITEMS_PER_PAGE = 10;

interface DailyStudentReportPageProps {
  students: ProcessedStudentData[];
}

const parseDateFromDayString = (dayString: string): Date => {
    const match = dayString.match(/(\d{2})-(\d{2})/);
    if (!match) {
        // Fallback for any string that doesn't match, return an old date to sort it last
        return new Date(0);
    }
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    // JS months are 0-indexed
    return new Date(new Date().getFullYear(), month - 1, day);
};

const DailyStudentReportPage: React.FC<DailyStudentReportPageProps> = ({ students }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'totalPoints', direction: 'descending' });
    const [selectedStudent, setSelectedStudent] = useState<ProcessedStudentData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    // State for dropdown selections (UI state)
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
    const dayDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedCircleTime, setSelectedCircleTime] = useState<string>('');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedCircle, setSelectedCircle] = useState<string>('');
    
    // State for applied filters (data filtering state)
    const [activeFilters, setActiveFilters] = useState({ day: [] as string[], circle: '', teacher: '', circleTime: '' });

    // Close day dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dayDropdownRef.current && !dayDropdownRef.current.contains(event.target as Node)) {
                setIsDayDropdownOpen(false);
            }
        };
        
        if (isDayDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDayDropdownOpen]);

    // Reset dependent filters when a parent filter changes
    useEffect(() => {
        setSelectedTeacher('');
        setSelectedCircle('');
    }, [selectedDays, selectedCircleTime]);

    useEffect(() => {
        setSelectedCircle('');
    }, [selectedTeacher]);

    useEffect(() => {
        setCurrentPage(1);
    }, [students, activeFilters]);

    // Memoize filter options based on selections for cascading effect
    const dayOptions = useMemo(() => {
        const days = new Set<string>(students.map(s => s.day).filter((d): d is string => !!d));
        return Array.from(days).sort((a, b) => {
            const dateA = parseDateFromDayString(a);
            const dateB = parseDateFromDayString(b);
            return dateB.getTime() - dateA.getTime();
        });
    }, [students]);

    const timeOptions = useMemo(() => {
        const times = new Set<string>(students.map(s => s.circleTime).filter((t): t is string => !!t));
        return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    const teacherOptions = useMemo(() => {
        const filtered = students.filter(s =>
            (!selectedDays.length || (s.day && selectedDays.includes(s.day))) &&
            (!selectedCircleTime || s.circleTime === selectedCircleTime)
        );
        const teachers = new Set<string>(filtered.map(s => s.teacherName).filter((t): t is string => !!t));
        return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students, selectedDays, selectedCircleTime]);

    const circleOptions = useMemo(() => {
        const filtered = students.filter(s =>
            (!selectedDays.length || (s.day && selectedDays.includes(s.day))) &&
            (!selectedCircleTime || s.circleTime === selectedCircleTime) &&
            (!selectedTeacher || s.teacherName === selectedTeacher)
        );
        const circles = new Set<string>(filtered.map(s => s.circle).filter((c): c is string => !!c));
        return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students, selectedDays, selectedCircleTime, selectedTeacher]);


    const { paginatedStudents, totalPages, reportTitle, summary, fullFilteredList } = useMemo(() => {
        const { day: activeDaysFilter, circle: activeCircleFilter, teacher: activeTeacherFilter, circleTime: activeTimeFilter } = activeFilters;
        
        const initialFilteredList = students.filter(student => {
            const dayMatch = !activeDaysFilter.length || (student.day && activeDaysFilter.includes(student.day));
            const timeMatch = !activeTimeFilter || student.circleTime === activeTimeFilter;
            const teacherMatch = !activeTeacherFilter || student.teacherName === activeTeacherFilter;
            const circleMatch = !activeCircleFilter || student.circle === activeCircleFilter;
            return dayMatch && timeMatch && teacherMatch && circleMatch;
        });

        let processedList: ProcessedStudentData[];
        const titleParts: string[] = [];

        if (activeDaysFilter.length > 1) {
            titleParts.push('التقرير المجمع للطلاب');
            const aggregationMap = new Map<number, {
                latestRow: ProcessedStudentData;
                memAchieved: number; memRequired: number;
                revAchieved: number; revRequired: number;
                conAchieved: number; conRequired: number;
                pointsSum: number;
                attendanceSum: number;
                entryCount: number;
                memorizationLessons: string[];
                reviewLessons: string[];
            }>();

            initialFilteredList.forEach(item => {
                const { username, memorizationPages, reviewPages, consolidationPages, attendance, totalPoints, memorizationLessons, reviewLessons } = item;
                if (!username) return;

                if (aggregationMap.has(username)) {
                    const agg = aggregationMap.get(username)!;
                    agg.latestRow = item;
                    agg.memAchieved += memorizationPages.achieved;
                    agg.memRequired += memorizationPages.required;
                    agg.revAchieved += reviewPages.achieved;
                    agg.revRequired += reviewPages.required;
                    agg.conAchieved += consolidationPages.achieved;
                    agg.conRequired += consolidationPages.required;
                    agg.pointsSum += totalPoints;
                    agg.attendanceSum += attendance;
                    agg.entryCount += 1;
                    if (memorizationLessons && !agg.memorizationLessons.includes(memorizationLessons)) agg.memorizationLessons.push(memorizationLessons);
                    if (reviewLessons && !agg.reviewLessons.includes(reviewLessons)) agg.reviewLessons.push(reviewLessons);
                } else {
                    aggregationMap.set(username, {
                        latestRow: item,
                        memAchieved: memorizationPages.achieved, memRequired: memorizationPages.required,
                        revAchieved: reviewPages.achieved, revRequired: reviewPages.required,
                        conAchieved: consolidationPages.achieved, conRequired: consolidationPages.required,
                        pointsSum: totalPoints,
                        attendanceSum: attendance,
                        entryCount: 1,
                        memorizationLessons: [memorizationLessons].filter((l): l is string => !!l),
                        reviewLessons: [reviewLessons].filter((l): l is string => !!l),
                    });
                }
            });

            processedList = Array.from(aggregationMap.values()).map(agg => {
                const { latestRow, entryCount } = agg;
                const createAchievement = (achieved: number, required: number): Achievement => ({
                    achieved, required,
                    formatted: `${achieved.toFixed(1)} / ${required.toFixed(1)}`,
                    index: required > 0 ? achieved / required : 0,
                });

                return {
                    ...latestRow,
                    id: `agg-${latestRow.username}`,
                    memorizationLessons: agg.memorizationLessons.join(', '),
                    memorizationPages: createAchievement(agg.memAchieved, agg.memRequired),
                    reviewLessons: agg.reviewLessons.join(', '),
                    reviewPages: createAchievement(agg.revAchieved, agg.revRequired),
                    consolidationPages: createAchievement(agg.conAchieved, agg.conRequired),
                    attendance: entryCount > 0 ? agg.attendanceSum / entryCount : 0,
                    totalPoints: agg.pointsSum,
                    day: `${entryCount} أيام`,
                };
            });
        } else {
            titleParts.push('التقرير اليومي للطلاب');
            processedList = initialFilteredList;
        }

        // Build title string
        if (activeDaysFilter.length > 0) {
            if (activeDaysFilter.length > 2) {
                titleParts.push(`${activeDaysFilter.length} أيام مختارة`);
            } else if (activeDaysFilter.length > 0) {
                titleParts.push(activeDaysFilter.join('، '));
            }
        }
        if (activeTimeFilter) titleParts.push(activeTimeFilter);
        if (activeTeacherFilter) titleParts.push(activeTeacherFilter);
        if (activeCircleFilter) titleParts.push(activeCircleFilter);
        const title = titleParts.join(' - ');
        
        const sortedList = [...processedList];
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
            const dayText = activeFilters.day.length > 0 ? `الأيام: ${activeFilters.day.join(', ')}` : `تاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
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

    const handleExport = () => {
        // FIX: Replaced `declare` with a constant assigned from the window object to fix scoping issue.
        const XLSX = (window as any).XLSX;
        const dataToExport = fullFilteredList.map(student => ({
          'اسم الطالب': student.studentName,
          'الحلقة': student.circle,
          'المعلم': student.teacherName,
          ...(activeFilters.day.length > 1 && { 'عدد الأيام': student.day }),
          'أوجه الحفظ المحققة': student.memorizationPages.achieved,
          'أوجه الحفظ المطلوبة': student.memorizationPages.required,
          'مؤشر الحفظ': `${(student.memorizationPages.index * 100).toFixed(0)}%`,
          'أوجه المراجعة المحققة': student.reviewPages.achieved,
          'أوجه المراجعة المطلوبة': student.reviewPages.required,
          'مؤشر المراجعة': `${(student.reviewPages.index * 100).toFixed(0)}%`,
          'أوجه التثبيت المحققة': student.consolidationPages.achieved,
          'أوجه التثبيت المطلوبة': student.consolidationPages.required,
          'مؤشر التثبيت': `${(student.consolidationPages.index * 100).toFixed(0)}%`,
          'نسبة الحضور': `${(student.attendance * 100).toFixed(0)}%`,
          'النقاط': student.totalPoints,
        }));
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'التقرير اليومي');
        XLSX.writeFile(wb, 'التقرير_اليومي_للطلاب.xlsx');
    };

    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handleDaySelection = (day: string) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleApplyFilter = () => {
        setActiveFilters({ day: selectedDays, circle: selectedCircle, teacher: selectedTeacher, circleTime: selectedCircleTime });
    };

    const handleClearFilter = () => {
        setSelectedDays([]);
        setSelectedCircleTime('');
        setSelectedTeacher('');
        setSelectedCircle('');
        setActiveFilters({ day: [], circle: '', teacher: '', circleTime: '' });
    };

    return (
        <>
            <div className="flex justify-end mb-4 print-hidden gap-2">
                <button
                    onClick={handleExport}
                    className="px-4 py-2 text-sm font-semibold text-green-800 bg-green-100 rounded-md shadow-sm hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 flex items-center justify-center gap-2"
                >
                    <ExcelIcon />
                    تصدير لإكسل
                </button>
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
                    <div className="md:col-span-1 relative" ref={dayDropdownRef}>
                        <label htmlFor="day-filter-btn" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب اليوم</label>
                        <button
                            id="day-filter-btn"
                            type="button"
                            onClick={() => setIsDayDropdownOpen(prev => !prev)}
                            className="block w-full text-right pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white relative text-right"
                        >
                            <span className="truncate">
                                {selectedDays.length === 0 ? 'كل الأيام' : selectedDays.length === 1 ? selectedDays[0] : `${selectedDays.length} أيام مختارة`}
                            </span>
                             <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </button>
                        {isDayDropdownOpen && (
                            <div className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg border border-stone-200">
                                <ul className="max-h-60 overflow-auto p-2 space-y-1">
                                    {dayOptions.map(day => (
                                        <li key={day}>
                                            <label className="flex items-center space-x-2 space-x-reverse px-2 py-1.5 rounded-md hover:bg-stone-100 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                                                    checked={selectedDays.includes(day)}
                                                    onChange={() => handleDaySelection(day)}
                                                />
                                                <span className="text-sm text-stone-700">{day}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                     <div className="md:col-span-1">
                        <label htmlFor="time-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب وقت الحلقة</label>
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
                        <label htmlFor="teacher-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب المعلم</label>
                        <select
                            id="teacher-filter"
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            disabled={teacherOptions.length === 0}
                        >
                            <option value="">كل المعلمين</option>
                            {teacherOptions.map((teacher) => (
                                <option key={teacher} value={teacher}>
                                    {teacher}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="circle-filter" className="block text-sm font-medium text-stone-700 mb-2">فلترة حسب الحلقة</label>
                        <select
                            id="circle-filter"
                            className="block w-full pl-3 pr-10 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                            value={selectedCircle}
                            onChange={(e) => setSelectedCircle(e.target.value)}
                            disabled={circleOptions.length === 0}
                        >
                            <option value="">كل الحلقات</option>
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