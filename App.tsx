import React, { useState, useEffect, useMemo } from 'react';
import StudentReportPage from './pages/StudentReportPage';
import CircleReportPage from './pages/CircleReportPage';
import GeneralReportPage from './pages/GeneralReportPage';
import DashboardPage from './pages/DashboardPage';
import DailyDashboardPage from './pages/DailyDashboardPage';
import NotesPage from './pages/NotesPage';
import EvaluationPage from './pages/EvaluationPage';
import ExcellencePage from './pages/ExcellencePage';
import TeacherAttendancePage from './pages/TeacherAttendancePage';
import TeacherAttendanceReportPage from './pages/TeacherAttendanceReportPage';
import SupervisorAttendancePage from './pages/SupervisorAttendancePage';
import SupervisorAttendanceReportPage from './pages/SupervisorAttendanceReportPage';
import DailyStudentReportPage from './pages/DailyStudentReportPage';
import DailyCircleReportPage from './pages/DailyCircleReportPage';
import ExamPage from './pages/ExamPage';
import ExamReportPage from './pages/ExamReportPage';
import PasswordModal from './components/PasswordModal';
import { Sidebar } from './components/Sidebar';
import Notification from './components/Notification';
import type { RawStudentData, ProcessedStudentData, Achievement, RawCircleEvaluationData, CircleEvaluationData, EvaluationSubmissionData, ExamSubmissionData, RawSupervisorData, SupervisorData, RawTeacherAttendanceData, TeacherDailyAttendance, TeacherAttendanceReportEntry, TeacherInfo, RawSupervisorAttendanceData, SupervisorAttendanceReportEntry, SupervisorDailyAttendance, SupervisorInfo, RawExamData, ProcessedExamData, RawRegisteredStudentData, ProcessedRegisteredStudentData } from './types';

const API_URL = 'https://script.google.com/macros/s/AKfycbzAgG5Md-g7TInRO-qFkjHq8PBGx3t3I8gGOa7vb5II-PSmapsg9yoREYArpqkkOeKt/exec';
const LOGO_URL = 'https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png';

const parseAchievement = (value: any): Achievement => {
  const strValue = String(value || '');
  if (!strValue || !strValue.includes('%')) {
    return { achieved: 0, required: 0, formatted: '0 / 0', index: 0 };
  }
  const parts = strValue.split('%');
  const achieved = parseFloat(parts[0]) || 0;
  const required = parseFloat(parts[1]) || 0;
  return {
    achieved,
    required,
    formatted: `${achieved} / ${required}`,
    index: required > 0 ? achieved / required : 0,
  };
};

const parsePercentage = (value: any): number => {
    if (typeof value === 'number') {
        return value > 1 ? value / 100 : value;
    }

    const strValue = String(value || '0').trim();
    if (strValue.endsWith('%')) {
        return (parseFloat(strValue.slice(0, -1)) || 0) / 100;
    }
    
    const numValue = parseFloat(strValue);
    if (isNaN(numValue)) return 0;

    return numValue > 1 ? numValue / 100 : numValue;
};


const processEvaluationData = (data: RawCircleEvaluationData[]): CircleEvaluationData[] => {
    return data.map(item => {
        const circleName = String(item["الحلقة"] || '').trim();
        if (!circleName) {
            return null;
        }

        return {
            circleName,
            discipline: parsePercentage(item["انضباط الحلقة"]),
            memorization: parsePercentage(item["انجاز الحفظ"]),
            review: parsePercentage(item["انجاز المراجعة"]),
            consolidation: parsePercentage(item["انجاز التثبيت"]),
            attendance: parsePercentage(item["نسبة الحضور"]),
            generalIndex: parsePercentage(item["المؤشر العام"]),
            overall: parsePercentage(item["التقييم العام"]),
        };
    })
    .filter((item): item is CircleEvaluationData => item !== null);
};

const processSupervisorData = (data: RawSupervisorData[]): SupervisorData[] => {
    const supervisorMap = new Map<string, { password: string; circles: string[] }>();
    data.forEach(item => {
        const supervisorName = (item['المشرف'] || '').trim();
        const password = (item['كلمة المرور'] || '').trim();
        const circle = (item['الحلقة'] || '').trim();

        if (supervisorName && password) {
            if (!supervisorMap.has(supervisorName)) {
                supervisorMap.set(supervisorName, { password, circles: [] });
            }
            
            const supervisorEntry = supervisorMap.get(supervisorName)!;
            if (circle && !supervisorEntry.circles.includes(circle)) {
                supervisorEntry.circles.push(circle);
            }
        }
    });

    return Array.from(supervisorMap.entries()).map(([supervisorName, data]) => ({
        supervisorName,
        ...data
    }));
};

