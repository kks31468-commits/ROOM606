import React, { useState } from 'react';
import { Calendar, Clock, ExternalLink, Image as ImageIcon, BookOpen } from 'lucide-react';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
type SubjectCategory = 'stem' | 'lang' | 'humanities' | 'activity' | 'break' | 'free';

interface ScheduleSlot {
  title: string;
  teacher?: string;
  room?: string;
  category: SubjectCategory;
}

interface SchedulePeriod {
  period: number;
  time: string;
  slots: Record<DayKey, ScheduleSlot>;
}

const DAYS: Array<{ key: DayKey; label: string; short: string }> = [
  { key: 'mon', label: 'วันจันทร์', short: 'จ.' },
  { key: 'tue', label: 'วันอังคาร', short: 'อ.' },
  { key: 'wed', label: 'วันพุธ', short: 'พ.' },
  { key: 'thu', label: 'วันพฤหัสบดี', short: 'พฤ.' },
  { key: 'fri', label: 'วันศุกร์', short: 'ศ.' },
];

const OFFICIAL_SCHEDULE: SchedulePeriod[] = [
  {
    period: 1,
    time: '08.40–09.30',
    slots: {
      mon: { title: 'ว30208', teacher: 'ครูวิรัตน์', room: '523', category: 'stem' },
      tue: { title: 'ค33229', teacher: 'ครูธัญญ์ญสิต', room: '523', category: 'stem' },
      wed: { title: 'เลือกเสรี ม.6', category: 'activity' },
      thu: { title: 'ส33104', teacher: 'ครูพิไลพร', room: '523', category: 'humanities' },
      fri: { title: 'ว30230', teacher: 'ครูจันจิรา', room: '523', category: 'stem' },
    },
  },
  {
    period: 2,
    time: '09.30–10.20',
    slots: {
      mon: { title: 'ว30208', teacher: 'ครูวิรัตน์', room: '523', category: 'stem' },
      tue: { title: 'ค33230', teacher: 'ครูกมลชนก', room: '523', category: 'stem' },
      wed: { title: 'เลือกเสรี ม.6', category: 'activity' },
      thu: { title: 'อ33102', teacher: 'ครูภูบดินทร์', room: '523', category: 'lang' },
      fri: { title: 'ว30207', teacher: 'ครูศรีวิไล', room: '523', category: 'stem' },
    },
  },
  {
    period: 3,
    time: '10.20–11.10',
    slots: {
      mon: { title: 'อ33102', teacher: 'ครูภูบดินทร์', room: '523', category: 'lang' },
      tue: { title: 'เลือกเสรี ม.6', category: 'activity' },
      wed: { title: 'ค33230', teacher: 'ครูกมลชนก', room: '523', category: 'stem' },
      thu: { title: 'เลือกเสรี ม.6', category: 'activity' },
      fri: { title: 'ว30207', teacher: 'ครูศรีวิไล', room: '523', category: 'stem' },
    },
  },
  {
    period: 4,
    time: '11.10–12.00',
    slots: {
      mon: { title: 'ท33102', teacher: 'ครูนันทิยา', room: '523', category: 'lang' },
      tue: { title: 'เลือกเสรี ม.6', category: 'activity' },
      wed: { title: 'พ33102', teacher: 'ครูเอกชัย', room: '523', category: 'humanities' },
      thu: { title: 'เลือกเสรี ม.6', category: 'activity' },
      fri: { title: 'ค33229', teacher: 'ครูธัญญ์ญสิต', room: '523', category: 'stem' },
    },
  },
  {
    period: 5,
    time: '12.00–12.50',
    slots: {
      mon: { title: 'พักกลางวัน', category: 'break' },
      tue: { title: 'พักกลางวัน', category: 'break' },
      wed: { title: 'พักกลางวัน', category: 'break' },
      thu: { title: 'พักกลางวัน', category: 'break' },
      fri: { title: 'พักกลางวัน', category: 'break' },
    },
  },
  {
    period: 6,
    time: '12.50–13.40',
    slots: {
      mon: { title: 'ส33103', teacher: 'ครูนุชนาท', room: '523', category: 'humanities' },
      tue: { title: 'ว30251', teacher: 'ครูกาญจนา', room: '523', category: 'stem' },
      wed: { title: 'ว30212', teacher: 'ครูศรีวิไล', room: '523', category: 'stem' },
      thu: { title: 'พัฒนาศักยภาพ ม.6', category: 'activity' },
      fri: { title: 'เลือกเสรี ม.6', category: 'activity' },
    },
  },
  {
    period: 7,
    time: '13.40–14.30',
    slots: {
      mon: { title: 'อ30206', teacher: 'ครู Jason', room: '325', category: 'lang' },
      tue: { title: 'ส33103', teacher: 'ครูนุชนาท', room: '523', category: 'humanities' },
      wed: { title: 'ศ33102', teacher: 'ครูจีระศักดิ์', room: 'ทัศนศิลป2', category: 'humanities' },
      thu: { title: 'พัฒนาศักยภาพ ม.6', category: 'activity' },
      fri: { title: 'เลือกเสรี ม.6', category: 'activity' },
    },
  },
  {
    period: 8,
    time: '14.30–15.20',
    slots: {
      mon: { title: 'แนะแนว', teacher: 'ครูรักชนก', room: '523', category: 'activity' },
      tue: { title: 'ว33282', teacher: 'ครูระพีพัฒน์', room: '513', category: 'stem' },
      wed: { title: 'ท33102', teacher: 'ครูนันทิยา', room: '523', category: 'lang' },
      thu: { title: 'พัฒนาศักยภาพ ม.6', category: 'activity' },
      fri: { title: 'ส30226', teacher: 'ครูกานดา', room: '523', category: 'humanities' },
    },
  },
  {
    period: 9,
    time: '15.20–16.10',
    slots: {
      mon: { title: 'ไม่มีเรียน', category: 'free' },
      tue: { title: 'ว33282', teacher: 'ครูระพีพัฒน์', room: '513', category: 'stem' },
      wed: { title: 'กิจกรรมพัฒนาผู้เรียน', category: 'activity' },
      thu: { title: 'กิจกรรมชุมนุม', category: 'activity' },
      fri: { title: 'โฮมรูม / โรงเรียนคุณธรรม', category: 'activity' },
    },
  },
];

