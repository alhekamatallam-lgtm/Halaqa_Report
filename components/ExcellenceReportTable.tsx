import React from 'react';
import type { ExcellenceReportData } from '../types';
import { ProgressBar } from './ProgressBar';

interface ExcellenceReportTableProps {
  circles: ExcellenceReportData[];
}

const ExcellenceReportTable: React.FC<ExcellenceReportTableProps> = ({ circles }) => {

    const getRowClass = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-amber-100/60';
            case 2:
                return 'bg-stone-200/60';
            case 3:
                return 'bg-orange-200/50';
            default:
                return 'hover:bg-amber-100/50';
        }
    };

  return (
    <div className="overflow-x-auto shadow-xl rounded-xl border border-stone-200 bg-white">
      <table className="min-w-full divide-y divide-stone-200">
        <thead className="bg-stone-200 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">الترتيب</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">الحلقة</th>
            <th scope="col" className="hidden md:table-cell px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">المعلم</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">مؤشر الحفظ</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">نسبة الحضور</th>
            <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-stone-700 uppercase tracking-wider">مؤشر التميز</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-stone-200">
          {circles.map((circle) => (
            <tr key={circle.circleName} className={`${getRowClass(circle.rank)} transition-colors`}>
              <td className="px-6 py-4 text-sm font-bold text-stone-900 text-center">{circle.rank}</td>
              <td className="px-6 py-4 text-sm font-medium text-stone-900 text-center">{circle.circleName}</td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-center">{circle.teacherName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                <div className='flex flex-col gap-1 items-center'>
                  <div className="w-full">
                    <ProgressBar value={circle.avgMemorizationIndex} />
                    <p className="text-xs text-center text-gray-600 mt-1">{(circle.avgMemorizationIndex * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                <div className='w-24 mx-auto'>
                  <ProgressBar value={circle.avgAttendance} />
                  <p className="text-xs text-center text-gray-600 mt-1">{(circle.avgAttendance * 100).toFixed(0)}%</p>
                </div>
              </td>
               <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
                <div className='flex flex-col gap-1 items-center font-semibold'>
                  <div className="w-full">
                    <ProgressBar value={circle.excellenceScore} />
                    <p className="text-xs text-center text-gray-700 mt-1">{(circle.excellenceScore * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExcellenceReportTable;