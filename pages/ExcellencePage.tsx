import React, { useMemo } from 'react';
import type { ProcessedStudentData, ExcellenceReportData } from '../types';
import ExcellenceReportTable from '../components/ExcellenceReportTable';
import { CrownIcon } from '../components/icons';

interface ExcellencePageProps {
  students: ProcessedStudentData[];
}

const PodiumCard: React.FC<{ rank: number; circle: ExcellenceReportData | undefined }> = ({ rank, circle }) => {
    if (!circle) return null;

    const rankStyles = {
        1: {
            order: 'order-1 md:order-2',
            height: 'h-64',
            bg: 'bg-gradient-to-b from-amber-300 to-amber-500',
            textColor: 'text-amber-900',
            borderColor: 'border-amber-600',
            shadow: 'shadow-2xl shadow-amber-500/30',
            iconColor: 'text-amber-800',
            scale: 'scale-105 z-10'
        },
        2: {
            order: 'order-2 md:order-1',
            height: 'h-56',
            bg: 'bg-gradient-to-b from-stone-200 to-stone-400',
            textColor: 'text-stone-800',
            borderColor: 'border-stone-500',
            shadow: 'shadow-xl shadow-stone-500/20',
            iconColor: 'text-stone-600',
            scale: ''
        },
        3: {
            order: 'order-3',
            height: 'h-56',
            bg: 'bg-gradient-to-b from-orange-300 to-orange-500',
            textColor: 'text-orange-900',
            borderColor: 'border-orange-600',
            shadow: 'shadow-xl shadow-orange-500/20',
            iconColor: 'text-orange-700',
            scale: ''
        },
    };

    const styles = rankStyles[rank as keyof typeof rankStyles];

    return (
        <div className={`w-full md:w-1/3 p-2 ${styles.order}`}>
            <div className={`relative flex flex-col items-center justify-center p-6 ${styles.height} ${styles.bg} rounded-t-xl border-b-8 ${styles.borderColor} ${styles.shadow} transform transition-all duration-300 ${styles.scale}`}>
                {rank === 1 && <CrownIcon className={`absolute -top-7 h-14 w-14 drop-shadow-lg ${styles.iconColor}`} />}
                <div className={`absolute top-3 right-3 flex items-center justify-center w-12 h-12 rounded-full bg-white/60 text-3xl font-bold ${styles.textColor} ring-2 ring-white/50`}>
                    {rank}
                </div>
                <h3 className="text-2xl font-extrabold text-white text-center drop-shadow-md">{circle.circleName}</h3>
                <p className={`font-semibold ${styles.textColor} mt-1 drop-shadow-sm`}>{circle.teacherName}</p>
                <div className="mt-4 text-center">
                    <p className={`text-sm font-medium ${styles.textColor}`}>مؤشر التميز</p>
                    <p className="text-5xl font-extrabold text-white drop-shadow-lg">{(circle.excellenceScore * 100).toFixed(1)}%</p>
                </div>
            </div>
        </div>
    );
};


const ExcellencePage: React.FC<ExcellencePageProps> = ({ students }) => {

  const rankedData: ExcellenceReportData[] = useMemo(() => {
    const circlesMap = new Map<string, ProcessedStudentData[]>();

    // فلترة الطلاب لعرض حلقات فترة العصر فقط
    const asrStudents = students.filter(student => student.circleTime === 'العصر');

    asrStudents.forEach(student => {
      if (!circlesMap.has(student.circle)) {
        circlesMap.set(student.circle, []);
      }
      circlesMap.get(student.circle)!.push(student);
    });

    let report: Omit<ExcellenceReportData, 'rank'>[] = [];

    for (const [circleName, circleStudents] of circlesMap.entries()) {
        if (circleStudents.length === 0) continue;

        // تجاهل حلقات التبيان من الترتيب
        if (circleName.includes('التبيان')) {
            continue;
        }

        const studentCount = circleStudents.length;
        
        const totalMemorizationAchieved = circleStudents.reduce((sum, s) => sum + s.memorizationPages.achieved, 0);
        const avgMemorizationIndex = circleStudents.reduce((sum, s) => sum + s.memorizationPages.index, 0) / studentCount;
        
        const totalReviewAchieved = circleStudents.reduce((sum, s) => sum + s.reviewPages.achieved, 0);
        const avgReviewIndex = circleStudents.reduce((sum, s) => sum + s.reviewPages.index, 0) / studentCount;
        
        const totalConsolidationAchieved = circleStudents.reduce((sum, s) => sum + s.consolidationPages.achieved, 0);
        const avgConsolidationIndex = circleStudents.reduce((sum, s) => sum + s.consolidationPages.index, 0) / studentCount;

        const avgAttendance = circleStudents.reduce((sum, s) => sum + s.attendance, 0) / studentCount;
        const totalPoints = circleStudents.reduce((sum, s) => sum + s.totalPoints, 0);
        
        const avgGeneralIndex = (avgMemorizationIndex + avgReviewIndex + avgConsolidationIndex) / 3;
        
        // مؤشر التميز: (متوسط مؤشر الحفظ + متوسط نسبة الحضور) / 2
        const excellenceScore = (avgMemorizationIndex + avgAttendance) / 2;

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
            excellenceScore
        });
    }

    // Sort by excellence score and assign rank
    return report
        .sort((a, b) => b.excellenceScore - a.excellenceScore)
        .map((circle, index) => ({
            ...circle,
            rank: index + 1
        }));
  }, [students]);

  const [first, second, third] = rankedData;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row items-end justify-center gap-1">
          <PodiumCard rank={2} circle={second} />
          <PodiumCard rank={1} circle={first} />
          <PodiumCard rank={3} circle={third} />
      </div>
      <ExcellenceReportTable circles={rankedData} />
    </div>
  );
};

export default ExcellencePage;