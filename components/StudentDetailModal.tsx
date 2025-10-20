import React from 'react';
import type { ProcessedStudentData } from '../types';
import { ProgressBar } from './ProgressBar';


interface StudentDetailModalProps {
  student: ProcessedStudentData;
  onClose: () => void;
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between items-center py-3 border-b border-stone-200">
    <dt className="text-sm font-medium text-stone-500">{label}</dt>
    <dd className="text-sm text-stone-900 text-left">{children}</dd>
  </div>
);

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-stone-900 bg-opacity-70 z-50 flex justify-center items-start p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="bg-stone-50 rounded-2xl shadow-2xl w-full max-w-lg mx-auto transform transition-all animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-stone-800">{student.studentName}</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <dl className="space-y-1">
            <DetailRow label="اسم المستخدم">{student.username}</DetailRow>
            <DetailRow label="الحلقة">{student.circle}</DetailRow>
            <DetailRow label="وقت الحلقة">{student.circleTime}</DetailRow>
            <DetailRow label="اسم المعلم">{student.teacherName}</DetailRow>
            <DetailRow label="البرنامج">{student.program}</DetailRow>
            <DetailRow label="إجمالي النقاط">{student.totalPoints}</DetailRow>
            <DetailRow label="دروس الحفظ">{student.memorizationLessons}</DetailRow>
            <DetailRow label="أوجه الحفظ">{student.memorizationPages.formatted}</DetailRow>
            <DetailRow label="مؤشر إنجاز الحفظ">
                <div className="w-40">
                    <ProgressBar value={student.memorizationPages.index} />
                </div>
            </DetailRow>
             <DetailRow label="دروس المراجعة">{student.reviewLessons}</DetailRow>
            <DetailRow label="أوجه المراجعة">{student.reviewPages.formatted}</DetailRow>
            <DetailRow label="مؤشر إنجاز المراجعة">
                <div className="w-40">
                    <ProgressBar value={student.reviewPages.index} />
                </div>
            </DetailRow>
            <DetailRow label="أوجه التثبيت">{student.consolidationPages.formatted}</DetailRow>
            <DetailRow label="مؤشر إنجاز التثبيت">
                <div className="w-40">
                    <ProgressBar value={student.consolidationPages.index} />
                </div>
            </DetailRow>
            <DetailRow label="نسبة الحضور">
                <div className="w-40 flex items-center gap-2">
                    <ProgressBar value={student.attendance} />
                    <span>{(student.attendance * 100).toFixed(0)}%</span>
                </div>
            </DetailRow>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal;