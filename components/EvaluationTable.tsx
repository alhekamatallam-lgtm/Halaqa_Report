

import React from 'react';
import type { ProcessedEvalResult } from '../types';
import { ProgressBar } from './ProgressBar';

interface EvaluationTableProps {
  evaluations: ProcessedEvalResult[];
}

const EvaluationTable: React.FC<EvaluationTableProps> = ({ evaluations }) => {
  const renderCellWithProgress = (value: number) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 min-w-[150px] text-center">
      <div className='w-24 mx-auto'>
        <ProgressBar value={value} />
        <p className="text-xs text-center text-gray-600 mt-1">{(value * 100).toFixed(0)}%</p>
      </div>
    </td>
  );

  return (
    <div className="overflow-x-auto shadow-lg rounded-xl border border-stone-200">
      <table className="min-w-full divide-y divide-stone-200">
        <thead className="bg-stone-200 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">الحلقة</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">انضباط الحلقة</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">إنجاز الحفظ</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">إنجاز المراجعة</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">إنجاز التثبيت</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">المؤشر العام</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">نسبة الحضور</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">التقييم العام</th>
          </tr>
        </thead>
        <tbody className="bg-stone-50 divide-y divide-stone-200">
          {evaluations.length > 0 ? (
            evaluations.map((item) => (
              <tr key={item.id} className="hover:bg-amber-100/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-900 text-center">{item.circleName}</td>
                {renderCellWithProgress(item.scores.find(s => s.question === 'انضباط الحلقة')?.score || 0)}
                {renderCellWithProgress(item.scores.find(s => s.question === 'إنجاز الحفظ')?.score || 0)}
                {renderCellWithProgress(item.scores.find(s => s.question === 'إنجاز المراجعة')?.score || 0)}
                {renderCellWithProgress(item.scores.find(s => s.question === 'إنجاز التثبيت')?.score || 0)}
                {renderCellWithProgress(item.scores.find(s => s.question === 'المؤشر العام')?.score || 0)}
                {renderCellWithProgress(item.scores.find(s => s.question === 'نسبة الحضور')?.score || 0)}
                {renderCellWithProgress(item.totalScore / item.maxScore)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="px-6 py-12 text-center text-stone-500">
                لا توجد حلقات تم تقييمها لعرضها.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EvaluationTable;