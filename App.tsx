
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
import type { RawStudentData, ProcessedStudentData, Achievement, ExamSubmissionData, RawSupervisorData, SupervisorData, RawTeacherAttendanceData, TeacherDailyAttendance, TeacherInfo, RawSupervisorAttendanceData, SupervisorAttendanceReportEntry, SupervisorDailyAttendance, SupervisorInfo, RawExamData, ProcessedExamData, RawRegisteredStudentData, ProcessedRegisteredStudentData, RawSettingData, ProcessedSettingsData, RawTeacherInfo, EvalQuestion, EvalSubmissionPayload, ProcessedEvalResult, RawEvalResult, RawProductorData, ProductorData, CombinedTeacherAttendanceEntry, AuthenticatedUser } from './types';
import { MenuIcon } from './components/icons';

const API_URL = 'https://script.google.com/macros/s/AKfycbzUUEJKndeH57my0QQd7UstCbsU6BftKOqR6vb83QkHN9tkGT3MTKuc16Zs8U43P8b1/exec';
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
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
        .replace(/\s+/g, ' ') // Standardize whitespace
        .replace(/[إأآا]/g, 'ا') // Unify Alif
        .replace(/[يى]/g, 'ي')     // Unify Ya
        .replace(/ة/g, 'ه')       // Unify Ta Marbuta
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
        const supervisorId = (item['id'] || '').trim();
        const supervisorName = (item['المشرف'] || '').trim();
        const password = (item['كلمة المرور'] || '').trim();
        const circle = (item['الحلقة'] || '').trim();

        if (supervisorId && supervisorName && password) {
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

const getTimestampFromItem = (item: RawTeacherAttendanceData | RawSupervisorAttendanceData): Date | null => {
    let timestamp: Date | null = null;
    const dateProcessValue = item['تاريخ العملية'];
    const timeProcessValue = item['وقت العملية'];

    const isValidDate = (d: Date) => !isNaN(d.getTime());

    if (!dateProcessValue || typeof dateProcessValue === 'object' || 
        !timeProcessValue || typeof timeProcessValue === 'object') {
        return null;
    }

    if (dateProcessValue && timeProcessValue) {
        try {
            const dateProcessStr = String(dateProcessValue);
            const timeProcessStr = String(timeProcessValue);

            if (dateProcessStr.includes('object') || timeProcessStr.includes('object')) {
                return null;
            }

            let year: number, month: number, day: number;

            const dateMatch = dateProcessStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (dateMatch) {
                year = Number(dateMatch[1]);
                month = Number(dateMatch[2]);
                day = Number(dateMatch[3]);
            } else {
                const d = new Date(dateProcessStr);
                if (!isValidDate(d)) return null; 
                year = d.getFullYear();
                month = d.getMonth() + 1;
                day = d.getDate();
            }

            if (year < 2023) return null;

            let timeString = timeProcessStr.trim();
            let isPM = false;
            
            if (timeString.includes('م')) {
                isPM = true;
                timeString = timeString.replace(/م/g, '').trim();
            } else if (timeString.includes('ص')) {
                timeString = timeString.replace(/ص/g, '').trim();
            }

            if (timeString.includes('T')) {
                timeString = timeString.split('T')[1];
            } else if (timeString.includes(' ')) {
                timeString = timeString.split(' ').pop() || '';
            }

            timeString = timeString.replace('Z', '').split('.')[0];

            const timeParts = timeString.split(':').map(Number);
            if (timeParts.length < 2 || timeParts.some(p => isNaN(p))) return null;

            let [hour, minute, second = 0] = timeParts;

            if (isPM && hour < 12) {
                hour += 12;
            } else if (!isPM && hour === 12) {
                hour = 0;
            }

            const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            
            if (isValidDate(utcDate)) {
                timestamp = utcDate;
            }

        } catch (e) {
             // fail silently
        }
    }
    
    if (!timestamp && item.time) {
        const ts = new Date(item.time);
        if (isValidDate(ts) && ts.getFullYear() >= 2023) {
            timestamp = ts;
        }
    }
    
    return timestamp;
};

const processTeachersInfoData = (data: RawTeacherInfo[]): TeacherInfo[] => {
    return data
        .map(item => ({
            id: item['teacher_id'],
            name: normalizeArabicForMatch(item['المعلم'] || ''),
            circle: (item['الحلقات'] || '').trim()
        }))
        .filter(item => item.id != null && item.name && item.circle);
};

const processTeacherAttendanceData = (data: RawTeacherAttendanceData[], allTeachers: TeacherInfo[]): TeacherDailyAttendance[] => {
    const timeZone = 'Asia/Riyadh';
    const todayRiyadhStr = new Date().toLocaleDateString('en-CA', { timeZone });

    const teacherRecords = new Map<number, { teacherName: string, checkIn: Date | null, checkOut: Date | null, checkInNote: string | null, checkOutNote: string | null }>();

    allTeachers.forEach(t => {
        teacherRecords.set(t.id, { teacherName: t.name, checkIn: null, checkOut: null, checkInNote: null, checkOutNote: null });
    });

    data.forEach(item => {
        const teacherId = item.teacher_id;
        if (teacherId == null) return;

        const timestamp = getTimestampFromItem(item);
        if (!timestamp) return;
        
        const itemDateRiyadhStr = timestamp.toLocaleDateString('en-CA', { timeZone });
        const status = (item.status || '').trim();
        const note = (item['ملاحظات'] || '').trim();

        if (itemDateRiyadhStr === todayRiyadhStr && teacherRecords.has(teacherId)) {
            const record = teacherRecords.get(teacherId)!;
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

    return Array.from(teacherRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        
        const combinedNotes = [record.checkInNote, record.checkOutNote].filter(Boolean).join('، ');
        return { teacherName: record.teacherName, checkIn: record.checkIn, checkOut: record.checkOut, status, notes: combinedNotes || undefined };
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
        const supervisorId = item.id;
        if (!supervisorId) return;
        const timestamp = getTimestampFromItem(item);
        if (!timestamp) return;
        const itemDateRiyadhStr = timestamp.toLocaleDateString('en-CA', { timeZone });
        const status = (item.status || '').trim();

        if (itemDateRiyadhStr === todayRiyadhStr && supervisorRecords.has(supervisorId)) {
            const record = supervisorRecords.get(supervisorId)!;
            if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
                if (!record.checkIn || timestamp < record.checkIn) record.checkIn = timestamp;
            } else if (status === 'انصراف') {
                 if (!record.checkOut || timestamp > record.checkOut) record.checkOut = timestamp;
            }
        }
    });

    return Array.from(supervisorRecords.values()).map(record => {
        let status: 'لم يحضر' | 'حاضر' | 'مكتمل الحضور' = 'لم يحضر';
        if (record.checkIn && record.checkOut) status = 'مكتمل الحضور';
        else if (record.checkIn) status = 'حاضر';
        return { supervisorName: record.supervisorName, checkIn: record.checkIn, checkOut: record.checkOut, status };
    });
};

const processTeacherAttendanceReportData = (data: RawTeacherAttendanceData[], teachersInfo: TeacherInfo[]): CombinedTeacherAttendanceEntry[] => {
    const teacherIdToNameMap = new Map<number, string>();
    teachersInfo.forEach(t => teacherIdToNameMap.set(t.id, t.name));
    const allTeacherIdsForReport = new Set(teachersInfo.map(t => t.id));

    const getDateString = (item: any): string | null => {
        const dateVal = item['تاريخ العملية'];
        if (dateVal && typeof dateVal === 'string') {
            if (dateVal.match(/^\d{4}-\d{2}-\d{2}$/)) return dateVal;
            if (dateVal.match(/^\d{4}-\d{2}-\d{2}T/)) return dateVal.split('T')[0];
        }
        const ts = getTimestampFromItem(item);
        if (ts) {
             const year = ts.getFullYear();
             const month = String(ts.getMonth() + 1).padStart(2, '0');
             const day = String(ts.getDate()).padStart(2, '0');
             return `${year}-${month}-${day}`;
        }
        return null;
    };

    const dailyRecords = new Map<string, { teacherId: number; date: string; checkIns: Date[]; checkOuts: Date[]; notes: Set<string>; }>();

    data.forEach(item => {
        const teacherId = item.teacher_id;
        if (teacherId == null) return;
        
        const dateString = getDateString(item);
        if (!dateString) return;

        const timestamp = getTimestampFromItem(item); 
        if (!timestamp) return;

        const mapKey = `${teacherId}/${dateString}`;

        if (!dailyRecords.has(mapKey)) {
            dailyRecords.set(mapKey, { teacherId, date: dateString, checkIns: [], checkOuts: [], notes: new Set() });
        }
        const record = dailyRecords.get(mapKey)!;
        const note = (item['ملاحظات'] || '').trim();
        if (note) record.notes.add(note);
        const status = (item.status || '').trim();
        if (status === 'حضور' || status === 'الحض' || status === 'الحضور') record.checkIns.push(timestamp);
        else if (status === 'انصراف') record.checkOuts.push(timestamp);
    });

    if (data.length > 0 || allTeacherIdsForReport.size > 0) {
        let minDateStr: string | null = null;
        let maxDateStr: string | null = null;

        Array.from(dailyRecords.values()).forEach(rec => {
            if (!minDateStr || rec.date < minDateStr) minDateStr = rec.date;
            if (!maxDateStr || rec.date > maxDateStr) maxDateStr = rec.date;
        });

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        if (!maxDateStr || todayStr > maxDateStr) maxDateStr = todayStr;
        
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}-${String(oneYearAgo.getDate()).padStart(2, '0')}`;
        
        if (minDateStr && minDateStr < oneYearAgoStr) minDateStr = oneYearAgoStr;

        if (minDateStr && maxDateStr && minDateStr <= maxDateStr) {
            const workingDays = [0, 1, 2, 3];
            
            let currentDate = new Date(minDateStr);
            let loopSafety = 0;
            
            while (loopSafety < 400) {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                
                if (dateString > maxDateStr) break;

                if (workingDays.includes(currentDate.getDay())) {
                    allTeacherIdsForReport.forEach(teacherId => {
                        const mapKey = `${teacherId}/${dateString}`;
                        if (!dailyRecords.has(mapKey)) {
                            dailyRecords.set(mapKey, { teacherId, date: dateString, checkIns: [], checkOuts: [], notes: new Set() });
                        }
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
                loopSafety++;
            }
        }
    }

    let limitedRecords = Array.from(dailyRecords.values());
    // IMPORTANT: Sort DESCENDING by date first to keep the most recent records
    limitedRecords.sort((a, b) => b.date.localeCompare(a.date));

    if (limitedRecords.length > 50000) {
        limitedRecords = limitedRecords.slice(0, 50000);
    }

    return limitedRecords.map(record => {
        record.checkIns.sort((a, b) => a.getTime() - b.getTime());
        record.checkOuts.sort((a, b) => a.getTime() - b.getTime());
        const timeFormatOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' };
        const formatTime = (date: Date | undefined) => date ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', timeFormatOptions).format(date) : null;
        return {
            id: `${record.teacherId}/${record.date}`,
            teacherId: record.teacherId,
            teacherName: teacherIdToNameMap.get(record.teacherId) || `المعلم #${record.teacherId}`,
            date: record.date,
            checkInTime: formatTime(record.checkIns[0]),
            checkOutTime: formatTime(record.checkOuts[record.checkOuts.length - 1]),
            notes: Array.from(record.notes).join('، '),
        };
    });
};

const processSupervisorAttendanceReportData = (data: RawSupervisorAttendanceData[], allSupervisors: SupervisorData[]): SupervisorAttendanceReportEntry[] => {
    const timeZone = 'Asia/Riyadh';
    const supervisorIdToNameMap = new Map<string, string>();
    allSupervisors.forEach(s => supervisorIdToNameMap.set(s.id, s.supervisorName));
    const allSupervisorIdsForReport = new Set(allSupervisors.map(s => s.id));
    data.forEach(item => { if (item.id) allSupervisorIdsForReport.add(item.id); });

    const toRiyadhDateString = (date: Date): string => {
        const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
        return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
    };

    const dailyRecords = new Map<string, { supervisorId: string; date: string; checkIn: { time: string, timestamp: Date } | null; checkOut: { time: string, timestamp: Date } | null }>();

    data.forEach(item => {
        const supervisorId = item.id;
        if (!supervisorId) return;
        const timestamp = getTimestampFromItem(item);
        if (!timestamp) return;
        const timeForDisplay = timestamp.toLocaleTimeString('ar-EG-u-nu-latn', { timeZone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateString = toRiyadhDateString(timestamp);
        const mapKey = `${supervisorId}/${dateString}`;
        let entry = dailyRecords.get(mapKey);
        if (!entry) {
            entry = { supervisorId, date: dateString, checkIn: null, checkOut: null };
            dailyRecords.set(mapKey, entry);
        }
        const status = (item.status || '').trim();
        if (status === 'حضور' || status === 'الحض' || status === 'الحضور') {
            if (!entry.checkIn || timestamp < entry.checkIn.timestamp) entry.checkIn = { time: timeForDisplay, timestamp };
        } else if (status === 'انصراف') {
            if (!entry.checkOut || timestamp > entry.checkOut.timestamp) entry.checkOut = { time: timeForDisplay, timestamp };
        }
    });

    if (data.length > 0 || allSupervisorIdsForReport.size > 0) {
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        data.forEach(item => {
            const timestamp = getTimestampFromItem(item);
            if (!timestamp || isNaN(timestamp.getTime())) return;
            if (!minDate || timestamp < minDate) minDate = timestamp;
            if (!maxDate || timestamp > maxDate) maxDate = timestamp;
        });
        const today = new Date();
        if (!maxDate || today > maxDate) maxDate = today;
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (minDate && minDate < oneYearAgo) minDate = oneYearAgo;
        
        if (minDate && maxDate && minDate <= maxDate) {
            const workingDays = [0, 1, 2, 3];
            let currentDate = new Date(minDate);
            currentDate.setHours(0, 0, 0, 0);
            let loopSafety = 0;
            while (currentDate <= maxDate && loopSafety < 400) {
                if (workingDays.includes(currentDate.getDay())) {
                    const dateString = toRiyadhDateString(currentDate);
                    allSupervisorIdsForReport.forEach(supervisorId => {
                        const mapKey = `${dateString}/${supervisorId}`;
                        if (!dailyRecords.has(mapKey)) {
                            dailyRecords.set(mapKey, { supervisorId, date: dateString, checkIn: null, checkOut: null });
                        }
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
                loopSafety++;
            }
        }
    }

    return Array.from(dailyRecords.values()).map(record => ({
        supervisorName: supervisorIdToNameMap.get(record.supervisorId) || `مشرف #${record.supervisorId}`,
        date: record.date,
        checkInTime: record.checkIn ? record.checkIn.time : null,
        checkOutTime: record.checkOut ? record.checkOut.time : null,
    })).sort((a, b) => a.date > b.date ? -1 : 1);
};


const processData = (data: RawStudentData[]): ProcessedStudentData[] => {
    const studentWeekMap = new Map<string, ProcessedStudentData>();
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

        const memPages = parseAchievement(item["أوجه الحفظ"]);
        const revPages = parseAchievement(item["أوجه المراجه"]);
        const conPages = parseAchievement(item["أوجه التثبيت"]);
        const points = Number(item["اجمالي النقاط"]) || 0;
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
            attendance: parsePercentage(item["نسبة الحضور"]),
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
    };
};

type Page = 'students' | 'circles' | 'general' | 'dashboard' | 'notes' | 'evaluation' | 'excellence' | 'teacherAttendance' | 'teacherAttendanceReport' | 'dailyStudents' | 'dailyCircles' | 'dailyDashboard' | 'supervisorAttendance' | 'supervisorAttendanceReport' | 'exam' | 'examReport' | 'studentFollowUp' | 'studentAttendanceReport' | 'studentAbsenceReport' | 'settings' | 'teacherList';

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
         if (supervisorSheetData && Array.isArray(supervisorSheetData)) {
             const processedSupervisors = processSupervisorData(supervisorSheetData as RawSupervisorData[]);
             setSupervisors(processedSupervisors);
             
             const supervisorAttendanceRaw = dataContainer.respon || [];
             if (Array.isArray(supervisorAttendanceRaw)) {
                 setSupervisorAttendance(processSupervisorAttendanceData(supervisorAttendanceRaw as RawSupervisorAttendanceData[], processedSupervisors));
                 setSupervisorAttendanceReport(processSupervisorAttendanceReportData(supervisorAttendanceRaw as RawSupervisorAttendanceData[], processedSupervisors));
             }
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

    useEffect(() => {
        if (authenticatedUser) {
            if (currentPage === 'settings' && authenticatedUser.role !== 'admin') {
                setNotification({ message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.', type: 'error' });
                setCurrentPage('general');
            } else if (currentPage === 'exam' && !['admin', 'exam_teacher'].includes(authenticatedUser.role)) {
                setNotification({ message: 'هذه الصفحة مخصصة لمعلمي الاختبارات والإدارة فقط.', type: 'error' });
                setCurrentPage('general');
            }
        }
    }, [authenticatedUser, currentPage]);

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
    
    const handlePostTeacherAttendance = async (teacherId: number, teacherName: string, action: 'حضور' | 'انصراف') => {
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
        } else { 
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
            "teacher_id": teacherId,
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

    const handlePostSupervisorAttendance = async (supervisorId: string, action: 'حضور' | 'انصراف') => {
        const supervisor = supervisors.find(s => s.id === supervisorId);
        if (!supervisor) {
            setIsSubmitting(false);
            setNotification({ message: 'لم يتم العثور على المشرف.', type: 'error' });
            return;
        }
        const supervisorName = supervisor.supervisorName;

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
                "وقت تأخر حضور المشرفين": data.supervisor_late_checkin_time || '',
                "وقت انصراف مبكر للمشرفين": data.supervisor_early_checkout_time || '',
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

    const handleRefreshTeacherData = async () => {
        setIsBackgroundUpdating(true);
        try {
            const cacheBuster = `&v=${new Date().getTime()}`;
            const [teachersJson, attendanceJson] = await Promise.all([
                fetchWithRetry(`${API_URL}?sheetName=teachers${cacheBuster}`),
                fetchWithRetry(`${API_URL}?sheetName=attandance${cacheBuster}`)
            ]);

            // Handle variable structure from Apps Script
            const teachersRaw = teachersJson.data?.teachers || teachersJson.teachers || (Array.isArray(teachersJson.data) ? teachersJson.data : []) || [];
            const attendanceRaw = attendanceJson.data?.attandance || attendanceJson.attandance || (Array.isArray(attendanceJson.data) ? attendanceJson.data : []) || [];

            // Re-process Data
            const updatedTeachersInfo = processTeachersInfoData(teachersRaw as RawTeacherInfo[]);
            const updatedAttendanceLog = processTeacherAttendanceReportData(attendanceRaw as RawTeacherAttendanceData[], updatedTeachersInfo);
            const updatedDailyAttendance = processTeacherAttendanceData(attendanceRaw as RawTeacherAttendanceData[], updatedTeachersInfo);

            // Update State
            setTeachersInfo(updatedTeachersInfo);
            setCombinedTeacherAttendanceLog(updatedAttendanceLog);
            setTeacherAttendance(updatedDailyAttendance);

            // Update DB Cache for persistence
            const currentCache = await getFromDB(CACHE_KEY) || {};
            const newCache = {
                ...currentCache,
                teachers: teachersRaw,
                attandance: attendanceRaw
            };
            await saveToDB(CACHE_KEY, newCache);

            setNotification({ message: 'تم تحديث بيانات المعلمين والحضور بنجاح.', type: 'success' });
        } catch (e) {
            console.error("Refresh Error:", e);
            setNotification({ message: 'حدث خطأ أثناء تحديث البيانات.', type: 'error' });
        } finally {
            setIsBackgroundUpdating(false);
        }
    };

    const handleNavigation = (page: Page) => {
        setInitialStudentFilter(null);
        setInitialDailyStudentFilter(null);

        if (!authenticatedUser) {
            if (['evaluation', 'exam', 'settings'].includes(page)) {
                setCurrentPage(page);
                setShowPasswordModal(true);
                setIsMobileSidebarOpen(false);
                return;
            }
        } else {
            if (page === 'settings' && authenticatedUser.role !== 'admin') {
                setNotification({ message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.', type: 'error' });
                setIsMobileSidebarOpen(false);
                return;
            }
            if (page === 'exam' && !['admin', 'exam_teacher'].includes(authenticatedUser.role)) {
                setNotification({ message: 'هذه الصفحة مخصصة لمعلمي الاختبارات والإدارة فقط.', type: 'error' });
                setIsMobileSidebarOpen(false);
                return;
            }
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
                <p className="text-sm text-stone-500">قد يستغرق التحميل بضع دقائق إذا كانت البيانات كبيرة.</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-red-50 p-4 text-center">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-bold text-red-800 mb-2">فشل تحميل البيانات</h3>
                    <p className="text-stone-600 mb-6">{error}</p>
                    <button 
                        onClick={loadData}
                        className="w-full px-4 py-2 bg-amber-500 text-white rounded-md font-semibold hover:bg-amber-600 transition-colors"
                    >
                        إعادة المحاولة
                    </button>
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
        teacherAttendance: `حضور وانصراف المعلمين`,
        teacherAttendanceReport: 'تقرير حضور المعلمين',
        supervisorAttendance: `حضور المشرفين`,
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
                return <TeacherAttendancePage allTeachers={asrTeachersInfo} attendanceStatus={teacherAttendance} onSubmit={handlePostTeacherAttendance} isSubmitting={isSubmitting} submittingTeacher={submittingTeacher} authenticatedUser={authenticatedUser} />;
            case 'teacherAttendanceReport':
                return <TeacherAttendanceReportPage 
                            reportData={combinedTeacherAttendanceLog} 
                            // teachersList={asrTeachersInfo} removed prop
                            onRefresh={handleRefreshTeacherData}
                            isRefreshing={isBackgroundUpdating}
                       />;
            case 'supervisorAttendance':
                return <SupervisorAttendancePage allSupervisors={supervisors.map(s => ({ id: s.id, name: s.supervisorName }))} attendanceStatus={supervisorAttendance} onSubmit={handlePostSupervisorAttendance} isSubmitting={isSubmitting} submittingSupervisor={submittingSupervisor} authenticatedUser={authenticatedUser} />;
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

            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300">
                <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-20 p-4 md:p-6 border-b border-stone-200 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold text-stone-800">{titles[currentPage]}</h1>
                        {isBackgroundUpdating && (
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full animate-pulse">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                جاري التحديث...
                            </span>
                        )}
                    </div>
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
                        if (currentPage === 'settings' && user.role !== 'admin') {
                            setNotification({ message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.', type: 'error' });
                            setCurrentPage('general');
                        } else if (currentPage === 'exam' && !['admin', 'exam_teacher'].includes(user.role)) {
                            setNotification({ message: 'هذه الصفحة مخصصة لمعلمي الاختبارات والإدارة فقط.', type: 'error' });
                            setCurrentPage('general');
                        }
                    }}
                    onClose={() => {
                        setShowPasswordModal(false);
                        if (['evaluation', 'exam', 'settings'].includes(currentPage)) {
                            setCurrentPage('general');
                        }
                    }}
                    supervisors={supervisors}
                    productors={productors}
                    teachersInfo={teachersInfo}
                />
            )}
            <Notification notification={notification} onClose={() => setNotification(null)} />
        </div>
    );
};

export default App;
