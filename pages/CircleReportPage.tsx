import React, { useState, useMemo } from 'react';
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

  const aggregatedData = useMemo(() => {
    const circlesMap = new Map<string, ProcessedStudentData[]>();

    students.forEach(student => {
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

      // FIX: Calculate and add missing 'avgGeneralIndex' property to conform to CircleReportData type.
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
    return report;
  }, [students]);

  const timeOptions = useMemo(() => Array.from(new Set(students.map(s => s.circleTime).filter(Boolean))), [students]);
  const teacherOptions = useMemo(() => Array.from(new Set(students.map(s => s.teacherName).filter(Boolean))), [students]);

  const filteredData = useMemo(() => {
    return aggregatedData.filter(circle => {
      const studentSample = students.find(s => s.circle === circle.circleName);
      if (!studentSample) return false;

      const matchesSearch = circle.circleName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTime = !selectedCircleTime || studentSample.circleTime === selectedCircleTime;
      const matchesTeacher = !selectedTeacher || circle.teacherName === selectedTeacher;
      
      return matchesSearch && matchesTime && matchesTeacher;
    });
  }, [aggregatedData, searchQuery, selectedCircleTime, selectedTeacher, students]);
  
  const handleFilterChange = (filterType: 'time' | 'teacher', value: string) => {
      if(filterType === 'time') setSelectedCircleTime(value);
      if(filterType === 'teacher') setSelectedTeacher(value);
  }
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCircleTime('');
    setSelectedTeacher('');
  };

  return (
    <>
      <CircleFilterControls 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        allCircleTimes={timeOptions}
        selectedCircleTime={selectedCircleTime}
        allTeachers={teacherOptions}
        selectedTeacher={selectedTeacher}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      <CircleReportTable circles={filteredData} />
    </>
  );
};

export default CircleReportPage;