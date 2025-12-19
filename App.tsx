
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
import CombinedAttendancePage from './pages/CombinedAttendancePage';
import SupervisorAttendanceReportPage from './pages/SupervisorAttendanceReportPage';
import DailyStudentReportPage from './pages/DailyStudentReportPage';
import DailyCircleReportPage from './pages/DailyCircleReportPage';
import ExamPage from './pages/ExamPage';
import ExamReportPage from './pages/ExamReportPage';
import StudentFollowUpPage from './pages/StudentFollowUpPage';
import StudentAttendanceReportPage from './pages/StudentAttendanceReportPage';
import StudentAbsenceReportPage from './pages/StudentAbsenceReportPage';
import SettingsPage from './pages/SettingsPage';
import TeacherListPage from './pages/TeacherListPage';
import PasswordModal from './components/PasswordModal';
import { Sidebar } from './components/Sidebar';
import Notification from './components/Notification';
import type { RawStudentData, ProcessedStudentData, Achievement, ExamSubmissionData, RawSupervisorData, SupervisorData, RawTeacherAttendanceData, TeacherDailyAttendance, TeacherInfo, RawSupervisorAttendanceData, SupervisorAttendanceReportEntry, SupervisorDailyAttendance, SupervisorInfo, RawExamData, ProcessedExamData, RawRegisteredStudentData, ProcessedRegisteredStudentData, RawSettingData, ProcessedSettingsData, RawTeacherInfo, EvalQuestion, EvalSubmissionPayload, ProcessedEvalResult, RawEvalResult, RawProductorData, ProductorData, CombinedTeacherAttendanceEntry, AuthenticatedUser } from './types';
import { MenuIcon } from './components/icons';

const API_URL = 'https://script.google.com/macros/s/AKfycbxbmwdJKfAZmeStYZv82hmNJkC1je_bY0IcfiJ1fhfo8Qz7I-b10Mb1Z-EcCpbjnTA/exec';
const LOGO_URL = 'https://i.ibb.co/ZzqqtpZQ/1-page-001-removebg-preview.png';
const CACHE_KEY = 'quran_app_data_v1';

// --- IndexedDB Helpers ---
const DB_NAME = 'QuranAppDB';
const STORE_NAME = 'dataStore';
const DB_VERSION = 1;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB not supported"));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

const getFromDB = async (key: string): Promise<any> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (e) {
        console.warn("Error reading from IndexedDB:", e);
        return null;
    }
};

const saveToDB = async (key: string, data: any): Promise<void> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data, key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.warn("Error saving to IndexedDB:", e);
    }
};
// -------------------------

const normalizeArabicForMatch = (text: string) => {
    if (!text) return '';
    return text
        .normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[إأآا]/g, 'ا')
        .replace(/[يى]/g, 'ي')
        .replace(/ة/g, 'ه')
        .trim();
};

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

/**
 * Strict parser for "Attendance Percentage" (نسبة الحضور) column.
 * Converts "100%", "85", "0.85" all to 0.0 - 1.0 range.
 */
const parsePercentage = (value: any): number => {
    if (value === undefined || value === null || value === '') return 0;
    
    let strValue = String(value).trim();
    
    // Handle "%" symbol
    if (strValue.endsWith('%')) {
        return (parseFloat(strValue.replace('%', '')) || 0) / 100;
    }
    
    const numValue = parseFloat(strValue);
    if (isNaN(numValue)) return 0;

    // Logic: Values > 1 (e.g., 90) are treated as percentages (90/100 = 0.9).
    // Values <= 1 (e.g., 0.9) are treated as fractions already.
    return numValue > 1 ? numValue / 100 : numValue;
};

const processEvalResultsData = (
  data: RawEvalResult[],
  questions: EvalQuestion[]
): { processedResults: ProcessedEvalResult[]; headerMap: Map<number, string> } => {
  const headerMap = new Map<number, string>();
  const maxScore = questions.reduce((sum, q) => sum + q.mark, 0);

  if (data.length > 0) {
    const firstRow = data[0];
    const headers = Object.keys(firstRow);
    const normalize = (text: string): string =>
      String(text || '')
        .normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF\s]/g, '') 
        .replace(/[إأآا]/g, 'ا'); 

    questions.forEach(q => {
      const normalizedQue = normalize(q.que);
      const foundHeader = headers.find(h => normalize(h) === normalizedQue);
      if (foundHeader) {
        headerMap.set(q.id, foundHeader.trim()); 
      } else {
        headerMap.set(q.id, q.que.trim());
      }
    });
  } else {
    questions.forEach(q => {
        headerMap.set(q.id, q.que.trim());
    });
  }

  const processedResults = data.map((row, index) => {
    let totalScore = 0;
    const scores = questions.map(q => {
      const header = headerMap.get(q.id);
      if (!header) {
        return { question: q.que, score: 0, maxMark: q.mark };
      }
      const score = Number(row[header as keyof RawEvalResult]) || 0;
      totalScore += score;
      return {
        question: q.que,
        score: score,
        maxMark: q.mark,
      };
    });

    return {
      id: `${row['المعلم']}-${row['الحلقة']}-${index}`,
      teacherName: String(row['المعلم'] || ''),
      circleName: String(row['الحلقة'] || ''),
      totalScore,
      maxScore,
      scores,
    };
  }).sort((a,b) => b.totalScore - a.totalScore);

  return { processedResults, headerMap };
};


