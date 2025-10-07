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
            bg: 'bg-amber-400',
            textColor: 'text-amber-800',
            borderColor: 'border-amber-500',
            shadow: 'shadow-2xl',
            iconColor: 'text-amber-600',
            scale: 'scale-105'
        },
        2: {
            order: 'order-2 md:order-1',
            height: 'h-56',
            bg: 'bg-stone-300',
            textColor: 'text-stone-700',
            borderColor: 'border-stone-400',
            shadow: 'shadow-xl',
            iconColor: 'text-stone-500',
            scale: ''
        },
        3: {
            order: 'order-3',
            height: 'h-56',
            bg: 'bg-orange-300',
            textColor: 'text-orange-800',
            borderColor: 'border-orange-400',
            shadow: 'shadow-xl',
            iconColor: 'text-orange-600',
            scale: ''
        },
    };

    const styles = rankStyles[rank as keyof typeof rankStyles];

    return (
        <div className={`w-full md:w-1/3 p-2 ${styles.order}`}>
            <div className={`relative flex flex-col items-center justify-center p-6 ${styles.height} ${styles.bg} rounded-t-xl border-4 ${styles.borderColor} ${styles.shadow} transform transition-transform duration-300 ${styles.scale}`}>
                {rank === 1 && <CrownIcon className={`absolute -top-6 h-12 w-12 ${styles.iconColor}`} />}
                <div className={`absolute top-3 right-3 flex items-center justify-center w-10 h-10 rounded-full bg-white/50 text-2xl font-bold ${styles.textColor}`}>
                    {rank}
                </div>
                <h3 className="text-2xl font-bold text-center">{circle.circleName}</h3>
                <p className={`text-sm font-semibold ${styles.textColor} mt-1`}>{circle.teacherName}</p>
                <div className="mt-4 text-center">
                    <p className="text-sm">مؤشر التميز</p>
                    <p className="text-4xl font-extrabold">{(circle.excellenceScore * 100).toFixed(1)}%</p>
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