function getTodayKey(): DayKey {
  const day = new Date().getDay();
  const map: Record<number, DayKey> = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
  };
  return map[day] || 'mon';
}

function getSlotTint(category: SubjectCategory): string {
  switch (category) {
    case 'stem':
      return 'bg-sky-500/[0.08] dark:bg-sky-400/[0.11] border-sky-400/30 dark:border-sky-400/20';
    case 'lang':
      return 'bg-violet-500/[0.08] dark:bg-violet-400/[0.11] border-violet-400/30 dark:border-violet-400/20';
    case 'humanities':
      return 'bg-teal-500/[0.08] dark:bg-teal-400/[0.11] border-teal-400/30 dark:border-teal-400/20';
    case 'activity':
      return 'bg-amber-500/[0.08] dark:bg-amber-400/[0.1] border-amber-400/30 dark:border-amber-400/20';
    case 'free':
      return 'bg-slate-500/[0.03] dark:bg-white/[0.02] border-slate-300/30 dark:border-white/[0.06] opacity-60';
    default:
      return 'glass-subtle';
  }
}

function getTitleAccent(category: SubjectCategory): string {
  switch (category) {
    case 'stem':
      return 'text-sky-700 dark:text-sky-300';
    case 'lang':
      return 'text-violet-700 dark:text-violet-300';
    case 'humanities':
      return 'text-teal-700 dark:text-teal-300';
    case 'activity':
      return 'text-amber-700 dark:text-amber-300';
    default:
      return 'text-slate-500 dark:text-slate-400';
  }
}

interface ScheduleSectionProps {
  onOpenOriginalImage: () => void;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({ onOpenOriginalImage }) => {
  const todayKey = getTodayKey();
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'stem' | 'lang' | 'humanities' | 'activity'>('all');
  const [mobileShowFullTable, setMobileShowFullTable] = useState(false);

  const isDimmed = (cat: SubjectCategory) => {
    if (categoryFilter === 'all' || cat === 'break' || cat === 'free') return false;
    return cat !== categoryFilter;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ตารางเรียนประจำสัปดาห์ ม.6/6 APE
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            ตารางเรียน 9 คาบ · โรงเรียนขุขันธ์ · ภาคเรียนที่ 2 ปีการศึกษา 2569
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenOriginalImage}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] glass-panel hover:border-indigo-400/60 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold rounded-2xl transition-all whitespace-nowrap cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>ตารางเรียนต้นฉบับ</span>
          </button>

          <a
            href="https://sites.google.com/site/kksvichakarn/?pli=1&authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" />
            <span>งานวิชาการ รร.ขุขันธ์</span>
          </a>
        </div>
      </div>

