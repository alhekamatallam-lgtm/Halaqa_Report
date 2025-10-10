import React, { useState, useMemo, useEffect } from 'react';
import { ReportTable } from '../components/ReportTable';
import StudentDetailModal from '../components/StudentDetailModal';
import FilterControls from '../components/FilterControls';
import type { ProcessedStudentData } from '../types';
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
        // FIX: Explicitly type the Set to string to help with type inference.
        const teachers = new Set<string>(filteredStudents.map(s => s.teacherName).filter(item => item));
        return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students, selectedCircleTime]);

    const circleOptions = useMemo(() => {
        let filteredStudents = students;
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        if (selectedCircleTime) {
            filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
        }
        // FIX: Explicitly type the Set to string to help with type inference.
        const circles = new Set<string>(filteredStudents.map(s => s.circle).filter(item => item));
        return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [students, selectedTeacher, selectedCircleTime]);

    const timeOptions = useMemo(() => {
        let filteredStudents = students;
        if (selectedTeacher) {
            filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
        }
        if (selectedCircle) {
            filteredStudents = filteredStudents.filter(s => s.circle === selectedCircle);
        }
        // FIX: Explicitly type the Set to string to help with type inference.
        const times = new Set<string>(filteredStudents.map(s => s.circleTime).filter(item => item));
        return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
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

    const handlePrint = () => {
        const asrStudents = students.filter(s => s.circleTime === 'العصر');

        const circles = asrStudents.reduce((acc, student) => {
            if (!acc[student.circle]) {
                acc[student.circle] = {
                    teacherName: student.teacherName,
                    students: []
                };
            }
            acc[student.circle].students.push(student);
            return acc;
        }, {} as Record<string, { teacherName: string; students: ProcessedStudentData[] }>);

        let printContent = '';

        Object.keys(circles).sort((a, b) => a.localeCompare(b, 'ar')).forEach(circleName => {
            const circleData = circles[circleName];
            printContent += `
                <div class="page-break">
                    <div class="print-header">
                        <h1>تقرير حلقة: ${circleName}</h1>
                        <h2>المعلم: ${circleData.teacherName}</h2>
                        <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>اسم الطالب</th>
                                <th>مؤشر الحفظ</th>
                                <th>مؤشر المراجعة</th>
                                <th>مؤشر التثبيت</th>
                                <th>الحضور</th>
                                <th>النقاط</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${circleData.students.map(student => `
                                <tr>
                                    <td>${student.studentName}</td>
                                    <td>${(student.memorizationPages.index * 100).toFixed(0)}%</td>
                                    <td>${(student.reviewPages.index * 100).toFixed(0)}%</td>
                                    <td>${(student.consolidationPages.index * 100).toFixed(0)}%</td>
                                    <td>${(student.attendance * 100).toFixed(0)}%</td>
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