const processSupervisorData = (data: RawSupervisorData[]): SupervisorData[] => {
    const supervisorMap = new Map<string, { supervisorName: string; password: string; circles: string[] }>();
    data.forEach(item => {
        const supervisorId = String(item['id'] || '').trim();
        const supervisorName = String(item['المشرف'] || '').trim();
        const password = String(item['كلمة المرور'] || '').trim();
        const circle = String(item['الحلقة'] || '').trim();

        if (supervisorId && supervisorName) {
            if (!supervisorMap.has(supervisorId)) {
                supervisorMap.set(supervisorId, { supervisorName, password, circles: [] });
            }
            
            const supervisorEntry = supervisorMap.get(supervisorId)!;
            if (circle && !supervisorEntry.circles.includes(circle)) {
                supervisorEntry.circles.push(circle);
            }
        }
    });

    return Array.from(supervisorMap.entries()).map(([id, data]) => ({
        id,
        supervisorName: data.supervisorName,
        password: data.password,
        circles: data.circles,
    }));
};

const processProductorData = (data: RawProductorData[]): ProductorData[] => {
    return data
        .map(item => ({
            role: (item['role'] || '').trim(),
            name: (item['name'] || '').trim(),
            password: String(item['pwd'] || '').trim(),
        }))
        .filter(item => item.role && item.name && item.password);
};

const processTeachersInfoData = (data: RawTeacherInfo[]): TeacherInfo[] => {
    return data
        .map(item => ({
            id: Number(item['teacher_id']),
            name: normalizeArabicForMatch(item['المعلم'] || ''),
            circle: String(item['الحلقات'] || '').trim(),
            circleTime: String(item['وقت الحلقة'] || '').trim()
        }))
        .filter(item => !isNaN(item.id) && item.name);
};

const processTeacherAttendanceReportData = (data: RawTeacherAttendanceData[], teachersInfo: TeacherInfo[]): CombinedTeacherAttendanceEntry[] => {
    const teacherLookup = new Map<number, TeacherInfo>();
    teachersInfo.forEach(t => teacherLookup.set(t.id, t));

    const groupMap = new Map<string, { id: number, date: string, times: string[] }>();

    data.forEach(item => {
        const id = Number(item.teacher_id);
        const rawDate = String(item['تاريخ العملية'] || '').trim().split(' ')[0]; 
        const rawTime = String(item['وقت العملية'] || '').trim().split(' ').pop() || ''; 

        if (isNaN(id) || !rawDate || !rawTime) return;

        const key = `${id}|${rawDate}`;
        if (!groupMap.has(key)) {
            groupMap.set(key, { id, date: rawDate, times: [] });
        }
        groupMap.get(key)!.times.push(rawTime);
    });

    const report: CombinedTeacherAttendanceEntry[] = [];

    groupMap.forEach((group, key) => {
        const info = teacherLookup.get(group.id);
        if (!info) return; 

        const sortedTimes = group.times.sort();
        const checkInTime = sortedTimes[0];
        const checkOutTime = sortedTimes.length > 1 ? sortedTimes[sortedTimes.length - 1] : null;

        report.push({
            id: key,
            teacherId: group.id,
            teacherName: info.name,
            circles: info.circle || '—',
            circleTime: info.circleTime || '—',
            date: group.date,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            status: 'حاضر'
        });
    });

    return report.sort((a, b) => b.date.localeCompare(a.date));
};

