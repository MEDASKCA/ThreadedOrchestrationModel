"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, Users, Activity, Search,
  Calendar, LayoutGrid, Zap, Bed,
  CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import type { Pathway } from "@/lib/pathways/schema";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Priority    = "urgent" | "expedited" | "routine" | "planned";
type RTTStatus   = "on-track" | "at-risk" | "breaching" | "suspended";
type SessionType = "AM" | "PM" | "FULL" | "EVE" | "EMERGENCY";
type StaffRole   = "Scrubbed" | "Circulating" | "Anaesthetist" | "ODP" | "HCA" | "Break";
type TheatreStatus = "active" | "between-cases" | "closed" | "emergency" | "standby";
type PlannerView   = "day" | "week" | "month";
type SortDir       = "asc" | "desc";

type DelayReason        = "staffing" | "equipment" | "patient" | "cleaning" | "emergency-add" | "other";
type CancellationReason = "dna" | "clinical" | "patient-unfit" | "equipment" | "capacity" | "other";

type PTLPatient = {
  id: string; priority: Priority; name: string; ref: string; age: number;
  procedure: string; opcs: string; consultant: string; specialty: string;
  durationMins: number; waitingDays: number; is52Week: boolean;
  rttTarget: string; rttStatus: RTTStatus;
};

type PendingIssueType = "clinical" | "operational" | "staffing" | "equipment" | "patient" | "other";
type PendingIssue = { type: PendingIssueType; detail: string };

type TheatreSession = {
  theatreId: string; date: string; type: SessionType;
  specialty: string; specialtyAbbrev: string;
  surgeon: string; anaesthetist: string;
  cases: number; utilization: number; startTime: string; endTime: string;
  teamComplete: boolean;
  pendingIssues: PendingIssue[];
};

type StaffMember = {
  name: string; role: StaffRole; initials: string;
  dutyStart: string; dutyEnd: string;
  breakSince?: string;
  breakUntil?: string;
  reliefPending?: boolean;
};

type DelayEntry        = { startTime: string; minutes: number; reason: DelayReason; detail: string; raisedBy: string };
type CancellationEntry = { procedure: string; patient: string; time: string; reason: CancellationReason; detail: string };
type IncidentEntry     = { time: string; level: "low" | "medium" | "high"; title: string; detail: string; reportedBy: string };
type CommentEntry      = { time: string; author: string; text: string };
type CaseEntry         = { procedure: string; consultant: string; patient: string; scheduledStart: string; scheduledEnd: string; status: "completed" | "active" | "pending" | "cancelled" };

type RTTheatre = {
  id: string; name: string; specialty: string; status: TheatreStatus;
  currentCase?: string; currentPatient?: string; currentConsultant?: string;
  progressPct: number; caseStarted?: string; estimatedEnd?: string;
  nextCase?: string; staff: StaffMember[];
  casesToday: number; completedCases: number;
  isOverrun?: boolean; delayMins?: number;
  delays: DelayEntry[]; cancellations: CancellationEntry[];
  incidents: IncidentEntry[]; comments: CommentEntry[];
  caseList: CaseEntry[];
};

type CallBellEntry = {
  id: string; theatreId: string; theatreName: string;
  type: "relief" | "overrun" | "emergency";
  staffName?: string; time: string;
};

type BedUnit = { name: string; total: number; occupied: number; available: number; blocked: number };
type Alert   = { id: string; level: "critical" | "warning" | "info"; title: string; detail: string; time: string };

// ─── MOCK: PTL ────────────────────────────────────────────────────────────────

const PTL_PATIENTS: PTLPatient[] = [
  { id:"p1",  priority:"urgent",    name:"Margaret O'Brien",   ref:"NHS-4821093", age:67, procedure:"Total Knee Replacement",          opcs:"W40.1", consultant:"Mr. R. Kapoor",  specialty:"Orthopaedics",    durationMins:90,  waitingDays:342, is52Week:true,  rttTarget:"14 Mar 2026", rttStatus:"breaching" },
  { id:"p2",  priority:"urgent",    name:"David Okafor",       ref:"NHS-3310447", age:54, procedure:"Laparoscopic Cholecystectomy",     opcs:"J18.3", consultant:"Mr. S. Ahmed",   specialty:"General Surgery", durationMins:60,  waitingDays:298, is52Week:false, rttTarget:"28 Feb 2026", rttStatus:"breaching" },
  { id:"p3",  priority:"expedited", name:"Fiona Clarke",       ref:"NHS-6640281", age:43, procedure:"Carpal Tunnel Release",            opcs:"A65.1", consultant:"Ms. T. Lawson",  specialty:"Plastics",        durationMins:30,  waitingDays:210, is52Week:false, rttTarget:"15 Apr 2026", rttStatus:"at-risk"  },
  { id:"p4",  priority:"expedited", name:"James Patterson",    ref:"NHS-2298761", age:71, procedure:"TURP",                             opcs:"M61.1", consultant:"Mr. G. Patel",   specialty:"Urology",         durationMins:75,  waitingDays:185, is52Week:false, rttTarget:"22 Apr 2026", rttStatus:"at-risk"  },
  { id:"p5",  priority:"routine",   name:"Amelia Watson",      ref:"NHS-9018234", age:36, procedure:"Laparoscopic Appendicectomy",      opcs:"H01.1", consultant:"Mr. S. Ahmed",   specialty:"General Surgery", durationMins:45,  waitingDays:142, is52Week:false, rttTarget:"30 May 2026", rttStatus:"on-track" },
  { id:"p6",  priority:"routine",   name:"Robert Mensah",      ref:"NHS-4412098", age:58, procedure:"Inguinal Hernia Repair",           opcs:"T20.1", consultant:"Ms. Y. Chen",    specialty:"General Surgery", durationMins:60,  waitingDays:98,  is52Week:false, rttTarget:"10 Jun 2026", rttStatus:"on-track" },
  { id:"p7",  priority:"urgent",    name:"Sandra Livingstone", ref:"NHS-7731052", age:62, procedure:"Hip Hemiarthroplasty",             opcs:"W37.1", consultant:"Mr. R. Kapoor",  specialty:"Orthopaedics",    durationMins:120, waitingDays:356, is52Week:true,  rttTarget:"05 Mar 2026", rttStatus:"breaching" },
  { id:"p8",  priority:"planned",   name:"Thomas Adeyemi",     ref:"NHS-1184529", age:49, procedure:"Cystoscopy + Biopsy",              opcs:"M45.1", consultant:"Mr. G. Patel",   specialty:"Urology",         durationMins:30,  waitingDays:65,  is52Week:false, rttTarget:"25 Jul 2026", rttStatus:"on-track" },
  { id:"p9",  priority:"expedited", name:"Priya Sharma",       ref:"NHS-8840337", age:39, procedure:"Diagnostic Laparoscopy",           opcs:"T43.1", consultant:"Mr. L. Hughes",  specialty:"Gynecology",      durationMins:45,  waitingDays:176, is52Week:false, rttTarget:"18 Apr 2026", rttStatus:"at-risk"  },
  { id:"p10", priority:"routine",   name:"Colin McBride",      ref:"NHS-3301198", age:77, procedure:"Cataract Extraction + IOL",        opcs:"C71.1", consultant:"Mr. N. Ahmed",   specialty:"Ophthalmology",   durationMins:30,  waitingDays:88,  is52Week:false, rttTarget:"20 Jun 2026", rttStatus:"on-track" },
  { id:"p11", priority:"urgent",    name:"Yasmin Hassan",      ref:"NHS-6622017", age:44, procedure:"Mastectomy + Reconstruction",      opcs:"B27.1", consultant:"Ms. E. Okeke",   specialty:"Breast Surgery",  durationMins:210, waitingDays:315, is52Week:true,  rttTarget:"10 Mar 2026", rttStatus:"breaching" },
  { id:"p12", priority:"planned",   name:"Graham Fletcher",    ref:"NHS-9900824", age:55, procedure:"Anterior Cervical Discectomy",     opcs:"V27.1", consultant:"Mr. D. Rajan",   specialty:"Neurosurgery",    durationMins:180, waitingDays:72,  is52Week:false, rttTarget:"15 Aug 2026", rttStatus:"on-track" },
  { id:"p13", priority:"expedited", name:"Chioma Eze",         ref:"NHS-5510982", age:31, procedure:"Myomectomy",                      opcs:"Q07.1", consultant:"Mr. L. Hughes",  specialty:"Gynecology",      durationMins:120, waitingDays:199, is52Week:false, rttTarget:"08 Apr 2026", rttStatus:"at-risk"  },
  { id:"p14", priority:"routine",   name:"Edward Tanner",      ref:"NHS-2211763", age:65, procedure:"CABG × 3",                        opcs:"K40.1", consultant:"Mr. A. Singh",   specialty:"Cardiac Surgery", durationMins:300, waitingDays:110, is52Week:false, rttTarget:"05 Jun 2026", rttStatus:"on-track" },
  { id:"p15", priority:"planned",   name:"Nadia Kowalski",     ref:"NHS-8873441", age:28, procedure:"Septoplasty",                     opcs:"E03.1", consultant:"Ms. R. Bassi",   specialty:"ENT",             durationMins:45,  waitingDays:41,  is52Week:false, rttTarget:"30 Sep 2026", rttStatus:"on-track" },
  { id:"p16", priority:"urgent",    name:"Marcus Osei",        ref:"NHS-1102934", age:59, procedure:"Anterior Resection (colorectal)", opcs:"H33.1", consultant:"Ms. Y. Chen",    specialty:"General Surgery", durationMins:180, waitingDays:311, is52Week:true,  rttTarget:"02 Mar 2026", rttStatus:"breaching" },
  { id:"p17", priority:"routine",   name:"Linda Ashworth",     ref:"NHS-7742018", age:52, procedure:"Lumbar Discectomy",               opcs:"V30.1", consultant:"Mr. D. Rajan",   specialty:"Neurosurgery",    durationMins:150, waitingDays:120, is52Week:false, rttTarget:"28 May 2026", rttStatus:"on-track" },
  { id:"p18", priority:"expedited", name:"Kwame Asante",       ref:"NHS-4480215", age:47, procedure:"Tonsillectomy",                   opcs:"F34.1", consultant:"Ms. R. Bassi",   specialty:"ENT",             durationMins:45,  waitingDays:168, is52Week:false, rttTarget:"25 Apr 2026", rttStatus:"at-risk"  },
  { id:"p19", priority:"planned",   name:"Susan Flanagan",     ref:"NHS-3319902", age:41, procedure:"Hysteroscopy + D&C",              opcs:"Q17.1", consultant:"Mr. L. Hughes",  specialty:"Gynecology",      durationMins:30,  waitingDays:55,  is52Week:false, rttTarget:"15 Oct 2026", rttStatus:"on-track" },
  { id:"p20", priority:"routine",   name:"Patrick Nwachukwu",  ref:"NHS-6600871", age:63, procedure:"AAA Endovascular Repair",         opcs:"L28.1", consultant:"Mr. A. Singh",   specialty:"Vascular Surgery",durationMins:240, waitingDays:103, is52Week:false, rttTarget:"12 Jun 2026", rttStatus:"on-track" },
];

function parseDurationMins(value?: string | null): number {
  if (!value) return 0;
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function mapPathwayToPTL(pathway: Pathway): PTLPatient {
  const priorityMap: Record<string, Priority> = {
    urgent: "urgent",
    soon: "expedited",
    routine: "routine",
    unknown: "planned",
  };
  const rttMap: Record<string, RTTStatus> = {
    on_track: "on-track",
    at_risk: "at-risk",
    breaching: "breaching",
    within_52_week: "on-track",
  };
  const is52Week =
    pathway.rtt_status === "within_52_week" ||
    (pathway.rtt_target ? pathway.rtt_target.includes("52") : false);

  return {
    id: pathway.pathway_id,
    priority: priorityMap[pathway.priority] ?? "planned",
    name: pathway.patient_name,
    ref: pathway.patient_id,
    age: pathway.patient_age ?? 0,
    procedure: pathway.procedure ?? "—",
    opcs: pathway.opcs_code ?? "—",
    consultant: pathway.consultant,
    specialty: pathway.specialty,
    durationMins: parseDurationMins(pathway.duration),
    waitingDays: pathway.waiting_days,
    is52Week,
    rttTarget: pathway.rtt_target ?? "—",
    rttStatus: rttMap[pathway.rtt_status] ?? "on-track",
  };
}

// ─── MOCK: SESSION PLANNER ────────────────────────────────────────────────────

const THEATRE_NAMES = [
  "Theatre 1","Theatre 2","Theatre 3","Theatre 4",
  "Theatre 5","Theatre 6","Theatre 7","Theatre 8",
];

const SP_SPECIALTIES = [
  { name:"Orthopaedics",    abbrev:"ORTH"  },
  { name:"General Surgery", abbrev:"GS"    },
  { name:"Urology",         abbrev:"URO"   },
  { name:"Gynecology",      abbrev:"GYN"   },
  { name:"ENT",             abbrev:"ENT"   },
  { name:"Ophthalmology",   abbrev:"OPTH"  },
  { name:"Cardiac Surgery", abbrev:"CARD"  },
  { name:"Plastics",        abbrev:"PLAS"  },
  { name:"Neurosurgery",    abbrev:"NEURO" },
];
// Future integration: these will map to real staff records in Vetara/roster
const SURGEONS = [
  {i:"RC",last:"Kapoor"},{i:"SA",last:"Ahmed"},{i:"YC",last:"Chen"},
  {i:"GP",last:"Patel"},{i:"LH",last:"Hughes"},{i:"EO",last:"Okeke"},
  {i:"NF",last:"Foster"},{i:"DR",last:"Rajan"},{i:"AS",last:"Singh"},
];
const ANAESTHETISTS = [
  {i:"JM",last:"Morris"},{i:"TK",last:"Kumar"},{i:"RB",last:"Brown"},
  {i:"MS",last:"Saha"},{i:"KP",last:"Patel"},{i:"HC",last:"Chen"},
];

const PENDING_ISSUE_POOL: PendingIssue[] = [
  { type:"clinical",    detail:"Pre-op bloods outstanding" },
  { type:"operational", detail:"Consent form not completed" },
  { type:"staffing",    detail:"Anaesthetist not yet confirmed" },
  { type:"equipment",   detail:"Specialist equipment not verified" },
  { type:"patient",     detail:"DNA risk — patient not confirmed" },
  { type:"clinical",    detail:"Recent ECG review required" },
  { type:"operational", detail:"Booking documentation incomplete" },
];

function seededRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function generateWeekSessions(weekStart: Date): TheatreSession[] {
  const baseSeed = Math.floor(weekStart.getTime() / (1000 * 60 * 60 * 24 * 7));
  const sessions: TheatreSession[] = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + d);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const dateStr = day.toISOString().split("T")[0];
    THEATRE_NAMES.forEach((theatre, tIdx) => {
      if (tIdx === 6 && d > 2) return;
      if (tIdx === 7 && d > 1) return;
      const seed  = baseSeed * 100 + tIdx * 10 + d;
      const spAM  = SP_SPECIALTIES[(tIdx + d) % SP_SPECIALTIES.length];
      const spPM  = SP_SPECIALTIES[(tIdx + d + 3) % SP_SPECIALTIES.length];
      const surgAM  = SURGEONS[(tIdx + d) % SURGEONS.length];
      const anaesAM = ANAESTHETISTS[(tIdx * 2 + d) % ANAESTHETISTS.length];
      const surgPM  = SURGEONS[(tIdx + d + 2) % SURGEONS.length];
      const anaesPM = ANAESTHETISTS[(tIdx + d) % ANAESTHETISTS.length];
      const issueAM = seededRand(seed + 70) > 0.78 ? [PENDING_ISSUE_POOL[Math.floor(seededRand(seed + 75) * PENDING_ISSUE_POOL.length)]] : [];
      const issuePM = seededRand(seed + 71) > 0.78 ? [PENDING_ISSUE_POOL[Math.floor(seededRand(seed + 76) * PENDING_ISSUE_POOL.length)]] : [];
      if (seededRand(seed) > 0.1) {
        sessions.push({
          theatreId: theatre, date: dateStr, type: "AM",
          specialty: spAM.name, specialtyAbbrev: spAM.abbrev,
          surgeon: surgAM.last, anaesthetist: anaesAM.last,
          cases: 2 + Math.floor(seededRand(seed + 50) * 4),
          utilization: 70 + Math.floor(seededRand(seed + 90) * 29),
          startTime:"08:00", endTime:"13:00",
          teamComplete: seededRand(seed + 80) > 0.12,
          pendingIssues: issueAM,
        });
      }
      if (seededRand(seed + 20) > 0.2) {
        sessions.push({
          theatreId: theatre, date: dateStr, type: "PM",
          specialty: spPM.name, specialtyAbbrev: spPM.abbrev,
          surgeon: surgPM.last, anaesthetist: anaesPM.last,
          cases: 1 + Math.floor(seededRand(seed + 60) * 3),
          utilization: 55 + Math.floor(seededRand(seed + 80) * 40),
          startTime:"13:00", endTime:"20:00",
          teamComplete: seededRand(seed + 81) > 0.12,
          pendingIssues: issuePM,
        });
      }
    });
  }
  return sessions;
}

// ─── MOCK: RT DASHBOARD ───────────────────────────────────────────────────────

