import React, { useState, useMemo, useEffect } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import FilterControls from '../components/FilterControls';
import type { ProcessedStudentData, Achievement } from '../types';
import { PrintIcon } from '../components/icons';

type SortKey = keyof ProcessedStudentData;

interface StudentReportPageProps {
  students: ProcessedStudentData[];
  initialFilter: { circle: string } | null;
  clearInitialFilter: () => void;
}

const StudentReportPage: React.FC<StudentReportPageProps> = ({ students, initialFilter, clearInitialFilter }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'totalPoints', direction: 'descending' });
    const [selectedStudent, setSelectedStudent] = useState<ProcessedStudentData | null>(null);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCircleTime, setSelectedCircleTime] = useState<string>('');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedCircle, setSelectedCircle] = useState<string>('');
    const [selectedWeek, setSelectedWeek] = useState<string>('');

    useEffect(() => {
        if (initialFilter?.circle) {
            setSelectedCircle(initialFilter.circle);
            // Auto-select teacher and time for the selected circle
            const studentForCircle = students.find(s => s.circle === initialFilter.circle);
            if (studentForCircle) {
                setSelectedTeacher(studentForCircle.teacherName);
                setSelectedCircleTime(studentForCircle.circleTime);
            }
            clearInitialFilter();
        }
    }, [initialFilter, clearInitialFilter, students]);

    // Base student data, filtered by week first. This is the source for other filter options.
    const studentsForFiltering = useMemo(() => {
        if (!selectedWeek) {
            return students;
        }
        return students.filter(s => s.week === selectedWeek);
    }, [students, selectedWeek]);

    // Memoized, interconnected lists for filters, following a strict hierarchy.
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
    
    // Week options should always be from the full student list
    const weekOptions = useMemo(() => {
        const weeks = new Set<string>(students.map(s => s.week).filter((w): w is string => !!w));
        return Array.from(weeks).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students]);

    // Effects to reset selections if they become invalid (safety net)
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
        if (filterType === 'week') {
            setSelectedWeek(value);
            // Reset downstream filters
            setSelectedCircleTime('');
            setSelectedTeacher('');
            setSelectedCircle('');
        } else if (filterType === 'time') {
            setSelectedCircleTime(value);
            // Reset downstream filters
            setSelectedTeacher('');
            setSelectedCircle('');
        } else if (filterType === 'teacher') {
            setSelectedTeacher(value);
            // Reset downstream filter
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
        setSelectedWeek('');
    };

    const { filteredAndSortedStudents, reportTitle, summary } = useMemo(() => {
        // Step 1: Prepare the base data (either aggregated or for a specific week)
        let dataToFilter: ProcessedStudentData[];
        let title: string;

        if (selectedWeek) {
            dataToFilter = students
                .filter(student => student.week === selectedWeek)
                .map(s => ({ ...s, hasMultipleEntries: false }));
            title = `عرض بيانات: ${selectedWeek}`;
        } else {
            const aggregationMap = new Map<number, {
                latestRow: ProcessedStudentData;
                memAchieved: number;
                memRequired: number;
                revAchieved: number;
                revRequired: number;
                conAchieved: number;
                conRequired: number;
                pointsSum: number;
                attendanceSum: number;
                entryCount: number;
                memorizationLessons: string[];
                reviewLessons: string[];
            }>();

            students.forEach(item => {
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
                    if (memorizationLessons) agg.memorizationLessons.push(memorizationLessons);
                    if (reviewLessons) agg.reviewLessons.push(reviewLessons);
                } else {
                    aggregationMap.set(username, {
                        latestRow: item,
                        memAchieved: memorizationPages.achieved,
                        memRequired: memorizationPages.required,
                        revAchieved: reviewPages.achieved,
                        revRequired: reviewPages.required,
                        conAchieved: consolidationPages.achieved,
                        conRequired: consolidationPages.required,
                        pointsSum: totalPoints,
                        attendanceSum: attendance,
                        entryCount: 1,
                        memorizationLessons: [memorizationLessons].filter(Boolean),
                        reviewLessons: [reviewLessons].filter(Boolean),
                    });
                }
            });

            dataToFilter = Array.from(aggregationMap.values()).map(agg => {
                const { latestRow, entryCount } = agg;
                const createAchievement = (achieved: number, required: number): Achievement => ({
                    achieved, required,
                    formatted: `${achieved.toFixed(1)} / ${required.toFixed(1)}`,
                    index: required > 0 ? achieved / required : 0,
                });

                return {
                    ...latestRow,
                    memorizationLessons: agg.memorizationLessons.join(', '),
                    memorizationPages: createAchievement(agg.memAchieved, agg.memRequired),
                    reviewLessons: agg.reviewLessons.join(', '),
                    reviewPages: createAchievement(agg.revAchieved, agg.revRequired),
                    consolidationPages: createAchievement(agg.conAchieved, agg.conRequired),
                    attendance: entryCount > 0 ? agg.attendanceSum / entryCount : 0,
                    totalPoints: agg.pointsSum,
                    hasMultipleEntries: entryCount > 1,
                };
            });
            title = 'العرض المجمع لجميع الأسابيع';
        }

        // Step 2: Apply other filters to the prepared data
        let filteredList = dataToFilter;

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

        // Step 3: Sort the final list
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
        
        // Step 4: Calculate summary
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

        return { filteredAndSortedStudents: sortedList, reportTitle: title, summary };
    }, [students, sortConfig, selectedCircleTime, selectedTeacher, selectedCircle, searchQuery, selectedWeek]);
    
    const handlePrint = () => {
        const studentsToPrint = filteredAndSortedStudents.filter(s => s.circleTime === 'العصر');

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
            const percentage = Math.min(Math.max(value * 100, 0), 100);
            return `
                <div class="print-progress-container">
                    <div class="print-progress-bar" style="width: ${percentage.toFixed(0)}%;"></div>
                </div>
                <div class="print-progress-percentage">${percentage.toFixed(0)}%</div>
            `;
        };

        let printContent = '';

        Object.keys(circles).sort((a, b) => a.localeCompare(b, 'ar')).forEach(circleName => {
            const circleData = circles[circleName];
            const weekText = selectedWeek ? `الأسبوع: ${selectedWeek}` : 'العرض المجمع لجميع الأسابيع';
            printContent += `
                <div class="page-break">
                    <div class="print-header">
                        <h1>تقرير حلقة: ${circleName}</h1>
                        <h2>المعلم: ${circleData.teacherName}</h2>
                        <p>${weekText}</p>
                    </div>
                    <table class="print-table">
                        <thead>
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
                allWeeks={weekOptions}
                selectedWeek={selectedWeek}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
            />
             <div className="mb-4">
                <h4 className="text-lg font-semibold text-stone-700">{reportTitle}</h4>
            </div>
            <ReportTable
                students={filteredAndSortedStudents}
                onRowClick={setSelectedStudent}
                sortConfig={sortConfig}
                onSort={handleSort}
                summary={summary}
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

export default StudentReportPage;