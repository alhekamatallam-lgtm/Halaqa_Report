import React, { useState, useMemo, useEffect } from 'react';
import type { EvaluationSubmissionData, ProcessedStudentData, CircleEvaluationData } from '../types';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EvaluationSubmissionData) => Promise<void>;
  isSubmitting: boolean;
  students: ProcessedStudentData[];
  evaluationData: CircleEvaluationData[];
}

const EvaluationModal: React.FC<EvaluationModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, students, evaluationData }) => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [memorization, setMemorization] = useState('');
  const [review, setReview] = useState('');
  const [consolidation, setConsolidation] = useState('');
  const [attendance, setAttendance] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        setSelectedTeacher('');
        setSelectedCircle('');
        setDiscipline('');
        setMemorization('');
        setReview('');
        setConsolidation('');
        setAttendance('');
        setError(null);
    }
  }, [isOpen]);

  const teachers = useMemo(() => {
    // FIX: Explicitly type the Set to string to help with type inference.
    const teacherSet = new Set<string>(students.map(s => s.teacherName).filter(item => item));
    return Array.from(teacherSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const availableCircles = useMemo(() => {
    if (!selectedTeacher) return [];
    
    // FIX: Explicitly type the Set to string to help with type inference.
    const circleSet = new Set<string>(
        students
            .filter(s => s.teacherName === selectedTeacher)
            .map(s => s.circle)
            .filter(item => item)
    );
    
    return Array.from(circleSet).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students, selectedTeacher]);

  useEffect(() => {
    setSelectedCircle('');
  }, [selectedTeacher]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircle.trim()) {
      setError('الرجاء اختيار حلقة.');
      return;
    }
    const disciplineVal = parseFloat(discipline);
    const memorizationVal = parseFloat(memorization);
    const reviewVal = parseFloat(review);
    const consolidationVal = parseFloat(consolidation);
    const attendanceVal = parseFloat(attendance);

    if (isNaN(disciplineVal) || isNaN(memorizationVal) || isNaN(reviewVal) || isNaN(consolidationVal) || isNaN(attendanceVal)) {
      setError('الرجاء إدخال قيم رقمية صحيحة لجميع الحقول.');
      return;
    }

    if ([disciplineVal, memorizationVal, reviewVal, consolidationVal, attendanceVal].some(v => v < 0 || v > 100)) {
        setError('يجب أن تكون القيم بين 0 و 100.');
        return;
    }

    setError(null);

    const generalIndex = (disciplineVal + memorizationVal + reviewVal + consolidationVal) / 4;
    const overallEvaluation = (generalIndex + attendanceVal) / 2;

    const submissionData: EvaluationSubmissionData = {
      'الحلقة': selectedCircle.trim(),
      'انضباط الحلقة': disciplineVal,
      'انجاز الحفظ': memorizationVal,
      'انجاز المراجعة': reviewVal,
      'انجاز التثبيت': consolidationVal,
      'نسبة الحضور': attendanceVal,
      'المؤشر العام': generalIndex,
      'التقييم العام': overallEvaluation,
    };

    onSubmit(submissionData);
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900 bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-50 rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-8 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-stone-800 text-center mb-6">إضافة تقييم جديد للحلقة</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="teacher-select" className="block text-sm font-medium text-stone-700 mb-2">المعلم</label>
              <select
                id="teacher-select"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="block w-full px-3 py-2 text-base border border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
              >
                <option value="">-- اختر المعلم --</option>
                {teachers.map(teacher => (
                  <option key={teacher} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="circle-select" className="block text-sm font-medium text-stone-700 mb-2">الحلقة</label>
              <select
                id="circle-select"
                value={selectedCircle}
                onChange={(e) => setSelectedCircle(e.target.value)}
                className="block w-full px-3 py-2 text-base border border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:bg-stone-100"
                disabled={!selectedTeacher || availableCircles.length === 0}
              >
                <option value="">-- اختر الحلقة --</option>
                {availableCircles.map(circle => (
                  <option key={circle} value={circle}>{circle}</option>
                ))}
              </select>
            </div>

            <hr className="my-4 border-t-2 border-stone-100" />

            {[
              {label: 'انضباط الحلقة', value: discipline, setter: setDiscipline},
              {label: 'انجاز الحفظ', value: memorization, setter: setMemorization},
              {label: 'انجاز المراجعة', value: review, setter: setReview},
              {label: 'انجاز التثبيت', value: consolidation, setter: setConsolidation},
              {label: 'نسبة الحضور', value: attendance, setter: setAttendance},
            ].map(({label, value, setter}) => (
                <div key={label}>
                    <label htmlFor={label} className="block text-sm font-medium text-stone-700 mb-2">{label} (%)</label>
                    <input
                        id={label}
                        type="number"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="block w-full px-3 py-2 text-base border border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        placeholder="أدخل قيمة بين 0 و 100"
                        min="0"
                        max="100"
                    />
                </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
          
          <div className="mt-8 flex justify-between gap-4">
             <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full h-10 px-4 text-sm font-semibold text-stone-700 bg-stone-200 rounded-md shadow-sm hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-all duration-150 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 px-4 text-sm font-semibold text-stone-900 bg-amber-500 rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-150 disabled:bg-amber-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EvaluationModal;