const RT_THEATRES: RTTheatre[] = [
  {
    id:"T1", name:"Theatre 1", specialty:"Orthopaedics", status:"active",
    currentCase:"Total Knee Replacement",
    currentConsultant:"Mr. R. Kapoor", currentPatient:"Pt. M.O.",
    progressPct:65, caseStarted:"09:15", estimatedEnd:"11:07",
    nextCase:"Hip Hemiarthroplasty — 11:30",
    casesToday:4, completedCases:1, delayMins:22,
    staff:[
      { name:"Sarah Mitchell", role:"Scrubbed",     initials:"SM", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"James Park",     role:"Circulating",  initials:"JP", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Dr. T. Kumar",   role:"Anaesthetist", initials:"TK", dutyStart:"08:00", dutyEnd:"17:00" },
      { name:"Linda Foster",   role:"ODP",          initials:"LF", dutyStart:"08:00", dutyEnd:"16:00", breakSince:"10:15", breakUntil:"10:45" },
      { name:"Ben Okafor",     role:"HCA",          initials:"BO", dutyStart:"09:00", dutyEnd:"17:00" },
    ],
    delays:[{
      startTime:"09:52", minutes:22, reason:"equipment",
      detail:"Arthroscopic scope failure. Backup scope sourced from Theatre 7.",
      raisedBy:"Sarah Mitchell",
    }],
    cancellations:[], incidents:[],
    comments:[{
      time:"10:05", author:"SDM: J. Harrison",
      text:"Aware of scope issue. Backup sourced from T7. List will run approx 22 mins late. T2 has buffer if overspill needed.",
    }],
    caseList:[
      { procedure:"Hip Hemiarthroplasty",  consultant:"Mr. R. Kapoor", patient:"Pt. S.L.", scheduledStart:"07:45", scheduledEnd:"09:15", status:"completed" },
      { procedure:"Total Knee Replacement",consultant:"Mr. R. Kapoor", patient:"Pt. M.O.", scheduledStart:"09:15", scheduledEnd:"10:45", status:"active"    },
      { procedure:"ACL Reconstruction",    consultant:"Mr. R. Kapoor", patient:"Pt. D.B.", scheduledStart:"11:30", scheduledEnd:"13:00", status:"pending"   },
      { procedure:"Shoulder Arthroscopy",  consultant:"Mr. R. Kapoor", patient:"Pt. F.N.", scheduledStart:"13:15", scheduledEnd:"14:15", status:"pending"   },
    ],
  },
  {
    id:"T2", name:"Theatre 2", specialty:"General Surgery", status:"between-cases",
    currentConsultant:"Mr. S. Ahmed",
    progressPct:0, nextCase:"Lap Cholecystectomy — 10:45",
    casesToday:3, completedCases:1,
    staff:[
      { name:"Amy Nwosu",      role:"Scrubbed",     initials:"AN", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Paul Griffiths", role:"Circulating",  initials:"PG", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Dr. R. Brown",   role:"Anaesthetist", initials:"RB", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Kat Ellis",      role:"ODP",          initials:"KE", dutyStart:"09:00", dutyEnd:"17:00" },
    ],
    delays:[], incidents:[], comments:[],
    cancellations:[{
      procedure:"Inguinal Hernia Repair", patient:"Pt. R.M.", time:"09:30", reason:"dna",
      detail:"Patient did not attend pre-op assessment. Unable to contact next of kin. Slot lost.",
    }],
    caseList:[
      { procedure:"Laparoscopic Appendicectomy", consultant:"Mr. S. Ahmed", patient:"Pt. A.W.", scheduledStart:"08:00", scheduledEnd:"08:45", status:"completed" },
      { procedure:"Inguinal Hernia Repair",      consultant:"Mr. S. Ahmed", patient:"Pt. R.M.", scheduledStart:"09:00", scheduledEnd:"10:00", status:"cancelled" },
      { procedure:"Lap Cholecystectomy",         consultant:"Mr. S. Ahmed", patient:"Pt. D.O.", scheduledStart:"10:45", scheduledEnd:"11:45", status:"pending"   },
    ],
  },
  {
    id:"T3", name:"Theatre 3", specialty:"Gynecology", status:"active",
    currentCase:"Diagnostic Laparoscopy",
    currentConsultant:"Mr. L. Hughes", currentPatient:"Pt. P.S.",
    progressPct:40, caseStarted:"10:05", estimatedEnd:"11:05",
    nextCase:"Myomectomy — 11:30",
    casesToday:5, completedCases:2, delayMins:15,
    staff:[
      { name:"Fiona West",  role:"Scrubbed",     initials:"FW", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Chris Obi",   role:"Circulating",  initials:"CO", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Dr. M. Saha", role:"Anaesthetist", initials:"MS", dutyStart:"08:00", dutyEnd:"17:00" },
      { name:"Diana Tran",  role:"ODP",          initials:"DT", dutyStart:"08:00", dutyEnd:"16:00" },
    ],
    cancellations:[], incidents:[{
      time:"10:20", level:"medium",
      title:"Near-miss: IV line disconnection",
      detail:"IV line briefly disconnected during patient repositioning. Reconnected immediately. No patient harm. Reported for learning.",
      reportedBy:"Diana Tran",
    }],
    delays:[{
      startTime:"10:10", minutes:15, reason:"staffing",
      detail:"Only 1 scrub nurse available at list start. Agency cover sourced, arriving 10:30.",
      raisedBy:"Fiona West",
    }],
    comments:[{
      time:"09:55", author:"SDM: J. Harrison",
      text:"Staffing shortfall escalated at list start. Agency scrub nurse secured and arriving 10:30. List progressing with cover arrangements.",
    }],
    caseList:[
      { procedure:"Hysteroscopy + D&C",        consultant:"Mr. L. Hughes", patient:"Pt. S.F.", scheduledStart:"08:00", scheduledEnd:"08:30", status:"completed" },
      { procedure:"Laparoscopic Sterilisation", consultant:"Mr. L. Hughes", patient:"Pt. C.E.", scheduledStart:"08:45", scheduledEnd:"09:30", status:"completed" },
      { procedure:"Diagnostic Laparoscopy",    consultant:"Mr. L. Hughes", patient:"Pt. P.S.", scheduledStart:"09:45", scheduledEnd:"10:30", status:"active"    },
      { procedure:"Myomectomy",                consultant:"Mr. L. Hughes", patient:"Pt. C.E.", scheduledStart:"11:30", scheduledEnd:"13:30", status:"pending"   },
      { procedure:"Ovarian Cystectomy",        consultant:"Mr. L. Hughes", patient:"Pt. Y.H.", scheduledStart:"14:00", scheduledEnd:"15:00", status:"pending"   },
    ],
  },
  {
    id:"T4", name:"Theatre 4", specialty:"Urology", status:"active",
    currentCase:"TURP",
    currentConsultant:"Mr. G. Patel", currentPatient:"Pt. J.P.",
    progressPct:80, caseStarted:"08:30", estimatedEnd:"09:45",
    nextCase:"Cystoscopy + Biopsy — 10:30",
    casesToday:6, completedCases:2,
    staff:[
      { name:"Mark Owens",   role:"Scrubbed",     initials:"MO", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Tanya Reid",   role:"Circulating",  initials:"TR", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Dr. K. Patel", role:"Anaesthetist", initials:"KP", dutyStart:"07:30", dutyEnd:"16:30" },
      { name:"Sean Walsh",   role:"ODP",          initials:"SW", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Rachel Green", role:"HCA",          initials:"RG", dutyStart:"08:00", dutyEnd:"16:00", breakSince:"10:00", breakUntil:"10:30" },
    ],
    delays:[], cancellations:[], incidents:[], comments:[],
    caseList:[
      { procedure:"Flexible Cystoscopy",  consultant:"Mr. G. Patel", patient:"Pt. T.A.", scheduledStart:"07:45", scheduledEnd:"08:15", status:"completed" },
      { procedure:"Ureteroscopy + Laser", consultant:"Mr. G. Patel", patient:"Pt. P.N.", scheduledStart:"08:15", scheduledEnd:"08:30", status:"completed" },
      { procedure:"TURP",                 consultant:"Mr. G. Patel", patient:"Pt. J.P.", scheduledStart:"08:30", scheduledEnd:"09:45", status:"active"    },
      { procedure:"Cystoscopy + Biopsy",  consultant:"Mr. G. Patel", patient:"Pt. T.A.", scheduledStart:"10:30", scheduledEnd:"11:00", status:"pending"   },
      { procedure:"Nephrectomy (Lap)",    consultant:"Mr. G. Patel", patient:"Pt. C.M.", scheduledStart:"11:15", scheduledEnd:"13:15", status:"pending"   },
      { procedure:"Prostate Biopsy",      consultant:"Mr. G. Patel", patient:"Pt. E.T.", scheduledStart:"13:30", scheduledEnd:"14:00", status:"pending"   },
    ],
  },
  {
    id:"T5", name:"Theatre 5", specialty:"Cardiac Surgery", status:"active",
    currentCase:"CABG × 3",
    currentConsultant:"Mr. A. Singh", currentPatient:"Pt. E.T.",
    progressPct:55, caseStarted:"07:45", estimatedEnd:"12:45",
    nextCase:"Valve Repair — 15:00",
    casesToday:2, completedCases:0,
    staff:[
      { name:"Elena Marsh", role:"Scrubbed",     initials:"EM", dutyStart:"07:30", dutyEnd:"17:30" },
      { name:"Kofi Mensah", role:"Circulating",  initials:"KM", dutyStart:"07:30", dutyEnd:"17:30" },
      { name:"Dr. H. Chen", role:"Anaesthetist", initials:"HC", dutyStart:"07:00", dutyEnd:"18:00" },
      { name:"Nadia Bloom", role:"ODP",          initials:"NB", dutyStart:"07:30", dutyEnd:"17:30" },
      { name:"Tim Reeves",  role:"Circulating",  initials:"TR", dutyStart:"08:00", dutyEnd:"16:00" },
    ],
    delays:[], cancellations:[], incidents:[],
    comments:[{
      time:"08:15", author:"SDM: J. Harrison",
      text:"CABG x3 complex case — perfusionist confirmed on pump. ICU bed reserved (Bay 3). Post-op transfer anticipated approx 13:30. Monitor closely.",
    }],
    caseList:[
      { procedure:"CABG × 3",    consultant:"Mr. A. Singh", patient:"Pt. E.T.", scheduledStart:"07:45", scheduledEnd:"12:45", status:"active"  },
      { procedure:"Valve Repair", consultant:"Mr. A. Singh", patient:"Pt. P.N.", scheduledStart:"15:00", scheduledEnd:"17:30", status:"pending" },
    ],
  },
  {
    id:"T6", name:"Theatre 6", specialty:"ENT", status:"between-cases",
    currentConsultant:"Ms. R. Bassi",
    progressPct:0, nextCase:"Septoplasty — 11:15",
    casesToday:4, completedCases:2,
    staff:[
      { name:"Jane Cooper", role:"Scrubbed",     initials:"JC", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Liam Taylor", role:"Circulating",  initials:"LT", dutyStart:"08:00", dutyEnd:"16:00" },
      { name:"Dr. P. Rao",  role:"Anaesthetist", initials:"PR", dutyStart:"08:00", dutyEnd:"16:00" },
    ],
    delays:[], incidents:[], comments:[],
    cancellations:[{
      procedure:"Tonsillectomy", patient:"Pt. K.A.", time:"08:45", reason:"patient-unfit",
      detail:"Patient found to have active URTI at pre-op check. Surgery deferred. Slot not replaceable today.",
    }],
    caseList:[
      { procedure:"Grommets (Bilateral)", consultant:"Ms. R. Bassi", patient:"Pt. L.A.", scheduledStart:"08:00", scheduledEnd:"08:30", status:"completed" },
      { procedure:"Tonsillectomy",        consultant:"Ms. R. Bassi", patient:"Pt. K.A.", scheduledStart:"08:45", scheduledEnd:"09:30", status:"cancelled" },
      { procedure:"Nasal Polypectomy",    consultant:"Ms. R. Bassi", patient:"Pt. S.F.", scheduledStart:"09:45", scheduledEnd:"10:30", status:"completed" },
      { procedure:"Septoplasty",          consultant:"Ms. R. Bassi", patient:"Pt. N.K.", scheduledStart:"11:15", scheduledEnd:"12:00", status:"pending"   },
    ],
  },
  {
    id:"T7", name:"Theatre 7", specialty:"Plastics", status:"active",
    currentCase:"Carpal Tunnel Release (Bilateral)",
    currentConsultant:"Ms. T. Lawson", currentPatient:"Pt. F.C.",
    progressPct:90, caseStarted:"09:00", estimatedEnd:"10:15",
    nextCase:"Skin Graft — 10:15",
    casesToday:6, completedCases:3,
    staff:[
      { name:"Olivia Stone", role:"Scrubbed",     initials:"OS", dutyStart:"09:00", dutyEnd:"17:00" },
      { name:"Dev Patel",    role:"Circulating",  initials:"DP", dutyStart:"09:00", dutyEnd:"17:00" },
      { name:"Dr. S. Flynn", role:"Anaesthetist", initials:"SF", dutyStart:"09:00", dutyEnd:"17:00" },
    ],
    delays:[], cancellations:[], incidents:[], comments:[],
    caseList:[
      { procedure:"Dupuytren's Fasciectomy", consultant:"Ms. T. Lawson", patient:"Pt. M.O.", scheduledStart:"08:00", scheduledEnd:"08:45", status:"completed" },
      { procedure:"Trigger Finger Release",  consultant:"Ms. T. Lawson", patient:"Pt. C.M.", scheduledStart:"08:45", scheduledEnd:"09:00", status:"completed" },
      { procedure:"Nail Bed Repair",         consultant:"Ms. T. Lawson", patient:"Pt. A.T.", scheduledStart:"09:00", scheduledEnd:"09:00", status:"completed" },
      { procedure:"CTR Bilateral",           consultant:"Ms. T. Lawson", patient:"Pt. F.C.", scheduledStart:"09:00", scheduledEnd:"10:00", status:"active"    },
      { procedure:"Skin Graft",              consultant:"Ms. T. Lawson", patient:"Pt. R.E.", scheduledStart:"10:15", scheduledEnd:"11:30", status:"pending"   },
      { procedure:"Lipoma Excision",         consultant:"Ms. T. Lawson", patient:"Pt. B.O.", scheduledStart:"11:45", scheduledEnd:"12:15", status:"pending"   },
    ],
  },
  {
    id:"T8", name:"Theatre 8", specialty:"Neurosurgery", status:"standby",
    progressPct:0, nextCase:"Craniotomy — 14:00",
    casesToday:1, completedCases:0,
    staff:[
      { name:"Chloe Nkosi",   role:"ODP",         initials:"CN", dutyStart:"13:00", dutyEnd:"22:00" },
      { name:"Michael Burns", role:"Circulating",  initials:"MB", dutyStart:"13:00", dutyEnd:"22:00" },
    ],
    delays:[], cancellations:[], incidents:[],
    comments:[{
      time:"10:05", author:"SDM: J. Harrison",
      text:"On-call team briefed. Craniotomy list starting 14:00. Anaesthetic team confirmed. Neuro ICU bed available.",
    }],
    caseList:[
      { procedure:"Craniotomy — Tumour Resection", consultant:"Mr. D. Rajan", patient:"Pt. G.F.", scheduledStart:"14:00", scheduledEnd:"18:00", status:"pending" },
    ],
  },
];

const BED_UNITS: BedUnit[] = [
  { name:"Surgical Ward A",  total:28, occupied:24, available:3, blocked:1 },
  { name:"Surgical Ward B",  total:32, occupied:29, available:2, blocked:1 },
  { name:"ICU",              total:12, occupied:11, available:1, blocked:0 },
  { name:"HDU",              total:8,  occupied:6,  available:2, blocked:0 },
  { name:"Day Surgery Unit", total:16, occupied:9,  available:7, blocked:0 },
  { name:"Recovery",         total:10, occupied:4,  available:6, blocked:0 },
];

const ALERTS: Alert[] = [
  { id:"a1", level:"critical", title:"Theatre 3 — Short Scrub Staff",        detail:"Only 1 scrub nurse available. Minimum 2 required for laparoscopic cases.", time:"09:42" },
  { id:"a2", level:"critical", title:"ICU capacity at 91%",                   detail:"Post-op cardiac patient pending ICU admission. Escalate bed manager.",       time:"10:01" },
  { id:"a3", level:"warning",  title:"Theatre 2 — Turnover exceeding 30 min", detail:"Clean-down commenced 10:12. Target hand-over 10:45.",                        time:"10:12" },
  { id:"a4", level:"warning",  title:"Surgical Ward B — 2 blocked beds",      detail:"Delayed discharge ×2. Social care referrals outstanding.",                   time:"08:30" },
  { id:"a5", level:"info",     title:"Theatre 8 activated for elective",      detail:"On-call team briefed. Craniotomy list starting 14:00.",                      time:"10:05" },
];

// ─── STYLE MAPS ───────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<Priority, { bg: string; color: string; label: string }> = {
  urgent:    { bg:"#fef2f2", color:"#dc2626", label:"Urgent"    },
  expedited: { bg:"#fff7ed", color:"#ea580c", label:"Expedited" },
  routine:   { bg:"#eff6ff", color:"#2563eb", label:"Routine"   },
  planned:   { bg:"#f0fdf4", color:"#16a34a", label:"Planned"   },
};

const RTT_STYLE: Record<RTTStatus, { color: string; label: string }> = {
  "on-track":  { color:"#16a34a", label:"On Track"  },
  "at-risk":   { color:"#d97706", label:"At Risk"   },
  "breaching": { color:"#dc2626", label:"Breaching" },
  "suspended": { color:"#94a3b8", label:"Suspended" },
};

const SESSION_STYLE: Record<SessionType, { bg: string; border: string; color: string }> = {
  AM:        { bg:"#eff6ff", border:"#bfdbfe", color:"#1d4ed8" },
  PM:        { bg:"#f5f3ff", border:"#ddd6fe", color:"#7c3aed" },
  FULL:      { bg:"#fff7ed", border:"#fed7aa", color:"#c2410c" },
  EVE:       { bg:"#fdf4ff", border:"#e9d5ff", color:"#9333ea" },
  EMERGENCY: { bg:"#fef2f2", border:"#fecaca", color:"#dc2626" },
};

const THEATRE_STATUS_STYLE: Record<TheatreStatus, { dot: string; label: string }> = {
  "active":        { dot:"#16a34a", label:"Active"    },
  "between-cases": { dot:"#d97706", label:"Turnover"  },
  "closed":        { dot:"#94a3b8", label:"Closed"    },
  "emergency":     { dot:"#dc2626", label:"Emergency" },
  "standby":       { dot:"#0ea5e9", label:"Standby"   },
};

const ROLE_DOT: Record<StaffRole, string> = {
  Scrubbed:"#1d4ed8", Circulating:"#15803d", Anaesthetist:"#7c3aed",
  ODP:"#c2410c", HCA:"#475569", Break:"#9333ea",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getWeekStart(d: Date): Date {
  const day  = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getMonthDays(ref: Date): Date[] {
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const start = getWeekStart(firstDay);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

// ─── PTL TAB ──────────────────────────────────────────────────────────────────

type PTLSortKey = keyof PTLPatient;

const PTL_COLS: { label: string; key: PTLSortKey; w: string }[] = [
  { label:"Priority",         key:"priority",     w:"110px" },
  { label:"Patient",          key:"name",         w:"190px" },
  { label:"Procedure / OPCS", key:"procedure",    w:"220px" },
  { label:"Consultant",       key:"consultant",   w:"170px" },
  { label:"Specialty",        key:"specialty",    w:"150px" },
  { label:"Dur.",             key:"durationMins", w:"70px"  },
  { label:"Waiting",          key:"waitingDays",  w:"100px" },
  { label:"RTT Target",       key:"rttTarget",    w:"120px" },
  { label:"RTT Status",       key:"rttStatus",    w:"115px" },
];

function PTLTab({ deepFilters }: { deepFilters?: Record<string, string> }) {
  const [sortKey, setSortKey] = useState<PTLSortKey>("waitingDays");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [ptlRows, setPtlRows] = useState<PTLPatient[]>(PTL_PATIENTS);
  const [ptlCounts, setPtlCounts] = useState<Record<string, number>>({});
  const [ptlSources, setPtlSources] = useState<{ sources_used?: Array<{ system: string; status: string }> } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (deepFilters && Object.keys(deepFilters).length > 0) {
      setFilters(deepFilters);
    }
  }, [deepFilters]);

  useEffect(() => {
    let isActive = true;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const url = params.toString() ? `/api/access-pathways/ptl?${params.toString()}` : "/api/access-pathways/ptl";
    fetch(url)
      .then((res) => res.json())
      .then((payload) => {
        if (!isActive) return;
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setPtlRows(data.map(mapPathwayToPTL));
        const nextCounts: Record<string, number> = {};
        if (Array.isArray(payload?.counts)) {
          for (const item of payload.counts) {
            if (item?.key) nextCounts[item.key] = item.count ?? 0;
          }
        }
        setPtlCounts(nextCounts);
        setPtlSources(payload?.sources ?? null);
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, [filters]);

  function toggleSort(key: PTLSortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = useMemo(() => {
    return [...ptlRows].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      let r = 0;
      if (typeof av === "number" && typeof bv === "number") r = av - bv;
      else if (typeof av === "string" && typeof bv === "string") r = av.localeCompare(bv);
      else if (typeof av === "boolean" && typeof bv === "boolean") r = Number(av) - Number(bv);
      return sortDir === "asc" ? r : -r;
    });
  }, [ptlRows, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total:     ptlCounts["in_pool"] ?? ptlRows.length,
    atRisk:    ptlCounts["at_risk"] ?? ptlRows.filter(p => p.rttStatus === "at-risk").length,
    breaching: ptlCounts["breaching"] ?? ptlRows.filter(p => p.rttStatus === "breaching").length,
    week52:    ptlRows.filter(p => p.is52Week).length,
    urgent:    ptlCounts["urgent"] ?? ptlRows.filter(p => p.priority === "urgent").length,
    onTrack:   ptlCounts["on_track"] ?? ptlRows.filter(p => p.rttStatus === "on-track").length,
  }), [ptlCounts, ptlRows]);

  function SortIcon({ k }: { k: PTLSortKey }) {
    if (sortKey !== k) return <ChevronDown className="w-3.5 h-3.5 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp   className="w-3.5 h-3.5 text-[#0ea5e9]" />
      : <ChevronDown className="w-3.5 h-3.5 text-[#0ea5e9]" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0" style={{ width: "max-content" }}>
        {[
          { label:"In Pool",   value:stats.total,     color:"#0ea5e9" },
          { label:"At Risk",   value:stats.atRisk,    color:"#d97706" },
          { label:"Breaching", value:stats.breaching, color:"#dc2626" },
          { label:"52-Week",   value:stats.week52,    color:"#7c3aed" },
          { label:"Urgent",    value:stats.urgent,    color:"#dc2626" },
          { label:"On Track",  value:stats.onTrack,   color:"#16a34a" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#dde3ed] rounded-xl px-2 py-1.5">
            <div className="flex items-baseline gap-2">
              <div className="text-xl sm:text-2xl font-bold" style={{ color:s.color }}>{s.value}</div>
              <div className="text-[16px] sm:text-[16px] text-[#94a3b8] font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      {ptlSources?.sources_used?.length ? (
        <div className="px-6 pb-3 text-[16px] text-[#64748b]">
          Sources: {ptlSources.sources_used.map((s) => `${s.system} (${s.status})`).join(", ")}
        </div>
      ) : null}

      {/* Table */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden" style={{ minWidth: 980 }}>
          <table className="w-full" style={{ fontSize: 16, color: "#0f172a", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                {PTL_COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-4 py-3 text-left text-[16px] font-semibold text-[#64748b] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    style={{ width:col.w, minWidth:col.w, borderRight:"1px solid #e2e8f0" }}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon k={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const ps    = PRIORITY_STYLE[p.priority];
                const rs    = RTT_STYLE[p.rttStatus];
                const rowBg = i % 2 === 0 ? "#ffffff" : "#f9fbff";
                return (
                  <tr
                    key={p.id}
                    className="transition-colors"
                    style={{ borderBottom: i < sorted.length - 1 ? "1px solid #e2e8f0" : "none", background: rowBg }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
                  >
                    <td className="px-4 py-3" style={{ borderRight:"1px solid #e2e8f0" }}>
                      <span className="px-2.5 py-1 rounded-full text-[16px] font-semibold" style={{ background:ps.bg, color:ps.color }}>
                        {ps.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ borderRight:"1px solid #e2e8f0" }}>
                      <div className="font-medium text-[#0f172a]">{p.name}</div>
                      <div className="text-[16px] text-[#94a3b8]">{p.ref} · Age {p.age}</div>
                    </td>
                    <td className="px-4 py-3" style={{ borderRight:"1px solid #e2e8f0" }}>
                      <div className="text-[#0f172a]">{p.procedure}</div>
                      <div className="text-[16px] font-mono text-[#94a3b8]">{p.opcs}</div>
                    </td>
                    <td className="px-4 py-3 text-[#475569]" style={{ borderRight:"1px solid #e2e8f0" }}>{p.consultant}</td>
                    <td className="px-4 py-3 text-[#475569]" style={{ borderRight:"1px solid #e2e8f0" }}>{p.specialty}</td>
                    <td className="px-4 py-3 text-[#475569] whitespace-nowrap" style={{ borderRight:"1px solid #e2e8f0" }}>{p.durationMins}m</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ borderRight:"1px solid #e2e8f0" }}>
                      <div className="font-semibold text-[#0f172a]">{p.waitingDays}d</div>
                      {p.is52Week && (
                        <span className="text-[16px] font-bold px-2 py-0.5 rounded mt-0.5 inline-block" style={{ background:"#f3e8ff", color:"#7c3aed" }}>52-wk</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#475569] whitespace-nowrap" style={{ borderRight:"1px solid #e2e8f0" }}>{p.rttTarget}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ color:rs.color }}>{rs.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AccessPathwaysMetricsView({
  endpoint,
  initialFilters,
}: {
  endpoint: string;
  initialFilters?: Record<string, string>;
}) {
  const [metrics, setMetrics] = useState<Array<{ key: string; count: number }>>([]);
  const [definitions, setDefinitions] = useState<Array<{ key: string; label: string; definition: string; category: string }>>([]);
  const [table, setTable] = useState<{ columns: Array<{ key: string; label: string; width?: string }>; rows: Array<Record<string, string | number | null>> } | null>(null);
  const [sources, setSources] = useState<{ sources_used: Array<{ system: string; status: string }>; expected_sources: string[] } | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ specialties: string[]; consultants: string[]; sites: string[] } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [filters, setFilters] = useState({ specialty: "", consultant: "", site: "", date_from: "", date_to: "" });

  useEffect(() => {
    if (!initialFilters) return;
    setFilters((prev) => ({
      ...prev,
      specialty: initialFilters.specialty ?? prev.specialty,
      consultant: initialFilters.consultant ?? prev.consultant,
      site: initialFilters.site ?? prev.site,
      date_from: initialFilters.date_from ?? prev.date_from,
      date_to: initialFilters.date_to ?? prev.date_to,
    }));
  }, [initialFilters]);

  useEffect(() => {
    let isActive = true;
    const params = new URLSearchParams();
    if (filters.specialty) params.set("specialty", filters.specialty);
    if (filters.consultant) params.set("consultant", filters.consultant);
    if (filters.site) params.set("site", filters.site);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    fetch(url)
      .then((res) => res.json())
      .then((payload) => {
        if (!isActive) return;
        setMetrics(Array.isArray(payload?.metrics) ? payload.metrics : []);
        setDefinitions(Array.isArray(payload?.definitions) ? payload.definitions : []);
        setTable(payload?.table ?? null);
        setSources(payload?.sources ?? null);
        setFilterOptions(payload?.filter_options ?? null);
        setUpdatedAt(payload?.updated_at ?? "");
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, [endpoint, filters]);

  const metricCards = definitions.map((definition) => {
    const count = metrics.find((m) => m.key === definition.key)?.count ?? 0;
    return {
      key: definition.key,
      label: definition.label,
      definition: definition.definition,
      count,
    };
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3">
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
          style={{ width: "max-content" }}
        >
          {metricCards.map((card) => (
            <div
              key={card.key}
              className="bg-white border border-[#dde3ed] rounded-xl px-2 py-1.5"
              title={card.definition}
              style={{ minWidth: 120 }}
            >
              <div className="flex items-baseline gap-2">
                <div className="text-xl sm:text-2xl font-bold text-[#0f172a]">
                  {card.count}
                </div>
                <div className="text-[16px] sm:text-[16px] text-[#94a3b8] font-medium">
                  {card.label}
                </div>
              </div>
            </div>
          ))}
        </div>
        {updatedAt && (
          <div className="text-[16px] text-[#94a3b8] mt-2">
            Updated {new Date(updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        )}
        {sources && (
          <div className="mt-2 text-[16px] text-[#64748b]">
            Sources: {sources.sources_used.map((s) => `${s.system} (${s.status})`).join(", ")}
            {sources.expected_sources.length > 0 && (
              <span className="text-[#94a3b8]"> · Expected: {sources.expected_sources.join(", ")}</span>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[16px] font-semibold text-[#64748b] uppercase">Specialty</label>
            <select
              value={filters.specialty}
              onChange={(e) => setFilters((prev) => ({ ...prev, specialty: e.target.value }))}
              className="mt-1 w-[180px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[16px] text-[#0f172a]"
            >
              <option value="">All</option>
              {filterOptions?.specialties.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[16px] font-semibold text-[#64748b] uppercase">Consultant</label>
            <select
              value={filters.consultant}
              onChange={(e) => setFilters((prev) => ({ ...prev, consultant: e.target.value }))}
              className="mt-1 w-[180px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[16px] text-[#0f172a]"
            >
              <option value="">All</option>
              {filterOptions?.consultants.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[16px] font-semibold text-[#64748b] uppercase">Site</label>
            <select
              value={filters.site}
              onChange={(e) => setFilters((prev) => ({ ...prev, site: e.target.value }))}
              className="mt-1 w-[160px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[16px] text-[#0f172a]"
            >
              <option value="">All</option>
              {filterOptions?.sites.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[16px] font-semibold text-[#64748b] uppercase">From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              className="mt-1 w-[150px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[16px] text-[#0f172a]"
            />
          </div>
          <div>
            <label className="text-[16px] font-semibold text-[#64748b] uppercase">To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              className="mt-1 w-[150px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[16px] text-[#0f172a]"
            />
          </div>
          <button
            onClick={() => setFilters({ specialty: "", consultant: "", site: "", date_from: "", date_to: "" })}
            className="ml-auto bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[16px] font-semibold text-[#475569]"
          >
            Clear filters
          </button>
          <button
            onClick={() => {
              if (!table) return;
              const headers = table.columns.map((col) => col.label);
              const rows = table.rows.map((row) =>
                table.columns.map((col) => `${row[col.key] ?? ""}`),
              );
              const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/\"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${endpoint.split("/").pop() ?? "access-pathways"}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="bg-[#0ea5e9] text-white rounded-lg px-3 py-2 text-[16px] font-semibold"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="flex-1 px-6 pb-6 overflow-auto">
        {table ? (
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <table className="w-full" style={{ fontSize: 16, color: "#0f172a", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {table.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-[16px] font-semibold text-[#64748b] uppercase tracking-wider whitespace-nowrap"
                      style={{ width: col.width ?? "auto", borderRight: "1px solid #e2e8f0" }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => {
                  const rowBg = i % 2 === 0 ? "#ffffff" : "#f9fbff";
                  return (
                    <tr key={i} style={{ background: rowBg, borderBottom: "1px solid #e2e8f0" }}>
                      {table.columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-[#0f172a]" style={{ borderRight: "1px solid #e2e8f0" }}>
                          {row[col.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {(!table || table.rows.length === 0) && (
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 text-[16px] text-[#64748b] mt-3">
            No relevant data found from connected systems.
            {sources?.expected_sources?.length ? (
              <div className="text-[16px] text-[#94a3b8] mt-2">
                Missing sources: {sources.expected_sources.join(", ")}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SESSION CARD ─────────────────────────────────────────────────────────────

function SessionCard({ s, compact = false }: { s: TheatreSession; compact?: boolean }) {
  const st        = SESSION_STYLE[s.type];
  const utilColor = s.utilization >= 85 ? "#16a34a" : s.utilization >= 60 ? "#d97706" : "#dc2626";
  const hasPending = s.pendingIssues.length > 0;
  return (
    <div
      style={{ background:st.bg, border:`1.5px solid ${st.border}`, borderRadius:10,
        padding:compact?"8px 10px":"12px 14px", cursor:"pointer" }}
      className="hover:shadow-md transition-shadow"
    >
      {/* Row 1: type + time + util */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:3 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize: 16, fontWeight:800, color:st.color, textTransform:"uppercase", letterSpacing:"0.05em" }}>
            {s.type}
          </span>
          <span style={{ fontSize: 16, color:"#64748b", fontWeight:500 }}>
            {s.startTime}–{s.endTime}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {hasPending && (
            <span
              title={s.pendingIssues.map(i => `${i.type.toUpperCase()}: ${i.detail}`).join(" | ")}
              style={{ fontSize: 16, color:"#ea580c", fontWeight:700, cursor:"help", lineHeight:1 }}>⚠</span>
          )}
          <span style={{ fontSize: 16, fontWeight:700, color:utilColor }}>{s.utilization}%</span>
        </div>
      </div>
      {/* Specialty */}
      <div style={{ fontSize:compact?15:17, fontWeight:700, color:"#0f172a", marginBottom:3 }}>
        {s.specialtyAbbrev}
      </div>
      {/* Surgeon / Anaesthetist */}
      <div style={{ fontSize:compact?13:14, color:"#475569", marginBottom:4 }}>
        <span style={{ fontWeight:600 }}>{s.surgeon}</span>
        <span style={{ color:"#94a3b8", margin:"0 4px" }}>/</span>
        <span>{s.anaesthetist}</span>
      </div>
      {/* Team status + cases */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize: 16, fontWeight:700, color:s.teamComplete?"#16a34a":"#dc2626" }}>
          {s.teamComplete ? "✓ Complete" : "⚠ Gaps"}
        </span>
        <span style={{ fontSize: 16, color:"#94a3b8" }}>{s.cases} cases</span>
      </div>
      {/* Utilization bar */}
      <div style={{ height:5, borderRadius:4, overflow:"hidden", background:"rgba(255,255,255,0.7)" }}>
        <div style={{ height:"100%", width:`${s.utilization}%`, background:utilColor, borderRadius:4 }} />
      </div>
      {/* Pending issues — expanded view only */}
      {!compact && hasPending && s.pendingIssues.map((issue, idx) => (
        <div key={idx} style={{ marginTop:6, fontSize: 16, color:"#92400e", background:"#fffbeb",
          border:"1px solid #fde68a", borderRadius:5, padding:"3px 8px", display:"flex", gap:5 }}>
          <span style={{ fontWeight:700, textTransform:"uppercase" }}>{issue.type}:</span>
          <span>{issue.detail}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SESSION PLANNER TAB ──────────────────────────────────────────────────────

function SessionPlannerTab() {
  const [viewMode,        setViewMode]        = useState<PlannerView>("week");
  const [weekStart,       setWeekStart]       = useState<Date>(() => getWeekStart(new Date()));
  const [selectedDay,     setSelectedDay]     = useState<Date>(new Date());
  const [monthRef,        setMonthRef]        = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [filterSpecialty, setFilterSpecialty] = useState<string>("");
  const [filterType,      setFilterType]      = useState<string>("");
  const [closedTheatreDays, setClosedTheatreDays] = useState<Set<string>>(new Set());
  const [assignTarget,    setAssignTarget]    = useState<{ theatre: string; date: string } | null>(null);

  const todayStr = toDateStr(new Date());

  const weekSessions    = useMemo(() => generateWeekSessions(weekStart), [weekStart]);
  const dayWeekSessions = useMemo(() => generateWeekSessions(getWeekStart(selectedDay)), [selectedDay]);
  const monthSessions   = useMemo(() => {
    const year = monthRef.getFullYear(), month = monthRef.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const all: TheatreSession[] = [];
    let cur = getWeekStart(firstDay);
    while (cur <= lastDay) { all.push(...generateWeekSessions(new Date(cur))); cur = addDays(cur, 7); }
    return all;
  }, [monthRef]);

  function applyFilters(list: TheatreSession[]) {
    return list.filter(s =>
      (!filterSpecialty || s.specialty === filterSpecialty) &&
      (!filterType      || s.type      === filterType)
    );
  }
  function isClosed(theatre: string, dateStr: string) { return closedTheatreDays.has(`${theatre}|${dateStr}`); }
  function toggleClosed(theatre: string, dateStr: string) {
    setClosedTheatreDays(prev => {
      const next = new Set(prev); const key = `${theatre}|${dateStr}`;
      next.has(key) ? next.delete(key) : next.add(key); return next;
    });
  }

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) { const d = addDays(weekStart, i); if (d.getDay() !== 0 && d.getDay() !== 6) weekDays.push(d); }
  const weekEnd = addDays(weekStart, 4);

  function navPrev() {
    if      (viewMode === "day")   setSelectedDay(d => addDays(d, -1));
    else if (viewMode === "week")  setWeekStart(d => addDays(d, -7));
    else setMonthRef(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function navNext() {
    if      (viewMode === "day")   setSelectedDay(d => addDays(d, 1));
    else if (viewMode === "week")  setWeekStart(d => addDays(d, 7));
    else setMonthRef(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function navToday() {
    const now = new Date();
    setSelectedDay(new Date(now)); setWeekStart(getWeekStart(now));
    setMonthRef(new Date(now.getFullYear(), now.getMonth(), 1));
  }
  const navLabel =
    viewMode === "day"   ? selectedDay.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" }) :
    viewMode === "week"  ? `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}` :
    monthRef.toLocaleDateString("en-GB", { month:"long", year:"numeric" });

  // ── TOOLBAR ─────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="px-6 py-3 flex flex-wrap items-center gap-3 shrink-0 bg-white border-b border-[#dde3ed]">
      {/* View toggle */}
      <div className="flex items-center gap-0.5 p-1 rounded-xl" style={{ background:"#f1f5f9" }}>
        {(["day","week","month"] as PlannerView[]).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className="px-4 py-1.5 rounded-lg font-medium capitalize transition-all"
            style={{ fontSize:16, background:viewMode===v?"#fff":"transparent",
              color:viewMode===v?"#0ea5e9":"#64748b", boxShadow:viewMode===v?"0 1px 3px rgba(0,0,0,0.08)":"none" }}>
            {v}
          </button>
        ))}
      </div>
      {/* Date nav */}
      <div className="flex items-center gap-2">
        <button onClick={navPrev} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors">
          <ChevronLeft className="w-4 h-4 text-[#64748b]" />
        </button>
        <span style={{ fontSize:16, fontWeight:600, color:"#0f172a", whiteSpace:"nowrap" }}>{navLabel}</span>
        <button onClick={navNext} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors">
          <ChevronRight className="w-4 h-4 text-[#64748b]" />
        </button>
        <button onClick={navToday} className="px-3 py-1.5 rounded-lg font-semibold transition-colors"
          style={{ fontSize: 16, background:"#f0f9ff", color:"#0ea5e9" }}>Today</button>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-2 ml-2">
        <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
          className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 bg-white text-[#0f172a]" style={{ fontSize: 16 }}>
          <option value="">All Specialties</option>
          {SP_SPECIALTIES.map(sp => <option key={sp.name} value={sp.name}>{sp.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 bg-white text-[#0f172a]" style={{ fontSize: 16 }}>
          <option value="">All Session Types</option>
          {(["AM","PM","FULL","EVE","EMERGENCY"] as SessionType[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 bg-white" style={{ fontSize: 16, color:"#94a3b8" }}>
          <option>All Units</option>
        </select>
        <select className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 bg-white" style={{ fontSize: 16, color:"#94a3b8" }}>
          <option>All Sub-units</option>
        </select>
      </div>
      <div className="flex-1" />
      {/* Legend */}
      <div className="flex items-center gap-3">
        {(["AM","PM","FULL","EMERGENCY"] as SessionType[]).map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border" style={{ background:SESSION_STYLE[t].bg, borderColor:SESSION_STYLE[t].border }} />
            <span style={{ fontSize: 16, fontWeight:600, color:SESSION_STYLE[t].color }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── WEEK VIEW ────────────────────────────────────────────────────────────
  const weekView = (
    <div className="flex-1 overflow-auto">
      <div style={{ minWidth:960 }}>
        <div className="grid sticky top-0 z-10 bg-white border-b border-[#dde3ed]"
          style={{ gridTemplateColumns:"150px repeat(5, 1fr)" }}>
          <div className="px-4 pb-3 pt-2 uppercase tracking-wider flex items-end"
            style={{ fontSize: 16, fontWeight:600, color:"#94a3b8" }}>Theatre</div>
          {weekDays.map(day => {
            const isToday = toDateStr(day) === todayStr;
            return (
              <div key={toDateStr(day)} className="px-3 py-2 text-center border-l border-[#f1f5f9]">
                <div style={{ fontSize: 16, fontWeight:500, color:"#64748b", textTransform:"uppercase", marginBottom:4 }}>
                  {day.toLocaleDateString("en-GB", { weekday:"short" })}
                </div>
                <div style={{ fontSize:18, fontWeight:700, width:36, height:36, display:"flex",
                  alignItems:"center", justifyContent:"center", margin:"0 auto", borderRadius:"50%",
                  background:isToday?"#0ea5e9":"transparent", color:isToday?"#fff":"#0f172a" }}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        {THEATRE_NAMES.map((theatre, tIdx) => (
          <div key={theatre} className="grid"
            style={{ gridTemplateColumns:"150px repeat(5, 1fr)", borderBottom:"1px solid #f1f5f9" }}>
            <div className="px-4 py-3 flex flex-col justify-center bg-white border-r border-[#f1f5f9]">
              <div style={{ fontSize:16, fontWeight:700, color:"#0f172a" }}>{theatre}</div>
              <div style={{ fontSize: 16, color:"#94a3b8" }}>T{tIdx + 1}</div>
            </div>
            {weekDays.map(day => {
              const dateStr = toDateStr(day);
              const closed  = isClosed(theatre, dateStr);
              const daySess = closed ? [] : applyFilters(weekSessions.filter(s => s.theatreId === theatre && s.date === dateStr));
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className="p-2 border-l border-[#f1f5f9]" style={{ minHeight:100,
                  background:closed?"#fef2f2":isToday?"#fafeff":"transparent" }}>
                  {closed ? (
                    <div style={{ height:"100%", minHeight:80, display:"flex", flexDirection:"column",
                      alignItems:"center", justifyContent:"center", gap:6 }}>
                      <span style={{ fontSize: 16, fontWeight:700, color:"#dc2626" }}>🔒 Closed</span>
                      <button onClick={() => toggleClosed(theatre, dateStr)}
                        style={{ fontSize: 16, color:"#64748b", background:"#f1f5f9", border:"1px solid #e2e8f0",
                          borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>Reopen</button>
                    </div>
                  ) : (
                    <>
                      {daySess.map((s, si) => <SessionCard key={si} s={s} compact />)}
                      <div style={{ display:"flex", gap:4, marginTop:4 }}>
                        <button onClick={() => setAssignTarget({ theatre, date: dateStr })}
                          style={{ fontSize: 16, color:"#0ea5e9", background:"#f0f9ff", border:"1px solid #bae6fd",
                            borderRadius:6, padding:"2px 8px", cursor:"pointer" }}>+ Assign</button>
                        <button onClick={() => toggleClosed(theatre, dateStr)}
                          style={{ fontSize: 16, color:"#dc2626", background:"#fef2f2", border:"1px solid #fecaca",
                            borderRadius:6, padding:"2px 8px", cursor:"pointer" }}>Close</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // ── DAY VIEW ─────────────────────────────────────────────────────────────
  const dayView = (
    <div className="flex-1 overflow-auto">
      <div style={{ minWidth:700 }}>
        <div className="grid sticky top-0 z-10 bg-white border-b border-[#dde3ed]"
          style={{ gridTemplateColumns:"170px 1fr" }}>
          <div className="px-4 py-3 uppercase tracking-wider" style={{ fontSize: 16, fontWeight:600, color:"#94a3b8" }}>Theatre</div>
          <div className="px-4 py-3 border-l border-[#f1f5f9] uppercase tracking-wider" style={{ fontSize: 16, fontWeight:600, color:"#94a3b8" }}>Sessions</div>
        </div>
        {THEATRE_NAMES.map((theatre, tIdx) => {
          const dateStr = toDateStr(selectedDay);
          const closed  = isClosed(theatre, dateStr);
          const sess    = closed ? [] : applyFilters(dayWeekSessions.filter(s => s.theatreId === theatre && s.date === dateStr));
          return (
            <div key={theatre} className="grid border-b border-[#f1f5f9]"
              style={{ gridTemplateColumns:"170px 1fr" }}>
              <div className="px-4 py-4 flex flex-col justify-start bg-white border-r border-[#f1f5f9]">
                <div style={{ fontSize:16, fontWeight:700, color:"#0f172a" }}>{theatre}</div>
                <div style={{ fontSize: 16, color:"#94a3b8", marginBottom:8 }}>T{tIdx + 1}</div>
                <button onClick={() => toggleClosed(theatre, dateStr)}
                  style={{ fontSize: 16, fontWeight:600,
                    color:closed?"#16a34a":"#dc2626", background:closed?"#f0fdf4":"#fef2f2",
                    border:`1px solid ${closed?"#bbf7d0":"#fecaca"}`,
                    borderRadius:8, padding:"4px 10px", cursor:"pointer", width:"fit-content" }}>
                  {closed ? "🔓 Reopen" : "🔒 Close"}
                </button>
              </div>
              <div className="p-3" style={{ minHeight:120 }}>
                {closed ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                    height:"100%", minHeight:90, color:"#dc2626", fontSize:16, fontWeight:700 }}>
                    🔒 Theatre closed for this day
                  </div>
                ) : sess.length === 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                    justifyContent:"center", height:"100%", minHeight:90, gap:10 }}>
                    <span style={{ fontSize: 16, color:"#94a3b8" }}>No sessions assigned</span>
                    <button onClick={() => setAssignTarget({ theatre, date: dateStr })}
                      style={{ fontSize: 16, color:"#0ea5e9", background:"#f0f9ff", border:"1px solid #bae6fd",
                        borderRadius:10, padding:"8px 22px", cursor:"pointer" }}>+ Assign Session</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
                    {sess.map((s, si) => (
                      <div key={si} style={{ flex:"1 1 240px", maxWidth:340 }}>
                        <SessionCard s={s} />
                      </div>
                    ))}
                    <div style={{ display:"flex", alignItems:"center" }}>
                      <button onClick={() => setAssignTarget({ theatre, date: dateStr })}
                        style={{ fontSize: 16, color:"#0ea5e9", background:"#f0f9ff", border:"1px solid #bae6fd",
                          borderRadius:10, padding:"8px 18px", cursor:"pointer" }}>+ Assign</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── MONTH VIEW ───────────────────────────────────────────────────────────
  const monthDays = getMonthDays(monthRef);
  const WEEKDAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const monthView = (
    <div className="flex-1 overflow-auto p-4">
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:3, maxWidth:1100, margin:"0 auto" }}>
        {WEEKDAY_LABELS.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize: 16, fontWeight:600, color:"#94a3b8",
            padding:"4px 0", textTransform:"uppercase" }}>{d}</div>
        ))}
        {monthDays.map((day, i) => {
          const dateStr  = toDateStr(day);
          const inMonth  = day.getMonth() === monthRef.getMonth();
          const isToday  = dateStr === todayStr;
          const daySess  = applyFilters(monthSessions.filter(s => s.date === dateStr));
          const counts: Partial<Record<SessionType, number>> = {};
          daySess.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });
          const hasIssues = daySess.some(s => s.pendingIssues.length > 0);
          return (
            <div key={i}
              onClick={() => { setSelectedDay(new Date(day)); setViewMode("day"); }}
              className="hover:shadow-md transition-shadow"
              style={{ minHeight:82, border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 8px",
                cursor:"pointer", background:isToday?"#f0f9ff":inMonth?"#ffffff":"#f8fafc",
                opacity:inMonth?1:0.4 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ fontSize: 16, fontWeight:isToday?700:500, width:26, height:26, borderRadius:"50%",
                  background:isToday?"#0ea5e9":"transparent", color:isToday?"#fff":"#0f172a",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {day.getDate()}
                </div>
                {hasIssues && <span style={{ fontSize: 16, color:"#ea580c" }}>⚠</span>}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:2 }}>
                {(Object.keys(counts) as SessionType[]).map(type => (
                  <div key={type} style={{ fontSize: 16, fontWeight:700, color:SESSION_STYLE[type].color,
                    background:SESSION_STYLE[type].bg, border:`1px solid ${SESSION_STYLE[type].border}`,
                    borderRadius:4, padding:"1px 5px" }}>
                    {type}×{counts[type]}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── ASSIGN MODAL ─────────────────────────────────────────────────────────
  const assignModal = assignTarget && (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.35)", backdropFilter:"blur(4px)",
      zIndex:60, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) setAssignTarget(null); }}>
      <div style={{ background:"#ffffff", borderRadius:16, padding:28, maxWidth:420, width:"100%",
        border:"1px solid #e2e8f0", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize:20, fontWeight:700, color:"#0f172a", marginBottom:4 }}>Assign Session</div>
        <div style={{ fontSize: 16, color:"#64748b", marginBottom:20 }}>
          {assignTarget.theatre} · {assignTarget.date}
        </div>
        <div style={{ fontSize: 16, color:"#94a3b8", textAlign:"center", padding:"24px 16px",
          border:"1px dashed #e2e8f0", borderRadius:10, lineHeight:1.7 }}>
          Session assignment will connect to<br/>
          <strong style={{ color:"#475569" }}>Roster · Staffing · PTL · Inventory</strong><br/>
          in a future integration release.
        </div>
        <button onClick={() => setAssignTarget(null)}
          style={{ marginTop:16, width:"100%", padding:"11px", borderRadius:10, background:"#f1f5f9",
            border:"none", fontSize:16, fontWeight:600, color:"#0f172a", cursor:"pointer" }}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {toolbar}
      {viewMode === "week"  && weekView}
      {viewMode === "day"   && dayView}
      {viewMode === "month" && monthView}
      {assignModal}
    </div>
  );
}

// ─── THEATRE DETAIL MODAL ─────────────────────────────────────────────────────

const CANCEL_LABEL: Record<string, string> = {
  dna:"DNA", clinical:"CLINICAL", "patient-unfit":"PT UNFIT",
  equipment:"EQUIPMENT", capacity:"CAPACITY", other:"OTHER",
};

function TheatreModal({
  theatre,
  onClose,
  onCallBell,
}: {
  theatre: RTTheatre;
  onClose: () => void;
  onCallBell: (theatreId: string, theatreName: string, type: "relief" | "overrun" | "emergency") => void;
}) {
  const ss = THEATRE_STATUS_STYLE[theatre.status];

  const SH: React.CSSProperties = {
    fontWeight:700, color:"#0f172a", fontSize:16,
    letterSpacing:"0.03em", textTransform:"uppercase" as const,
    borderBottom:"1px solid #e2e8f0", paddingBottom:8, marginBottom:14, marginTop:4,
  };

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.35)", backdropFilter:"blur(4px)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:"#ffffff", borderRadius:16, maxWidth:820, width:"100%", maxHeight:"88vh", overflowY:"auto", border:"1px solid #e2e8f0", boxShadow:"0 20px 60px rgba(15,23,42,0.18)" }}>

        {/* Header */}
        <div style={{ padding:"16px 22px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#f8fafc", zIndex:1 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:11, height:11, borderRadius:"50%", background:ss.dot, boxShadow:`0 0 0 3px ${ss.dot}25`, flexShrink:0 }} />
              <span style={{ fontWeight:800, fontSize:22, color:"#0f172a", letterSpacing:"-0.01em" }}>{theatre.name}</span>
              <span style={{ fontSize:18, color:"#64748b" }}>— {theatre.specialty}</span>
            </div>
            <div style={{ fontSize:16, color:ss.dot, marginTop:4, fontWeight:600 }}>
              {ss.label} · {theatre.completedCases}/{theatre.casesToday} cases today
              {(theatre.delayMins ?? 0) > 0 && (
                <span style={{ marginLeft:12, color:"#dc2626" }}>▼ +{theatre.delayMins}m delay</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #e2e8f0", background:"#ffffff", color:"#64748b", cursor:"pointer", fontSize:19, lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:"22px 24px" }}>

          {/* Case Timeline */}
          <div style={{ marginBottom:24 }}>
            <div style={SH}>Today&apos;s Case Timeline</div>
            {theatre.caseList.map((c, i) => {
              const isCancel  = c.status === "cancelled";
              const isDone    = c.status === "completed";
              const isActive  = c.status === "active";
              const color     = isDone ? "#16a34a" : isActive ? "#0ea5e9" : isCancel ? "#dc2626" : "#94a3b8";
              const icon      = isDone ? "✓" : isActive ? "▶" : isCancel ? "✕" : "○";
              const cancelEntry = isCancel ? theatre.cancellations.find(x => x.procedure === c.procedure) : undefined;
              return (
                <div key={i} style={{ display:"flex", gap:14, paddingBottom:14, marginBottom:14, borderBottom: i < theatre.caseList.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div style={{ fontSize:21, color, width:22, flexShrink:0, paddingTop:1, fontWeight:700 }}>{icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                      <span style={{ fontWeight:700, fontSize:17, color: isCancel ? "#94a3b8" : "#0f172a", textDecoration: isCancel ? "line-through" : "none" }}>
                        {c.procedure}
                      </span>
                      {isCancel && (
                        <span style={{ padding:"2px 8px", borderRadius:4, background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", fontSize: 16, fontWeight:700 }}>
                          {cancelEntry ? CANCEL_LABEL[cancelEntry.reason] ?? "CANCELLED" : "CANCELLED"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 16, color:"#64748b" }}>{c.consultant} · {c.patient} · {c.scheduledStart}–{c.scheduledEnd}</div>
                    {isActive && (
                      <div style={{ marginTop:7, height:5, background:"#f1f5f9", borderRadius:3, maxWidth:260 }}>
                        <div style={{ height:"100%", background:"#0ea5e9", borderRadius:3, width:`${theatre.progressPct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delay Log */}
          {theatre.delays.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={SH}>Delay Log</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:16 }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Time","Reason","+Mins","Detail","Raised By"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"7px 10px", borderBottom:"1px solid #e2e8f0", fontSize: 16, color:"#64748b", fontWeight:700, letterSpacing:"0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {theatre.delays.map((d, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                      <td style={{ padding:"9px 10px", color:"#475569", whiteSpace:"nowrap" }}>{d.startTime}</td>
                      <td style={{ padding:"9px 10px", color:"#0f172a", fontWeight:600, textTransform:"capitalize" }}>{d.reason}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:4, background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", fontSize: 16, fontWeight:700 }}>+{d.minutes}m</span>
                      </td>
                      <td style={{ padding:"9px 10px", color:"#475569" }}>{d.detail}</td>
                      <td style={{ padding:"9px 10px", color:"#94a3b8", whiteSpace:"nowrap" }}>{d.raisedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cancellations */}
          {theatre.cancellations.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={SH}>Cancellations</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:16 }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Patient","Procedure","Reason","Time"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"7px 10px", borderBottom:"1px solid #e2e8f0", fontSize: 16, color:"#64748b", fontWeight:700, letterSpacing:"0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {theatre.cancellations.map((c, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                      <td style={{ padding:"9px 10px", color:"#0f172a", fontWeight:600 }}>{c.patient}</td>
                      <td style={{ padding:"9px 10px", color:"#475569" }}>{c.procedure}</td>
                      <td style={{ padding:"9px 10px" }}>
                        <span style={{
                          padding:"2px 8px", borderRadius:4, fontSize: 16, fontWeight:700,
                          background: c.reason === "dna" ? "#fef2f2" : "#fff7ed",
                          color:      c.reason === "dna" ? "#dc2626"  : "#ea580c",
                          border: `1px solid ${c.reason === "dna" ? "#fecaca" : "#fdba74"}`,
                        }}>
                          {CANCEL_LABEL[c.reason] ?? c.reason.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding:"9px 10px", color:"#94a3b8" }}>{c.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {theatre.cancellations[0] && (
                <div style={{ marginTop:8, fontSize: 16, color:"#94a3b8", paddingLeft:4 }}>
                  {theatre.cancellations[0].detail}
                </div>
              )}
            </div>
          )}

          {/* Incidents */}
          {theatre.incidents.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={SH}>Incidents</div>
              {theatre.incidents.map((inc, i) => {
                const lc = inc.level === "high" ? "#dc2626" : inc.level === "medium" ? "#ea580c" : "#d97706";
                const lb = inc.level === "high" ? "#fef2f2" : inc.level === "medium" ? "#fff7ed" : "#fffbeb";
                const le = inc.level === "high" ? "#fecaca" : inc.level === "medium" ? "#fdba74" : "#fde68a";
                return (
                  <div key={i} style={{ background:"#f8fafc", borderRadius:10, padding:"13px 16px", marginBottom:10, borderLeft:`4px solid ${lc}`, border:`1px solid ${le}`, borderLeftWidth:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:7 }}>
                      <span style={{ padding:"3px 9px", borderRadius:5, background:lb, color:lc, border:`1px solid ${le}`, fontSize: 16, fontWeight:700 }}>
                        {inc.level.toUpperCase()}
                      </span>
                      <span style={{ fontWeight:700, fontSize:17, color:"#0f172a" }}>{inc.title}</span>
                      <span style={{ fontSize: 16, color:"#94a3b8", marginLeft:"auto" }}>{inc.time}</span>
                    </div>
                    <div style={{ fontSize:16, color:"#475569", lineHeight:1.55 }}>{inc.detail}</div>
                    <div style={{ fontSize: 16, color:"#94a3b8", marginTop:7 }}>Reported by: {inc.reportedBy}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comments / SDM Notes */}
          {theatre.comments.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={SH}>Comments / SDM Notes</div>
              {theatre.comments.map((c, i) => (
                <div key={i} style={{ background:"#f8fafc", borderRadius:10, padding:"13px 16px", marginBottom:10, border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:16, color:"#0f172a", marginBottom:7, lineHeight:1.6 }}>{c.text}</div>
                  <div style={{ fontSize: 16, color:"#94a3b8" }}>{c.author} · {c.time}</div>
                </div>
              ))}
            </div>
          )}

          {/* Staff Roster */}
          <div style={{ marginBottom:24 }}>
            <div style={SH}>Staff Roster</div>
            {theatre.staff.map((s, i) => {
              const onBreak = !!s.breakSince;
              const dot     = ROLE_DOT[s.role];
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 0", borderBottom: i < theatre.staff.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:dot, flexShrink:0 }} />
                  <div style={{ fontSize:17, color: onBreak ? "#94a3b8" : "#0f172a", fontWeight:600, width:170, whiteSpace:"nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 16, color:"#94a3b8", width:140 }}>{s.role} · {s.dutyStart}–{s.dutyEnd}</div>
                  <div>
                    {!onBreak && !s.reliefPending && (
                      <span style={{ padding:"3px 10px", borderRadius:5, background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0", fontSize: 16, fontWeight:700 }}>ON DUTY</span>
                    )}
                    {onBreak && (
                      <span style={{ padding:"3px 10px", borderRadius:5, background:"#fff7ed", color:"#ea580c", border:"1px solid #fdba74", fontSize: 16, fontWeight:700 }}>
                        ON BREAK {s.breakSince}→{s.breakUntil}
                      </span>
                    )}
                    {s.reliefPending && (
                      <span style={{ padding:"3px 10px", borderRadius:5, background:"#fffbeb", color:"#d97706", border:"1px solid #fde68a", fontSize: 16, fontWeight:700, animation:"reliefPulse 1.2s ease-in-out infinite" }}>
                        RELIEF PENDING
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call Bell Panel */}
          <div>
            <div style={SH}>Call Bell</div>
            <div style={{ display:"flex", gap:10 }}>
              <button
                onClick={() => onCallBell(theatre.id, theatre.name, "relief")}
                style={{ flex:1, padding:"13px 16px", borderRadius:10, border:"1px solid #fde68a", background:"#fffbeb", color:"#b45309", fontSize:17, fontWeight:700, cursor:"pointer" }}
              >🔔 Break Relief</button>
              <button
                onClick={() => onCallBell(theatre.id, theatre.name, "overrun")}
                style={{ flex:1, padding:"13px 16px", borderRadius:10, border:"1px solid #fdba74", background:"#fff7ed", color:"#c2410c", fontSize:17, fontWeight:700, cursor:"pointer" }}
              >⚠ Overrun</button>
              <button
                onClick={() => onCallBell(theatre.id, theatre.name, "emergency")}
                style={{ flex:1, padding:"13px 16px", borderRadius:10, border:"1px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:17, fontWeight:700, cursor:"pointer" }}
              >🚨 Emergency Add</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── RT DASHBOARD TAB ─────────────────────────────────────────────────────────

function RTDashboardTab() {
  const [theatres, setTheatres]           = useState<RTTheatre[]>(RT_THEATRES);
  const [selectedTheatre, setSelected]    = useState<RTTheatre | null>(null);
  const [callBells, setCallBells]         = useState<CallBellEntry[]>([]);
  const [time, setTime]                   = useState("");

  // Live clock
  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function fireCallBell(theatreId: string, theatreName: string, type: "relief" | "overrun" | "emergency") {
    const bellId = `${Date.now()}-${Math.random()}`;
    const entry: CallBellEntry = {
      id: bellId, theatreId, theatreName, type,
      time: new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }),
    };
    setCallBells(prev => [entry, ...prev]);
    setTimeout(() => setCallBells(prev => prev.filter(b => b.id !== bellId)), 8000);
    if (type === "overrun") {
      setTheatres(prev => prev.map(t => t.id === theatreId ? { ...t, isOverrun: true } : t));
    }
  }

  const activeCount   = theatres.filter(t => t.status === "active").length;
  const turnoverCount = theatres.filter(t => t.status === "between-cases").length;
  const standbyCount  = theatres.filter(t => t.status === "standby").length;
  const casesDone     = theatres.reduce((n, t) => n + t.completedCases, 0);
  const casesTotal    = theatres.reduce((n, t) => n + t.casesToday, 0);
  const criticals     = ALERTS.filter(a => a.level === "critical").length;

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background:"#f4f6f9" }}>

      {/* Animation keyframes */}
      <style>{`
        @keyframes solariFlipIn {
          0%   { transform: perspective(700px) rotateX(-90deg); opacity: 0; }
          100% { transform: perspective(700px) rotateX(0deg);   opacity: 1; }
        }
        @keyframes reliefPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes toastSlideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Toast stack */}
      <div style={{ position:"fixed", top:20, right:20, zIndex:200, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
        {callBells.map(bell => {
          const color = bell.type === "emergency" ? "#dc2626" : bell.type === "overrun" ? "#ea580c" : "#d97706";
          const icon  = bell.type === "emergency" ? "🚨" : bell.type === "overrun" ? "⚠" : "🔔";
          const label = bell.type === "emergency" ? "Emergency Add" : bell.type === "overrun" ? "Overrun" : "Break Relief";
          return (
            <div
              key={bell.id}
              style={{
                background:"#ffffff", border:`1px solid #e2e8f0`, borderLeft:`3px solid ${color}`,
                borderRadius:10, padding:"12px 16px", minWidth:280, maxWidth:340,
                pointerEvents:"auto", animation:"toastSlideIn 0.3s ease forwards",
                boxShadow:"0 8px 24px rgba(15,23,42,0.14)",
              }}
            >
              <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
                <div>
                  <div style={{ color, fontWeight:700, fontSize:16 }}>{label}</div>
                  <div style={{ color:"#0f172a", fontSize:16, marginTop:2 }}>{bell.theatreName}</div>
                  <div style={{ color:"#94a3b8", fontSize: 16, marginTop:1 }}>{bell.time}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-5 space-y-4">

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:"Theatres Active",  value:`${activeCount} / ${theatres.length}`, icon:Activity,      color:"#0ea5e9" },
            { label:"Staff On Duty",    value:String(theatres.reduce((n,t) => n + t.staff.filter(s => !s.breakSince).length, 0)), icon:Users, color:"#16a34a" },
            { label:"Cases Completed",  value:`${casesDone} / ${casesTotal}`,        icon:CheckCircle,   color:"#7c3aed" },
            { label:"Critical Alerts",  value:String(criticals),                      icon:AlertTriangle, color:"#dc2626" },
          ].map(m => (
            <div key={m.label} className="bg-white border border-[#dde3ed] rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${m.color}18` }}>
                <m.icon className="w-6 h-6" style={{ color:m.color }} />
              </div>
              <div>
                <div className="text-3xl font-bold text-[#0f172a]">{m.value}</div>
                <div className="text-base text-[#94a3b8]">{m.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── LIVE THEATRE BOARD ── */}
        <div style={{ background:"#ffffff", borderRadius:16, overflow:"hidden", border:"1px solid #e2e8f0", boxShadow:"0 1px 4px rgba(15,23,42,0.06)" }}>

          {/* Board header */}
          <div style={{ background:"#f8fafc", padding:"14px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:800, color:"#0f172a", fontSize:19, letterSpacing:"-0.01em" }}>
              Theatre Operations Board
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:24 }}>
              <div style={{ display:"flex", gap:16, fontSize:17, fontWeight:600 }}>
                <span style={{ color:"#16a34a" }}>● {activeCount} Active</span>
                <span style={{ color:"#d97706" }}>◑ {turnoverCount} Turnover</span>
                <span style={{ color:"#0ea5e9" }}>◌ {standbyCount} Standby</span>
              </div>
              <div style={{ color:"#0ea5e9", fontSize:24, fontWeight:800, letterSpacing:"0.04em", minWidth:92, fontVariantNumeric:"tabular-nums" }}>
                {time}
              </div>
            </div>
          </div>

          {/* Spreadsheet table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 16, tableLayout:"auto" }}>
              <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                <tr style={{ background:"#f1f5f9", borderBottom:"2px solid #e2e8f0" }}>
                  {["THEATRE","STATUS","CURRENT CASE","PROGRESS","STAFF","NEXT CASE","ACTIONS"].map(h => (
                    <th key={h} style={{
                      padding:"10px 12px", textAlign:"left", fontSize: 16, fontWeight:700,
                      color:"#475569", textTransform:"uppercase", letterSpacing:"0.04em",
                      whiteSpace:"nowrap", borderRight:"1px solid #e2e8f0", userSelect:"none",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {theatres.map((theatre, i) => {
                  const ss      = THEATRE_STATUS_STYLE[theatre.status];
                  const delayed = (theatre.delayMins ?? 0) > 0;
                  const rowBg   = i % 2 === 0 ? "#ffffff" : "#f8fafc";
                  return (
                    <tr
                      key={theatre.id}
                      onClick={() => setSelected(theatre)}
                      style={{ background:rowBg, borderBottom:"1px solid #eef1f5", cursor:"pointer",
                        animation:`solariFlipIn 0.4s ease ${i * 0.07}s forwards`, opacity:0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f0f9ff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
                    >
                      {/* THEATRE */}
                      <td style={{ padding:"10px 12px", borderRight:"1px solid #f1f5f9", whiteSpace:"nowrap" }}>
                        <div style={{ fontWeight:800, color:"#0f172a", fontSize: 16 }}>{theatre.id}</div>
                        <div style={{ fontSize: 16, color:"#64748b" }}>{theatre.specialty}</div>
                        <div style={{ fontSize: 16, color:"#94a3b8" }}>{theatre.completedCases}/{theatre.casesToday} cases</div>
                      </td>

                      {/* STATUS */}
                      <td style={{ padding:"10px 12px", borderRight:"1px solid #f1f5f9", whiteSpace:"nowrap" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                          <div style={{
                            width:8, height:8, borderRadius:"50%", background:ss.dot, flexShrink:0,
                            boxShadow: theatre.status === "active" ? `0 0 0 3px ${ss.dot}28` : "none",
                          }} />
                          <span style={{ fontSize: 16, fontWeight:700, color:ss.dot }}>{ss.label}</span>
                        </div>
                        {theatre.caseStarted && (
                          <div style={{ fontSize: 16, color:"#94a3b8" }}>Since {theatre.caseStarted}</div>
                        )}
                        {delayed && (
                          <span style={{
                            display:"inline-block", marginTop:4, padding:"1px 7px", borderRadius:4,
                            background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", fontSize: 16, fontWeight:700,
                          }}>▼ +{theatre.delayMins}m</span>
                        )}
                      </td>

                      {/* CURRENT CASE */}
                      <td style={{ padding:"10px 12px", borderRight:"1px solid #f1f5f9", minWidth:200 }}>
                        {theatre.currentCase ? (
                          <>
                            <div style={{ fontWeight:700, color:"#0f172a", fontSize: 16 }}>{theatre.currentCase}</div>
                            <div style={{ fontSize: 16, color:"#475569", marginTop:1 }}>{theatre.currentConsultant}</div>
                            {theatre.currentPatient && (
                              <div style={{ fontSize: 16, color:"#94a3b8" }}>{theatre.currentPatient}</div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: 16, color:"#94a3b8", fontStyle:"italic" }}>
                            {theatre.status === "between-cases" ? "Turnover in progress" : theatre.status === "standby" ? "On standby" : "—"}
                          </span>
                        )}
                      </td>

                      {/* PROGRESS */}
                      <td style={{ padding:"10px 12px", borderRight:"1px solid #f1f5f9", minWidth:110 }}>
                        {theatre.currentCase ? (
                          <>
                            <div style={{ height:6, background:"#f1f5f9", borderRadius:3, marginBottom:3, overflow:"hidden", minWidth:80 }}>
                              <div style={{ height:"100%", background: theatre.progressPct > 80 ? "#16a34a" : "#0ea5e9", borderRadius:3, width:`${theatre.progressPct}%` }} />
                            </div>
                            <div style={{ fontSize: 16, color:"#475569", fontWeight:600 }}>{theatre.progressPct}%</div>
                            {theatre.estimatedEnd && (
                              <div style={{ fontSize: 16, color:"#94a3b8" }}>ETA {theatre.estimatedEnd}</div>
                            )}
                            {theatre.isOverrun && (
                              <span style={{ display:"inline-block", marginTop:3, padding:"1px 7px", borderRadius:4, background:"#fff7ed", color:"#ea580c", border:"1px solid #fdba74", fontSize: 16, fontWeight:700 }}>
                                OVERRUN
                              </span>
                            )}
                          </>
                        ) : <span style={{ color:"#94a3b8" }}>—</span>}
                      </td>

                      {/* STAFF */}
                      <td style={{ padding:"10px 12px", borderRight:"1px solid #f1f5f9", minWidth:220 }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          {theatre.staff.map(s => {
                            const onBreak = !!s.breakSince;
                            return (
                              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                                <span style={{ fontSize: 16, color: onBreak ? "#94a3b8" : "#334155", fontWeight: onBreak ? 400 : 500 }}>
                                  {s.name}
                                </span>
                                <span style={{ fontSize: 16, color:"#94a3b8", background:"#f1f5f9", borderRadius:3, padding:"1px 5px" }}>
                                  {s.role}
                                </span>
                                {onBreak && (
                                  <span style={{ fontSize: 16, color:"#ea580c", fontWeight:600 }}>
                                    Break {s.breakSince}→{s.breakUntil}
                                  </span>
                                )}
                                {s.reliefPending && (
                                  <span style={{ fontSize: 16, color:"#d97706", fontWeight:600, animation:"reliefPulse 1.2s ease-in-out infinite" }}>
                                    Relief pending
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* NEXT CASE */}
                      <td style={{ padding:"10px 12px", borderRight:"1px solid #f1f5f9", minWidth:160 }}>
                        <span style={{ fontSize: 16, color:"#475569" }}>
                          {theatre.nextCase ?? "—"}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td style={{ padding:"10px 12px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", gap:4 }}>
                          <button
                            onClick={() => fireCallBell(theatre.id, theatre.name, "relief")}
                            title="Request Break Relief"
                            style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #fde68a", background:"#fffbeb", color:"#b45309", fontSize: 16, cursor:"pointer" }}
                          >🔔</button>
                          <button
                            onClick={() => fireCallBell(theatre.id, theatre.name, "overrun")}
                            title="Flag Overrun"
                            style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #fdba74", background:"#fff7ed", color:"#c2410c", fontSize: 16, cursor:"pointer" }}
                          >⚠</button>
                          <button
                            onClick={() => setSelected(theatre)}
                            title="View Detail"
                            style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize: 16, cursor:"pointer" }}
                          >📋</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── BELOW BOARD: Bed Management + Alerts ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns:"1fr 1fr" }}>

          {/* Bed management */}
          <div>
            <h3 className="text-base font-bold text-[#0f172a] mb-3 flex items-center gap-2">
              <Bed className="w-4 h-4 text-[#0ea5e9]" />
              Bed Management
            </h3>
            <div className="space-y-2">
              {BED_UNITS.map(unit => {
                const pct      = Math.round((unit.occupied / unit.total) * 100);
                const barColor = pct >= 90 ? "#dc2626" : pct >= 75 ? "#d97706" : "#16a34a";
                return (
                  <div key={unit.name} className="bg-white border border-[#dde3ed] rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[16px] font-semibold text-[#0f172a]">{unit.name}</span>
                      <span className="text-[16px] font-bold" style={{ color:barColor }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background:"#f1f5f9" }}>
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, background:barColor }} />
                    </div>
                    <div className="flex justify-between text-[16px] text-[#94a3b8] mt-1.5">
                      <span>{unit.available} available</span>
                      <span>{unit.occupied}/{unit.total}</span>
                    </div>
                    {unit.blocked > 0 && (
                      <div className="mt-1 text-[16px] font-semibold" style={{ color:"#d97706" }}>
                        {unit.blocked} bed{unit.blocked > 1 ? "s" : ""} blocked
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h3 className="text-base font-bold text-[#0f172a] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#dc2626]" />
              Alerts
            </h3>
            <div className="space-y-2">
              {ALERTS.map(alert => {
                const [Ic, color] = alert.level === "critical"
                  ? [XCircle,     "#dc2626"] as const
                  : alert.level === "warning"
                  ? [AlertCircle, "#d97706"] as const
                  : [CheckCircle, "#0ea5e9"] as const;
                return (
                  <div
                    key={alert.id}
                    className="bg-white rounded-xl p-3.5"
                    style={{ border:`1px solid ${color}30`, borderLeftWidth:3, borderLeftColor:color }}
                  >
                    <div className="flex items-start gap-2.5">
                      <Ic className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
                      <div className="min-w-0">
                        <div className="text-[16px] font-semibold text-[#0f172a] leading-snug">{alert.title}</div>
                        <div className="text-[16px] text-[#64748b] mt-0.5 leading-snug">{alert.detail}</div>
                        <div className="text-[16px] text-[#94a3b8] mt-1">{alert.time}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Theatre Detail Modal */}
      {selectedTheatre && (
        <TheatreModal
          theatre={selectedTheatre}
          onClose={() => setSelected(null)}
          onCallBell={fireCallBell}
        />
      )}

    </div>
  );
}

// ─── OPERATIONS SECTION ───────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    key: "access",
    label: "Access & Pathways",
    icon: LayoutGrid,
    items: [
      { key: "ptl", label: "PTL (Patient Tracking List)", icon: LayoutGrid },
      { key: "waiting", label: "Waiting List Management", icon: Users },
      { key: "rtt", label: "RTT Monitoring", icon: Activity },
      { key: "cancer", label: "Cancer Pathways (2WW)", icon: AlertTriangle },
      { key: "referrals", label: "Referral Management", icon: Calendar },
      { key: "triage", label: "Triage Status", icon: AlertCircle },
      { key: "breach", label: "Breach Tracking", icon: XCircle },
      { key: "milestones", label: "Pathway Milestones", icon: CheckCircle },
      { key: "clock", label: "Clock Starts / Stops", icon: Activity },
      { key: "validation", label: "Validation & Data Quality", icon: AlertTriangle },
    ],
  },
  {
    key: "capacity",
    label: "Capacity",
    icon: Bed,
    items: [
      { key: "beds", label: "Bed Management", icon: Bed },
      { key: "wardCapacity", label: "Ward Capacity", icon: Users },
      { key: "icuCapacity", label: "ICU Capacity", icon: Activity },
      { key: "theatreCapacity", label: "Theatre Capacity", icon: Zap },
      { key: "clinicSlots", label: "Clinic Slot Availability", icon: Calendar },
      { key: "sessionPlanner", label: "Session Planner", icon: Calendar },
      { key: "templateUtil", label: "Template Utilisation", icon: LayoutGrid },
      { key: "surge", label: "Surge Planning", icon: AlertTriangle },
      { key: "forwardCapacity", label: "7-Day Forward Capacity View", icon: Calendar },
    ],
  },
  {
    key: "activity",
    label: "Activity & Performance",
    icon: Activity,
    items: [
      { key: "dailyVsPlan", label: "Daily Activity vs Plan", icon: Activity },
      { key: "theatreUtil", label: "Theatre Utilisation", icon: CheckCircle },
      { key: "clinicUtil", label: "Clinic Utilisation", icon: CheckCircle },
      { key: "dna", label: "DNA Rates", icon: AlertCircle },
      { key: "cancellations", label: "Cancellation Rates", icon: XCircle },
      { key: "breachPerf", label: "Breach Performance", icon: AlertTriangle },
      { key: "targets", label: "Performance vs Targets", icon: Activity },
      { key: "variance", label: "Variance Analysis", icon: Activity },
      { key: "specialtyPerf", label: "Specialty Performance View", icon: Users },
      { key: "solari", label: "Solari Board (Live Operational Dashboard)", icon: Zap },
    ],
  },
  {
    key: "procedures",
    label: "Procedures",
    icon: CheckCircle,
    items: [
      { key: "opcs", label: "OPSC Tracking", icon: CheckCircle },
      { key: "procedureReqs", label: "Procedure Requirements", icon: Users },
      { key: "preop", label: "Pre-Op Checklist Status", icon: CheckCircle },
      { key: "coding", label: "Procedure Coding", icon: LayoutGrid },
      { key: "durationTrends", label: "Procedure Duration Trends", icon: Activity },
      { key: "theatreList", label: "Theatre List Composition", icon: LayoutGrid },
      { key: "backlog", label: "Backlog by Procedure Type", icon: AlertTriangle },
    ],
  },
  {
    key: "flow",
    label: "Flow & Escalation",
    icon: AlertTriangle,
    items: [
      { key: "delayedDischarge", label: "Delayed Discharges", icon: AlertTriangle },
      { key: "transfers", label: "Internal Transfers", icon: Activity },
      { key: "blockedBeds", label: "Blocked Beds", icon: XCircle },
      { key: "capacityAlerts", label: "Capacity Alerts", icon: AlertCircle },
      { key: "opel", label: "Escalation Level (OPEL-style view)", icon: AlertTriangle },
      { key: "incidentFlags", label: "Incident Flags", icon: XCircle },
      { key: "emergency", label: "Emergency Pressure Indicators", icon: AlertTriangle },
      { key: "sameDayCancel", label: "Same-Day Cancellations", icon: XCircle },
      { key: "riskFeed", label: "Real-Time Risk Feed", icon: Activity },
    ],
  },
] as const;

export default function OperationsSection({
  deepLink,
  hideNav,
}: {
  deepLink?: { view?: string; filters?: Record<string, string> };
  hideNav?: boolean;
}) {
  const [activeView, setActiveView] = useState("ptl");
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [deepFilters, setDeepFilters] = useState<Record<string, string> | undefined>(undefined);

  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.key === activeView));
  const activeItem  = activeGroup?.items.find(i => i.key === activeView);

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setMobileView(mobile ? "list" : "detail");
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!deepLink) return;
    if (deepLink.view) {
      setActiveView(deepLink.view);
    }
    if (deepLink.filters) {
      setDeepFilters(deepLink.filters);
    }
  }, [deepLink]);

  const VIEW_COMPONENTS: Record<string, JSX.Element> = {
    ptl: <PTLTab deepFilters={deepFilters} />,
    waiting: <AccessPathwaysMetricsView endpoint="/api/access-pathways/waiting-list" initialFilters={deepFilters} />,
    rtt: <AccessPathwaysMetricsView endpoint="/api/access-pathways/rtt-monitoring" initialFilters={deepFilters} />,
    cancer: <AccessPathwaysMetricsView endpoint="/api/access-pathways/cancer-pathways" initialFilters={deepFilters} />,
    referrals: <AccessPathwaysMetricsView endpoint="/api/access-pathways/referral-management" initialFilters={deepFilters} />,
    triage: <AccessPathwaysMetricsView endpoint="/api/access-pathways/triage-status" initialFilters={deepFilters} />,
    breach: <AccessPathwaysMetricsView endpoint="/api/access-pathways/breach-tracking" initialFilters={deepFilters} />,
    milestones: <AccessPathwaysMetricsView endpoint="/api/access-pathways/pathway-milestones" initialFilters={deepFilters} />,
    clock: <AccessPathwaysMetricsView endpoint="/api/access-pathways/clock-starts-stops" initialFilters={deepFilters} />,
    validation: <AccessPathwaysMetricsView endpoint="/api/access-pathways/validation-quality" initialFilters={deepFilters} />,
    sessionPlanner: <SessionPlannerTab />,
    solari: <RTDashboardTab />,
  };

  if (isMobile) {
    return (
      <div style={{ height: "100%", background: "#f4f6f9", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {mobileView === "list" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {NAV_GROUPS.map(group => (
              <div key={group.key} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {group.label}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {group.items.map(item => (
                    <button
                      key={item.key}
                      onClick={() => { setActiveView(item.key); setMobileView("detail"); }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: activeView === item.key ? "#f0f9ff" : "#ffffff",
                        color: activeView === item.key ? "#0ea5e9" : "#0f172a",
                        fontSize: 16,
                        fontWeight: activeView === item.key ? 600 : 500,
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "12px 16px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setMobileView("list")}
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", background: "#f8fafc", color: "#0f172a", fontSize: 16, fontWeight: 600 }}
              >
                Back
              </button>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{activeItem?.label}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {VIEW_COMPONENTS[activeView] ?? (
                <div className="h-full flex items-center justify-center" style={{ padding: 16 }}>
                  <div className="bg-white border border-[#e2e8f0] rounded-2xl px-8 py-6 text-center">
                    <div className="text-lg font-semibold text-[#0f172a] mb-1">{activeItem?.label}</div>
                    <div className="text-[16px] text-[#94a3b8]">Configured view will appear here.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: "#f4f6f9" }}>

      {/* Left navigation — hidden when rendered inside SecondaryNavSidebar canvas mode */}
      {!hideNav && <div style={{ width: 260, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e2e8f0",
        overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: 60 }}>
        {NAV_GROUPS.map(group => {
          const GroupIcon = group.icon;
          return (
            <div key={group.key}>
              <div style={{ padding: "12px 14px 8px", display: "flex", alignItems: "center", gap: 7, background: "#94a3b8" }}>
                <GroupIcon style={{ width: 12, height: 12, color: "#ffffff", flexShrink: 0 }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff",
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {group.label}
                </span>
              </div>
              {group.items.map(item => {
                const ItemIcon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button key={item.key}
                    onClick={() => { setActiveView(item.key); setSearch(""); }}
                    style={{
                      width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9,
                      padding: "7px 14px 7px 24px",
                      background: isActive ? "#f0f9ff" : "transparent",
                      color: isActive ? "#0ea5e9" : "#475569",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 16, border: "none", cursor: "pointer",
                      borderLeft: isActive ? "3px solid #0ea5e9" : "3px solid transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <ItemIcon style={{ width: 14, height: 14, flexShrink: 0, color: isActive ? "#0ea5e9" : "#94a3b8" }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ padding: "11px 20px", background: "#ffffff", borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          backgroundImage: "linear-gradient(90deg, rgba(14,165,233,0.55) 0%, rgba(14,165,233,0.0) 70%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", padding: "2px 0" }}>
              {activeGroup && activeItem
                ? <>{activeGroup.label}<span style={{ fontWeight: 700, color: "#0f172a", margin: "0 4px 0 4px" }}>:</span>{activeItem.label}</>
                : "Operations"}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              width: 14, height: 14, color: "#94a3b8" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 16, color: "#0f172a",
                background: "#f8fafc", outline: "none", width: 240 }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {VIEW_COMPONENTS[activeView] ?? (
            <div className="h-full flex items-center justify-center">
              <div className="bg-white border border-[#e2e8f0] rounded-2xl px-8 py-6 text-center">
                <div className="text-lg font-semibold text-[#0f172a] mb-1">{activeItem?.label}</div>
                <div className="text-[16px] text-[#94a3b8]">Configured view will appear here.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
