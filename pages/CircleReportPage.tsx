import React, { useState, useMemo, useEffect } from 'react';
import type { ProcessedStudentData, CircleReportData, SupervisorData } from '../types';
import CircleFilterControls from '../components/CircleFilterControls';
import { CircleReportTable } from '../components/CircleReportTable';
import { PrintIcon } from '../components/icons';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

interface CircleReportPageProps {
  students: ProcessedStudentData[];
  supervisors: SupervisorData[];
}

const CircleReportPage: React.FC<CircleReportPageProps> = ({ students, supervisors }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleTime, setSelectedCircleTime] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCircleTime, selectedTeacher, selectedWeek]);

  const weekOptions = useMemo(() => {
    const weeks = new Set<string>(students.map(s => s.week).filter((w): w is string => !!w));
    return Array.from(weeks).sort((a,b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const studentsForFiltering = useMemo(() => {
    if (!selectedWeek) return students;
    return students.filter(s => s.week === selectedWeek);
  }, [students, selectedWeek]);

  const timeOptions = useMemo(() => {
    const times = new Set<string>(studentsForFiltering.map(s => s.circleTime).filter(Boolean));
    return Array.from(times).sort((a,b) => a.localeCompare(b, 'ar'));
  }, [studentsForFiltering]);
  
  const teacherOptions = useMemo(() => {
    const filteredStudents = selectedCircleTime
        ? studentsForFiltering.filter(s => s.circleTime === selectedCircleTime)
        : studentsForFiltering;
    const teachers = new Set<string>(filteredStudents.map(s => s.teacherName).filter(Boolean));
    return Array.from(teachers).sort((a,b) => a.localeCompare(b, 'ar'));
  }, [studentsForFiltering, selectedCircleTime]);

  useEffect(() => {
      if (selectedTeacher && !teacherOptions.includes(selectedTeacher)) {
          setSelectedTeacher('');
      }
  }, [selectedTeacher, teacherOptions]);

  const handleFilterChange = (filterType: 'time' | 'teacher' | 'week', value: string) => {
      if(filterType === 'week') {
        setSelectedWeek(value);
        setSelectedCircleTime('');
        setSelectedTeacher('');
      } else if(filterType === 'time') {
        setSelectedCircleTime(value);
        setSelectedTeacher('');
      } else if(filterType === 'teacher') {
        setSelectedTeacher(value);
      }
  }
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCircleTime('');
    setSelectedTeacher('');
    setSelectedWeek('');
  };
  
  const { paginatedCircles, totalPages, summary } = useMemo(() => {
    let filteredStudents = studentsForFiltering;
    if (selectedCircleTime) {
      filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
    }
    if (selectedTeacher) {
      filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
    }

    const supervisorMap = new Map<string, string>();
    supervisors.forEach(supervisor => {
        supervisor.circles.forEach(circle => {
            supervisorMap.set(circle, supervisor.supervisorName);
        });
    });

    const circlesMap = new Map<string, ProcessedStudentData[]>();
    filteredStudents.forEach(student => {
      if (!circlesMap.has(student.circle)) {
        circlesMap.set(student.circle, []);
      }
      circlesMap.get(student.circle)!.push(student);
    });

    let report: CircleReportData[] = [];
    for (const [circleName, circleStudents] of circlesMap.entries()) {
      if (circleStudents.length === 0) continue;

      const studentCount = circleStudents.length;
      
      const totalMemorizationAchieved = circleStudents.reduce((sum, s) => sum + s.memorizationPages.achieved, 0);
      let avgMemorizationIndex = circleStudents.reduce((sum, s) => sum + s.memorizationPages.index, 0) / studentCount;
      
      const totalReviewAchieved = circleStudents.reduce((sum, s) => sum + s.reviewPages.achieved, 0);
      let avgReviewIndex = circleStudents.reduce((sum, s) => sum + s.reviewPages.index, 0) / studentCount;
      
      const totalConsolidationAchieved = circleStudents.reduce((sum, s) => sum + s.consolidationPages.achieved, 0);
      let avgConsolidationIndex = circleStudents.reduce((sum, s) => sum + s.consolidationPages.index, 0) / studentCount;

      const avgAttendance = circleStudents.reduce((sum, s) => sum + s.attendance, 0) / studentCount;
      const totalPoints = circleStudents.reduce((sum, s) => sum + s.totalPoints, 0);
      
      if (circleName.includes('التبيان')) {
        avgMemorizationIndex = 1;
        avgReviewIndex = 1;
        avgConsolidationIndex = 1;
      }

      const avgGeneralIndex = (avgMemorizationIndex + avgReviewIndex + avgConsolidationIndex) / 3;

      report.push({
        circleName,
        teacherName: circleStudents[0]?.teacherName || 'غير محدد',
        supervisorName: supervisorMap.get(circleName) || 'غير محدد',
        studentCount,
        totalMemorizationAchieved,
        avgMemorizationIndex,
        totalReviewAchieved,
        avgReviewIndex,
        totalConsolidationAchieved,
        avgConsolidationIndex,
        avgGeneralIndex,
        avgAttendance,
        totalPoints,
      });
    }
    
    if(searchQuery){
        report = report.filter(circle => circle.circleName.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const finalCircleNames = new Set(report.map(c => c.circleName));
    const finalStudents = filteredStudents.filter(s => finalCircleNames.has(s.circle));
    
    const summary = {
        totalMemorizationAchieved: finalStudents.reduce((acc, s) => acc + s.memorizationPages.achieved, 0),
        totalMemorizationRequired: finalStudents.reduce((acc, s) => acc + s.memorizationPages.required, 0),
        totalReviewAchieved: finalStudents.reduce((acc, s) => acc + s.reviewPages.achieved, 0),
        totalReviewRequired: finalStudents.reduce((acc, s) => acc + s.reviewPages.required, 0),
        totalConsolidationAchieved: finalStudents.reduce((acc, s) => acc + s.consolidationPages.achieved, 0),
        totalConsolidationRequired: finalStudents.reduce((acc, s) => acc + s.consolidationPages.required, 0),
        avgAttendance: finalStudents.length > 0 ? finalStudents.reduce((acc, s) => acc + s.attendance, 0) / finalStudents.length : 0,
        totalPoints: finalStudents.reduce((acc, s) => acc + s.totalPoints, 0),
    };
    
    const totalPages = Math.ceil(report.length / ITEMS_PER_PAGE);
    const paginatedCircles = report.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return { paginatedCircles, totalPages, summary };
  }, [studentsForFiltering, searchQuery, selectedCircleTime, selectedTeacher, supervisors, currentPage]);

  const reportTitle = selectedWeek ? `عرض بيانات: ${selectedWeek}` : 'العرض المجمع لجميع الأسابيع';

  const handlePrint = () => {
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

        const getSummaryAchievementCellHtml = (achieved: number, required: number) => {
            const index = required > 0 ? achieved / required : 0;
            return `
                <div class="print-achievement-text">${achieved.toFixed(1)} / ${required.toFixed(1)}</div>
                ${getProgressBarHtml(index)}
            `;
        };

        const weekText = selectedWeek ? `الأسبوع: ${selectedWeek}` : 'العرض المجمع لجميع الأسابيع';
        
        const printContent = `
            <div class="page-break">
                <table class="print-table">
                     <thead>
                        <tr>
                            <th colspan="9" class="print-header-container">
                                <div class="print-header">
                                    <h1>التقرير الإجمالي للحلقات</h1>
                                    <p>${weekText}</p>
                                </div>
                            </th>
                        </tr>
                        <tr>
                            <th>الحلقة</th>
                            <th>المعلم</th>
                            <th>المشرف التعليمي</th>
                            <th>إنجاز الحفظ</th>
                            <th>إنجاز المراجعة</th>
                            <th>إنجاز التثبيت</th>
                            <th>الحضور</th>
                            <th>النقاط</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedCircles.map(circle => `
                            <tr>
                                <td>${circle.circleName}</td>
                                <td>${circle.teacherName}</td>
                                <td>${circle.supervisorName}</td>
                                <td>
                                    <div class="print-achievement-text">${circle.totalMemorizationAchieved.toFixed(1)}</div>
                                    ${getProgressBarHtml(circle.avgMemorizationIndex)}
                                </td>
                                <td>
                                    <div class="print-achievement-text">${circle.totalReviewAchieved.toFixed(1)}</div>
                                    ${getProgressBarHtml(circle.avgReviewIndex)}
                                </td>
                                <td>
                                    <div class="print-achievement-text">${circle.totalConsolidationAchieved.toFixed(1)}</div>
                                    ${getProgressBarHtml(circle.avgConsolidationIndex)}
                                </td>
                                <td>${getProgressBarHtml(circle.avgAttendance)}</td>
                                <td>${circle.totalPoints}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td><strong>الإجمالي</strong></td>
                            <td></td>
                            <td></td>
                            <td>${getSummaryAchievementCellHtml(summary.totalMemorizationAchieved, summary.totalMemorizationRequired)}</td>
                            <td>${getSummaryAchievementCellHtml(summary.totalReviewAchieved, summary.totalReviewRequired)}</td>
                            <td>${getSummaryAchievementCellHtml(summary.totalConsolidationAchieved, summary.totalConsolidationRequired)}</td>
                            <td>${getProgressBarHtml(summary.avgAttendance)}</td>
                            <td><strong>${summary.totalPoints.toFixed(0)}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="9" class="print-page-footer">
                                <span>تقرير الحلقات</span> - <span>صفحة <span class="page-number"></span></span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        const printContainer = document.createElement('div');
        printContainer.className = 'printable-student-report';
        printContainer.innerHTML = printContent;
        document.body.appendChild(printContainer);
        
        document.body.classList.add('student-print-active');
        window.print();
        document.body.classList.remove('student-print-active');

        document.body.removeChild(printContainer);
    };

  return (
    <>
      <div className="flex justify-end mb-4 print-hidden">
          <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 flex items-center justify-center gap-2"
          >
              <PrintIcon />
              طباعة التقرير
          </button>
      </div>
      <CircleFilterControls 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        allCircleTimes={timeOptions}
        selectedCircleTime={selectedCircleTime}
        allTeachers={teacherOptions}
        selectedTeacher={selectedTeacher}
        allWeeks={weekOptions}
        selectedWeek={selectedWeek}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-stone-700">{reportTitle}</h4>
      </div>
      <CircleReportTable circles={paginatedCircles} summary={summary} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  );
};

export default CircleReportPage;
