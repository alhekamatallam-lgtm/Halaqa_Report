import React, { useMemo, useState, useEffect } from 'react';
import type { ProcessedStudentData, CircleReportData, SupervisorData } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import FilterControls from '../components/FilterControls';
import { PrintIcon } from '../components/icons';

// --- CircleCard Components ---
interface DailyCircleCardProps {
    circle: CircleReportData;
    onSelect: (circleName: string) => void;
    onExport: (circle: CircleReportData) => void;
}

const StatItem: React.FC<{ label: string; value?: string | number; indexValue: number; indexLabel: string; }> = ({ label, value, indexValue, indexLabel }) => (
    <div className="py-3">
        <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-stone-600">{label}</span>
            {value != null && <span className="font-bold text-stone-800">{value}</span>}
        </div>
        <ProgressBar value={indexValue} />
        <p className="text-xs text-right text-stone-500 mt-1">
            {indexLabel}: {(indexValue * 100).toFixed(0)}%
        </p>
    </div>
);

const DailyCircleCard: React.FC<DailyCircleCardProps> = ({ circle, onSelect, onExport }) => (
    <div 
        className="bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col border border-stone-200"
    >
        <div 
            className="p-5 border-b-2 border-amber-400 cursor-pointer hover:bg-amber-50"
            onClick={() => onSelect(circle.circleName)}
        >
            <h3 className="text-lg font-bold text-stone-800 truncate">{circle.circleName}</h3>
            <p className="text-sm text-stone-600">{circle.studentCount} طالب</p>
        </div>
        <div className="p-5 divide-y divide-stone-200 flex-grow bg-stone-50/50">
            <StatItem label="مجموع أوجه الحفظ" value={circle.totalMemorizationAchieved.toFixed(1)} indexValue={circle.avgMemorizationIndex} indexLabel="مؤشر الحفظ" />
            <StatItem label="مجموع أوجه المراجعة" value={circle.totalReviewAchieved.toFixed(1)} indexValue={circle.avgReviewIndex} indexLabel="مؤشر المراجعة" />
            <StatItem label="مجموع أوجه التثبيت" value={circle.totalConsolidationAchieved.toFixed(1)} indexValue={circle.avgConsolidationIndex} indexLabel="مؤشر التثبيت" />
            <StatItem label="المؤشر العام" indexValue={circle.avgGeneralIndex} indexLabel="المؤشر العام" />
            <div className="pt-3">
                 <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-stone-600">متوسط نسبة الحضور</span>
                    <span className="font-bold text-stone-800">{(circle.avgAttendance * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={circle.avgAttendance} />
            </div>
        </div>
         <div className="p-3 bg-stone-100 border-t border-stone-200">
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    onExport(circle);
                }}
                className="w-full h-10 px-4 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 flex items-center justify-center gap-2"
            >
                <PrintIcon className="w-5 h-5"/>
                تصدير تقرير الحلقة
            </button>
        </div>
    </div>
);


// --- Main Page Component ---
interface DailyDashboardPageProps {
  students: ProcessedStudentData[];
  onCircleSelect: (circleName: string) => void;
  supervisors: SupervisorData[];
}

