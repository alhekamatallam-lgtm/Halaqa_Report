import React, { useState, useMemo, useEffect } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import FilterControls from '../components/FilterControls';
import type { ProcessedStudentData } from '../types';

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

    // Memoized, interconnected lists for filters
    const teacherOptions = useMemo(() => {
        const filteredStudents = selectedCircleTime
            ? students.filter(s => s.circleTime === selectedCircleTime)
            : students;
        const teachers = new Set(filteredStudents.map(s => s.teacherName).filter(Boolean));
        // FIX: Explicitly typing the sort callback parameters as string to fix 'unknown' type error.
        return Array.from(teachers).sort((a: string, b: string) => a.localeCompare(b, 'ar'));
    }, [students, selectedCircleTime]);

    const circleOptions = useMemo(() => {
        let filteredStudents = students;
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        if (selectedCircleTime) {
            filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
        }
        const circles = new Set(filteredStudents.map(s => s.circle).filter(Boolean));
        // FIX: Explicitly typing the sort callback parameters as string to fix 'unknown' type error.
        return Array.from(circles).sort((a: string, b: string) => a.localeCompare(b, 'ar'));
    }, [students, selectedTeacher, selectedCircleTime]);

    const timeOptions = useMemo(() => {
        let filteredStudents = students;
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        if (selectedCircle) {
            filteredStudents = filteredStudents.filter(s => s.circle === selectedCircle);
        }
        const times = new Set(filteredStudents.map(s => s.circleTime).filter(Boolean));
        // FIX: Explicitly typing the sort callback parameters as string to fix 'unknown' type error.
        return Array.from(times).sort((a: string, b: string) => a.localeCompare(b, 'ar'));
    }, [students, selectedTeacher, selectedCircle]);

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

    useEffect(() => {
        if (selectedCircleTime && !timeOptions.includes(selectedCircleTime)) {
            setSelectedCircleTime('');
        }
    }, [selectedCircleTime, timeOptions]);

    const handleFilterChange = (filterType: 'time' | 'teacher' | 'circle', value: string) => {
        if (filterType === 'time') {
            setSelectedCircleTime(value);
            if (!value) { // Resetting time
                setSelectedTeacher('');
                setSelectedCircle('');
            }
        } else if (filterType === 'teacher') {
            setSelectedTeacher(value);
            setSelectedCircle(''); // Reset circle when teacher changes
        } else if (filterType === 'circle') {
            setSelectedCircle(value);
            if (value) {
                const studentForCircle = students.find(s => s.circle === value);
                if (studentForCircle) {
                    if (!selectedTeacher) setSelectedTeacher(studentForCircle.teacherName);
                    if (!selectedCircleTime) setSelectedCircleTime(studentForCircle.circleTime);
                }
            }
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCircleTime('');
        setSelectedTeacher('');
        setSelectedCircle('');
    };
    
    const filteredAndSortedStudents = useMemo(() => {
        let studentsToProcess = students;
        
        if (searchQuery) {
            studentsToProcess = studentsToProcess.filter(student =>
                student.studentName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedCircleTime) {
            studentsToProcess = studentsToProcess.filter(student => student.circleTime === selectedCircleTime);
        }
        if (selectedTeacher) {
            studentsToProcess = studentsToProcess.filter(student => student.teacherName === selectedTeacher);
        }
        if (selectedCircle) {
            studentsToProcess = studentsToProcess.filter(student => student.circle === selectedCircle);
        }


        const sortableStudents = [...studentsToProcess];

        if (sortConfig !== null) {
            sortableStudents.sort((a, b) => {
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

        return sortableStudents;
    }, [students, sortConfig, selectedCircleTime, selectedTeacher, selectedCircle, searchQuery]);

    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

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
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
            />
            <ReportTable
                students={filteredAndSortedStudents}
                onRowClick={setSelectedStudent}
                sortConfig={sortConfig}
                onSort={handleSort}
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