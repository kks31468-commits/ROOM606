/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Award, Search, Heart, MessageSquare, 
  ExternalLink, GraduationCap, ChevronLeft, ChevronRight, X, 
  RefreshCw, Download, Layers, Sun, Moon, Home, Eye, Send
} from 'lucide-react';
import {
  CanvaPosterRenderer,
  downloadCanvaPosterAsPng,
  type CanvaSyncedPage,
  type CanvaSyncResponse
} from './components/CanvaPosterRenderer';
import { ScheduleSection } from './components/ScheduleSection';
import { AdmissionStatsSection, splitPosterUniversities } from './components/AdmissionStatsSection';
import {
  createGuestbookNote,
  fetchGuestbookNotes,
  getScheduleImageSrc,
  hitVisitorCounter,
  syncCanvaData,
} from './lib/backend';

interface Student {
  no: number;
  id: string;
  prefix: 'นาย' | 'นางสาว';
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  nickname?: string;
  dream?: string;
  ig?: string;
  quote?: string;
  classRole?: 'หัวหน้าห้อง' | 'รองหัวหน้าห้อง';
}

const studentsData: Student[] = [
  { no: 1, id: '31192', prefix: 'นางสาว', firstName: 'กมลลักษณ์', lastName: 'สถานพงษ์', gender: 'F', nickname: 'การ์ตูน', dream: 'แพทย์/ทันตแพทย์', quote: 'ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น' },
  { no: 2, id: '31193', prefix: 'นางสาว', firstName: 'ชาลิสา', lastName: 'สบายดี', gender: 'F', nickname: 'ลิสา', dream: 'เภสัชศาสตร์', quote: 'ยิ้มเข้าไว้ โลกสดใสเสมอ' },
  { no: 3, id: '31201', prefix: 'นางสาว', firstName: 'ปทิตตา', lastName: 'ระงับภัย', gender: 'F', nickname: 'มายด์', dream: 'วิศวกรรมคอมพิวเตอร์', quote: 'Code better, live better.' },
  { no: 4, id: '31271', prefix: 'นาย', firstName: 'อนุภาพ', lastName: 'พิลาพงษ์', gender: 'M', nickname: 'ภาพ', dream: 'วิศวกรรมโยธา', quote: 'อนาคตสร้างได้ด้วยสองมือ' },
  { no: 5, id: '31295', prefix: 'นาย', firstName: 'วิทยาธร', lastName: 'บุรกรณ์', gender: 'M', nickname: 'ธร', dream: 'วิทยาศาสตร์การกีฬา', quote: 'สุขภาพดีคือลาภอันประเสริฐ' },
  { no: 6, id: '31306', prefix: 'นาย', firstName: 'ธิติวัฒน์', lastName: 'เปี่ยมธราพัฒน์', gender: 'M', nickname: 'ท็อป', dream: 'แพทย์ศาสตร์', quote: 'คิดให้ใหญ่ ลุยให้สุด' },
  { no: 7, id: '31340', prefix: 'นาย', firstName: 'ปฏิรพ', lastName: 'บานชื่น', gender: 'M', nickname: 'ภพ', dream: 'เทคโนโลยีสารสนเทศ', quote: 'เรียนรู้ไม่มีวันสิ้นสุด' },
  { no: 8, id: '31352', prefix: 'นางสาว', firstName: 'กฤษติญา', lastName: 'อินตา', gender: 'F', nickname: 'ก้อย', dream: 'พยาบาลศาสตร์', quote: 'ทำวันนี้ให้ดีที่สุด' },
  { no: 9, id: '31359', prefix: 'นางสาว', firstName: 'ฐิตินันท์', lastName: 'ไกลถิ่น', gender: 'F', nickname: 'นันท์', dream: 'บัญชีและการเงิน', quote: 'เงินทองเป็นของมายา หน้าตาซิของจริง' },
  { no: 10, id: '31370', prefix: 'นางสาว', firstName: 'สุพิชชา', lastName: 'ศรีนาค', gender: 'F', nickname: 'พิชชา', dream: 'มนุษยศาสตร์', quote: 'ภาษาคือสะพานเชื่อมโลก' },
  { no: 11, id: '31372', prefix: 'นางสาว', firstName: 'อัจฉริยาพร', lastName: 'สนใจ', gender: 'F', nickname: 'อัจ', dream: 'สถาปัตยกรรม', quote: 'งานศิลป์สะท้อนตัวตน' },
  { no: 12, id: '31375', prefix: 'นาย', firstName: 'กฤษณนันท์', lastName: 'แก้วธรรม', gender: 'M', nickname: 'กฤษ', dream: 'วิศวกรรมไฟฟ้า', quote: 'พลังงานขับเคลื่อนอนาคต' },
  { no: 13, id: '31379', prefix: 'นาย', firstName: 'ชลชาติ', lastName: 'กันตา', gender: 'M', nickname: 'ชาติ', dream: 'นิติศาสตร์', quote: 'ความยุติธรรมคืองานของเรา' },
  { no: 14, id: '31381', prefix: 'นาย', firstName: 'ญาณกิตต์', lastName: 'รับรอง', gender: 'M', nickname: 'กิตต์', dream: 'วิทยาการคอมพิวเตอร์', quote: 'Keep coding and never give up.' },
  { no: 15, id: '31409', prefix: 'นางสาว', firstName: 'วินิดา', lastName: 'สำรวย', gender: 'F', nickname: 'ดา', dream: 'ครุศาสตร์', quote: 'แม่พิมพ์ของชาติคือเป้าหมาย' },
  { no: 16, id: '31425', prefix: 'นาย', firstName: 'พฤติภูมิ', lastName: 'ยินดี', gender: 'M', nickname: 'ภูมิ', dream: 'วิศวกรรมเครื่องกล', quote: 'เครื่องยนต์กลไกคือชีวิต' },
  { no: 17, id: '31442', prefix: 'นางสาว', firstName: 'น้ำภูฟ้า', lastName: 'คำพินิจกุลเดช', gender: 'F', nickname: 'ฟ้า', dream: 'เทคนิคการแพทย์', quote: 'มุ่งมั่นสู่ฝันอันยิ่งใหญ่', classRole: 'รองหัวหน้าห้อง' },
  { no: 18, id: '31468', prefix: 'นาย', firstName: 'พงศกร', lastName: 'นาคมาก', gender: 'M', nickname: 'พงษ์', dream: 'วิศวกรรมคอมพิวเตอร์ / APE', quote: 'M.6/6 APE Khukhan School Pride!' },
  { no: 19, id: '31544', prefix: 'นาย', firstName: 'รัฐศาสตร์', lastName: 'รับขวัญ', gender: 'M', nickname: 'รัฐ', dream: 'รัฐศาสตร์', quote: 'รับผิดชอบต่อสังคม' },
  { no: 20, id: '31551', prefix: 'นางสาว', firstName: 'ญาดา', lastName: 'ใบธง', gender: 'F', nickname: 'ญาดา', dream: 'จิตวิทยา', quote: 'เข้าใจตัวเองเข้าใจผู้อื่น' },
  { no: 21, id: '31585', prefix: 'นาย', firstName: 'ปฏิปทา', lastName: 'พลนำ', gender: 'M', nickname: 'ปะ', dream: 'วิทยาศาสตร์การอาหาร', quote: 'กินดีอยู่ดีมีความสุข' },
  { no: 22, id: '31615', prefix: 'นาย', firstName: 'กิตติพงศ์', lastName: 'คำโท', gender: 'M', nickname: 'พงศ์', dream: 'วิศวกรรมโยธา', quote: 'สร้างรากฐานให้มั่นคง' },
  { no: 23, id: '31624', prefix: 'นาย', firstName: 'พีรพัฒน์', lastName: 'สมพงษ์', gender: 'M', nickname: 'พี', dream: 'แพทย์แผนไทยประยุกต์', quote: 'สมุนไพรไทยก้าวไกล' },
  { no: 24, id: '31627', prefix: 'นาย', firstName: 'ศิวัช', lastName: 'มูลเหล็ก', gender: 'M', nickname: 'วัช', dream: 'วิศวกรรมอากาศยาน', quote: 'บินให้สูงที่สุด' },
  { no: 25, id: '31638', prefix: 'นางสาว', firstName: 'ณัฐฑิตา', lastName: 'เจริญรัมย์', gender: 'F', nickname: 'ณัฐ', dream: 'บริหารธุรกิจ', quote: 'ธุรกิจรุ่งเรืองเฟื่องฟู' },
  { no: 26, id: '31693', prefix: 'นางสาว', firstName: 'สุจิรา', lastName: 'ปัตถา', gender: 'F', nickname: 'จิรา', dream: 'พยาบาลศาสตร์', quote: 'ด้วยรักและห่วงใย' },
  { no: 27, id: '31700', prefix: 'นาย', firstName: 'วิชยุตม์', lastName: 'สมบัติกำไร', gender: 'M', nickname: 'วิช', dream: 'เศรษฐศาสตร์', quote: 'เงินทองไหลมาเทมา', classRole: 'หัวหน้าห้อง' },
  { no: 28, id: '31720', prefix: 'นาย', firstName: 'ปัญจพล', lastName: 'ทองตัน', gender: 'M', nickname: 'ปั้น', dream: 'วิศวกรรมเคมี', quote: 'ปฏิกิริยาแห่งความสำเร็จ' },
  { no: 29, id: '31895', prefix: 'นาย', firstName: 'ธนกฤต', lastName: 'บุตรวงศ์', gender: 'M', nickname: 'กฤต', dream: 'เทคโนโลยีสารสนเทศ', quote: 'Data is the new oil.' },
  { no: 30, id: '34081', prefix: 'นาย', firstName: 'ธนาคาร', lastName: 'เสนชัย', gender: 'M', nickname: 'ธนา', dream: 'การเงินการธนาคาร', quote: 'ความมั่นคงทางการเงิน' },
  { no: 31, id: '34082', prefix: 'นาย', firstName: 'ธิติวุฒิ', lastName: 'ละออไสย์', gender: 'M', nickname: 'วุฒิ', dream: 'วิศวกรรมหุ่นยนต์', quote: 'Robotics will rule.' },
  { no: 32, id: '34083', prefix: 'นาย', firstName: 'ปารณัท', lastName: 'สรีโย', gender: 'M', nickname: 'ปาร', dream: 'นวัตกรรมดิจิทัล', quote: 'Innovate the future.' },
  { no: 33, id: '34085', prefix: 'นาย', firstName: 'พุฒิพงศ์', lastName: 'เรียมทอง', gender: 'M', nickname: 'พุฒิ', dream: 'วิศวกรรมสิ่งแวดล้อม', quote: 'Green earth, bright future.' },
  { no: 34, id: '34086', prefix: 'นาย', firstName: 'ภัทรกร', lastName: 'บุญขาว', gender: 'M', nickname: 'ภัทร', dream: 'ทันตแพทยศาสตร์', quote: 'รอยยิ้มสดใสเริ่มที่ฟัน' },
  { no: 35, id: '34087', prefix: 'นาย', firstName: 'วัชรศักดิ์', lastName: 'มนทอง', gender: 'M', nickname: 'ศักดิ์', dream: 'วิทยาศาสตร์การกีฬา', quote: 'แข็งแรงทั้งกายและใจ' },
  { no: 36, id: '34088', prefix: 'นางสาว', firstName: 'โมริยาห์', lastName: 'เหง้าใหม่', gender: 'F', nickname: 'โมริ', dream: 'อักษรศาสตร์', quote: 'ภาษาพาเพลิน' },
  { no: 37, id: '34089', prefix: 'นางสาว', firstName: 'วรรษชล', lastName: 'อุปมา', gender: 'F', nickname: 'ชล', dream: 'พยาบาลศาสตร์', quote: 'บริการด้วยใจ' },
  { no: 38, id: '34090', prefix: 'นางสาว', firstName: 'สวิตตา', lastName: 'พงษ์คละ', gender: 'F', nickname: 'สวิท', dream: 'นิเทศศาสตร์', quote: 'สื่อสารสร้างสรรค์สังคม' },
  { no: 39, id: '34091', prefix: 'นางสาว', firstName: 'สุชาดา', lastName: 'สีดาพันธ์', gender: 'F', nickname: 'ดา', dream: 'บัญชี', quote: 'ตัวเลขไม่เคยโกหกใคร' },
  { no: 40, id: '35064', prefix: 'นางสาว', firstName: 'จิราวรรณ', lastName: 'ทิพพรหม', gender: 'F', nickname: 'จิรา', dream: 'เภสัชศาสตร์', quote: 'ยารักษาโรค รอยยิ้มรักษาใจ' }
];