const DailyDashboardPage: React.FC<DailyDashboardPageProps> = ({ students, onCircleSelect, supervisors }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleTime, setSelectedCircleTime] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedDay, setSelectedDay] = useState('');

  const studentsForDay = useMemo(() => {
    if (!selectedDay) return students;
    return students.filter(s => s.day === selectedDay);
  }, [students, selectedDay]);
  
  const aggregatedData = useMemo(() => {
    const supervisorMap = new Map<string, string>();
    supervisors.forEach(supervisor => {
        supervisor.circles.forEach(circle => {
            supervisorMap.set(circle, supervisor.supervisorName);
        });
    });

    const circlesMap = new Map<string, ProcessedStudentData[]>();

    studentsForDay.forEach(student => {
      if (!circlesMap.has(student.circle)) {
        circlesMap.set(student.circle, []);
      }
      circlesMap.get(student.circle)!.push(student);
    });

    const report: CircleReportData[] = [];
    for (const [circleName, circleStudents] of circlesMap.entries()) {
      if (circleStudents.length === 0) continue;

      const studentCount = circleStudents.length;
      
      const totalMemorizationAchieved = circleStudents.reduce((sum, s) => sum + s.memorizationPages.achieved, 0);
      let avgMemorizationIndex = studentCount > 0 ? circleStudents.reduce((sum, s) => sum + s.memorizationPages.index, 0) / studentCount : 0;
      
      const totalReviewAchieved = circleStudents.reduce((sum, s) => sum + s.reviewPages.achieved, 0);
      let avgReviewIndex = studentCount > 0 ? circleStudents.reduce((sum, s) => sum + s.reviewPages.index, 0) / studentCount : 0;
      
      const totalConsolidationAchieved = circleStudents.reduce((sum, s) => sum + s.consolidationPages.achieved, 0);
      let avgConsolidationIndex = studentCount > 0 ? circleStudents.reduce((sum, s) => sum + s.consolidationPages.index, 0) / studentCount : 0;

      const avgAttendance = studentCount > 0 ? circleStudents.reduce((sum, s) => sum + s.attendance, 0) / studentCount : 0;
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
    return report.sort((a,b) => a.circleName.localeCompare(b.circleName, 'ar'));
  }, [studentsForDay, supervisors]);

  // Memoized lists for filters
  const dayOptions = useMemo(() => {
    const days = new Set<string>(students.map(s => s.day).filter((w): w is string => !!w));
    return Array.from(days).sort((a,b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const timeOptions = useMemo(() => {
      const times = new Set<string>(studentsForDay.map(s => s.circleTime).filter(item => item));
      return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [studentsForDay]);

  const teacherOptions = useMemo(() => {
    const filteredStudents = selectedCircleTime
        ? studentsForDay.filter(s => s.circleTime === selectedCircleTime)
        : studentsForDay;
    const teachers = new Set<string>(filteredStudents.map(s => s.teacherName).filter(item => item));
    return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [studentsForDay, selectedCircleTime]);

  const circleOptions = useMemo(() => {
      let filteredStudents = studentsForDay;
      if (selectedCircleTime) {
          filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
      }
      if (selectedTeacher) {
          filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
      }
      const circles = new Set<string>(filteredStudents.map(s => s.circle).filter(item => item));
      return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [studentsForDay, selectedCircleTime, selectedTeacher]);

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
    if (filterType === 'week') { // This is our 'day' filter
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

  const filteredData = useMemo(() => {
      let circlesToProcess = aggregatedData;

      if (searchQuery) {
          circlesToProcess = circlesToProcess.filter(c => c.circleName.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      if (selectedCircleTime) {
        const studentsInTime = studentsForDay.filter(s => s.circleTime === selectedCircleTime);
        const circlesInTime = new Set(studentsInTime.map(s => s.circle));
        circlesToProcess = circlesToProcess.filter(c => circlesInTime.has(c.circleName));
      }
      if (selectedTeacher) {
          circlesToProcess = circlesToProcess.filter(c => c.teacherName === selectedTeacher);
      }
      if (selectedCircle) {
          circlesToProcess = circlesToProcess.filter(c => c.circleName === selectedCircle);
      }

      return circlesToProcess;
  }, [aggregatedData, searchQuery, selectedCircleTime, selectedTeacher, selectedCircle, studentsForDay]);


  const handleExport = (circleData: CircleReportData) => {
        const studentsToPrint = studentsForDay.filter(s => s.circle === circleData.circleName);

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

        const dayText = selectedDay ? `اليوم: ${selectedDay}` : `تاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
        
        const printContent = `
            <div class="page-break">
                <table class="print-table">
                        <thead>
                        <tr>
                            <th colspan="6" class="print-header-container">
                                <div class="print-header">
                                    <h1>التقرير اليومي لحلقة: ${circleData.circleName}</h1>
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
                        ${studentsToPrint.map(student => `
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
                                <span>${circleData.circleName}</span> - <span>صفحة <span class="page-number"></span></span>
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
      <FilterControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchLabel="بحث بالحلقة"
        searchPlaceholder="ادخل اسم الحلقة..."
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredData.map(circle => (
          <DailyCircleCard key={circle.circleName} circle={circle} onSelect={onCircleSelect} onExport={handleExport} />
        ))}
      </div>
    </>
  );
};

export default DailyDashboardPage;
