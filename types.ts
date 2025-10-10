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
  "الأسبوع"?: string;
  "الاسبوع"?: string;
}

export interface Achievement {
  achieved: number;
  required: number;
  formatted: string;
  index: number;
}

export interface ProcessedStudentData {
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
  hasMultipleEntries?: boolean;
}

export interface CircleReportData {
  circleName: string;
  teacherName: string;
  supervisorName: string;
  studentCount: number;
  totalMemorizationAchieved: number;
  avgMemorizationIndex: number;
  totalReviewAchieved: number;
  avgReviewIndex: number;
  totalConsolidationAchieved: number;
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

export interface RawCircleEvaluationData {
  "الحلقة": string;
  "انضباط الحلقة": number;
  "انجاز الحفظ": number;
  "انجاز المراجعة": number;
  "انجاز التثبيت": number;
  "المؤشر العام": number;
  "نسبة الحضور": number;
  "التقييم العام": number;
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
  "الحلقة": string;
  "انضباط الحلقة": number;
  "انجاز الحفظ": number;
  "انجاز المراجعة": number;
  "انجاز التثبيت": number;
  "نسبة الحضور": number;
  "المؤشر العام": number;
  "التقييم العام": number;
}

export interface RawSupervisorData {
  "الحلقة": string;
  "المشرف": string;
  "كلمة المرور": string;
}

export interface SupervisorData {
  supervisorName: string;
  password: string;
  circles: string[];
}

export interface RawTeacherAttendanceData {
  "time": string;
  "name": string;
  "status": 'حضور' | 'انصراف';
}

export interface TeacherInfo {
  name: string;
  circle: string;
}

export interface TeacherDailyAttendance {
  teacherName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور';
}

export interface TeacherAttendanceReportEntry {
  teacherName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
}

export interface TeacherAttendanceSummaryEntry {
  teacherName: string;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}