interface AdmissionPoster {
  id: number;
  studentNo: number;
  studentName: string;
  university: string;
  faculty: string;
  image: string;
  canvaPage?: CanvaSyncedPage | null;
}

function findStudentNoByName(name: string): number {
  const clean = name.replace(/\s+/g, '');
  const exact = studentsData.find(s => clean.includes(s.firstName) && clean.includes(s.lastName));
  if (exact) return exact.no;
  const byLastName = studentsData.filter(s => clean.includes(s.lastName));
  if (byLastName.length === 1) return byLastName[0].no;
  return 0;
}

const OFFICIAL_CANVA_URL = 'https://canva.link/forlinktoweb606';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'schedule' | 'admissions' | 'guestbook'>('home');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');
  const [admissionFilter, setAdmissionFilter] = useState<'all' | 'admitted' | 'pending'>('all');
  const [showScheduleImageModal, setShowScheduleImageModal] = useState(false);
  const [admissionSearch, setAdmissionSearch] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [selectedPoster, setSelectedPoster] = useState<AdmissionPoster | null>(null);

  const [canvaSyncData, setCanvaSyncData] = useState<CanvaSyncResponse | null>(null);
  const [isSyncingCanva, setIsSyncingCanva] = useState(true);
  const [canvaSyncError, setCanvaSyncError] = useState<string | null>(null);
  const [showCanvaEmbedModal, setShowCanvaEmbedModal] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [visitorStats, setVisitorStats] = useState<{
    totalVisits: number;
    todayVisits: number;
    uniqueVisitors: number;
  } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  const toggleTheme = () => {
    const next = !isDarkMode;
    document.documentElement.classList.toggle('dark', next);
    setIsDarkMode(next);
  };
  const [guestbook, setGuestbook] = useState<Array<{ id: string; name: string; message: string; createdAt: string }>>([]);
  const [isLoadingGuestbook, setIsLoadingGuestbook] = useState(true);
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [guestbookError, setGuestbookError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadNotes = async () => {
      try {
        const notes = await fetchGuestbookNotes();
        if (!cancelled) {
          setGuestbook(notes);
        }
      } catch {
        // Ignore transient load error
      } finally {
        if (!cancelled) {
          setIsLoadingGuestbook(false);
        }
      }
    };
    loadNotes();
    return () => {
      cancelled = true;
    };
  }, []);

  const syncFromCanva = async (manual = false) => {
    setIsSyncingCanva(true);
    setCanvaSyncError(null);
    try {
      const typedData = await syncCanvaData(manual);
      setCanvaSyncData(typedData);
      setSelectedPoster((prev) => {
        if (!prev) return null;
        const freshPage = typedData.pages.find((p) => p.page === prev.id);
        if (!freshPage) return prev;
        return {
          id: freshPage.page,
          studentNo: findStudentNoByName(freshPage.studentName),
          studentName: freshPage.studentName,
          university: freshPage.university,
          faculty: freshPage.faculty,
          image: freshPage.renderedImageUrl || '',
          canvaPage: freshPage,
        };
      });
    } catch (err: any) {
      setCanvaSyncError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Canva');
    } finally {
      setIsSyncingCanva(false);
    }
  };

  useEffect(() => {
    syncFromCanva(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const trackVisit = async () => {
      try {
        let visitorId = localStorage.getItem('m66_visitor_id') || '';
        if (!visitorId || !/^[A-Za-z0-9_-]{8,64}$/.test(visitorId)) {
          visitorId =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `v_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
          localStorage.setItem('m66_visitor_id', visitorId);
        }
        const alreadyCounted = sessionStorage.getItem('m66_visit_counted') === '1';
        const data = await hitVisitorCounter(visitorId, !alreadyCounted);
        if (!alreadyCounted) {
          sessionStorage.setItem('m66_visit_counted', '1');
        }
        if (!cancelled) {
          setVisitorStats(data);
        }
      } catch {
        // Ignore transient visitor counter errors
      }
    };
    trackVisit();
    return () => {
      cancelled = true;
    };
  }, []);

  const submitGuestbookNote = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || isPostingNote) return;
    setIsPostingNote(true);
    setGuestbookError(null);
    try {
      const data = await createGuestbookNote(newName.trim(), trimmedMessage);
      if (Array.isArray(data?.notes)) {
        setGuestbook(data.notes);
      } else if (data?.note) {
        setGuestbook((prev) => [data.note!, ...prev]);
      }
      setNewMessage('');
    } catch (err: any) {
      setGuestbookError(err?.message || 'เกิดข้อผิดพลาดในการส่งโน้ต');
    } finally {
      setIsPostingNote(false);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitGuestbookNote();
  };

  const activePosters: AdmissionPoster[] = React.useMemo(() => {
    if (!canvaSyncData || !canvaSyncData.pages.length) {
      return [];
    }
    return canvaSyncData.pages.map((page) => ({
      id: page.page,
      studentNo: findStudentNoByName(page.studentName),
      studentName: page.studentName,
      university: page.university,
      faculty: page.faculty,
      image: page.renderedImageUrl || '',
      canvaPage: page,
    }));
  }, [canvaSyncData]);

  const postersByStudentNo = React.useMemo(() => {
    const map = new Map<number, AdmissionPoster[]>();
    for (const poster of activePosters) {
      if (poster.studentNo > 0) {
        const list = map.get(poster.studentNo) || [];
        list.push(poster);
        map.set(poster.studentNo, list);
      }
    }
    return map;
  }, [activePosters]);

  const filteredStudents = studentsData.filter(s => {
    const studentPosters = postersByStudentNo.get(s.no) || [];
    const admissionText = studentPosters.map(p => `${p.university} ${p.faculty}`).join(' ');
    const matchQuery = `${s.no} ${s.id} ${s.prefix}${s.firstName} ${s.lastName} ${s.classRole || ''} ${admissionText}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchGender = genderFilter === 'all' || s.gender === genderFilter;
    const matchAdmission =
      admissionFilter === 'all' ||
      (admissionFilter === 'admitted' && studentPosters.length > 0) ||
      (admissionFilter === 'pending' && studentPosters.length === 0);
    return matchQuery && matchGender && matchAdmission;
  });

  const activeUniversities = Array.from(
    new Set(activePosters.flatMap(p => splitPosterUniversities(p.university)))
  );
  const activeAdmittedStudentCount = new Set(
    activePosters.map(p => (p.studentNo > 0 ? String(p.studentNo) : p.studentName))
  ).size;
  const admissionRatePercent = studentsData.length > 0
    ? Math.round((activeAdmittedStudentCount / studentsData.length) * 100)
    : 0;

  const filteredPosters = activePosters.filter(p => {
    const matchUni =
      selectedUniversity === 'all' ||
      splitPosterUniversities(p.university).includes(selectedUniversity);
    const matchSearch = `${p.studentNo || ''} ${p.studentName} ${p.university} ${p.faculty}`.toLowerCase().includes(admissionSearch.toLowerCase());
    return matchUni && matchSearch;
  });

  const selectedPosterIdx = selectedPoster ? filteredPosters.findIndex(p => p.id === selectedPoster.id) : -1;

  const safeHeroSlideIndex = activePosters.length > 0 ? heroSlideIndex % activePosters.length : 0;
  const heroPoster = activePosters[safeHeroSlideIndex] || activePosters[0];

  useEffect(() => {
    if (activeTab !== 'home' || isHeroPaused || activePosters.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % activePosters.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [activeTab, isHeroPaused, activePosters.length]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex flex-col">

      {/* Top Bar Contract (3 Zones: Brand, Nav, Theme) */}
      <header className="sticky top-0 z-40 glass-bar px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-indigo-500/30 flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
            <img
              src="./assets/aistudio/AISelect_20261117_193643_Instagram_84b46b6a.jpg"
              alt="โลโก้ห้อง ม.6/6 APE"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            ม.6/6 APE ขุขันธ์
          </span>
        </button>

        {/* Zone 2: Navigation Links (5 items, single line) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {[
            { key: 'home', label: 'หน้าแรก' },
            { key: 'students', label: 'สมาชิก' },
            { key: 'schedule', label: 'ตารางเรียน' },
            { key: 'admissions', label: 'คนติดมหาลัย' },
            { key: 'guestbook', label: 'สมุดเยี่ยม' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as typeof activeTab)}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
                activeTab === item.key
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Theme Toggle */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="สลับโหมดสว่างและมืด"
            className="min-h-[40px] min-w-[40px] rounded-xl glass-subtle text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-8">

        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-10 sm:space-y-14 pb-10 sm:pb-14">
            {/* Airy Liquid Glass Hero */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 lg:pt-14">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl glass-subtle shadow-sm">
                    <img
                      src="./assets/aistudio/AISelect_20261117_193643_Instagram_84b46b6a.jpg"
                      alt="โลโก้ห้อง"
                      className="w-5 h-5 rounded-lg object-cover"
                    />
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Gen 5 · M.6/6 APE Khukhan School</span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide">
                    โรงเรียนขุขันธ์ · แผนการเรียน วิทย์-คณิต (APE)
                  </p>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-slate-900 dark:text-white">
                    ห้อง ม.6/6 APE <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 dark:from-indigo-400 dark:via-violet-400 dark:to-sky-400">
                      โรงเรียนขุขันธ์
                    </span>
                  </h1>

                  <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    พื้นที่รวมข้อมูลห้องเรียน ม.6/6 วิทย์-คณิต ปีการศึกษา 2569 ตารางเรียน 9 คาบ รายชื่อสมาชิกทั้ง 40 คน และผลงานความสำเร็จสู่รั้วมหาวิทยาลัย
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('admissions')}
                      className="px-5 sm:px-6 py-3 min-h-[44px] rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>คนติดมหาลัย</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('schedule')}
                      className="px-5 sm:px-6 py-3 min-h-[44px] rounded-2xl glass-panel hover:border-indigo-400/60 text-slate-800 dark:text-slate-100 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>ดูตารางเรียน</span>
                    </button>
                  </div>
                </div>

                {/* Hero University Admissions Showcase */}
                <div className="lg:col-span-5">
                  <div className="glass-panel p-2 sm:p-2.5 rounded-3xl max-w-[420px] mx-auto w-full">
                    <div
                      onMouseEnter={() => setIsHeroPaused(true)}
                      onMouseLeave={() => setIsHeroPaused(false)}
                      onClick={() => {
                        if (heroPoster) {
                          setActiveTab('admissions');
                          setSelectedPoster(heroPoster);
                        }
                      }}
                      className="relative rounded-2xl overflow-hidden aspect-square w-full bg-slate-900 cursor-pointer group"
                    >
                      {heroPoster ? (
                        <>
                          <CanvaPosterRenderer
                            imageSrc={heroPoster.image}
                            canvaPage={heroPoster.canvaPage}
                            canvasWidth={canvaSyncData?.canvasWidth || 1080}
                            canvasHeight={canvaSyncData?.canvasHeight || 1080}
                            alt={`${heroPoster.studentName} - ${heroPoster.university}`}
                            className="w-full h-full group-hover:scale-[1.02] transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent flex flex-col justify-between p-4">
                            <div className="flex items-center justify-between gap-2 text-xs font-medium text-white/95">
                              <span className="px-2.5 py-1 rounded-xl bg-slate-950/55 backdrop-blur-md">
                                คนติดมหาลัย ม.6/6
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-slate-950/55 backdrop-blur-md font-mono tabular-nums">
                                {safeHeroSlideIndex + 1} / {activePosters.length}
                              </span>
                            </div>

                            <div className="flex items-end justify-between gap-3">
                              <div className="min-w-0 space-y-0.5">
                                <div className="text-sm sm:text-base font-bold text-white truncate">
                                  {heroPoster.studentName}
                                </div>
                                <div className="text-xs font-semibold text-indigo-300 truncate">
                                  {heroPoster.university}
                                </div>
                                <div className="text-[11px] text-slate-300 truncate">
                                  {heroPoster.faculty}
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-1.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  aria-label="ภาพก่อนหน้า"
                                  onClick={() =>
                                    setHeroSlideIndex((prev) => (prev - 1 + activePosters.length) % activePosters.length)
                                  }
                                  className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-colors flex items-center justify-center cursor-pointer"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="ภาพถัดไป"
                                  onClick={() =>
                                    setHeroSlideIndex((prev) => (prev + 1) % activePosters.length)
                                  }
                                  className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-colors flex items-center justify-center cursor-pointer"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('admissions')}
                                  className="px-3 py-2 min-h-[38px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  ดูทั้งหมด
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-3 text-slate-300">
                          <RefreshCw className={`w-7 h-7 text-indigo-400 ${isSyncingCanva ? 'animate-spin' : ''}`} />
                          <p className="text-xs sm:text-sm font-medium">
                            {isSyncingCanva ? 'กำลังดึงข้อมูลคนติดมหาลัยจาก Canva...' : canvaSyncError || 'ไม่พบข้อมูลจากลิงก์ Canva'}
                          </p>
                          {!isSyncingCanva && canvaSyncError && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                syncFromCanva(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                            >
                              ลองดึงข้อมูลใหม่
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Stats Strip */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="glass-panel rounded-3xl p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="text-center py-2 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {studentsData.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">สมาชิกในห้อง</div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admissions')}
                  className="text-center py-2 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-violet-600 dark:text-violet-400 tabular-nums">
                    {isSyncingCanva && !canvaSyncData ? '—' : `${activeAdmittedStudentCount}/${studentsData.length}`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 tabular-nums">
                    {isSyncingCanva && !canvaSyncData
                      ? 'ติดมหาลัยแล้ว'
                      : `ติดมหาลัยแล้ว (${admissionRatePercent}%)`}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admissions')}
                  className="text-center py-2 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 tabular-nums">
                    {isSyncingCanva && !canvaSyncData ? '—' : activePosters.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">ผลงานสอบติดรวม</div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('admissions')}
                  className="text-center py-2 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {isSyncingCanva && !canvaSyncData ? '—' : activeUniversities.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">สถาบันอุดมศึกษา</div>
                </button>
              </div>

              {/* Compact Home Visitor Counter Strip */}
              <div className="mt-3 flex justify-center sm:justify-end">
                <div className="glass-subtle rounded-2xl px-4 py-2 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>ผู้เข้าชมเว็บไซต์</span>
                  </span>
                  <span className="text-slate-300 dark:text-white/20">·</span>
                  <span className="tabular-nums">
                    ทั้งหมด <strong className="font-bold text-slate-800 dark:text-white">{visitorStats ? visitorStats.totalVisits.toLocaleString('th-TH') : '—'}</strong> ครั้ง
                  </span>
                  <span className="text-slate-300 dark:text-white/20">·</span>
                  <span className="tabular-nums">
                    วันนี้ <strong className="font-bold text-slate-800 dark:text-white">{visitorStats ? visitorStats.todayVisits.toLocaleString('th-TH') : '—'}</strong> ครั้ง
                  </span>
                  <span className="text-slate-300 dark:text-white/20">·</span>
                  <span className="tabular-nums">
                    ผู้เยี่ยมชม <strong className="font-bold text-slate-800 dark:text-white">{visitorStats ? visitorStats.uniqueVisitors.toLocaleString('th-TH') : '—'}</strong> คน
                  </span>
                </div>
              </div>
            </section>

            {/* Clean Overview Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">เมนูหลักประจำห้อง</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  เลือกดูข้อมูลสำคัญของ ม.6/6 APE ได้ทุกอุปกรณ์
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="glass-panel rounded-3xl p-6 sm:p-7 text-left space-y-3.5 hover:border-indigo-400/60 transition-all cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    ทำเนียบสมาชิก
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                    รายชื่อสมาชิก 40 คน เลขที่ รหัสประจำตัว และข้อมูลการสอบติดมหาลัย
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="glass-panel rounded-3xl p-6 sm:p-7 text-left space-y-3.5 hover:border-sky-400/60 transition-all cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    ตารางเรียน 9 คาบ
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                    แยกกลุ่มวิชาชัดเจน ปรับมุมมองรายวันอัตโนมัติบนมือถือ พร้อมไฟล์ต้นฉบับ
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('admissions')}
                  className="glass-panel rounded-3xl p-6 sm:p-7 text-left space-y-3.5 hover:border-violet-400/60 transition-all cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-violet-500/12 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    คนติดมหาลัย
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                    รวมภาพแสดงความยินดีจาก Canva อัปเดตอัตโนมัติและดาวน์โหลดภาพได้
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('guestbook')}
                  className="glass-panel rounded-3xl p-6 sm:p-7 text-left space-y-3.5 hover:border-rose-400/60 transition-all cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/12 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    สมุดเยี่ยมความทรงจำ
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                    เขียนข้อความอวยพรและเก็บความประทับใจร่วมกันของชาว ม.6/6
                  </p>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: STUDENTS DIRECTORY (40 STUDENTS) */}
        {activeTab === 'students' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ทำเนียบสมาชิก ม.6/6 APE</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 tabular-nums">
                  รายชื่อสมาชิก {studentsData.length} คน ·{' '}
                  {isSyncingCanva && !canvaSyncData
                    ? 'กำลังดึงข้อมูลติดมหาลัย...'
                    : `ติดมหาลัยแล้ว ${postersByStudentNo.size} คน`}
                </p>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-2.5">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, เลขที่, รหัส, มหาลัย..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 min-h-[42px] glass-panel rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                  />
                </div>

                <div className="glass-panel p-1 rounded-2xl flex items-center text-xs self-start">
                  {[
                    { key: 'all', label: `ทั้งหมด (${studentsData.length})` },
                    {
                      key: 'admitted',
                      label: `ติดมหาลัย (${isSyncingCanva && !canvaSyncData ? '—' : postersByStudentNo.size})`,
                    },
                    {
                      key: 'pending',
                      label: `ยังไม่ติด (${isSyncingCanva && !canvaSyncData ? '—' : studentsData.length - postersByStudentNo.size})`,
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setAdmissionFilter(item.key as typeof admissionFilter)}
                      className={`px-3 py-2 min-h-[36px] rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        admissionFilter === item.key
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="glass-panel p-1 rounded-2xl flex items-center text-xs self-start">
                  {[
                    { key: 'all', label: 'ทุกเพศ' },
                    { key: 'M', label: 'ชาย' },
                    { key: 'F', label: 'หญิง' },
                  ].map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGenderFilter(g.key as typeof genderFilter)}
                      className={`px-3 py-2 min-h-[36px] rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        genderFilter === g.key
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Class Leadership Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {studentsData
                .filter((s) => s.classRole)
                .sort((a, b) => (a.classRole === 'หัวหน้าห้อง' ? -1 : b.classRole === 'หัวหน้าห้อง' ? 1 : 0))
                .map((leader) => (
                  <button
                    key={leader.no}
                    type="button"
                    onClick={() => setSelectedStudent(leader)}
                    className="glass-panel rounded-2xl px-4 sm:px-5 py-3.5 text-left hover:border-indigo-400/60 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span
                        className={`text-[11px] font-bold tracking-wide ${
                          leader.classRole === 'หัวหน้าห้อง'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {leader.classRole}
                      </span>
                      <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {leader.prefix}{leader.firstName} {leader.lastName}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        เลขที่ {leader.no} · รหัส {leader.id}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0 transition-colors" />
                  </button>
                ))}
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredStudents.map((student) => {
                const studentPosters = postersByStudentNo.get(student.no) || [];
                const hasAdmitted = studentPosters.length > 0;
                const uniqueUnis = Array.from(
                  new Set(studentPosters.flatMap((p) => splitPosterUniversities(p.university)))
                );

                return (
                  <div
                    key={student.no}
                    onClick={() => setSelectedStudent(student)}
                    className="glass-panel rounded-3xl p-5 sm:p-6 hover:border-indigo-400/60 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          เลขที่ {student.no} · รหัส {student.id}
                        </span>
                        {hasAdmitted ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                            ติดมหาลัยแล้ว
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                            {isSyncingCanva && !canvaSyncData ? 'กำลังโหลด...' : 'รอข้อมูล'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {student.classRole && (
                          <div
                            className={`text-[11px] font-bold ${
                              student.classRole === 'หัวหน้าห้อง'
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            {student.classRole}
                          </div>
                        )}
                        <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                          {student.prefix}{student.firstName} {student.lastName}
                        </h3>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 space-y-1.5">
                      {isSyncingCanva && !canvaSyncData ? (
                        <p className="text-xs text-slate-400">กำลังตรวจสอบข้อมูลจาก Canva...</p>
                      ) : hasAdmitted ? (
                        <>
                          <div className="space-y-1">
                            {uniqueUnis.slice(0, 2).map((uni) => (
                              <div
                                key={uni}
                                className="flex items-start gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                              >
                                <GraduationCap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span className="line-clamp-1">{uni}</span>
                              </div>
                            ))}
                            {uniqueUnis.length > 2 && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                                และอีก {uniqueUnis.length - 2} สถาบัน
                              </p>
                            )}
                          </div>
                          {studentPosters.length === 1 && studentPosters[0].faculty && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 pl-5">
                              {studentPosters[0].faculty}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          ยังไม่มีข้อมูลติดมหาลัย
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-16 space-y-3 glass-panel rounded-3xl">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-slate-500 font-medium text-sm">ไม่พบรายชื่อสมาชิกที่ค้นหา</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setGenderFilter('all'); setAdmissionFilter('all'); }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold cursor-pointer"
                >
                  ล้างตัวกรองการค้นหา
                </button>
              </div>
            )}
          </div>
        )}

        {/* STUDENT DETAIL MODAL */}
        {selectedStudent && (() => {
          const selectedStudentPosters = postersByStudentNo.get(selectedStudent.no) || [];
          return (
            <div
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedStudent(null)}
            >
              <div
                className="glass-panel rounded-3xl max-w-md w-full p-6 sm:p-8 relative space-y-5 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  aria-label="ปิดหน้าต่าง"
                  className="absolute top-5 right-5 p-2 rounded-full glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="pr-8 space-y-1">
                  {selectedStudent.classRole && (
                    <div
                      className={`text-xs font-bold ${
                        selectedStudent.classRole === 'หัวหน้าห้อง'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {selectedStudent.classRole}
                    </div>
                  )}
                  <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    เลขที่ {selectedStudent.no} · รหัส {selectedStudent.id}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {selectedStudent.prefix}{selectedStudent.firstName} {selectedStudent.lastName}
                  </h3>
                </div>

                {selectedStudentPosters.length > 0 ? (
                  <div className="glass-subtle p-4 rounded-2xl space-y-2.5 border border-emerald-400/30">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span>ติดมหาลัยแล้ว ({selectedStudentPosters.length} แห่ง)</span>
                    </span>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {selectedStudentPosters.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(null);
                            setActiveTab('admissions');
                            setSelectedPoster(p);
                          }}
                          className="w-full text-left p-3 rounded-xl glass-panel hover:border-indigo-400/60 transition-all flex items-center justify-between gap-2 text-xs cursor-pointer"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.university}</div>
                            <div className="text-slate-500 dark:text-slate-400 truncate">{p.faculty}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="glass-subtle p-4 rounded-2xl text-xs text-slate-500 dark:text-slate-400">
                    {isSyncingCanva && !canvaSyncData
                      ? 'กำลังดึงข้อมูลการสอบติดมหาลัยจาก Canva...'
                      : 'ยังไม่มีข้อมูลการสอบติดมหาลัย'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="w-full py-3 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-colors text-sm cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          );
        })()}

        {/* TAB 3: SCHEDULE & ACADEMIC HUB */}
        {activeTab === 'schedule' && (
          <ScheduleSection onOpenOriginalImage={() => setShowScheduleImageModal(true)} />
        )}

        {/* SCHEDULE IMAGE MODAL */}
        {showScheduleImageModal && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowScheduleImageModal(false)}
          >
            <div
              className="glass-panel rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base sm:text-lg font-bold">ตารางเรียนต้นฉบับ (รูปภาพทางการ)</h3>
                <button
                  type="button"
                  onClick={() => setShowScheduleImageModal(false)}
                  aria-label="ปิดหน้าต่าง"
                  className="p-2 rounded-full glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-auto max-h-[70vh] rounded-2xl glass-subtle p-2">
                <img
                  src={getScheduleImageSrc()}
                  alt="ตารางเรียนต้นฉบับ ม.6/6 APE"
                  className="w-full h-auto object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowScheduleImageModal(false)}
                className="w-full py-3 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-colors text-sm cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: UNIVERSITY ADMISSIONS (คนติดมหาลัย) */}
        {activeTab === 'admissions' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ทำเนียบคนติดมหาลัย ม.6/6 APE</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                  ซิงค์อัตโนมัติจาก Canva · <span className="tabular-nums">{activePosters.length}</span> ผลงาน · <span className="tabular-nums">{activeAdmittedStudentCount}</span> คนเก่ง · <span className="tabular-nums">{activeUniversities.length}</span> สถาบัน
                </p>
                {canvaSyncData && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ซิงค์ล่าสุด {new Date(canvaSyncData.syncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น. ({canvaSyncData.totalPages} หน้า)
                  </p>
                )}
                {canvaSyncError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    ไม่สามารถเชื่อมต่อ Canva ได้: {canvaSyncError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => syncFromCanva(true)}
                  disabled={isSyncingCanva}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] glass-panel hover:border-emerald-400/60 disabled:opacity-60 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold rounded-2xl transition-all whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isSyncingCanva ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCanva ? 'กำลังอัปเดต...' : 'อัปเดตจาก Canva'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCanvaEmbedModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all whitespace-nowrap cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>เปิดสไลด์ Canva สด</span>
                </button>
              </div>
            </div>

            {/* Class Admission Statistics */}
            <AdmissionStatsSection
              posters={activePosters}
              students={studentsData}
              selectedUniversity={selectedUniversity}
              onSelectUniversity={(uni) => setSelectedUniversity(uni)}
              onSelectStudentFilter={(name) => setAdmissionSearch(name)}
              isLoading={isSyncingCanva}
            />

            {/* Search & University Filter */}
            <div className="glass-panel p-3.5 sm:p-4 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเพื่อน, มหาวิทยาลัย, คณะหรือสาขา..."
                  value={admissionSearch}
                  onChange={(e) => setAdmissionSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 min-h-[42px] glass-subtle rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedUniversity}
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="px-4 py-2.5 min-h-[42px] glass-subtle rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-full sm:max-w-xs"
                >
                  <option value="all">ทุกสถาบัน ({activePosters.length})</option>
                  {activeUniversities.map((uni) => (
                    <option key={uni} value={uni}>
                      {uni} ({activePosters.filter(p => splitPosterUniversities(p.university).includes(uni)).length})
                    </option>
                  ))}
                </select>

                {(admissionSearch || selectedUniversity !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setAdmissionSearch(''); setSelectedUniversity('all'); }}
                    className="px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-indigo-600 dark:text-indigo-400 glass-subtle rounded-2xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    รีเซ็ต
                  </button>
                )}
              </div>
            </div>

            {/* Congratulation Posters Gallery */}
            {isSyncingCanva && activePosters.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="glass-panel rounded-3xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-slate-200/60 dark:bg-white/5" />
                    <div className="p-4 sm:p-5 space-y-2.5">
                      <div className="h-3 w-20 bg-slate-200/70 dark:bg-white/10 rounded" />
                      <div className="h-4 w-4/5 bg-slate-200/70 dark:bg-white/10 rounded" />
                      <div className="h-3 w-3/5 bg-slate-200/70 dark:bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : canvaSyncError && activePosters.length === 0 ? (
              <div className="text-center py-16 space-y-3 glass-panel rounded-3xl px-4">
                <GraduationCap className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">{canvaSyncError}</p>
                <button
                  type="button"
                  onClick={() => syncFromCanva(true)}
                  className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  ลองดึงข้อมูลจาก Canva อีกครั้ง
                </button>
              </div>
            ) : filteredPosters.length === 0 ? (
              <div className="text-center py-16 space-y-3 glass-panel rounded-3xl">
                <GraduationCap className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-slate-500 font-medium text-sm">ไม่พบภาพที่ตรงกับคำค้นหา</p>
                <button
                  type="button"
                  onClick={() => { setAdmissionSearch(''); setSelectedUniversity('all'); }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold cursor-pointer"
                >
                  แสดงรูปภาพทั้งหมด ({activePosters.length} ภาพ)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredPosters.map((poster) => (
                  <div
                    key={poster.id}
                    onClick={() => setSelectedPoster(poster)}
                    className="glass-panel rounded-3xl overflow-hidden hover:border-indigo-400/60 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="aspect-square overflow-hidden bg-slate-900/5 dark:bg-slate-950/60 relative">
                      <CanvaPosterRenderer
                        imageSrc={poster.image}
                        canvaPage={poster.canvaPage}
                        canvasWidth={canvaSyncData?.canvasWidth || 1080}
                        canvasHeight={canvaSyncData?.canvasHeight || 1080}
                        alt={`${poster.studentName} - ${poster.university}`}
                        className="group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 sm:p-5 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                          <span>{poster.studentNo > 0 ? `เลขที่ ${poster.studentNo}` : 'สมาชิกห้อง'}</span>
                          <span>หน้า {poster.id}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {poster.studentName}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {poster.university}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pt-1">
                        {poster.faculty}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lightbox Modal for Congratulation Poster */}
            {selectedPoster && (
              <div
                className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setSelectedPoster(null)}
              >
                <div
                  className="glass-panel rounded-3xl max-w-2xl w-full p-4 sm:p-6 relative space-y-4 max-h-[92vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {selectedPoster.studentNo > 0 ? `เลขที่ ${selectedPoster.studentNo} · ` : ''}หน้า {selectedPoster.id}/{activePosters.length}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{selectedPoster.studentName}</h3>
                      <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">{selectedPoster.university}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedPoster.faculty}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPoster(null)}
                      aria-label="ปิดหน้าต่าง"
                      className="p-2 rounded-full glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="rounded-2xl overflow-hidden glass-subtle aspect-square max-h-[56vh] mx-auto flex items-center justify-center">
                    <CanvaPosterRenderer
                      imageSrc={selectedPoster.image}
                      canvaPage={selectedPoster.canvaPage}
                      canvasWidth={canvaSyncData?.canvasWidth || 1080}
                      canvasHeight={canvaSyncData?.canvasHeight || 1080}
                      alt={`${selectedPoster.studentName} - ${selectedPoster.university}`}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={selectedPosterIdx <= 0}
                      onClick={() => selectedPosterIdx > 0 && setSelectedPoster(filteredPosters[selectedPosterIdx - 1])}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-2xl glass-subtle text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>ก่อนหน้า</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDownloadingPng}
                        onClick={async () => {
                          setIsDownloadingPng(true);
                          try {
                            await downloadCanvaPosterAsPng({
                              imageSrc: selectedPoster.image,
                              canvaPage: selectedPoster.canvaPage,
                              canvasWidth: canvaSyncData?.canvasWidth || 1080,
                              canvasHeight: canvaSyncData?.canvasHeight || 1080,
                              filename: `m6-6-canva-page-${selectedPoster.id}.png`,
                            });
                          } finally {
                            setIsDownloadingPng(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isDownloadingPng ? 'กำลังสร้าง...' : 'ดาวน์โหลด PNG'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPoster(null)}
                        className="px-4 py-2 min-h-[40px] rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                      >
                        ปิด
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={selectedPosterIdx < 0 || selectedPosterIdx >= filteredPosters.length - 1}
                      onClick={() => selectedPosterIdx >= 0 && selectedPosterIdx < filteredPosters.length - 1 && setSelectedPoster(filteredPosters[selectedPosterIdx + 1])}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-2xl glass-subtle text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <span>ถัดไป</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Canva Embed Slide Viewer Modal */}
            {showCanvaEmbedModal && (
              <div
                className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setShowCanvaEmbedModal(false)}
              >
                <div
                  className="glass-panel rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold">Canva สไลด์ต้นฉบับ</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">เชื่อมต่อตรงกับอัลบั้มทางการของห้อง ม.6/6 APE</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={OFFICIAL_CANVA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>เปิดใน Canva</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowCanvaEmbedModal(false)}
                        aria-label="ปิดหน้าต่าง"
                        className="p-2 rounded-full glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full aspect-square max-h-[70vh] rounded-2xl overflow-hidden glass-subtle flex items-center justify-center">
                    {canvaSyncData?.embedUrl ? (
                      <iframe
                        src={canvaSyncData.embedUrl}
                        title="Canva Live Design Viewer"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        กำลังเชื่อมต่อสไลด์จาก Canva...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GUESTBOOK & COMMENT NOTES */}
        {activeTab === 'guestbook' && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">สมุดเยี่ยม ม.6/6 APE</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                ฝากโน้ตหรือคอมเม้นสั้นๆ ถึงเพื่อนๆ และห้อง ม.6/6
              </p>
            </div>

            {/* Compact Comment / Note Composer */}
            <form onSubmit={handleAddMessage} className="glass-panel p-4 sm:p-5 rounded-3xl space-y-3">
              <textarea
                required
                rows={3}
                maxLength={500}
                placeholder="เขียนโน้ตหรือคอมเม้น..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    submitGuestbookNote();
                  }
                }}
                className="w-full px-4 py-3 glass-subtle rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              {guestbookError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{guestbookError}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <input
                  type="text"
                  maxLength={60}
                  placeholder="ชื่อของคุณ (ไม่บังคับ)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-4 py-2.5 min-h-[42px] glass-subtle rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {newMessage.length}/500
                  </span>
                  <button
                    type="submit"
                    disabled={isPostingNote || !newMessage.trim()}
                    className="px-5 py-2.5 min-h-[42px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-indigo-600/20 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isPostingNote ? 'กำลังส่ง...' : 'ส่งโน้ต'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Comment / Note Feed */}
            <div className="space-y-3.5">
              <h3 className="font-bold text-sm sm:text-base text-slate-700 dark:text-slate-200 tabular-nums">
                โน้ตทั้งหมด ({guestbook.length})
              </h3>

              {isLoadingGuestbook ? (
                <div className="glass-panel p-8 rounded-3xl text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  กำลังโหลดโน้ต...
                </div>
              ) : guestbook.length === 0 ? (
                <div className="glass-panel p-8 sm:p-10 rounded-3xl text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    ยังไม่มีโน้ตในตอนนี้
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    พิมพ์ข้อความด้านบนเพื่อฝากคอมเม้นแรกได้เลย
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {guestbook.map((item) => {
                    const initial = item.name.trim().charAt(0) || 'ผ';
                    const formattedTime = new Date(item.createdAt).toLocaleString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <div key={item.id} className="glass-panel p-4 sm:p-5 rounded-2xl flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {item.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
                              {formattedTime}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Mobile Floating Liquid Glass Bottom Tab Bar */}
      <nav
        aria-label="เมนูหลักบนมือถือ"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 glass-panel rounded-2xl grid grid-cols-5 p-1 gap-1"
      >
        {[
          { key: 'home', label: 'หน้าแรก', icon: Home },
          { key: 'students', label: 'สมาชิก', icon: Users },
          { key: 'schedule', label: 'ตาราง', icon: Calendar },
          { key: 'admissions', label: 'มหาลัย', icon: Award },
          { key: 'guestbook', label: 'สมุดเยี่ยม', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as typeof activeTab)}
              className={`min-h-[46px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full px-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="glass-bar border-t border-white/40 dark:border-white/10 py-8 sm:py-10 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg">ม.6/6 วิทย์-คณิต (APE)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">โรงเรียนขุขันธ์ อำเภอขุขันธ์ จังหวัดศรีสะเกษ</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <button type="button" onClick={() => setActiveTab('home')} className="hover:text-indigo-600 cursor-pointer">หน้าแรก</button>
            <button type="button" onClick={() => setActiveTab('students')} className="hover:text-indigo-600 cursor-pointer">สมาชิก</button>
            <button type="button" onClick={() => setActiveTab('schedule')} className="hover:text-indigo-600 cursor-pointer">ตารางเรียน</button>
            <button type="button" onClick={() => setActiveTab('admissions')} className="hover:text-indigo-600 cursor-pointer">คนติดมหาลัย</button>
            <button type="button" onClick={() => setActiveTab('guestbook')} className="hover:text-indigo-600 cursor-pointer">สมุดเยี่ยม</button>
          </div>

          <div className="md:text-right text-xs text-slate-400">
            <p>© 2569 M.6/6 APE Khukhan School.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
