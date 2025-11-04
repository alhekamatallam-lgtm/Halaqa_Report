import React, { useState, useMemo, useEffect } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import FilterControls from '../components/FilterControls';
import type { ProcessedStudentData, Achievement } from '../types';
import Pagination from '../components/Pagination';

type SortKey = keyof ProcessedStudentData;
const ITEMS_PER_PAGE = 10;

interface NotesPageProps {
  students: ProcessedStudentData[];
}

const NotesPage: React.FC<NotesPageProps> = ({ students }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'totalPoints', direction: 'descending' });
    const [selectedStudent, setSelectedStudent] = useState<ProcessedStudentData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCircleTime, setSelectedCircleTime] = useState<string>('');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedCircle, setSelectedCircle] = useState<string>('');
    const [selectedWeek, setSelectedWeek] = useState<string>('');

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCircleTime, selectedTeacher, selectedCircle, selectedWeek]);

    // First, identify the students who are the focus of this page (those with multiple entries)
    const multiEntryUsernames = useMemo(() => {
        const studentEntryCounts = new Map<number, number>();
        students.forEach(s => {
            studentEntryCounts.set(s.username, (studentEntryCounts.get(s.username) || 0) + 1);
        });
        const usernames = new Set<number>();
        studentEntryCounts.forEach((count, username) => {
            if (count > 1) {
                usernames.add(username);
            }
        });
        return usernames;
    }, [students]);

    const baseStudentsForPage = useMemo(() => {
        return students.filter(s => multiEntryUsernames.has(s.username));
    }, [students, multiEntryUsernames]);

    // Data source for filter dropdowns depends on the selected week
    const studentsForFilterOptions = useMemo(() => {
        if (!selectedWeek) {
            return baseStudentsForPage;
        }
        return baseStudentsForPage.filter(s => s.week === selectedWeek);
    }, [baseStudentsForPage, selectedWeek]);
    
    // Memoized, interconnected lists for filters
    const weekOptions = useMemo(() => {
        const weeks = new Set<string>(baseStudentsForPage.map(s => s.week).filter((w): w is string => !!w));
        return Array.from(weeks).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [baseStudentsForPage]);

    const timeOptions = useMemo(() => {
        const times = new Set<string>(studentsForFilterOptions.map(s => s.circleTime).filter(item => item));
        return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsForFilterOptions]);
    
    const teacherOptions = useMemo(() => {
        const filteredStudents = selectedCircleTime
            ? studentsForFilterOptions.filter(s => s.circleTime === selectedCircleTime)
            : studentsForFilterOptions;
        const teachers = new Set<string>(filteredStudents.map(s => s.teacherName).filter(item => item));
        return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsForFilterOptions, selectedCircleTime]);

    const circleOptions = useMemo(() => {
        let filteredStudents = studentsForFilterOptions;
        if (selectedCircleTime) {
            filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
        }
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        const circles = new Set<string>(filteredStudents.map(s => s.circle).filter(item => item));
        return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsForFilterOptions, selectedCircleTime, selectedTeacher]);
    
    // Effects to reset selections if they become invalid
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

    const handleFilterChange = (filterType: 'time' | 'teacher' | 'circle' | 'week', value: string) => {
        if (filterType === 'week') {
            setSelectedWeek(value);
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
        setSelectedWeek('');
    };
    
    const { filteredStudents, totalPages, summary } = useMemo(() => {
        let dataToProcess: ProcessedStudentData[];

        if (selectedWeek) {
            dataToProcess = baseStudentsForPage.filter(s => s.week === selectedWeek);
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

            baseStudentsForPage.forEach(item => {
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
            
            dataToProcess = Array.from(aggregationMap.values()).map(agg => {
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
                    hasMultipleEntries: true,
                };
            });
        }
        
        if (searchQuery) {
            dataToProcess = dataToProcess.filter(student =>
                student.studentName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (selectedCircleTime) {
            dataToProcess = dataToProcess.filter(student => student.circleTime === selectedCircleTime);
        }
        if (selectedTeacher) {
            dataToProcess = dataToProcess.filter(student => student.teacherName === selectedTeacher);
        }
        if (selectedCircle) {
            dataToProcess = dataToProcess.filter(student => student.circle === selectedCircle);
        }

        const sortedList = [...dataToProcess];

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
        const paginatedList = sortedList.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );

        return { filteredStudents: paginatedList, totalPages, summary };
    }, [baseStudentsForPage, sortConfig, selectedCircleTime, selectedTeacher, selectedCircle, searchQuery, selectedWeek, currentPage]);

    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (baseStudentsForPage.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
                <p className="text-lg text-gray-600">لا توجد ملاحظات لعرضها حاليًا (لا يوجد طلاب لديهم إدخالات متعددة).</p>
            </div>
        );
    }

    return (
        <>
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
                showWeekFilter={true}
            />
            <ReportTable
                students={filteredStudents}
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

export default NotesPage;