const processTeacherAttendanceData = (data: RawTeacherAttendanceData[], allTeacherNames: string[]): TeacherDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadh = new Date(new Date().toLocaleString('en-US', { timeZone }));
    todayRiyadh.setHours(0, 0, 0, 0);

    const teacherRecords = new Map<string, { checkIn: Date | null, checkOut: Date | null }>();

    allTeacherNames.forEach(name => {
        teacherRecords.set(name, { checkIn: null, checkOut: null });
    });

    data.forEach(item => {
        const timestamp = new Date(item['time']);
        const itemDateRiyadh = new Date(timestamp.toLocaleString('en-US', { timeZone }));
        itemDateRiyadh.setHours(0, 0, 0, 0);
        
        const teacherName = (item['name'] || '').trim();
        const status = (item.status || '').trim();

        if (itemDateRiyadh.getTime() === todayRiyadh.getTime() && teacherRecords.has(teacherName)) {
            const record = teacherRecords.get(teacherName)!;

            if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
                if (!record.checkIn || timestamp < record.checkIn) {
                    record.checkIn = timestamp;
                }
            } else if (status === 'انصراف') {
                if (!record.checkOut || timestamp > record.checkOut) {
                    record.checkOut = timestamp;
                }
            }
        }
    });

    return Array.from(teacherRecords.entries()).map(([teacherName, times]) => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (times.checkIn && times.checkOut) {
            status = 'مكتمل الحضور';
        } else if (times.checkIn) {
            status = 'حاضر';
        }
        
        return {
            teacherName,
            checkIn: times.checkIn,
            checkOut: times.checkOut,
            status,
        };
    });
};

const processSupervisorAttendanceData = (data: RawSupervisorAttendanceData[], allSupervisorNames: string[]): SupervisorDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadh = new Date(new Date().toLocaleString('en-US', { timeZone }));
    todayRiyadh.setHours(0, 0, 0, 0);

    const supervisorRecords = new Map<string, { checkIn: Date | null, checkOut: Date | null }>();

    allSupervisorNames.forEach(name => {
        supervisorRecords.set(name, { checkIn: null, checkOut: null });
    });

    data.forEach(item => {
        const timestamp = new Date(item['time']);
        if (isNaN(timestamp.getTime())) return;

        const itemDateRiyadh = new Date(timestamp.toLocaleString('en-US', { timeZone }));
        itemDateRiyadh.setHours(0, 0, 0, 0);
        
        const supervisorName = (item['name'] || '').trim();
        const status = (item.status || '').trim();

        if (itemDateRiyadh.getTime() === todayRiyadh.getTime() && supervisorRecords.has(supervisorName)) {
            const record = supervisorRecords.get(supervisorName)!;

            if (status === 'حضور' || status === 'الحضور') {
                if (!record.checkIn || timestamp < record.checkIn) {
                    record.checkIn = timestamp;
                }
            } else if (status === 'انصراف') {
                 if (!record.checkOut || timestamp > record.checkOut) {
                    record.checkOut = timestamp;
                }
            }
        }
    });

    return Array.from(supervisorRecords.entries()).map(([supervisorName, times]) => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (times.checkIn && times.checkOut) {
            status = 'مكتمل الحضور';
        } else if (times.checkIn) {
            status = 'حاضر';
        }
        
        return {
            supervisorName,
            checkIn: times.checkIn,
            checkOut: times.checkOut,
            status,
        };
    });
};