const processTeacherAttendanceData = (data: RawTeacherAttendanceData[], allTeachers: TeacherInfo[]): TeacherDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadhStr = new Date().toLocaleDateString('en-CA', { timeZone });
    const teacherRecords = new Map<number, { teacherName: string, checkIn: Date | null, checkOut: Date | null }>();

    allTeachers.forEach(t => {
        teacherRecords.set(t.id, { teacherName: t.name, checkIn: null, checkOut: null });
    });

    data.forEach(item => {
        const id = Number(item.teacher_id);
        if (isNaN(id) || !teacherRecords.has(id)) return;

        const dateStr = String(item['تاريخ العملية'] || '');
        if (dateStr.includes(todayRiyadhStr)) {
            const record = teacherRecords.get(id)!;
            const status = (item.status || '').trim();
            if (status === 'حضور' || status === 'الحضور') record.checkIn = new Date(); 
            else if (status === 'انصراف') record.checkOut = new Date();
        }
    });

    return Array.from(teacherRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        return { teacherName: record.teacherName, checkIn: record.checkIn, checkOut: record.checkOut, status };
    });
};

const processSupervisorAttendanceData = (data: RawSupervisorAttendanceData[], allSupervisors: SupervisorData[]): SupervisorDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadhStr = new Date().toLocaleDateString('en-CA', { timeZone });
    const supervisorRecords = new Map<string, { supervisorName: string, checkIn: Date | null, checkOut: Date | null }>();

    allSupervisors.forEach(s => {
        supervisorRecords.set(s.id, { supervisorName: s.supervisorName, checkIn: null, checkOut: null });
    });

    data.forEach(item => {
        const supervisorId = String(item.id || '').trim();
        if (!supervisorId || !supervisorRecords.has(supervisorId)) return;
        
        const dateStr = String(item['تاريخ العملية'] || '');
        if (dateStr.includes(todayRiyadhStr)) {
            const record = supervisorRecords.get(supervisorId)!;
            const status = (item.status || '').trim();
            if (status === 'حضور' || status === 'الحضور') record.checkIn = new Date();
            else if (status === 'انصراف') record.checkOut = new Date();
        }
    });

    return Array.from(supervisorRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        return { supervisorName: record.supervisorName, checkIn: record.checkIn, checkOut: record.checkOut, status };
    });
};

const processSupervisorAttendanceReportData = (data: RawSupervisorAttendanceData[], allSupervisors: SupervisorData[]): SupervisorAttendanceReportEntry[] => {
    const supervisorLookup = new Map<string, { name: string, circle: string }>();
    allSupervisors.forEach(s => {
        supervisorLookup.set(s.id, { 
            name: s.supervisorName, 
            circle: s.circles.join('، ') || '—' 
        });
    });

    const groupMap = new Map<string, { id: string, date: string, times: string[] }>();

    data.forEach(item => {
        const id = String(item.id || '').trim();
        const rawDate = String(item['تاريخ العملية'] || '').trim().split(' ')[0];
        const rawTime = String(item['وقت العملية'] || '').trim().split(' ').pop() || '';

        if (!id || !rawDate || !rawTime) return;

        const key = `${id}|${rawDate}`;
        if (!groupMap.has(key)) {
            groupMap.set(key, { id, date: rawDate, times: [] });
        }
        groupMap.get(key)!.times.push(rawTime);
    });

    const report: SupervisorAttendanceReportEntry[] = [];

    groupMap.forEach((group, key) => {
        const info = supervisorLookup.get(group.id);
        if (!info) return;

        const sortedTimes = group.times.sort();
        const checkInTime = sortedTimes[0];
        const checkOutTime = sortedTimes.length > 1 ? sortedTimes[sortedTimes.length - 1] : null;

        report.push({
            supervisorId: group.id,
            supervisorName: info.name,
            circle: info.circle,
            date: group.date,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            status: 'حاضر'
        });
    });

    return report.sort((a, b) => b.date.localeCompare(a.date));
};


