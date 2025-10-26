import React, { useState, useMemo, useEffect } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import FilterControls from '../components/FilterControls';
import type { ProcessedStudentData } from '../types';
import { PrintIcon } from '../components/icons';
import Pagination from '../components/Pagination';

type SortKey = keyof ProcessedStudentData;
const ITEMS_PER_PAGE = 10;

interface DailyStudentReportPageProps {
  students: ProcessedStudentData[];
  initialFilter: { circle: string } | null;
  clearInitialFilter: () => void;
}

const DailyStudentReportPage: React.FC<DailyStudentReportPageProps> = ({ students, initialFilter, clearInitialFilter }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'totalPoints', direction: 'descending' });
    const [selectedStudent, setSelectedStudent] = useState<ProcessedStudentData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCircleTime, setSelectedCircleTime] = useState<string>('');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedCircle, setSelectedCircle] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>('');

    useEffect(() => {
        if (initialFilter?.circle) {
            setSelectedCircle(initialFilter.circle);
            const studentForCircle = students.find(s => s.circle === initialFilter.circle);
            if (studentForCircle) {
                setSelectedTeacher(studentForCircle.teacherName);
                setSelectedCircleTime(studentForCircle.circleTime);
            }
            clearInitialFilter();
        }
    }, [initialFilter, clearInitialFilter, students]);

     useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCircleTime, selectedTeacher, selectedCircle, selectedDay]);


    const dayOptions = useMemo(() => {
        const days = new Set<string>(students.map(s => s.day).filter((d): d is string => !!d));
        return Array.from(days).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    const studentsForFiltering = useMemo(() => {
        if (!selectedDay) return students;
        return students.filter(s => s.day === selectedDay);
    }, [students, selectedDay]);

    const timeOptions = useMemo(() => {
        const times = new Set<string>(studentsForFiltering.map(s => s.circleTime).filter(item => item));
        return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsForFiltering]);
    
    const teacherOptions = useMemo(() => {
        const filteredStudents = selectedCircleTime
            ? studentsForFiltering.filter(s => s.circleTime === selectedCircleTime)
            : studentsForFiltering;
        const teachers = new Set<string>(filteredStudents.map(s => s.teacherName).filter(item => item));
        return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsForFiltering, selectedCircleTime]);

    const circleOptions = useMemo(() => {
        let filteredStudents = studentsForFiltering;
        if (selectedCircleTime) {
            filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
        }
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        const circles = new Set<string>(filteredStudents.map(s => s.circle).filter(item => item));
        return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsForFiltering, selectedCircleTime, selectedTeacher]);

    useEffect(() => {
        if (selectedTeacher && !teacherOptions.includes(selectedTeacher)) {
            setSelectedTeacher('');
        }
    }, [selectedTeacher, teacherOptions]);

    useEffect(() => {
        if (selectedCircle && !circleOptions.includes(selectedCircle)) {
            setSelectedCircle('');
        }
    }, [selectedCircle, circleOptions]);

    useEffect(() => {
        if (selectedCircleTime && !timeOptions.includes(selectedCircleTime)) {
            setSelectedCircleTime('');
        }
    }, [selectedCircleTime, timeOptions]);

    const handleFilterChange = (filterType: 'time' | 'teacher' | 'circle' | 'week', value: string) => {
        if (filterType === 'week') { // This is our day filter
            setSelectedDay(value);
            setSelectedCircleTime('');
            setSelectedTeacher('');
            setSelectedCircle('');
        } else if (filterType === 'time') {
            setSelectedCircleTime(value);
            setSelectedTeacher('');
            setSelectedCircle('');
        } else if (filterType === 'teacher') {
            setSelectedTeacher(value);
            setSelectedCircle('');
        } else if (filterType === 'circle') {
            setSelectedCircle(value);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCircleTime('');
        setSelectedTeacher('');
        setSelectedCircle('');
        setSelectedDay('');
    };

    const { paginatedStudents, totalPages, reportTitle, summary } = useMemo(() => {
        let filteredList = students;
        const title = `التقرير اليومي للطلاب ${selectedDay ? `- ${selectedDay}`: ''}`;

        if (selectedDay) {
            filteredList = filteredList.filter(student => student.day === selectedDay);
        }
        if (searchQuery) {
            filteredList = filteredList.filter(student =>
                student.studentName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (selectedCircleTime) {
            filteredList = filteredList.filter(student => student.circleTime === selectedCircleTime);
        }
        if (selectedTeacher) {
            filteredList = filteredList.filter(student => student.teacherName === selectedTeacher);
        }
        if (selectedCircle) {
            filteredList = filteredList.filter(student => student.circle === selectedCircle);
        }

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

        return { paginatedStudents, totalPages, reportTitle: title, summary };
    }, [students, sortConfig, selectedCircleTime, selectedTeacher, selectedCircle, searchQuery, selectedDay, currentPage]);
    
    const handlePrint = () => {
        const studentsToPrint = paginatedStudents.filter(s => s.circleTime === 'العصر');

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
            const dayText = selectedDay ? `اليوم: ${selectedDay}` : `تاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
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
            <FilterControls
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                allCircleTimes={timeOptions}
                selectedCircleTime={selectedCircleTime}
                allTeachers={teacherOptions}
                selectedTeacher={selectedTeacher}
                availableCircles={circleOptions}
                selectedCircle={selectedCircle}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showWeekFilter={true}
                allWeeks={dayOptions}
                selectedWeek={selectedDay}
                weekFilterLabel="فلترة حسب اليوم"
                weekFilterAllOptionLabel="كل الأيام"
            />
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
