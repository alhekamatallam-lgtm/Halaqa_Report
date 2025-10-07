import React from 'react';
import type { CircleReportData } from '../types';
import { ProgressBar } from './ProgressBar';

interface CircleReportTableProps {
  circles: CircleReportData[];
}

export const CircleReportTable: React.FC<CircleReportTableProps> = ({ circles }) => {
  return (
    <div className="overflow-x-auto shadow-lg rounded-xl border border-stone-200">
      <table className="min-w-full divide-y divide-stone-200">
        <thead className="bg-stone-200">
          <tr>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">الحلقة</th>
            <th scope="col" className="hidden md:table-cell px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">المعلم</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">أوجه الحفظ / المؤشر</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">أوجه المراجعة / المؤشر</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">أوجه التثبيت / المؤشر</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">نسبة الحضور</th>
            <th scope="col" className="hidden md:table-cell px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">إجمالي النقاط</th>
          </tr>
        </thead>
        <tbody className="bg-stone-50 divide-y divide-stone-200">
          {circles.map((circle) => (
            <tr key={circle.circleName} className="hover:bg-amber-100/50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-stone-900 text-center">{circle.circleName}</td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{circle.teacherName}</td>
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
      </table>
    </div>
  );
};