const processData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const studentWeekMap = new Map<string, {
        data: ProcessedStudentData;
        attendanceSum: number;
        recordCount: number;
    }>();
    let lastKey: string | null = null;

    const normalize = (val: any): string => {
        const str = String(val || '');
        return str.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');
    };

    for (const item of data) {
        const username = item["اسم المستخدم"];
        const studentName = normalize(item["الطالب"]);
        const week = normalize(item["الأسبوع"] || item["الاسبوع"]);

        let currentKey: string | null = null;
        if (username != null && studentName && week) {
            currentKey = `${username}-${week}`;
            lastKey = currentKey;
        } else {
            currentKey = lastKey;
        }
        if (!currentKey) continue;

        const attendance = parsePercentage(item["نسبة الحضور"]);
        const memPages = parseAchievement(item["أوجه الحفظ"]);
        const revPages = parseAchievement(item["أوجه المراجه"]);
        const conPages = parseAchievement(item["أوجه التثبيت"]);
        const points = Number(item["اجمالي النقاط"]) || 0;
        const memLessons = normalize(item["دروس الحفظ"]);
        const revLessons = normalize(item["دروس المراجعة"]);

        if (studentWeekMap.has(currentKey)) {
            const entry = studentWeekMap.get(currentKey)!;
            const existingStudent = entry.data;
            existingStudent.memorizationPages.achieved += memPages.achieved;
            existingStudent.memorizationPages.required += memPages.required;
            existingStudent.reviewPages.achieved += revPages.achieved;
            existingStudent.reviewPages.required += revPages.required;
            existingStudent.consolidationPages.achieved += conPages.achieved;
            existingStudent.consolidationPages.required += conPages.required;
            existingStudent.totalPoints += points;
            
            // Collect for precise attendance average from column
            entry.attendanceSum += attendance;
            entry.recordCount += 1;

            if (memLessons) existingStudent.memorizationLessons = existingStudent.memorizationLessons ? `${existingStudent.memorizationLessons}, ${memLessons}` : memLessons;
            if (revLessons) existingStudent.reviewLessons = existingStudent.reviewLessons ? `${existingStudent.reviewLessons}, ${revLessons}` : revLessons;
        } else {
            if (!studentName || username == null || !week) continue;
            const circle = normalize(item["الحلقة"]);
            const isTabyan = circle.includes('التبيان');
            const finalMemPages = isTabyan ? { achieved: 0, required: memPages.required, formatted: '', index: 0 } : memPages;
            const finalRevPages = isTabyan ? { achieved: 0, required: revPages.required, formatted: '', index: 0 } : revPages;
            const finalConPages = isTabyan ? { achieved: 0, required: conPages.required, formatted: '', index: 0 } : conPages;

            const newStudent: ProcessedStudentData = {
                id: currentKey,
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
            studentWeekMap.set(currentKey, { data: newStudent, attendanceSum: attendance, recordCount: 1 });
        }
    }
    
    return Array.from(studentWeekMap.values()).map(entry => {
        const student = entry.data;
        // Final precise attendance average from multiple entries in the same week
        student.attendance = entry.attendanceSum / entry.recordCount;
        
        student.memorizationPages.formatted = `${student.memorizationPages.achieved.toFixed(1)} / ${student.memorizationPages.required.toFixed(1)}`;
        student.memorizationPages.index = student.memorizationPages.required > 0 ? student.memorizationPages.achieved / student.memorizationPages.required : 0;
        student.reviewPages.formatted = `${student.reviewPages.achieved.toFixed(1)} / ${student.reviewPages.required.toFixed(1)}`;
        student.reviewPages.index = student.reviewPages.required > 0 ? student.reviewPages.achieved / student.reviewPages.required : 0;
        student.consolidationPages.formatted = `${student.consolidationPages.achieved.toFixed(1)} / ${student.consolidationPages.required.toFixed(1)}`;
        student.consolidationPages.index = student.consolidationPages.required > 0 ? student.consolidationPages.achieved / student.consolidationPages.required : 0;
        return student;
    });
};

