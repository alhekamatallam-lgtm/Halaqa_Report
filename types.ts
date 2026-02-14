
export interface RawStudentData {
  "الطالب": string;
  "اسم المستخدم": number;
  "الحلقة": string;
  "وقت الحلقة": string;
  "دروس الحفظ": string;
  "أوجه الحفظ": string;
  "دروس المراجعة": string;
  "أوجه المراجه": string;
  "أوجه التثبيت": string;
  "اسم المعلم": string;
  "البرنامج": string;
  "نسبة الحضور": number;
  "اجمالي النقاط": number;
  "جوال ولي الأمر": string;
  "نسبة إنجاز خطة الحفظ"?: string | number;
  "نسبة إنجاز خطة التثبيت"?: string | number;
  "نسبة إنجاز خطة المراجعة"?: string | number;
  "الأسبوع"?: string;
  "الاسبوع"?: string;
  "اليوم"?: string;
}

export interface Achievement {
  achieved: number;
  required: number;
  formatted: string;
  index: number;
}

export interface ProcessedStudentData {
  id: string;
  studentName: string;
  username: number;
  circle: string;
  circleTime: string;
  memorizationLessons: string;
  memorizationPages: Achievement;
  reviewLessons: string;
  reviewPages: Achievement;
  consolidationPages: Achievement;
  teacherName: string;
  program: string;
  attendance: number;
  totalPoints: number;
  guardianMobile: string;
  week?: string;
  day?: string;
  hasMultipleEntries?: boolean;
}

export interface CircleReportData {
  circleName: string;
  teacherName: string;
  supervisorName: string;
  studentCount: number;
  totalMemorizationAchieved: number;
  totalMemorizationRequired: number;
  avgMemorizationIndex: number;
  totalReviewAchieved: number;
  totalReviewRequired: number;
  avgReviewIndex: number;
  totalConsolidationAchieved: number;
  totalConsolidationRequired: number;
  avgConsolidationIndex: number;
  avgGeneralIndex: number;
  avgAttendance: number;
  totalPoints: number;
}

export interface ExcellenceReportData extends CircleReportData {
    excellenceScore: number;
    rank: number;
}

export interface GeneralReportStats {
  totalCircles: number;
  totalStudents: number;
  totalMemorization: number;
  totalReview: number;
  totalConsolidation: number;
  totalAchievement: number;
  avgAttendance: number;
}

export interface CircleEvaluationData {
  circleName: string;
  discipline: number;
  memorization: number;
  review: number;
  consolidation: number;
  generalIndex: number;
  attendance: number;
  overall: number;
}

export interface EvaluationSubmissionData {
  'الحلقة': string;
  'انضباط الحلقة': number;
  'انجاز الحفظ': number;
  'انجاز المراجعة': number;
  'انجاز التثبيت': number;
  'نسبة الحضور': number;
  'المؤشر العام': number;
  'التقييم العام': number;
}

export interface EvalQuestion {
  id: number;
  que: string;
  mark: number;
  tip?: string; // التوضيح المضاف من قبل المستخدم
}

export interface EvalSubmissionPayload {
    sheet: 'Eval_result';
    'المعلم': string;
    'الحلقة': string;
    [question: string]: string | number;
}

export interface RawEvalResult {
    'المعلم': string;
    'الحلقة': string;
    [question: string]: string | number;
}

export interface ProcessedEvalResult {
    id: string;
    teacherName: string;
    circleName: string;
    totalScore: number;
    maxScore: number;
    scores: {
        question: string;
        score: number;
        maxMark: number;
    }[];
}

export interface ExamSubmissionData {
    "الطالب": string;
    "الحلقة": string;
    "الاختبار  ": string;
    "السؤال الاول": number;
    "السؤال الثاني": number;
    "السؤال الثالث": number;
    "السؤال الرابع": number;
    "السؤال الخامس": number;
    "إجمالي الدرجة": number;
}

export interface RawExamData {
    "الطالب": string;
    "الحلقة": string;
    "الاختبار  ": string;
    "السؤال الاول": number | string;
    "السؤال الثاني": number | string;
    "السؤال الثالث": number | string;
    "السؤال الرابع": number | string;
    "السؤال الخامس": number | string;
    "إجمالي الدرجة": number | string;
}

export interface ProcessedExamData {
    studentName: string;
    circle: string;
    examName: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    q5: number;
    totalScore: number;
}

export interface RawSupervisorData {
  "id": string;
  "الحلقة": string;
  "المشرف": string;
  "كلمة المرور": string;
}

export interface SupervisorData {
  id: string;
  supervisorName: string;
  password: string;
  circles: string[];
}

export interface SupervisorInfo {
  id: string;
  name: string;
}

export interface RawTeacherAttendanceData {
  "teacher_id": number;
  "name": string;
  "status": string;
  "تاريخ العملية": string;
  "وقت العملية": string;
}

export interface TeacherInfo {
  id: number;
  name: string;
  circle: string;
  circleTime: string;
}

export interface RawTeacherInfo {
  "teacher_id": number;
  "المعلم": string;
  "الحلقات": string;
  "وقت الحلقة": string;
}

export interface TeacherDailyAttendance {
  teacherName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور';
  notes?: string;
}

export interface TeacherAttendanceSummaryEntry {
  teacherId: number;
  teacherName: string;
  presentDays: number;
  attendanceRate: number;
}

export interface RawSupervisorAttendanceData {
  "id": string;
  "name": string;
  "status": string;
  "تاريخ العملية": string;
  "وقت العملية": string;
}

export interface SupervisorAttendanceReportEntry {
  supervisorId: string;
  supervisorName: string;
  circle: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'حاضر';
}

export interface SupervisorAttendanceSummaryEntry {
  supervisorId: string;
  supervisorName: string;
  presentDays: number;
  attendanceRate: number;
}

export interface SupervisorDailyAttendance {
  supervisorName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور';
}

export interface RawRegisteredStudentData {
  "الطالب": string;
  "الحلقة": string;
}

export interface ProcessedRegisteredStudentData {
  studentName: string;
  circle: string;
}

export interface RawSettingData {
  "الرقم": number;
  "اليوم الافتراضي": string;
  "وقت تأخر حضور المعلمين": string;
  "وقت انصراف مبكر للمعلمين": string;
  "وقت تأخر حضور المشرفين"?: string;
  "وقت انصراف مبكر للمشرفين"?: string;
  "متوسط الحضور"?: number | string;
}

export type ProcessedSettingsData = Record<string, string>;

export interface RawProductorData {
  "role": string;
  "name": string;
  "pwd": string | number;
}

export interface ProductorData {
  role: string;
  name: string;
  password: string;
}

export interface CombinedTeacherAttendanceEntry {
  id: string;
  teacherId: number;
  teacherName: string;
  circles: string;
  circleTime: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'حاضر';
}

export type AuthenticatedUser = {
    role: 'admin' | 'supervisor' | 'exam_teacher' | 'teacher';
    name: string;
    circles: string[];
    teacherId?: number;
    supervisorId?: string;
};
