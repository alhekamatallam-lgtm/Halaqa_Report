
import React from 'react';
import type { CircleReportData } from '../types';
import { ProgressBar } from './ProgressBar';

interface CircleReportSummary {
  totalMemorizationAchieved: number;
  totalMemorizationRequired: number;
  totalReviewAchieved: number;
  totalReviewRequired: number;
  totalConsolidationAchieved: number;
  totalConsolidationRequired: number;
  avgAttendance: number;
  totalPoints: number;
}

interface CircleReportTableProps {
  circles: CircleReportData[];
  summary: CircleReportSummary;
}

const SummaryAchievementCell: React.FC<{ achieved: number; required: number; }> = ({ achieved, required }) => {
    const index = required > 0 ? achieved / required : 0;
    return (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
            <div className='flex flex-col gap-1 items-center'>
                <span className="font-semibold">{`${achieved.toFixed(1)} / ${required.toFixed(1)}`}</span>
                <div className="w-full">
                    <ProgressBar value={index} />
                    <p className="text-xs text-center text-gray-700 mt-1 font-bold">{(index * 100).toFixed(0)}%</p>
                </div>
            </div>
        </td>
    );
};


export const CircleReportTable: React.FC<CircleReportTableProps> = ({ circles, summary }) => {
  return (
    <div className="overflow-x-auto shadow-xl rounded-xl border border-stone-200 bg-white">
      <table className="min-w-full divide-y divide-stone-200">
        <thead className="bg-stone-200 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">الحلقة</th>
            <th scope="col" className="hidden md:table-cell px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">المعلم</th>
            <th scope="col" className="hidden md:table-cell px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">المشرف التعليمي</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">أوجه الحفظ / المؤشر</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">أوجه المراجعة / المؤشر</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">أوجه التثبيت / المؤشر</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">نسبة الحضور</th>
            <th scope="col" className="hidden md:table-cell px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">إجمالي النقاط</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-stone-200">
          {circles.map((circle, index) => (
            <tr key={circle.circleName} className={`transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50/70'} hover:bg-amber-100/60`}>
              <td className="px-6 py-4 text-sm font-medium text-stone-900 text-center">{circle.circleName}</td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{circle.teacherName}</td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{circle.supervisorName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                <div className='flex flex-col gap-1 items-center'>
                  <span>{circle.totalMemorizationAchieved.toFixed(1)}</span>
                  <div className="w-full">
                    <ProgressBar value={circle.avgMemorizationIndex} />
                    <p className="text-xs text-center text-gray-600 mt-1">{(circle.avgMemorizationIndex * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                <div className='flex flex-col gap-1 items-center'>
                  <span>{circle.totalReviewAchieved.toFixed(1)}</span>
                  <div className="w-full">
                    <ProgressBar value={circle.avgReviewIndex} />
                    <p className="text-xs text-center text-gray-600 mt-1">{(circle.avgReviewIndex * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                <div className='flex flex-col gap-1 items-center'>
                  <span>{circle.totalConsolidationAchieved.toFixed(1)}</span>
                  <div className="w-full">
                    <ProgressBar value={circle.avgConsolidationIndex} />
                    <p className="text-xs text-center text-gray-600 mt-1">{(circle.avgConsolidationIndex * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">
                <div className='w-24 mx-auto'>
                  <ProgressBar value={circle.avgAttendance} />
                  <p className="text-xs text-center text-gray-600 mt-1">{(circle.avgAttendance * 100).toFixed(0)}%</p>
                </div>
              </td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-800 text-center">{circle.totalPoints}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-stone-200 font-bold text-stone-800">
            <tr>
                <td className="px-6 py-4 text-center">الإجمالي</td>
                <td className="hidden md:table-cell px-6 py-4"></td>
                <td className="hidden md:table-cell px-6 py-4"></td>
                <SummaryAchievementCell achieved={summary.totalMemorizationAchieved} required={summary.totalMemorizationRequired} />
                <SummaryAchievementCell achieved={summary.totalReviewAchieved} required={summary.totalReviewRequired} />
                <SummaryAchievementCell achieved={summary.totalConsolidationAchieved} required={summary.totalConsolidationRequired} />
                <td className="px-6 py-4 text-center">
                  <div className='w-24 mx-auto'>
                      <ProgressBar value={summary.avgAttendance} />
                      <p className="text-xs text-center text-gray-700 mt-1 font-bold">{(summary.avgAttendance * 100).toFixed(0)}%</p>
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4 text-center">{summary.totalPoints}</td>
            </tr>
        </tfoot>
      </table>
    </div>
  );
};
