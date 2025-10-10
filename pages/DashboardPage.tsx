import React, { useMemo, useState, useEffect } from 'react';
import type { ProcessedStudentData, CircleReportData, SupervisorData } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import FilterControls from '../components/FilterControls';

// --- CircleCard Components ---
interface CircleCardProps {
    circle: CircleReportData;
    onSelect: (circleName: string) => void;
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

const CircleCard: React.FC<CircleCardProps> = ({ circle, onSelect }) => (
    <div 
        className="bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer flex flex-col border border-stone-200"
        onClick={() => onSelect(circle.circleName)}
    >
        <div className="p-5 border-b-2 border-amber-400">
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
    </div>
);


// --- Main Page Component ---
interface DashboardPageProps {
  students: ProcessedStudentData[];
  onCircleSelect: (circleName: string) => void;
  supervisors: SupervisorData[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ students, onCircleSelect, supervisors }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleTime, setSelectedCircleTime] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

  const studentsForWeek = useMemo(() => {
    if (!selectedWeek) return students;
    return students.filter(s => s.week === selectedWeek);
  }, [students, selectedWeek]);
  
  const aggregatedData = useMemo(() => {
    const supervisorMap = new Map<string, string>();
    supervisors.forEach(supervisor => {
        supervisor.circles.forEach(circle => {
            supervisorMap.set(circle, supervisor.supervisorName);
        });
    });

    const circlesMap = new Map<string, ProcessedStudentData[]>();

    studentsForWeek.forEach(student => {
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
  }, [studentsForWeek, supervisors]);

  // Memoized, interconnected lists for filters, following a strict hierarchy.
  const weekOptions = useMemo(() => {
    const weeks = new Set<string>(students.map(s => s.week).filter((w): w is string => !!w));
    return Array.from(weeks).sort((a,b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const timeOptions = useMemo(() => {
      const times = new Set<string>(studentsForWeek.map(s => s.circleTime).filter(item => item));
      return Array.from(times).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [studentsForWeek]);

  const teacherOptions = useMemo(() => {
    const filteredStudents = selectedCircleTime
        ? studentsForWeek.filter(s => s.circleTime === selectedCircleTime)
        : studentsForWeek;
    const teachers = new Set<string>(filteredStudents.map(s => s.teacherName).filter(item => item));
    return Array.from(teachers).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [studentsForWeek, selectedCircleTime]);

  const circleOptions = useMemo(() => {
      let filteredStudents = studentsForWeek;
      if (selectedCircleTime) {
          filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
      }
      if (selectedTeacher) {
          filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
      }
      const circles = new Set<string>(filteredStudents.map(s => s.circle).filter(item => item));
      return Array.from(circles).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [studentsForWeek, selectedCircleTime, selectedTeacher]);

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

  const filteredData = useMemo(() => {
      let circlesToProcess = aggregatedData;

      if (searchQuery) {
          circlesToProcess = circlesToProcess.filter(c => c.circleName.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      if (selectedCircleTime) {
        const studentsInTime = studentsForWeek.filter(s => s.circleTime === selectedCircleTime);
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
  }, [aggregatedData, searchQuery, selectedCircleTime, selectedTeacher, selectedCircle, studentsForWeek]);


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
        allWeeks={weekOptions}
        selectedWeek={selectedWeek}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        showWeekFilter={true}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredData.map(circle => (
          <CircleCard key={circle.circleName} circle={circle} onSelect={onCircleSelect} />
        ))}
      </div>
    </>
  );
};

export default DashboardPage;