const processDailyData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const normalize = (val: any): string => String(val || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');

    return data.map((item, index): ProcessedStudentData | null => {
        const studentName = normalize(item["الطالب"]);
        const usernameRaw = item["اسم المستخدم"];
        if (!studentName || usernameRaw == null) return null;
        const username = Number(usernameRaw);
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
        const day = normalize(item["اليوم"]);
        return {
            id: `${username}-${day}-${index}`,
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
            attendance: parsePercentage(item["نسبة الحضور"]), // Direct from column
            totalPoints: Number(item["اجمالي النقاط"]) || 0,
            guardianMobile: normalize(item["جوال ولي الأمر"]),
            day: day,
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
    return data.map(item => {
            const studentName = normalize(item["الطالب"]);
            const circle = normalize(item["الحلقة"]);
            if (!studentName || !circle) return null;
            return { studentName, circle };
        }).filter((item): item is ProcessedRegisteredStudentData => item !== null);
};

const extractTimeFromSheetDate = (value: string | undefined): string => {
    if (!value || typeof value !== 'string') return '';
    const timeMatch = value.match(/\d{2}:\d{2}/);
    return timeMatch ? timeMatch[0] : '';
};

const processSettingsData = (data: RawSettingData[]): ProcessedSettingsData => {
    if (!data || !Array.isArray(data) || data.length === 0) return {};
    const firstRow = data[0];
    if (!firstRow) return {};
    return {
        default_student_count_day: firstRow["اليوم الافتراضي"] || '',
        teacher_late_checkin_time: extractTimeFromSheetDate(firstRow["وقت تأخر حضور المعلمين"]),
        teacher_early_checkout_time: extractTimeFromSheetDate(firstRow["وقت انصراف مبكر للمعلمين"]),
        supervisor_late_checkin_time: extractTimeFromSheetDate(firstRow["وقت تأخر حضور المشرفين"]),
        supervisor_early_checkout_time: extractTimeFromSheetDate(firstRow["وقت انصراف مبكر للمشرفين"]),
        avg_attendance: String(firstRow["متوسط الحضور"] || '0'),
    };
};

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'combinedAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendanceReport' | 'exam' | 'examReport' | 'studentFollowUp' | 'studentAttendanceReport' | 'studentAbsenceReport' | 'settings' | 'teacherList';

const App: React.FC = () => {
    const [students, setStudents] = useState<ProcessedStudentData[]>([]);
    const [dailyStudents, setDailyStudents] = useState<ProcessedStudentData[]>([]);
    const [evalQuestions, setEvalQuestions] = useState<EvalQuestion[]>([]);
    const [evalResults, setEvalResults] = useState<ProcessedEvalResult[]>([]);
    const [evalHeaderMap, setEvalHeaderMap] = useState<Map<number, string>>(new Map());
    const [examData, setExamData] = useState<ProcessedExamData[]>([]);
    const [registeredStudents, setRegisteredStudents] = useState<ProcessedRegisteredStudentData[]>([]);
    const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
    const [productors, setProductors] = useState<ProductorData[]>([]);
    const [teachersInfo, setTeachersInfo] = useState<TeacherInfo[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<TeacherDailyAttendance[]>([]);
    const [combinedTeacherAttendanceLog, setCombinedTeacherAttendanceLog] = useState<CombinedTeacherAttendanceEntry[]>([]);
    const [supervisorAttendance, setSupervisorAttendance] = useState<SupervisorDailyAttendance[]>([]);
    const [supervisorAttendanceReport, setSupervisorAttendanceReport] = useState<SupervisorAttendanceReportEntry[]>([]);
    const [settings, setSettings] = useState<ProcessedSettingsData>({});
    
    // Loading State
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("جاري التحميل...");
    const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
    
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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const asrTeachersInfo = useMemo(() => {
        return [...teachersInfo].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [teachersInfo]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const fetchWithRetry = async (url: string, retries = 2, timeout = 25000) => {
        for (let i = 0; i <= retries; i++) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (err: any) {
                clearTimeout(id);
                if (i === retries) throw err;
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            }
        }
    };

    const processAllData = (dataContainer: any) => {
         const allStudentsRaw = dataContainer.report || [];
         const sanitizedStudentsRaw = allStudentsRaw.map((row: any) => {
             const newRow: { [key: string]: any } = {};
             Object.keys(row).forEach(key => {
                 const cleanedKey = key.replace(/[\\u200B-\\u200D\\uFEFF]/g, '').trim();
                 newRow[cleanedKey] = row[key];
             });
             return newRow;
         });
         setStudents(processData(sanitizedStudentsRaw as RawStudentData[]));

         const dailySheetData = dataContainer.daily;
         if (dailySheetData && Array.isArray(dailySheetData)) {
             setDailyStudents(processDailyData(dailySheetData as RawStudentData[]));
         }
         
         const evalQuestionsData = dataContainer.eval;
         if (evalQuestionsData && Array.isArray(evalQuestionsData)) {
             const questions = evalQuestionsData as EvalQuestion[];
             setEvalQuestions(questions);
             const evalResultsData = dataContainer.Eval_result || [];
             const { processedResults, headerMap } = processEvalResultsData(evalResultsData as RawEvalResult[], questions);
             setEvalResults(processedResults);
             setEvalHeaderMap(headerMap);
         }

         const examSheetData = dataContainer.exam;
         if (examSheetData && Array.isArray(examSheetData)) {
             setExamData(processExamData(examSheetData as RawExamData[]));
         }

         const registeredStudentData = dataContainer.regstudent;
         if (registeredStudentData && Array.isArray(registeredStudentData)) {
             setRegisteredStudents(processRegisteredStudentData(registeredStudentData as RawRegisteredStudentData[]));
         }

         const supervisorSheetData = dataContainer['supervisor'];
         let currentSupervisors: SupervisorData[] = [];
         if (supervisorSheetData && Array.isArray(supervisorSheetData)) {
             currentSupervisors = processSupervisorData(supervisorSheetData as RawSupervisorData[]);
             setSupervisors(currentSupervisors);
         }

         const productorSheetData = dataContainer.productor;
         if (productorSheetData && Array.isArray(productorSheetData)) {
             setProductors(processProductorData(productorSheetData as RawProductorData[]));
         }

         let currentAsrTeachers: TeacherInfo[] = [];
         const teachersSheetData = dataContainer.teachers;
         if (teachersSheetData && Array.isArray(teachersSheetData)) {
             currentAsrTeachers = processTeachersInfoData(teachersSheetData as RawTeacherInfo[]);
         }
         setTeachersInfo(currentAsrTeachers);
         
         const attendanceRaw = dataContainer.attandance || [];
         if (attendanceRaw && Array.isArray(attendanceRaw)) {
             setTeacherAttendance(processTeacherAttendanceData(attendanceRaw as RawTeacherAttendanceData[], currentAsrTeachers));
             setCombinedTeacherAttendanceLog(processTeacherAttendanceReportData(attendanceRaw as RawTeacherAttendanceData[], currentAsrTeachers));
         }

         const responRaw = dataContainer.respon || [];
         if (Array.isArray(responRaw)) {
             setSupervisorAttendance(processSupervisorAttendanceData(responRaw as RawSupervisorAttendanceData[], currentSupervisors));
             setSupervisorAttendanceReport(processSupervisorAttendanceReportData(responRaw as RawSupervisorAttendanceData[], currentSupervisors));
         }

         const settingsSheetData = dataContainer.setting;
         if (settingsSheetData && Array.isArray(settingsSheetData)) {
             const sanitizedSettingsRaw = settingsSheetData.map((row: any) => {
                 const newRow: { [key: string]: any } = {};
                 Object.keys(row).forEach(key => {
                     const cleanedKey = key.replace(/[\\u200B-\\u200D\\uFEFF]/g, '').trim();
                     newRow[cleanedKey] = row[key];
                 });
                 return newRow;
             });
             setSettings(processSettingsData(sanitizedSettingsRaw as RawSettingData[]));
         }
    };

    const loadFromCache = async () => {
        try {
            const cached = await getFromDB(CACHE_KEY);
            if (cached) {
                processAllData(cached);
                setIsLoading(false);
                return true;
            }
        } catch (e) {
            console.warn("Failed to load from cache", e);
        }
        return false;
    };

    const saveToCache = async (data: any) => {
        try {
            await saveToDB(CACHE_KEY, data);
        } catch (e) {
            console.warn("Failed to save to cache (Quota Exceeded)", e);
        }
    };

    const loadData = async () => {
        setError(null);
        const loadedFromCache = await loadFromCache();
        
        if (loadedFromCache) {
             setIsBackgroundUpdating(true);
        } else {
            setIsLoading(true);
            setLoadingMessage("جاري جلب البيانات من قاعدة البيانات...");
        }
        
        const cacheBuster = `&v=${new Date().getTime()}`;
        try {
            const allDataJson = await fetchWithRetry(`${API_URL}?${cacheBuster.substring(1)}`);
            if (!allDataJson.success) {
                throw new Error("فشل في جلب البيانات من المصدر");
            }
            const dataContainer = allDataJson.data || {};
            processAllData(dataContainer);
            saveToCache(dataContainer);
            if (loadedFromCache) {
                setNotification({ message: 'تم تحديث البيانات بنجاح.', type: 'success' });
            }
        } catch (err) {
            console.error("فشل في جلب البيانات:", err);
            if (!loadedFromCache) {
                const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
                setError(msg.includes('aborted') ? "انتهت مهلة الاتصال بالسيرفر." : msg);
            } else {
                setNotification({ message: 'فشل تحديث البيانات في الخلفية. يتم عرض نسخة مخزنة.', type: 'error' });
            }
        } finally {
            setIsLoading(false);
            setIsBackgroundUpdating(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePostEvaluation = async (data: EvalSubmissionPayload) => {
        setIsSubmitting(true);
        setNotification(null);
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data),
            });
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {} 
            else {
                setNotification({ message: 'فشل في إرسال التقييم.', type: 'error' });
                setIsSubmitting(false);
                return;
            }
        }
        setNotification({ message: 'تم إرسال التقييم بنجاح!', type: 'success' });
        setIsSubmitting(false);
    };

    const handlePostExam = async (data: ExamSubmissionData) => {
        setIsSubmitting(true);
        try {
            const payload = { sheet: 'exam', ...data };
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
            setNotification({ message: `تم رصد درجة الطالب ${data['الطالب']} بنجاح!`, type: 'success' });
        } catch (err) {
            setNotification({ message: `تم رصد درجة الطالب ${data['الطالب']} بنجاح!`, type: 'success' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePostTeacherAttendance = async (teacherId: number, teacherName: string, action: 'حضور' | 'انصراف') => {
        setSubmittingTeacher(teacherName);
        setIsSubmitting(true);
        const now = new Date();
        const payload = {
            sheet: 'attandance',
            "teacher_id": teacherId,
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
            setNotification({ message: `تم تسجيل ${action} للمعلم ${teacherName} بنجاح!`, type: 'success' });
        } finally {
            setIsSubmitting(false);
            setSubmittingTeacher(null);
        }
    };

    const handlePostSupervisorAttendance = async (supervisorId: string, action: 'حضور' | 'انصراف') => {
        const supervisor = supervisors.find(s => s.id === supervisorId);
        if (!supervisor) return;
        const supervisorName = supervisor.supervisorName;
        setSubmittingSupervisor(supervisorName);
        setIsSubmitting(true);
        const now = new Date();
        const payload = {
            sheet: 'respon',
            "id": supervisorId,
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
            setNotification({ message: `تم تسجيل ${action} للمشرف ${supervisorName} بنجاح!`, type: 'success' });
        } finally {
            setIsSubmitting(false);
            setSubmittingSupervisor(null);
        }
    };

    const handlePostSettings = async (data: ProcessedSettingsData) => {
        setIsSubmitting(true);
        try {
            const payload = {
                sheet: 'setting',
                keyField: 'الرقم',
                "الرقم": 1, 
                "اليوم الافتراضي": data.default_student_count_day,
                "وقت تأخر حضور المعلمين": data.teacher_late_checkin_time || '',
                "وقت انصراف مبكر للمعلمين": data.teacher_early_checkout_time || '',
                "وقت تأخر حضور المشرفين": data.supervisor_late_checkin_time || '',
                "وقت انصراف مبكر للمشرفين": data.supervisor_early_checkout_time || '',
            };
            await fetch(`${API_URL}?action=updateSettings`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
            setNotification({ message: 'تم حفظ الإعدادات بنجاح!', type: 'success' });
        } catch (err) {
            setNotification({ message: 'تم حفظ الإعدادات بنجاح!', type: 'success' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefreshTeacherData = async () => {
        setIsBackgroundUpdating(true);
        try {
            const allDataJson = await fetchWithRetry(`${API_URL}&v=${new Date().getTime()}`);
            processAllData(allDataJson.data || {});
            setNotification({ message: 'تم تحديث البيانات بنجاح.', type: 'success' });
        } catch (e) {
            setNotification({ message: 'حدث خطأ أثناء تحديث البيانات.', type: 'error' });
        } finally {
            setIsBackgroundUpdating(false);
        }
    };

    const handleNavigation = (page: Page) => {
        setInitialStudentFilter(null);
        setInitialDailyStudentFilter(null);
        if (!authenticatedUser && ['evaluation', 'exam', 'settings'].includes(page)) {
            setCurrentPage(page);
            setShowPasswordModal(true);
            setIsMobileSidebarOpen(false);
            return;
        }
        setCurrentPage(page);
        setShowPasswordModal(false);
        setIsMobileSidebarOpen(false);
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
                <img src={LOGO_URL} alt="شعار المجمع" className="w-32 h-32 animate-pulse mb-6" />
                <div className="flex items-center gap-3 text-stone-700 font-semibold text-lg mb-2">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>{loadingMessage}</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-red-50 p-4 text-center">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-md">
                    <h3 className="text-lg font-bold text-red-800 mb-2">فشل تحميل البيانات</h3>
                    <p className="text-stone-600 mb-6">{error}</p>
                    <button onClick={loadData} className="w-full px-4 py-2 bg-amber-500 text-white rounded-md font-semibold hover:bg-amber-600">إعادة المحاولة</button>
                </div>
            </div>
        );
    }

    const titles = {
        students: 'تقرير الطلاب',
        circles: 'تقرير الحلقات',
        general: 'التقرير العام',
        dashboard: 'متابعة الحلقات',
        dailyDashboard: 'متابعة الحلقات (يومي)',
        notes: 'ملاحظات الطلاب',
        evaluation: `زيارات الحلقات ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`,
        excellence: 'تميز الحلقات',
        combinedAttendance: `حضور الموظفين`,
        teacherAttendanceReport: 'تقرير حضور المعلمين',
        supervisorAttendanceReport: 'تقرير حضور المشرفين',
        dailyStudents: 'التقرير اليومي (طلاب)',
        dailyCircles: 'التقرير اليومي (حلقات)',
        exam: `إدخال درجات الاختبار ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`,
        examReport: 'تقرير الاختبارات',
        studentFollowUp: 'متابعة طالب',
        studentAttendanceReport: 'تقرير حضور الطلاب اليومي',
        studentAbsenceReport: 'تقرير غياب الطلاب',
        settings: 'الإعدادات',
        teacherList: 'قائمة المعلمين',
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'students':
                return <StudentReportPage students={students} initialFilter={initialStudentFilter} clearInitialFilter={() => setInitialStudentFilter(null)} />;
            case 'circles':
                return <CircleReportPage students={students} supervisors={supervisors} />;
            case 'general':
                return <GeneralReportPage students={students} dailyStudents={dailyStudents} settings={settings} />;
            case 'dashboard':
                return <DashboardPage students={students} onCircleSelect={handleCircleSelect} supervisors={supervisors} />;
            case 'dailyDashboard':
                return <DailyDashboardPage students={dailyStudents} onCircleSelect={handleDailyCircleSelect} supervisors={supervisors} />;
            case 'notes':
                return <NotesPage students={students} />;
            case 'evaluation':
                return authenticatedUser && <EvaluationPage onSubmit={handlePostEvaluation} isSubmitting={isSubmitting} authenticatedUser={authenticatedUser} evalQuestions={evalQuestions} evalResults={evalResults} evalHeaderMap={evalHeaderMap} dailyStudents={dailyStudents} settings={settings} />;
            case 'excellence':
                return <ExcellencePage students={students} supervisors={supervisors} />;
            case 'combinedAttendance':
                return <CombinedAttendancePage allTeachers={asrTeachersInfo} teacherAttendanceStatus={teacherAttendance} onTeacherSubmit={handlePostTeacherAttendance} submittingTeacher={submittingTeacher} allSupervisors={supervisors.map(s => ({ id: s.id, name: s.supervisorName }))} supervisorAttendanceStatus={supervisorAttendance} onSupervisorSubmit={handlePostSupervisorAttendance} submittingSupervisor={submittingSupervisor} isSubmitting={isSubmitting} authenticatedUser={authenticatedUser} />;
            case 'teacherAttendanceReport':
                return <TeacherAttendanceReportPage reportData={combinedTeacherAttendanceLog} onRefresh={handleRefreshTeacherData} isRefreshing={isBackgroundUpdating} />;
            case 'supervisorAttendanceReport':
                return <SupervisorAttendanceReportPage reportData={supervisorAttendanceReport} />;
            case 'dailyStudents':
                return <DailyStudentReportPage students={dailyStudents} />;
            case 'dailyCircles':
                return <DailyCircleReportPage students={dailyStudents} supervisors={supervisors} />;
            case 'exam':
                return authenticatedUser && <ExamPage onSubmit={handlePostExam} isSubmitting={isSubmitting} students={registeredStudents} authenticatedUser={authenticatedUser} />;
            case 'examReport':
                return <ExamReportPage examData={examData} />;
            case 'studentFollowUp':
                return <StudentFollowUpPage students={students} />;
            case 'studentAttendanceReport':
                return <StudentAttendanceReportPage students={dailyStudents} />;
            case 'studentAbsenceReport':
                return <StudentAbsenceReportPage students={dailyStudents} />;
            case 'settings':
                return authenticatedUser && <SettingsPage settings={settings} onSave={handlePostSettings} isSubmitting={isSubmitting} dailyStudents={dailyStudents} />;
            case 'teacherList':
                return <TeacherListPage students={students} />;
            default:
                return <GeneralReportPage students={students} dailyStudents={dailyStudents} settings={settings} />;
        }
    };
    
    return (
        <div className="flex h-screen bg-stone-100" dir="rtl">
            <div className={`print-hidden lg:flex lg:flex-shrink-0 fixed lg:relative inset-y-0 right-0 z-40 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`}>
                <Sidebar currentPage={currentPage} onNavigate={handleNavigation} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(prev => !prev)} authenticatedUser={authenticatedUser} />
            </div>
            {isMobileSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)}></div>}
            <main className={`flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300`}>
                <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-20 p-4 md:p-6 border-b border-stone-200 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold text-stone-800">{titles[currentPage]}</h1>
                        {isBackgroundUpdating && <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full animate-pulse">جاري التحديث...</span>}
                    </div>
                    <button className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-md" onClick={() => setIsMobileSidebarOpen(true)}><MenuIcon className="w-6 h-6" /></button>
                </header>
                <div className="p-4 md:p-6">{renderPage()}</div>
            </main>
            {showPasswordModal && <PasswordModal onSuccess={(user) => { setAuthenticatedUser(user); setShowPasswordModal(false); }} onClose={() => { setShowPasswordModal(false); if (['evaluation', 'exam', 'settings'].includes(currentPage)) setCurrentPage('general'); }} supervisors={supervisors} productors={productors} teachersInfo={teachersInfo} />}
            <Notification notification={notification} onClose={() => setNotification(null)} />
        </div>
    );
};

export default App;
