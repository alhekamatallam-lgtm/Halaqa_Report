import React, { useState, useMemo, useEffect } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import FilterControls from '../components/FilterControls';
import type { ProcessedStudentData } from '../types';

type SortKey = keyof ProcessedStudentData;

interface NotesPageProps {
  students: ProcessedStudentData[];
}

const NotesPage: React.FC<NotesPageProps> = ({ students }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'totalPoints', direction: 'descending' });
    const [selectedStudent, setSelectedStudent] = useState<ProcessedStudentData | null>(null);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCircleTime, setSelectedCircleTime] = useState<string>('');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedCircle, setSelectedCircle] = useState<string>('');

    // Filter students to only those with notes/multiple entries
    const studentsWithNotes = useMemo(() => {
        return students.filter(s => s.hasMultipleEntries);
    }, [students]);

    // Memoized, interconnected lists for filters, based on studentsWithNotes
    const teacherOptions = useMemo(() => {
        const filteredStudents = selectedCircleTime
            ? studentsWithNotes.filter(s => s.circleTime === selectedCircleTime)
            : studentsWithNotes;
        // FIX: Explicitly type the Set to string to help with type inference.
        const teachers = new Set<string>(filteredStudents.map(s => s.teacherName).filter(item => item));
        return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsWithNotes, selectedCircleTime]);

    const circleOptions = useMemo(() => {
        let filteredStudents = studentsWithNotes;
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        if (selectedCircleTime) {
            filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
        }
        // FIX: Explicitly type the Set to string to help with type inference.
        const circles = new Set<string>(filteredStudents.map(s => s.circle).filter(item => item));
        return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsWithNotes, selectedTeacher, selectedCircleTime]);

    const timeOptions = useMemo(() => {
        let filteredStudents = studentsWithNotes;
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        if (selectedCircle) {
            filteredStudents = filteredStudents.filter(s => s.circle === selectedCircle);
        }
        // FIX: Explicitly type the Set to string to help with type inference.
        const times = new Set<string>(filteredStudents.map(s => s.circleTime).filter(item => item));
        return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [studentsWithNotes, selectedTeacher, selectedCircle]);

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
            if (!value) {
                setSelectedTeacher('');
                setSelectedCircle('');
            }
        } else if (filterType === 'teacher') {
            setSelectedTeacher(value);
            setSelectedCircle('');
        } else if (filterType === 'circle') {
            setSelectedCircle(value);
            if (value) {
                const studentForCircle = studentsWithNotes.find(s => s.circle === value);
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
        let studentsToProcess = studentsWithNotes;
        
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
    }, [studentsWithNotes, sortConfig, selectedCircleTime, selectedTeacher, selectedCircle, searchQuery]);

    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (studentsWithNotes.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
                <p className="text-lg text-gray-600">لا توجد ملاحظات لعرضها حاليًا.</p>
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

export default NotesPage;