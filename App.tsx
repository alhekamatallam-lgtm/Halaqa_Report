
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
import StudentFollowUpPage from './pages/StudentFollowUpPage';
import StudentAttendanceReportPage from './pages/StudentAttendanceReportPage';
import StudentAbsenceReportPage from './pages/StudentAbsenceReportPage';
import SettingsPage from './pages/SettingsPage';
import TeacherListPage from './pages/TeacherListPage';
import PasswordModal from './components/PasswordModal';
import { Sidebar } from './components/Sidebar';
import Notification from './components/Notification';
import type { RawStudentData, ProcessedStudentData, Achievement, ExamSubmissionData, RawSupervisorData, SupervisorData, RawTeacherAttendanceData, TeacherDailyAttendance, TeacherAttendanceReportEntry, TeacherInfo, RawSupervisorAttendanceData, SupervisorAttendanceReportEntry, SupervisorDailyAttendance, SupervisorInfo, RawExamData, ProcessedExamData, RawRegisteredStudentData, ProcessedRegisteredStudentData, RawSettingData, ProcessedSettingsData, RawTeacherInfo, EvalQuestion, EvalSubmissionPayload, ProcessedEvalResult, RawEvalResult } from './types';
import { MenuIcon } from './components/icons';

const API_URL = 'https://script.google.com/macros/s/AKfycbxnWt66AHyIyLK8PYm_nJnk4k4R-e3N1jVwa7WCshw3Lxd0OhljuYuALwQOQkTAqbI2/exec';
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