      {/* Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto">
          {[
            { key: 'all', label: 'ทุกกลุ่มวิชา' },
            { key: 'stem', label: 'วิทย์-คณิต' },
            { key: 'lang', label: 'ภาษา' },
            { key: 'humanities', label: 'สังคม / ศิลปะ / พละ' },
            { key: 'activity', label: 'กิจกรรม / เลือกเสรี' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategoryFilter(item.key as typeof categoryFilter)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === item.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMobileShowFullTable((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center gap-2 px-4 py-2.5 glass-panel rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap self-start cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span>{mobileShowFullTable ? 'สลับเป็นมุมมองรายวัน' : 'ดูตารางรวมทั้งสัปดาห์'}</span>
        </button>
      </div>

      {/* Mobile / Tablet Day-by-Day Liquid Glass Timeline */}
      {!mobileShowFullTable && (
        <div className="lg:hidden space-y-4">
          <div className="glass-panel p-1.5 rounded-2xl grid grid-cols-5 gap-1">
            {DAYS.map((d) => {
              const isSelected = selectedDay === d.key;
              const isToday = todayKey === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDay(d.key)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{d.short}</span>
                  {isToday && (
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-indigo-100' : 'text-indigo-500 dark:text-indigo-400'}`}>
                      วันนี้
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-2.5">
            {OFFICIAL_SCHEDULE.map((row) => {
              const slot = row.slots[selectedDay];
              if (slot.category === 'break') {
                return (
                  <div
                    key={row.period}
                    className="rounded-2xl px-4 py-3 glass-subtle flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
                  >
                    <span className="font-semibold">พักกลางวัน</span>
                    <span className="font-mono tabular-nums">{row.time}</span>
                  </div>
                );
              }
              return (
                <div
                  key={row.period}
                  className={`rounded-2xl p-3.5 border backdrop-blur-md transition-all flex items-center justify-between gap-3 ${getSlotTint(
                    slot.category
                  )} ${isDimmed(slot.category) ? 'opacity-30' : ''}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-16 shrink-0 text-center">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">คาบ {row.period}</div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400">{row.time}</div>
                    </div>
                    <div className="min-w-0">
                      <div className={`font-bold text-sm sm:text-base truncate ${getTitleAccent(slot.category)}`}>
                        {slot.title}
                      </div>
                      {slot.teacher && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {slot.teacher}
                        </div>
                      )}
                    </div>
                  </div>
                  {slot.room && (
                    <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                      ห้อง {slot.room}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop (and optional Mobile Full-Week) Liquid Glass Matrix */}
      <div className={`${mobileShowFullTable ? 'block' : 'hidden lg:block'} glass-panel rounded-3xl p-4 sm:p-6 overflow-hidden`}>
        <div className="overflow-x-auto">
          <div className="min-w-[780px] space-y-2.5">
            {/* Matrix Header */}
            <div className="grid grid-cols-[118px_repeat(5,minmax(0,1fr))] gap-2.5">
              <div className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                คาบ / เวลา
              </div>
              {DAYS.map((day) => {
                const isToday = day.key === todayKey;
                return (
                  <div
                    key={day.key}
                    className={`px-3 py-3 rounded-2xl text-center text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'glass-subtle text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <span>{day.label}</span>
                    {isToday && <span className="text-[11px] font-medium opacity-85">วันนี้</span>}
                  </div>
                );
              })}
            </div>

            {/* Matrix Body */}
            <div className="space-y-2">
              {OFFICIAL_SCHEDULE.map((row) => {
                if (row.period === 5) {
                  return (
                    <div key={row.period} className="grid grid-cols-[118px_repeat(5,minmax(0,1fr))] gap-2.5 items-stretch">
                      <div className="px-2 py-2.5 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">คาบ 5</span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">{row.time}</span>
                      </div>
                      <div className="col-span-5 glass-subtle rounded-2xl py-2.5 px-4 flex items-center justify-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span>พักกลางวัน</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{row.time} น.</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={row.period} className="grid grid-cols-[118px_repeat(5,minmax(0,1fr))] gap-2.5 items-stretch">
                    <div className="px-2 py-3 flex flex-col items-center justify-center text-center glass-subtle rounded-2xl">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">คาบ {row.period}</span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                        {row.time}
                      </span>
                    </div>

                    {DAYS.map((day) => {
                      const slot = row.slots[day.key];
                      const dimmed = isDimmed(slot.category);
                      return (
                        <div
                          key={day.key}
                          className={`rounded-2xl p-3 border backdrop-blur-md transition-all flex flex-col justify-between min-h-[76px] ${getSlotTint(
                            slot.category
                          )} ${dimmed ? 'opacity-25 scale-[0.98]' : 'hover:scale-[1.015]'}`}
                        >
                          <div className={`font-bold text-sm leading-snug ${getTitleAccent(slot.category)}`}>
                            {slot.title}
                          </div>
                          {(slot.teacher || slot.room) && (
                            <div className="flex items-center justify-between gap-2 pt-2 text-[11px] text-slate-600 dark:text-slate-300">
                              <span className="truncate">{slot.teacher || ''}</span>
                              {slot.room && (
                                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                                  {slot.room}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Academic & Reminders Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-panel p-5 sm:p-6 rounded-3xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
              <span>ศูนย์วิชาการโรงเรียนขุขันธ์</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              เข้าถึงประกาศหลักสูตร ระเบียบการเรียน และตารางสอบทางการ
            </p>
          </div>
          <a
            href="https://sites.google.com/site/kksvichakarn/?pli=1&authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl glass-subtle text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-white/70 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>เปิดเว็บ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-3xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
              <span>เวลาเรียนทั้งหมด</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              คาบ 1–9 เวลา <span className="font-mono tabular-nums">08.40–16.10</span> น. (พักกลางวัน <span className="font-mono tabular-nums">12.00–12.50</span> น.)
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenOriginalImage}
            className="px-4 py-2 rounded-xl glass-subtle text-xs font-semibold text-purple-600 dark:text-purple-300 hover:bg-white/70 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ดูไฟล์ภาพ
          </button>
        </div>
      </div>
    </div>
  );
};
