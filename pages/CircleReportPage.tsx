import React, { useState, useMemo, useEffect } from 'react';
import type { ProcessedStudentData, CircleReportData } from '../types';
import CircleFilterControls from '../components/CircleFilterControls';
import { CircleReportTable } from '../components/CircleReportTable';

interface CircleReportPageProps {
  students: ProcessedStudentData[];
}

const CircleReportPage: React.FC<CircleReportPageProps> = ({ students }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCircleTime, setSelectedCircleTime] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

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
  
  const { circles: filteredData, summary } = useMemo(() => {
    let filteredStudents = studentsForFiltering;
    if (selectedCircleTime) {
      filteredStudents = filteredStudents.filter(s => s.circleTime === selectedCircleTime);
    }
    if (selectedTeacher) {
      filteredStudents = filteredStudents.filter(s => s.teacherName === selectedTeacher);
    }

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

    // Calculate Summary from the students that make up the final filtered report
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
    
    return { circles: report, summary };
  }, [studentsForFiltering, searchQuery, selectedCircleTime, selectedTeacher]);

  const reportTitle = selectedWeek ? `عرض بيانات: ${selectedWeek}` : 'العرض المجمع لجميع الأسابيع';

  return (
    <>
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
      <CircleReportTable circles={filteredData} summary={summary} />
    </>
  );
};

export default CircleReportPage;