const processEvalResultsData = (
  data: RawEvalResult[],
  questions: EvalQuestion[]
): { processedResults: ProcessedEvalResult[]; headerMap: Map<number, string> } => {
  const headerMap = new Map<number, string>();
  const maxScore = questions.reduce((sum, q) => sum + q.mark, 0);

  // Build the header map from the first data row and the questions list for robust matching.
  if (data.length > 0) {
    const firstRow = data[0];
    const headers = Object.keys(firstRow);
    const normalize = (text: string): string =>
      String(text || '')
        .normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF\s]/g, '') // Remove zero-width chars and all whitespace
        .replace(/[إأآا]/g, 'ا'); // Unify Alif

    questions.forEach(q => {
      const normalizedQue = normalize(q.que);
      const foundHeader = headers.find(h => normalize(h) === normalizedQue);
      if (foundHeader) {
        headerMap.set(q.id, foundHeader.trim()); // Store the exact, trimmed header
      } else {
        // Fallback for safety, use the question from the 'eval' sheet
        headerMap.set(q.id, q.que.trim());
      }
    });
  } else {
    // If there's no previous data, we assume the `eval` sheet's questions are the headers
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

const processTeachersInfoData = (data: RawTeacherInfo[]): TeacherInfo[] => {
    return data
        .filter(item => (item['وقت الحلقة'] || '').trim() === 'العصر')
        .map(item => ({
            name: (item['المعلم'] || '').trim(),
            circle: (item['الحلقات'] || '').trim()
        }))
        .filter(item => item.name && item.circle);
};

const processTeacherAttendanceData = (data: RawTeacherAttendanceData[], allTeacherNames: string[]): TeacherDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadh = new Date(new Date().toLocaleString('en-US', { timeZone }));
    todayRiyadh.setHours(0, 0, 0, 0);

    const teacherRecords = new Map<string, { checkIn: Date | null, checkOut: Date | null, checkInNote: string | null, checkOutNote: string | null }>();

    allTeacherNames.forEach(name => {
        teacherRecords.set(name, { checkIn: null, checkOut: null, checkInNote: null, checkOutNote: null });
    });

    data.forEach(item => {
        const timestamp = new Date(item['time']);
        const itemDateRiyadh = new Date(timestamp.toLocaleString('en-US', { timeZone }));
        itemDateRiyadh.setHours(0, 0, 0, 0);
        
        const teacherName = (item['name'] || '').trim();
        const status = (item.status || '').trim();
        const note = (item['ملاحظات'] || '').trim();

        if (itemDateRiyadh.getTime() === todayRiyadh.getTime() && teacherRecords.has(teacherName)) {
            const record = teacherRecords.get(teacherName)!;

            if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
                if (!record.checkIn || timestamp < record.checkIn) {
                    record.checkIn = timestamp;
                    record.checkInNote = note || null;
                }
            } else if (status === 'انصراف') {
                if (!record.checkOut || timestamp > record.checkOut) {
                    record.checkOut = timestamp;
                    record.checkOutNote = note || null;
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
        
        const combinedNotes = [times.checkInNote, times.checkOutNote].filter(Boolean).join('، ');
        
        return {
            teacherName,
            checkIn: times.checkIn,
            checkOut: times.checkOut,
            status,
            notes: combinedNotes || undefined,
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

    return data.map((item, index): ProcessedStudentData | null => {
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
            attendance: parsePercentage(item["نسبة الحضور"]),
            totalPoints: item["اجمالي النقاط"] || 0,
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
    return data
        .map(item => {
            const studentName = normalize(item["الطالب"]);
            const circle = normalize(item["الحلقة"]);
            if (!studentName || !circle) return null;
            return { studentName, circle };
        })
        .filter((item): item is ProcessedRegisteredStudentData => item !== null);
};

const extractTimeFromSheetDate = (value: string | undefined): string => {
    if (!value || typeof value !== 'string') {
        return '';
    }
    // Find the HH:mm part in the string.
    const timeMatch = value.match(/\d{2}:\d{2}/);
    if (timeMatch) {
        return timeMatch[0]; // Returns "HH:mm"
    }
    return '';
};

const processSettingsData = (data: RawSettingData[]): ProcessedSettingsData => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return {};
    }
    const firstRow = data[0];
    if (!firstRow) return {};

    return {
        default_student_count_day: firstRow["اليوم الافتراضي"] || '',
        teacher_late_checkin_time: extractTimeFromSheetDate(firstRow["وقت تأخر حضور المعلمين"]),
        teacher_early_checkout_time: extractTimeFromSheetDate(firstRow["وقت انصراف مبكر للمعلمين"]),
    };
};

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'teacherAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendance' | 'supervisorAttendanceReport' | 'exam' | 'examReport' | 'studentFollowUp' | 'studentAttendanceReport' | 'studentAbsenceReport' | 'settings' | 'teacherList';
type AuthenticatedUser = { role: 'admin' | 'supervisor', name: string, circles: string[] };

const App: React.FC = () => {
    const [students, setStudents] = useState<ProcessedStudentData[]>([]);
    const [dailyStudents, setDailyStudents] = useState<ProcessedStudentData[]>([]);
    const [evalQuestions, setEvalQuestions] = useState<EvalQuestion[]>([]);
    const [evalResults, setEvalResults] = useState<ProcessedEvalResult[]>([]);
    const [evalHeaderMap, setEvalHeaderMap] = useState<Map<number, string>>(new Map());
    const [examData, setExamData] = useState<ProcessedExamData[]>([]);
    const [registeredStudents, setRegisteredStudents] = useState<ProcessedRegisteredStudentData[]>([]);
    const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
    const [teachersInfo, setTeachersInfo] = useState<TeacherInfo[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<TeacherDailyAttendance[]>([]);
    const [teacherAttendanceReport, setTeacherAttendanceReport] = useState<TeacherAttendanceReportEntry[]>([]);
    const [supervisorAttendance, setSupervisorAttendance] = useState<SupervisorDailyAttendance[]>([]);
    const [supervisorAttendanceReport, setSupervisorAttendanceReport] = useState<SupervisorAttendanceReportEntry[]>([]);
    const [settings, setSettings] = useState<ProcessedSettingsData>({});
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

                let currentAsrTeachers: TeacherInfo[] = [];
                const teachersSheetData = dataContainer.teachers;
                if (teachersSheetData && Array.isArray(teachersSheetData)) {
                    currentAsrTeachers = processTeachersInfoData(teachersSheetData as RawTeacherInfo[]);
                }
                setTeachersInfo(currentAsrTeachers);
                const currentAsrTeacherNames = currentAsrTeachers.map(t => t.name);
                
                const attendanceRaw = dataContainer.attandance || [];
                if (attendanceRaw && Array.isArray(attendanceRaw)) {
                    const rawAttendanceData = attendanceRaw as RawTeacherAttendanceData[];
                    const processedAttendance = processTeacherAttendanceData(rawAttendanceData, currentAsrTeacherNames);
                    setTeacherAttendance(processedAttendance);

                    const processedReport = processTeacherAttendanceReportData(rawAttendanceData, currentAsrTeacherNames);
                    setTeacherAttendanceReport(processedReport);
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
                    const processedSettings = processSettingsData(sanitizedSettingsRaw as RawSettingData[]);
                    setSettings(processedSettings);
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
            const evaluationResponse = await fetch(`${API_URL}?sheetName=Eval_result${cacheBuster}`);
            if (!evaluationResponse.ok) throw new Error(`خطأ في تحديث البيانات: ${evaluationResponse.statusText}`);
            const evaluationJson = await evaluationResponse.json();
            
            const dataContainer = evaluationJson.data || evaluationJson;
            const refreshedResultsRaw = dataContainer['Eval_result'] || (Array.isArray(dataContainer) ? dataContainer : []);
            
            if (!Array.isArray(refreshedResultsRaw)) {
                 throw new Error('تنسيق بيانات التقييم المحدثة غير صالح.');
            }

            const { processedResults, headerMap } = processEvalResultsData(refreshedResultsRaw as RawEvalResult[], evalQuestions);
            setEvalResults(processedResults);
            setEvalHeaderMap(headerMap);
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

        const timeZone = 'Asia/Riyadh';
        const riyadhTimeParts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        }).formatToParts(now);

        let riyadhHour = parseInt(riyadhTimeParts.find(p => p.type === 'hour')?.value || '0');
        if (riyadhHour === 24) riyadhHour = 0; // Handle midnight case
        const riyadhMinute = parseInt(riyadhTimeParts.find(p => p.type === 'minute')?.value || '0');

        const lateTime = settings.teacher_late_checkin_time || '15:25';
        const earlyTime = settings.teacher_early_checkout_time || '16:50';

        const [lateHour, lateMinute] = lateTime.split(':').map(Number);
        const [earlyHour, earlyMinute] = earlyTime.split(':').map(Number);

        let note = '';
        if (action === 'حضور') {
            if (riyadhHour > lateHour || (riyadhHour === lateHour && riyadhMinute > lateMinute)) {
                note = 'حضر متأخر';
            }
        } else { // action === 'انصراف'
            if (riyadhHour < earlyHour || (riyadhHour === earlyHour && riyadhMinute < earlyMinute)) {
                note = 'انصراف مبكر';
            }
        }

        if (action === 'حضور') {
            updatedTeacher.checkIn = now;
            updatedTeacher.status = 'حاضر';
            if (note) {
                 updatedTeacher.notes = [note, updatedTeacher.notes].filter(Boolean).join('، ');
            }
        } else {
            updatedTeacher.checkOut = now;
            updatedTeacher.status = 'مكتمل الحضور';
            if (note) {
                 updatedTeacher.notes = [updatedTeacher.notes, note].filter(Boolean).join('، ');
            }
        }

        const newAttendance = [...teacherAttendance];
        newAttendance[teacherIndex] = updatedTeacher;
        setTeacherAttendance(newAttendance);
        
        const payload: { [key: string]: any } = {
            sheet: 'attandance',
            "name": teacherName,
            "status": action,
            "time": now.toISOString(),
        };

        if (note) {
            payload["ملاحظات"] = note;
        }

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

    const handlePostSettings = async (data: ProcessedSettingsData) => {
        setIsSubmitting(true);
        setNotification(null);
        const originalSettings = { ...settings };
        setSettings(data);
    
        try {
            const updateUrl = `${API_URL}?action=updateSettings`;
            const payload = {
                sheet: 'setting',
                keyField: 'الرقم',
                "الرقم": 1, 
                "اليوم الافتراضي": data.default_student_count_day,
                "وقت تأخر حضور المعلمين": data.teacher_late_checkin_time || '',
                "وقت انصراف مبكر للمعلمين": data.teacher_early_checkout_time || '',
            };
            await fetch(updateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
             setNotification({ message: 'تم حفظ الإعدادات بنجاح!', type: 'success' });
        } catch (err) {
             if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                console.log('Fetch error (settings), likely redirect. Assuming success.');
                setNotification({ message: 'تم حفظ الإعدادات بنجاح!', type: 'success' });
            } else {
                console.error("فشل في حفظ الإعدادات:", err);
                setNotification({ message: 'فشل حفظ الإعدادات.', type: 'error' });
                setSettings(originalSettings);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNavigation = (page: Page) => {
        setInitialStudentFilter(null);
        setInitialDailyStudentFilter(null);

        // Unauthenticated access check
        if (!authenticatedUser) {
            if (page === 'evaluation' || page === 'exam' || page === 'settings') {
                setCurrentPage(page);
                setShowPasswordModal(true);
                setIsMobileSidebarOpen(false);
                return;
            }
        } else { // Authenticated user
            // Role-based access check
            if (page === 'settings' && authenticatedUser.role !== 'admin') {
                setNotification({ message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.', type: 'error' });
                setIsMobileSidebarOpen(false);
                return; // Block navigation
            }
        }
        
        setCurrentPage(page);
        setShowPasswordModal(false); // Make sure modal is closed if we navigate somewhere else
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
        evaluation: `زيارات الحلقات ${authenticatedUser ? `- ${authenticatedUser.name}` : ''}`,
        excellence: 'تميز الحلقات',
        teacherAttendance: 'حضور وانصراف المعلمين',
        teacherAttendanceReport: 'تقرير حضور المعلمين',
        supervisorAttendance: 'حضور المشرفين',
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
                return authenticatedUser && <EvaluationPage 
                    onSubmit={handlePostEvaluation} 
                    isSubmitting={isSubmitting} 
                    authenticatedUser={authenticatedUser} 
                    evalQuestions={evalQuestions} 
                    evalResults={evalResults} 
                    evalHeaderMap={evalHeaderMap}
                    dailyStudents={dailyStudents}
                    settings={settings} />;
            case 'excellence':
                return <ExcellencePage students={students} supervisors={supervisors} />;
            case 'teacherAttendance':
                return <TeacherAttendancePage allTeachers={asrTeachersInfo} attendanceStatus={teacherAttendance} onSubmit={handlePostTeacherAttendance} isSubmitting={isSubmitting} submittingTeacher={submittingTeacher} />;
            case 'teacherAttendanceReport':
                return <TeacherAttendanceReportPage reportData={teacherAttendanceReport} />;
            case 'supervisorAttendance':
                return <SupervisorAttendancePage allSupervisors={supervisors.map(s => ({ name: s.supervisorName }))} attendanceStatus={supervisorAttendance} onSubmit={handlePostSupervisorAttendance} isSubmitting={isSubmitting} submittingSupervisor={submittingSupervisor} />;
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
            <div 
                className={`
                    print-hidden
                    lg:flex lg:flex-shrink-0 
                    fixed lg:relative inset-y-0 right-0 z-40
                    transition-transform duration-300 ease-in-out
                    ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0
                `}
            >
                <Sidebar 
                    currentPage={currentPage} 
                    onNavigate={handleNavigation} 
                    isCollapsed={isSidebarCollapsed} 
                    onToggle={() => setIsSidebarCollapsed(prev => !prev)} 
                    authenticatedUser={authenticatedUser}
                />
            </div>

            {isMobileSidebarOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} aria-hidden="true"></div>
            )}

            <main className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'}`}>
                <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-20 p-4 md:p-6 border-b border-stone-200 flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-stone-800">{titles[currentPage]}</h1>
                    <button
                        className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-md"
                        onClick={() => setIsMobileSidebarOpen(true)}
                        aria-label="Open sidebar"
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-4 md:p-6">
                    {renderPage()}
                </div>
            </main>
            {showPasswordModal && (
                <PasswordModal
                    onSuccess={(user) => {
                        setAuthenticatedUser(user);
                        setShowPasswordModal(false);
                        // After successful login, if the target page was settings and user is not admin, handle it
                        if (currentPage === 'settings' && user.role !== 'admin') {
                            setNotification({ message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.', type: 'error' });
                            setCurrentPage('general'); // Redirect to a default page
                        }
                    }}
                    onClose={() => {
                        setShowPasswordModal(false);
                        // If user closes modal without logging in, redirect from protected page
                        if (['evaluation', 'exam', 'settings'].includes(currentPage)) {
                            setCurrentPage('general');
                        }
                    }}
                    supervisors={supervisors}
                />
            )}
            <Notification notification={notification} onClose={() => setNotification(null)} />
        </div>
    );
};

export default App;