const processTeacherAttendanceReportData = (data: RawTeacherAttendanceData[], allTeachers: string[]): TeacherAttendanceReportEntry[] => {
    const timeZone = 'Asia/Riyadh';
    
    const toRiyadhDateString = (date: Date): string => {
        const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
    };

    const timeFormatOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone,
    };
    
    const dailyRecords = new Map<string, { teacherName: string; date: string; checkIn: Date | null; checkOut: Date | null }>();

    data.forEach(item => {
        const timestamp = new Date(item.time);
        if (isNaN(timestamp.getTime())) return;
        
        const teacherName = (item.name || '').trim();
        const status = (item.status || '').trim();
        if (!teacherName) return;

        const dateString = toRiyadhDateString(timestamp);
        const mapKey = `${dateString}/${teacherName}`;

        let entry = dailyRecords.get(mapKey);
        if (!entry) {
            entry = { teacherName, date: dateString, checkIn: null, checkOut: null };
            dailyRecords.set(mapKey, entry);
        }
        
        if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
            if (!entry.checkIn || timestamp < entry.checkIn) {
                entry.checkIn = timestamp;
            }
        } else if (status === 'انصراف') {
            if (!entry.checkOut || timestamp > entry.checkOut) {
                entry.checkOut = timestamp;
            }
        }
    });

    if (data.length > 0 || allTeachers.length > 0) {
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        data.forEach(item => {
            const timestamp = new Date(item.time);
            if (isNaN(timestamp.getTime())) return;
            if (!minDate || timestamp < minDate) minDate = timestamp;
            if (!maxDate || timestamp > maxDate) maxDate = timestamp;
        });

        const today = new Date();
        if (!maxDate || today > maxDate) {
            maxDate = today;
        }
        if (minDate && maxDate) {
            const workingDays = [0, 1, 2, 3]; // Sunday to Wednesday
            let currentDate = new Date(minDate);
            currentDate.setHours(0, 0, 0, 0);

            while (currentDate <= maxDate) {
                if (workingDays.includes(currentDate.getDay())) {
                    const dateString = toRiyadhDateString(currentDate);
                    allTeachers.forEach(teacherName => {
                        const mapKey = `${dateString}/${teacherName}`;
                        if (!dailyRecords.has(mapKey)) {
                            dailyRecords.set(mapKey, {
                                teacherName,
                                date: dateString,
                                checkIn: null,
                                checkOut: null,
                            });
                        }
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    }

    const report: TeacherAttendanceReportEntry[] = Array.from(dailyRecords.values()).map(record => ({
        teacherName: record.teacherName,
        date: record.date,
        checkInTime: record.checkIn ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(record.checkIn) : null,
        checkOutTime: record.checkOut ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(record.checkOut) : null,
    }));

    return report.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return a.teacherName.localeCompare(b.teacherName, 'ar');
    });
};

const processSupervisorAttendanceReportData = (data: RawSupervisorAttendanceData[], allSupervisors: string[]): SupervisorAttendanceReportEntry[] => {
    const timeZone = 'Asia/Riyadh';
    
    const toRiyadhDateString = (date: Date): string => {
        const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
    };

    const timeFormatOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone,
    };
    
    const dailyRecords = new Map<string, { supervisorName: string; date: string; checkIn: Date | null; checkOut: Date | null }>();

    data.forEach(item => {
        const timestamp = new Date(item.time);
        if (isNaN(timestamp.getTime())) return;
        
        const supervisorName = (item.name || '').trim();
        const status = (item.status || '').trim();
        if (!supervisorName) return;

        const dateString = toRiyadhDateString(timestamp);
        const mapKey = `${dateString}/${supervisorName}`;

        let entry = dailyRecords.get(mapKey);
        if (!entry) {
            entry = { supervisorName, date: dateString, checkIn: null, checkOut: null };
            dailyRecords.set(mapKey, entry);
        }
        
        if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
            if (!entry.checkIn || timestamp < entry.checkIn) {
                entry.checkIn = timestamp;
            }
        } else if (status === 'انصراف') {
            if (!entry.checkOut || timestamp > entry.checkOut) {
                entry.checkOut = timestamp;
            }
        }
    });

    if (data.length > 0 || allSupervisors.length > 0) {
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        data.forEach(item => {
            const timestamp = new Date(item.time);
            if (isNaN(timestamp.getTime())) return;
            if (!minDate || timestamp < minDate) minDate = timestamp;
            if (!maxDate || timestamp > maxDate) maxDate = timestamp;
        });

        const today = new Date();
        if (!maxDate || today > maxDate) {
            maxDate = today;
        }
        if (minDate && maxDate) {
            const workingDays = [0, 1, 2, 3]; // Sunday to Wednesday
            let currentDate = new Date(minDate);
            currentDate.setHours(0, 0, 0, 0);

            while (currentDate <= maxDate) {
                if (workingDays.includes(currentDate.getDay())) {
                    const dateString = toRiyadhDateString(currentDate);
                    allSupervisors.forEach(supervisorName => {
                        const mapKey = `${dateString}/${supervisorName}`;
                        if (!dailyRecords.has(mapKey)) {
                            dailyRecords.set(mapKey, {
                                supervisorName,
                                date: dateString,
                                checkIn: null,
                                checkOut: null,
                            });
                        }
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    }

    const report: SupervisorAttendanceReportEntry[] = Array.from(dailyRecords.values()).map(record => ({
        supervisorName: record.supervisorName,
        date: record.date,
        checkInTime: record.checkIn ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(record.checkIn) : null,
        checkOutTime: record.checkOut ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(record.checkOut) : null,
    }));

    return report.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return a.supervisorName.localeCompare(b.supervisorName, 'ar');
    });
};


const processData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const studentWeekMap = new Map<string, ProcessedStudentData>();
    let lastKey: string | null = null;

    const normalize = (val: any): string => {
        const str = String(val || '');
        return str
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    };

    for (const item of data) {
        const username = item["اسم المستخدم"];
        const studentName = normalize(item["الطالب"]);
        const week = normalize(item["الأسبوع"] || item["الاسبوع"]);

        let currentKey: string | null = null;
        
        if (username && studentName && week) {
            currentKey = `${username}-${week}`;
            lastKey = currentKey;
        } else {
            currentKey = lastKey;
        }
        
        if (!currentKey) {
            continue;
        }

        const memPages = parseAchievement(item["أوجه الحفظ"]);
        const revPages = parseAchievement(item["أوجه المراجه"]);
        const conPages = parseAchievement(item["أوجه التثبيت"]);
        const points = item["اجمالي النقاط"] || 0;
        const attendance = parsePercentage(item["نسبة الحضور"]);
        const memLessons = normalize(item["دروس الحفظ"]);
        const revLessons = normalize(item["دروس المراجعة"]);

        if (studentWeekMap.has(currentKey)) {
            const existingStudent = studentWeekMap.get(currentKey)!;

            existingStudent.memorizationPages.achieved += memPages.achieved;
            existingStudent.memorizationPages.required += memPages.required;
            existingStudent.reviewPages.achieved += revPages.achieved;
            existingStudent.reviewPages.required += revPages.required;
            existingStudent.consolidationPages.achieved += conPages.achieved;
            existingStudent.consolidationPages.required += conPages.required;
            
            existingStudent.totalPoints += points;
            
            if (memLessons) {
                existingStudent.memorizationLessons = existingStudent.memorizationLessons
                    ? `${existingStudent.memorizationLessons}, ${memLessons}`
                    : memLessons;
            }
            if (revLessons) {
                existingStudent.reviewLessons = existingStudent.reviewLessons
                    ? `${existingStudent.reviewLessons}, ${revLessons}`
                    : revLessons;
            }
        } else {
            if (!studentName || !username || !week) continue;

            const circle = normalize(item["الحلقة"]);
            const isTabyan = circle.includes('التبيان');

            const finalMemPages = isTabyan ? { achieved: 0, required: memPages.required, formatted: '', index: 0 } : memPages;
            const finalRevPages = isTabyan ? { achieved: 0, required: revPages.required, formatted: '', index: 0 } : revPages;
            const finalConPages = isTabyan ? { achieved: 0, required: conPages.required, formatted: '', index: 0 } : conPages;

            const newStudent: ProcessedStudentData = {
                studentName,
                username,
                circle,
                circleTime: normalize(item["وقت الحلقة"]),
                memorizationLessons: memLessons,
                memorizationPages: finalMemPages,
                reviewLessons: revLessons,
                reviewPages: finalRevPages,
                consolidationPages: finalConPages,
                teacherName: normalize(item["اسم المعلم"]),
                program: normalize(item["البرنامج"]),
                attendance: attendance,
                totalPoints: points,
                guardianMobile: normalize(item["جوال ولي الأمر"]),
                week: week,
            };
            studentWeekMap.set(currentKey, newStudent);
        }
    }

    studentWeekMap.forEach(student => {
        student.memorizationPages.formatted = `${student.memorizationPages.achieved.toFixed(1)} / ${student.memorizationPages.required.toFixed(1)}`;
        student.memorizationPages.index = student.memorizationPages.required > 0 ? student.memorizationPages.achieved / student.memorizationPages.required : 0;
        
        student.reviewPages.formatted = `${student.reviewPages.achieved.toFixed(1)} / ${student.reviewPages.required.toFixed(1)}`;
        student.reviewPages.index = student.reviewPages.required > 0 ? student.reviewPages.achieved / student.reviewPages.required : 0;

        student.consolidationPages.formatted = `${student.consolidationPages.achieved.toFixed(1)} / ${student.consolidationPages.required.toFixed(1)}`;
        student.consolidationPages.index = student.consolidationPages.required > 0 ? student.consolidationPages.achieved / student.consolidationPages.required : 0;
    });

    return Array.from(studentWeekMap.values());
};

const processDailyData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const normalize = (val: any): string => {
        const str = String(val || '');
        return str
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    };

    return data.map((item): ProcessedStudentData | null => {
        const studentName = normalize(item["الطالب"]);
        const username = item["اسم المستخدم"];
        if (!studentName || !username) return null;
        
        const circle = normalize(item["الحلقة"]);
        const isTabyan = circle.includes('التبيان');

        const memPages = parseAchievement(item["أوجه الحفظ"]);
        const revPages = parseAchievement(item["أوجه المراجه"]);
        const conPages = parseAchievement(item["أوجه التثبيت"]);

        const finalMemPages = isTabyan ? { achieved: 0, required: memPages.required, formatted: '', index: 0 } : memPages;
        const finalRevPages = isTabyan ? { achieved: 0, required: revPages.required, formatted: '', index: 0 } : revPages;
        const finalConPages = isTabyan ? { achieved: 0, required: conPages.required, formatted: '', index: 0 } : conPages;
        
        finalMemPages.formatted = `${finalMemPages.achieved.toFixed(1)} / ${finalMemPages.required.toFixed(1)}`;
        finalMemPages.index = finalMemPages.required > 0 ? finalMemPages.achieved / finalMemPages.required : 0;
        
        finalRevPages.formatted = `${finalRevPages.achieved.toFixed(1)} / ${finalRevPages.required.toFixed(1)}`;
        finalRevPages.index = finalRevPages.required > 0 ? finalRevPages.achieved / finalRevPages.required : 0;
        
        finalConPages.formatted = `${finalConPages.achieved.toFixed(1)} / ${finalConPages.required.toFixed(1)}`;
        finalConPages.index = finalConPages.required > 0 ? finalConPages.achieved / finalConPages.required : 0;

        return {
            studentName,
            username,
            circle,
            circleTime: normalize(item["وقت الحلقة"]),
            memorizationLessons: normalize(item["دروس الحفظ"]),
            memorizationPages: finalMemPages,
            reviewLessons: normalize(item["دروس المراجعة"]),
            reviewPages: finalRevPages,
            consolidationPages: finalConPages,
            teacherName: normalize(item["اسم المعلم"]),
            program: normalize(item["البرنامج"]),
            attendance: parsePercentage(item["نسبة الحضور"]),
            totalPoints: item["اجمالي النقاط"] || 0,
            guardianMobile: normalize(item["جوال ولي الأمر"]),
            day: normalize(item["اليوم"]),
        };
    }).filter((item): item is ProcessedStudentData => item !== null);
};

const processExamData = (data: RawExamData[]): ProcessedExamData[] => {
    const normalize = (val: any): string => String(val || '').trim();
    const parseNum = (val: any): number => Number(val) || 0;

    return data.map(item => {
        const studentName = normalize(item["الطالب"]);
        if (!studentName) return null;

        return {
            studentName,
            circle: normalize(item["الحلقة"]),
            examName: normalize(item["الاختبار  "]),
            q1: parseNum(item["السؤال الاول"]),
            q2: parseNum(item["السؤال الثاني"]),
            q3: parseNum(item["السؤال الثالث"]),
            q4: parseNum(item["السؤال الرابع"]),
            q5: parseNum(item["السؤال الخامس"]),
            totalScore: parseNum(item["إجمالي الدرجة"]),
        };
    }).filter((item): item is ProcessedExamData => item !== null);
};

const processRegisteredStudentData = (data: RawRegisteredStudentData[]): ProcessedRegisteredStudentData[] => {
    const normalize = (val: any): string => String(val || '').trim();
    return data
        .map(item => {
            const studentName = normalize(item["الطالب"]);
            const circle = normalize(item["الحلقة"]);
            if (!studentName || !circle) return null;
            return { studentName, circle };
        })
        .filter((item): item is ProcessedRegisteredStudentData => item !== null);
};

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'teacherAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendance' | 'supervisorAttendanceReport' | 'exam' | 'examReport';
type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };

const App: React.FC = () => {
    const [students, setStudents] = useState<ProcessedStudentData[]>([]);
    const [dailyStudents, setDailyStudents] = useState<ProcessedStudentData[]>([]);
    const [evaluationData, setEvaluationData] = useState<CircleEvaluationData[]>([]);
    const [examData, setExamData] = useState<ProcessedExamData[]>([]);
    const [registeredStudents, setRegisteredStudents] = useState<ProcessedRegisteredStudentData[]>([]);
    const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<TeacherDailyAttendance[]>([]);
    const [teacherAttendanceReport, setTeacherAttendanceReport] = useState<TeacherAttendanceReportEntry[]>([]);
    const [supervisorAttendance, setSupervisorAttendance] = useState<SupervisorDailyAttendance[]>([]);
    const [supervisorAttendanceReport, setSupervisorAttendanceReport] = useState<SupervisorAttendanceReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingTeacher, setSubmittingTeacher] = useState<string | null>(null);
    const [submittingSupervisor, setSubmittingSupervisor] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('general');
    const [initialStudentFilter, setInitialStudentFilter] = useState<{ circle: string } | null>(null);
    const [initialDailyStudentFilter, setInitialDailyStudentFilter] = useState<{ circle: string } | null>(null);
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const asrTeachersInfo = useMemo(() => {
        const teacherInfoMap = new Map<string, TeacherInfo>();
        students
            .filter(s => s.circleTime === 'العصر' && s.teacherName && s.circle)
            .forEach(s => {
                if (!teacherInfoMap.has(s.teacherName)) {
                    teacherInfoMap.set(s.teacherName, { name: s.teacherName, circle: s.circle });
                }
            });
        return Array.from(teacherInfoMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students]);

    const asrTeacherNames = useMemo(() => asrTeachersInfo.map(t => t.name), [asrTeachersInfo]);


    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const cacheBuster = `&v=${new Date().getTime()}`;
            try {
                const allDataResponse = await fetch(`${API_URL}?${cacheBuster.substring(1)}`);
                if (!allDataResponse.ok) throw new Error(`خطأ في الشبكة: ${allDataResponse.statusText}`);
                const allDataJson = await allDataResponse.json();

                if (!allDataJson.success) {
                    throw new Error("فشل في جلب البيانات من المصدر");
                }
                
                const dataContainer = allDataJson.data || {};
                
                const allStudentsRaw = dataContainer.report || [];
                const sanitizedStudentsRaw = allStudentsRaw.map((row: any) => {
                    const newRow: { [key: string]: any } = {};
                    Object.keys(row).forEach(key => {
                        const cleanedKey = key.replace(/[\\u200B-\\u200D\\uFEFF]/g, '').trim();
                        newRow[cleanedKey] = row[key];
                    });
                    return newRow;
                });
                const processedStudents = processData(sanitizedStudentsRaw as RawStudentData[]);
                setStudents(processedStudents);

                const dailySheetData = dataContainer.daily;
                if (dailySheetData && Array.isArray(dailySheetData)) {
                    const processedDailyStudents = processDailyData(dailySheetData as RawStudentData[]);
                    setDailyStudents(processedDailyStudents);
                }
                
                const evaluationSheetData = dataContainer['Evaluation_Sheet'];
                if (evaluationSheetData && Array.isArray(evaluationSheetData)) {
                    const processedEvaluations = processEvaluationData(evaluationSheetData as RawCircleEvaluationData[]);
                    setEvaluationData(processedEvaluations);
                }

                const examSheetData = dataContainer.exam;
                if (examSheetData && Array.isArray(examSheetData)) {
                    const processedExams = processExamData(examSheetData as RawExamData[]);
                    setExamData(processedExams);
                }

                const registeredStudentData = dataContainer.regstudent;
                if (registeredStudentData && Array.isArray(registeredStudentData)) {
                    const processedRegStudents = processRegisteredStudentData(registeredStudentData as RawRegisteredStudentData[]);
                    setRegisteredStudents(processedRegStudents);
                }

                const supervisorSheetData = dataContainer['supervisor'];
                if (supervisorSheetData && Array.isArray(supervisorSheetData)) {
                    const processedSupervisors = processSupervisorData(supervisorSheetData as RawSupervisorData[]);
                    setSupervisors(processedSupervisors);
                    
                    const allSupervisorNames = processedSupervisors.map(s => s.supervisorName);
                    const supervisorAttendanceRaw = dataContainer.respon || [];
                    if (Array.isArray(supervisorAttendanceRaw)) {
                        const processedDailyAttendance = processSupervisorAttendanceData(supervisorAttendanceRaw as RawSupervisorAttendanceData[], allSupervisorNames);
                        setSupervisorAttendance(processedDailyAttendance);
                        
                        const processedReport = processSupervisorAttendanceReportData(supervisorAttendanceRaw as RawSupervisorAttendanceData[], allSupervisorNames);
                        setSupervisorAttendanceReport(processedReport);
                    }
                }

                const attendanceRaw = dataContainer.attandance || [];
                if (attendanceRaw && Array.isArray(attendanceRaw)) {
                    const rawAttendanceData = attendanceRaw as RawTeacherAttendanceData[];
                    const currentAsrTeacherNames = Array.from<string>(new Set(
                        processedStudents
                            .filter(s => s.circleTime === 'العصر')
                            .map(s => s.teacherName)
                            .filter(Boolean)
                    ));
                    const processedAttendance = processTeacherAttendanceData(rawAttendanceData, currentAsrTeacherNames);
                    setTeacherAttendance(processedAttendance);

                    const processedReport = processTeacherAttendanceReportData(rawAttendanceData, currentAsrTeacherNames);
                    setTeacherAttendanceReport(processedReport);
                }

            } catch (err) {
                console.error("فشل في جلب البيانات:", err);
                setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePostEvaluation = async (data: EvaluationSubmissionData) => {
        setIsSubmitting(true);
        setNotification(null);
        try {
            const payload = {
                sheet: 'Evaluation_Sheet',
                ...data
            };

            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                 console.log('Fetch error occurred, likely due to Apps Script redirect. Proceeding with data refresh.');
            } else {
                console.error("فشل في إرسال التقييم:", err);
                setNotification({ message: 'فشل في إرسال التقييم. الرجاء التحقق من اتصالك بالإنترنت.', type: 'error' });
                setIsSubmitting(false);
                return;
            }
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const cacheBuster = `&v=${new Date().getTime()}`;
            const evaluationResponse = await fetch(`${API_URL}?sheetName=Evaluation_Sheet${cacheBuster}`);
            if (!evaluationResponse.ok) throw new Error(`خطأ في تحديث البيانات: ${evaluationResponse.statusText}`);
            const evaluationJson = await evaluationResponse.json();
            
            const dataContainer = evaluationJson.data || evaluationJson;
            const refreshedEvaluationsRaw = dataContainer['Evaluation_Sheet'] || (Array.isArray(dataContainer) ? dataContainer : []);
            
            if (!Array.isArray(refreshedEvaluationsRaw)) {
                 throw new Error('تنسيق بيانات التقييم المحدثة غير صالح.');
            }

            const processedEvaluations = processEvaluationData(refreshedEvaluationsRaw as RawCircleEvaluationData[]);
            setEvaluationData(processedEvaluations);
            setNotification({ message: 'تم إرسال التقييم بنجاح!', type: 'success' });
        } catch(refreshError) {
             console.error("فشل في تحديث البيانات بعد الإرسال:", refreshError);
             setNotification({ message: 'تم الإرسال، ولكن فشل تحديث البيانات. حاول تحديث الصفحة.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePostExam = async (data: ExamSubmissionData) => {
        setIsSubmitting(true);
        setNotification(null);
        try {
            const payload = {
                sheet: 'exam',
                ...data
            };
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
            setNotification({ message: `تم رصد درجة الطالب ${data['الطالب']} بنجاح!`, type: 'success' });
        } catch (err) {
             if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                console.log('Fetch error (exam), likely redirect. Assuming success.');
                setNotification({ message: `تم رصد درجة الطالب ${data['الطالب']} بنجاح!`, type: 'success' });
             } else {
                console.error("فشل في إرسال درجة الاختبار:", err);
                setNotification({ message: 'فشل في إرسال درجة الاختبار. الرجاء التحقق من اتصالك.', type: 'error' });
             }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePostTeacherAttendance = async (teacherName: string, action: 'حضور' | 'انصراف') => {
        setSubmittingTeacher(teacherName);
        setIsSubmitting(true);
        setNotification(null);

        const originalAttendance = [...teacherAttendance];
        const teacherIndex = teacherAttendance.findIndex(t => t.teacherName === teacherName);
        if (teacherIndex === -1) {
            setIsSubmitting(false);
            setSubmittingTeacher(null);
            return;
        }

        const updatedTeacher = { ...teacherAttendance[teacherIndex] };
        const now = new Date();

        if (action === 'حضور') {
            updatedTeacher.checkIn = now;
            updatedTeacher.status = 'حاضر';
        } else {
            updatedTeacher.checkOut = now;
            updatedTeacher.status = 'مكتمل الحضور';
        }

        const newAttendance = [...teacherAttendance];
        newAttendance[teacherIndex] = updatedTeacher;
        setTeacherAttendance(newAttendance);

        const payload = {
            sheet: 'attandance',
            "name": teacherName,
            "status": action,
            "time": now.toISOString(),
        };

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
            setNotification({ message: `تم تسجيل ${action} للمعلم ${teacherName} بنجاح!`, type: 'success' });
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                console.log('Fetch error (attendance), likely redirect. Assuming success.');
                setNotification({ message: `تم تسجيل ${action} للمعلم ${teacherName} بنجاح!`, type: 'success' });
            } else {
                console.error("فشل في تسجيل الحضور:", err);
                setNotification({ message: 'فشل في تسجيل الحضور. الرجاء التحقق من اتصالك.', type: 'error' });
                setTeacherAttendance(originalAttendance);
            }
        } finally {
            setIsSubmitting(false);
            setSubmittingTeacher(null);
        }
    };

    const handlePostSupervisorAttendance = async (supervisorName: string, action: 'حضور' | 'انصراف') => {
        setSubmittingSupervisor(supervisorName);
        setIsSubmitting(true);
        setNotification(null);

        const originalAttendance = [...supervisorAttendance];
        const supervisorIndex = supervisorAttendance.findIndex(s => s.supervisorName === supervisorName);
        if (supervisorIndex === -1) {
            setIsSubmitting(false);
            setSubmittingSupervisor(null);
            return;
        }

        const updatedSupervisor = { ...supervisorAttendance[supervisorIndex] };
        const now = new Date();

        if (action === 'حضور') {
            updatedSupervisor.checkIn = now;
            updatedSupervisor.status = 'حاضر';
        } else {
            updatedSupervisor.checkOut = now;
            updatedSupervisor.status = 'مكتمل الحضور';
        }

        const newAttendance = [...supervisorAttendance];
        newAttendance[supervisorIndex] = updatedSupervisor;
        setSupervisorAttendance(newAttendance);

        const payload = {
            sheet: 'respon',
            "name": supervisorName,
            "status": action,
            "time": now.toISOString(),
        };

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
            setNotification({ message: `تم تسجيل ${action} للمشرف ${supervisorName} بنجاح!`, type: 'success' });
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                console.log('Fetch error (supervisor attendance), likely redirect. Assuming success.');
                setNotification({ message: `تم تسجيل ${action} للمشرف ${supervisorName} بنجاح!`, type: 'success' });
            } else {
                console.error("فشل في تسجيل حضور المشرف:", err);
                setNotification({ message: 'فشل في تسجيل الحضور. الرجاء التحقق من اتصالك.', type: 'error' });
                setSupervisorAttendance(originalAttendance);
            }
        } finally {
            setIsSubmitting(false);
            setSubmittingSupervisor(null);
        }
    };

    const handleNavigation = (page: Page) => {
        setInitialStudentFilter(null);
        if ((page === 'evaluation' || page === 'exam') && !authenticatedUser) {
            setCurrentPage(page);
            setShowPasswordModal(true);
        } else {
            setCurrentPage(page);
            setShowPasswordModal(false);
        }
    };

    const handleCircleSelect = (circleName: string) => {
        setInitialStudentFilter({ circle: circleName });
        setCurrentPage('students');
    };

    const handleDailyCircleSelect = (circleName: string) => {
        setInitialDailyStudentFilter({ circle: circleName });
        setCurrentPage('dailyStudents');
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-stone-50">
                <img src={LOGO_URL} alt="شعار المجمع" className="w-40 h-40 animate-pulse mb-4" />
                <p className="text-stone-600 font-semibold">...جاري تحميل البيانات</p>
            </div>
        );
    }
    
    if (error) {
        return <div className="flex justify-center items-center h-screen text-lg text-red-600 bg-red-50 p-4"><p>فشل تحميل البيانات: {error}</p></div>;
    }

    const titles = {
        students: 'تقرير الطلاب',
        circles: 'تقرير الحلقات',
        general: 'التقرير العام',
        dashboard: 'متابعة الحلقات',
        dailyDashboard: 'متابعة الحلقات (يومي)',
        notes: 'ملاحظات الطلاب',
        evaluation: `تقييم الحلقات ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`,
        excellence: 'تميز الحلقات',
        teacherAttendance: 'حضور وانصراف المعلمين',
        teacherAttendanceReport: 'تقرير حضور المعلمين',
        supervisorAttendance: 'حضور المشرفين',
        supervisorAttendanceReport: 'تقرير حضور المشرفين',
        dailyStudents: 'التقرير اليومي (طلاب)',
        dailyCircles: 'التقرير اليومي (حلقات)',
        exam: `إدخال درجات الاختبار ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`,
        examReport: 'تقرير الاختبارات',
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'students':
                return <StudentReportPage students={students} initialFilter={initialStudentFilter} clearInitialFilter={() => setInitialStudentFilter(null)} />;
            case 'circles':
                return <CircleReportPage students={students} supervisors={supervisors} />;
            case 'general':
                return <GeneralReportPage students={students} dailyStudents={dailyStudents} />;
            case 'dashboard':
                return <DashboardPage students={students} onCircleSelect={handleCircleSelect} supervisors={supervisors} />;
            case 'dailyDashboard':
                return <DailyDashboardPage students={dailyStudents} onCircleSelect={handleDailyCircleSelect} supervisors={supervisors} />;
            case 'notes':
                return <NotesPage students={students} />;
            case 'excellence':
                return <ExcellencePage students={students} supervisors={supervisors} />;
            case 'evaluation':
                 if (!authenticatedUser) return null;
                return (
                    <EvaluationPage
                        onSubmit={handlePostEvaluation}
                        isSubmitting={isSubmitting}
                        evaluationData={evaluationData}
                        students={students}
                        authenticatedUser={authenticatedUser}
                    />
                );
            case 'exam':
                 if (!authenticatedUser) return null;
                return (
                    <ExamPage
                        onSubmit={handlePostExam}
                        isSubmitting={isSubmitting}
                        students={registeredStudents}
                        authenticatedUser={authenticatedUser}
                    />
                );
            case 'examReport':
                return <ExamReportPage examData={examData} />;
            case 'teacherAttendance':
                return (
                    <TeacherAttendancePage 
                        allTeachers={asrTeachersInfo}
                        attendanceStatus={teacherAttendance}
                        onSubmit={handlePostTeacherAttendance}
                        isSubmitting={isSubmitting}
                        submittingTeacher={submittingTeacher}
                    />
                );
            case 'teacherAttendanceReport':
                return <TeacherAttendanceReportPage reportData={teacherAttendanceReport} />;
            case 'supervisorAttendance':
                return (
                    <SupervisorAttendancePage
                        allSupervisors={supervisors.map(s => ({ name: s.supervisorName }))}
                        attendanceStatus={supervisorAttendance}
                        onSubmit={handlePostSupervisorAttendance}
                        isSubmitting={isSubmitting}
                        submittingSupervisor={submittingSupervisor}
                    />
                );
            case 'supervisorAttendanceReport':
                return <SupervisorAttendanceReportPage reportData={supervisorAttendanceReport} />;
            case 'dailyStudents':
                return <DailyStudentReportPage students={dailyStudents} initialFilter={initialDailyStudentFilter} clearInitialFilter={() => setInitialDailyStudentFilter(null)} />;
            case 'dailyCircles':
                return <DailyCircleReportPage students={dailyStudents} supervisors={supervisors} />;
            default:
                return <GeneralReportPage students={students} dailyStudents={dailyStudents} />;
        }
    };

    return (
        <div className="flex h-screen bg-stone-100 text-stone-800 font-sans">
            <Notification notification={notification} onClose={() => setNotification(null)} />
            
            <Sidebar 
                currentPage={currentPage} 
                onNavigate={handleNavigation}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(prev => !prev)}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white/80 backdrop-blur-sm shadow-md z-10 print-hidden border-b border-stone-200">
                    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <img src={LOGO_URL} alt="شعار المجمع" className="h-14 md:h-16" />
                                <div className='hidden sm:block'>
                                    <h2 className="text-lg font-semibold text-stone-600">مجمع الراجحي بشبرا</h2>
                                    <p className="text-sm text-stone-500">نظام متابعة أداء الحلقات</p>
                                </div>
                            </div>
                            <div className="text-center flex-grow">
                                <h1 className="text-xl sm:text-2xl font-bold leading-tight text-stone-800">
                                    {titles[currentPage]}
                                </h1>
                            </div>
                            <div className="w-24 sm:w-48"> {/* Spacer to help center the title */}
                            </div>
                        </div>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="animate-slide-in">
                        {renderPage()}
                    </div>
                </main>
            </div>

            {showPasswordModal && (
                <PasswordModal
                    supervisors={supervisors}
                    onSuccess={(user) => {
                        setAuthenticatedUser(user);
                        setShowPasswordModal(false);
                        if (currentPage !== 'evaluation' && currentPage !== 'exam') {
                             setCurrentPage(currentPage); // Stay on current page if it's not eval/exam
                        }
                    }}
                    onClose={() => setShowPasswordModal(false)}
                />
            )}
        </div>
    );
};

export default App;
