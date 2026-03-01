"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Users, Calendar, LayoutGrid, TrendingUp, Search,
  Clock, UserX, Package, BookOpen, Monitor, MapPin,
  ShoppingCart, FileText, Building2, Archive, BarChart2,
  Truck, RotateCcw, Timer, SlidersHorizontal, ArrowLeftRight, AlertCircle,
  Plus, Download, ChevronUp, ChevronDown,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ColAlign = "left" | "right" | "center";
type Column = {
  key: string;
  label: string;
  width?: number;
  align?: ColAlign;
  mono?: boolean;
  badge?: boolean;
};
type Row = Record<string, string | number>;
type ViewDef = { columns: Column[]; rows: Row[] };

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    key: "workforce", label: "Workforce", icon: Users,
    items: [
      { key: "roster",      label: "Roster",           icon: Calendar        },
      { key: "allocation",  label: "Allocation",       icon: LayoutGrid      },
      { key: "fte",         label: "FTE Management",   icon: TrendingUp      },
      { key: "staffFinder", label: "Staff Finder",     icon: Search          },
      { key: "shifts",      label: "Shift Management", icon: Clock           },
      { key: "absence",     label: "Absence Tracking", icon: UserX           },
    ],
  },
  {
    key: "supplies", label: "Supplies & Equipment", icon: Package,
    items: [
      { key: "catalogue",   label: "Product Catalogue",      icon: BookOpen     },
      { key: "equipment",   label: "Equipment Register",     icon: Monitor      },
      { key: "assetTrack",  label: "Asset Tracking",         icon: MapPin       },
      { key: "procurement", label: "Procurement Requests",   icon: ShoppingCart },
      { key: "specs",       label: "Product Specifications", icon: FileText     },
      { key: "suppliers",   label: "Supplier Information",   icon: Building2    },
    ],
  },
  {
    key: "inventory", label: "Inventory", icon: Archive,
    items: [
      { key: "stockLevels",  label: "Stock Levels",            icon: BarChart2        },
      { key: "warehousing",  label: "Warehousing",             icon: Archive          },
      { key: "distribution", label: "Distribution",            icon: Truck            },
      { key: "returns",      label: "Returns",                 icon: RotateCcw        },
      { key: "expiry",       label: "Expiry & Batch Tracking", icon: Timer            },
      { key: "stockAdj",     label: "Stock Adjustments",       icon: SlidersHorizontal},
      { key: "assetMove",    label: "Asset Movement Tracking", icon: ArrowLeftRight   },
    ],
  },
  {
    key: "deployment", label: "Deployment & Coverage", icon: Users,
    items: [
      { key: "staffCoverage",   label: "Staff Coverage",        icon: Users           },
      { key: "equipmentCoverage", label: "Equipment Coverage",  icon: Monitor         },
      { key: "spaceCoverage",   label: "Space/Room Coverage",   icon: MapPin          },
      { key: "coverageRisk",    label: "Coverage Risk",         icon: AlertCircle     },
      { key: "coverageTimeline", label: "Today / Tomorrow / 7-day view", icon: Calendar },
    ],
  },
];

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "Active":        { bg:"#f0fdf4", color:"#16a34a" },
  "Available":     { bg:"#f0fdf4", color:"#16a34a" },
  "Confirmed":     { bg:"#f0fdf4", color:"#16a34a" },
  "In Stock":      { bg:"#f0fdf4", color:"#16a34a" },
  "Approved":      { bg:"#f0fdf4", color:"#16a34a" },
  "Operational":   { bg:"#f0fdf4", color:"#16a34a" },
  "Received":      { bg:"#f0fdf4", color:"#16a34a" },
  "Completed":     { bg:"#f0fdf4", color:"#16a34a" },
  "Complete":      { bg:"#f0fdf4", color:"#16a34a" },
  "Returned":      { bg:"#f0fdf4", color:"#16a34a" },
  "Good":          { bg:"#f0fdf4", color:"#16a34a" },
  "On Duty":       { bg:"#f0fdf4", color:"#16a34a" },
  "Pending":       { bg:"#fffbeb", color:"#d97706" },
  "Low Stock":     { bg:"#fffbeb", color:"#d97706" },
  "On Leave":      { bg:"#fffbeb", color:"#d97706" },
  "Unconfirmed":   { bg:"#fffbeb", color:"#d97706" },
  "Raised":        { bg:"#fffbeb", color:"#d97706" },
  "Processing":    { bg:"#fffbeb", color:"#d97706" },
  "Near Expiry":   { bg:"#fff7ed", color:"#c2410c" },
  "Partial":       { bg:"#fff7ed", color:"#c2410c" },
  "Arranged":      { bg:"#f0fdf4", color:"#16a34a" },
  "Not Required":  { bg:"#f1f5f9", color:"#64748b" },
  "In Transit":    { bg:"#eff6ff", color:"#2563eb" },
  "Reserved":      { bg:"#eff6ff", color:"#2563eb" },
  "In Service":    { bg:"#eff6ff", color:"#2563eb" },
  "Submitted":     { bg:"#eff6ff", color:"#2563eb" },
  "Dispatched":    { bg:"#eff6ff", color:"#2563eb" },
  "In Use":        { bg:"#eff6ff", color:"#2563eb" },
  "Inactive":      { bg:"#f1f5f9", color:"#64748b" },
  "Retired":       { bg:"#f1f5f9", color:"#64748b" },
  "Discontinued":  { bg:"#f1f5f9", color:"#64748b" },
  "Standby":       { bg:"#f1f5f9", color:"#64748b" },
  "Out of Stock":  { bg:"#fef2f2", color:"#dc2626" },
  "Absent":        { bg:"#fef2f2", color:"#dc2626" },
  "Overdue":       { bg:"#fef2f2", color:"#dc2626" },
  "Critical":      { bg:"#fef2f2", color:"#dc2626" },
  "Expired":       { bg:"#fef2f2", color:"#dc2626" },
  "Cancelled":     { bg:"#fef2f2", color:"#dc2626" },
  "Maintenance":   { bg:"#fef2f2", color:"#dc2626" },
  "Write-off":     { bg:"#fef2f2", color:"#dc2626" },
  "Correction":    { bg:"#fffbeb", color:"#d97706" },
  "Receipt":       { bg:"#f0fdf4", color:"#16a34a" },
  "Routine":       { bg:"#f1f5f9", color:"#64748b" },
  "Urgent":        { bg:"#fef2f2", color:"#dc2626" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg:"#f1f5f9", color:"#64748b" };
  return (
    <span style={{ display:"inline-block", fontSize:16, fontWeight:600,
      padding:"2px 9px", borderRadius:12, background:s.bg, color:s.color, whiteSpace:"nowrap" }}>
      {status}
    </span>
  );
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const VIEWS: Record<string, ViewDef> = {

  // ── WORKFORCE ─────────────────────────────────────────────────────────────

  roster: {
    columns: [
      { key:"id",        label:"Staff ID",   width:90,  mono:true  },
      { key:"name",      label:"Name",       width:180             },
      { key:"role",      label:"Role",       width:160             },
      { key:"specialty", label:"Specialty",  width:160             },
      { key:"grade",     label:"Grade",      width:110             },
      { key:"site",      label:"Site",       width:150             },
      { key:"contract",  label:"Contract",   width:100             },
      { key:"fte",       label:"FTE",        width:65,  align:"right" },
      { key:"nextShift", label:"Next Shift", width:130             },
      { key:"status",    label:"Status",     width:110, badge:true },
    ],
    rows: [
      { id:"S-0041", name:"Sarah Mitchell",   role:"Scrub Nurse",        specialty:"Orthopaedics",    grade:"Band 6",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"Mon 08:00", status:"On Duty"   },
      { id:"S-0072", name:"James Park",       role:"Circulating Nurse",  specialty:"General Surgery", grade:"Band 5",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"Mon 08:00", status:"On Duty"   },
      { id:"S-0088", name:"Dr. Tariq Kumar",  role:"Consultant Anaes.",  specialty:"Cardiac",         grade:"Consultant",  site:"Main Theatres",   contract:"NHS",       fte:1.0,  nextShift:"Mon 07:30", status:"On Duty"   },
      { id:"S-0031", name:"Linda Foster",     role:"ODP",                specialty:"General",         grade:"Band 5",      site:"Day Surgery",     contract:"Permanent", fte:1.0,  nextShift:"Mon 08:00", status:"Active"    },
      { id:"S-0095", name:"Ben Okafor",       role:"HCA",                specialty:"Urology",         grade:"Band 3",      site:"Day Surgery",     contract:"Permanent", fte:0.8,  nextShift:"Tue 08:00", status:"Active"    },
      { id:"S-0114", name:"Amy Nwosu",        role:"Scrub Nurse",        specialty:"Gynecology",      grade:"Band 6",      site:"Main Theatres",   contract:"Bank",      fte:0.6,  nextShift:"Wed 09:00", status:"Active"    },
      { id:"S-0063", name:"Paul Griffiths",   role:"Circulating Nurse",  specialty:"ENT",             grade:"Band 5",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"Mon 08:00", status:"Active"    },
      { id:"S-0119", name:"Dr. Rachel Brown", role:"Staff Grade Anaes.", specialty:"General",         grade:"Staff Grade", site:"Day Surgery",     contract:"Permanent", fte:1.0,  nextShift:"Mon 08:00", status:"Active"    },
      { id:"S-0027", name:"Kat Ellis",        role:"ODP",                specialty:"Orthopaedics",    grade:"Band 6",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"Mon 09:00", status:"Active"    },
      { id:"S-0082", name:"Mark Owens",       role:"Scrub Nurse",        specialty:"Urology",         grade:"Band 5",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"24 Feb",    status:"On Leave"  },
      { id:"S-0109", name:"Tanya Reid",       role:"Circulating Nurse",  specialty:"Plastics",        grade:"Band 5",      site:"Day Surgery",     contract:"Bank",      fte:0.5,  nextShift:"Thu 13:00", status:"Active"    },
      { id:"S-0047", name:"Elena Marsh",      role:"Scrub Nurse",        specialty:"Cardiac Surgery", grade:"Band 7",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"Mon 07:30", status:"On Duty"   },
      { id:"S-0061", name:"Fiona West",       role:"Scrub Nurse",        specialty:"Gynecology",      grade:"Band 6",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"Mon 08:00", status:"On Duty"   },
      { id:"S-0055", name:"Dr. H. Chen",      role:"Consultant Anaes.",  specialty:"Cardiac Surgery", grade:"Consultant",  site:"Main Theatres",   contract:"NHS",       fte:1.0,  nextShift:"Mon 07:00", status:"On Duty"   },
      { id:"S-0033", name:"Jane Cooper",      role:"Scrub Nurse",        specialty:"ENT",             grade:"Band 5",      site:"Main Theatres",   contract:"Permanent", fte:1.0,  nextShift:"Mon 08:00", status:"Active"    },
    ],
  },

  allocation: {
    columns: [
      { key:"date",    label:"Date",        width:120 },
      { key:"theatre", label:"Theatre",     width:120 },
      { key:"session", label:"Session",     width:80  },
      { key:"start",   label:"Start",       width:80, mono:true },
      { key:"end",     label:"End",         width:80, mono:true },
      { key:"name",    label:"Staff Name",  width:180 },
      { key:"role",    label:"Role",        width:150 },
      { key:"grade",   label:"Grade",       width:110 },
      { key:"hrs",     label:"Hrs",         width:60, align:"right" },
      { key:"confirm", label:"Status",      width:110, badge:true },
      { key:"notes",   label:"Notes",       width:240 },
    ],
    rows: [
      { date:"20 Feb 2026", theatre:"Theatre 1", session:"AM", start:"08:00", end:"13:00", name:"Sarah Mitchell",  role:"Scrub Nurse",       grade:"Band 6",      hrs:5.0, confirm:"Confirmed",   notes:"Ortho list — Mr. Kapoor" },
      { date:"20 Feb 2026", theatre:"Theatre 1", session:"AM", start:"08:00", end:"13:00", name:"James Park",      role:"Circulating",       grade:"Band 5",      hrs:5.0, confirm:"Confirmed",   notes:"" },
      { date:"20 Feb 2026", theatre:"Theatre 1", session:"AM", start:"08:00", end:"13:00", name:"Dr. T. Kumar",    role:"Consultant Anaes.", grade:"Consultant",  hrs:5.0, confirm:"Confirmed",   notes:"" },
      { date:"20 Feb 2026", theatre:"Theatre 1", session:"AM", start:"08:00", end:"13:00", name:"Linda Foster",    role:"ODP",               grade:"Band 5",      hrs:5.0, confirm:"Confirmed",   notes:"Break relief arranged 10:15" },
      { date:"20 Feb 2026", theatre:"Theatre 2", session:"AM", start:"08:00", end:"13:00", name:"Amy Nwosu",       role:"Scrub Nurse",       grade:"Band 6",      hrs:5.0, confirm:"Confirmed",   notes:"Gen Surg — Mr. Ahmed" },
      { date:"20 Feb 2026", theatre:"Theatre 2", session:"AM", start:"08:00", end:"13:00", name:"Paul Griffiths",  role:"Circulating",       grade:"Band 5",      hrs:5.0, confirm:"Confirmed",   notes:"" },
      { date:"20 Feb 2026", theatre:"Theatre 3", session:"AM", start:"08:00", end:"13:00", name:"Fiona West",      role:"Scrub Nurse",       grade:"Band 6",      hrs:5.0, confirm:"Confirmed",   notes:"GYN list — Mr. Hughes" },
      { date:"20 Feb 2026", theatre:"Theatre 3", session:"AM", start:"08:00", end:"13:00", name:"Agency Cover",    role:"Scrub Nurse",       grade:"Band 5",      hrs:5.0, confirm:"Unconfirmed", notes:"Staffing shortfall — agency arranged" },
      { date:"20 Feb 2026", theatre:"Theatre 4", session:"AM", start:"08:00", end:"13:00", name:"Mark Owens",      role:"Scrub Nurse",       grade:"Band 5",      hrs:5.0, confirm:"Confirmed",   notes:"Urology — Mr. Patel" },
      { date:"20 Feb 2026", theatre:"Theatre 5", session:"AM", start:"07:30", end:"17:30", name:"Elena Marsh",     role:"Scrub Nurse",       grade:"Band 7",      hrs:10.0,confirm:"Confirmed",   notes:"Cardiac — Mr. Singh / CABG ×3" },
      { date:"20 Feb 2026", theatre:"Theatre 5", session:"AM", start:"07:00", end:"18:00", name:"Dr. H. Chen",     role:"Consultant Anaes.", grade:"Consultant",  hrs:11.0,confirm:"Confirmed",   notes:"Perfusionist confirmed on pump" },
      { date:"20 Feb 2026", theatre:"Theatre 6", session:"AM", start:"08:00", end:"13:00", name:"Jane Cooper",     role:"Scrub Nurse",       grade:"Band 5",      hrs:5.0, confirm:"Confirmed",   notes:"ENT — Ms. Bassi" },
      { date:"20 Feb 2026", theatre:"Theatre 8", session:"PM", start:"13:00", end:"20:00", name:"Chloe Nkosi",     role:"ODP",               grade:"Band 5",      hrs:7.0, confirm:"Confirmed",   notes:"On-call neuro — Craniotomy 14:00" },
    ],
  },

  fte: {
    columns: [
      { key:"id",         label:"Staff ID",       width:90,  mono:true },
      { key:"name",       label:"Name",           width:180            },
      { key:"grade",      label:"Grade",          width:110            },
      { key:"dept",       label:"Department",     width:170            },
      { key:"contracted", label:"Contracted FTE", width:130, align:"right" },
      { key:"used",       label:"Used FTE",       width:110, align:"right" },
      { key:"remaining",  label:"Remaining",      width:110, align:"right" },
      { key:"period",     label:"Period",         width:110            },
      { key:"status",     label:"Status",         width:100, badge:true },
    ],
    rows: [
      { id:"S-0041", name:"Sarah Mitchell",   grade:"Band 6",      dept:"Main Theatres",    contracted:1.00, used:0.95, remaining:0.05, period:"Feb 2026", status:"Active"   },
      { id:"S-0072", name:"James Park",       grade:"Band 5",      dept:"Main Theatres",    contracted:1.00, used:1.00, remaining:0.00, period:"Feb 2026", status:"Active"   },
      { id:"S-0095", name:"Ben Okafor",       grade:"Band 3",      dept:"Day Surgery",      contracted:0.80, used:0.75, remaining:0.05, period:"Feb 2026", status:"Active"   },
      { id:"S-0114", name:"Amy Nwosu",        grade:"Band 6",      dept:"Main Theatres",    contracted:0.60, used:0.60, remaining:0.00, period:"Feb 2026", status:"Active"   },
      { id:"S-0063", name:"Paul Griffiths",   grade:"Band 5",      dept:"Main Theatres",    contracted:1.00, used:0.90, remaining:0.10, period:"Feb 2026", status:"Active"   },
      { id:"S-0082", name:"Mark Owens",       grade:"Band 5",      dept:"Main Theatres",    contracted:1.00, used:0.40, remaining:0.60, period:"Feb 2026", status:"On Leave" },
      { id:"S-0109", name:"Tanya Reid",       grade:"Band 5",      dept:"Day Surgery",      contracted:0.50, used:0.45, remaining:0.05, period:"Feb 2026", status:"Active"   },
      { id:"S-0047", name:"Elena Marsh",      grade:"Band 7",      dept:"Cardiac Theatres", contracted:1.00, used:1.00, remaining:0.00, period:"Feb 2026", status:"Active"   },
      { id:"S-0027", name:"Kat Ellis",        grade:"Band 6",      dept:"Main Theatres",    contracted:1.00, used:0.85, remaining:0.15, period:"Feb 2026", status:"Active"   },
      { id:"S-0031", name:"Linda Foster",     grade:"Band 5",      dept:"Day Surgery",      contracted:1.00, used:0.80, remaining:0.20, period:"Feb 2026", status:"Active"   },
      { id:"S-0061", name:"Fiona West",       grade:"Band 6",      dept:"Main Theatres",    contracted:1.00, used:0.95, remaining:0.05, period:"Feb 2026", status:"Active"   },
      { id:"S-0033", name:"Jane Cooper",      grade:"Band 5",      dept:"Main Theatres",    contracted:1.00, used:0.90, remaining:0.10, period:"Feb 2026", status:"Active"   },
    ],
  },

  staffFinder: {
    columns: [
      { key:"id",        label:"Staff ID",   width:90,  mono:true },
      { key:"name",      label:"Name",       width:180            },
      { key:"role",      label:"Role",       width:155            },
      { key:"specialty", label:"Specialty",  width:165            },
      { key:"grade",     label:"Grade",      width:110            },
      { key:"avail",     label:"Status",     width:120, badge:true },
      { key:"location",  label:"Location",   width:150            },
      { key:"skills",    label:"Key Skills", width:280            },
      { key:"bleep",     label:"Bleep/Ext",  width:100, mono:true },
    ],
    rows: [
      { id:"S-0041", name:"Sarah Mitchell",  role:"Scrub Nurse",        specialty:"Orthopaedics",    grade:"Band 6",     avail:"In Use",    location:"Theatre 1",    skills:"Total knee, hip arthroplasty, shoulder arthroscopy",    bleep:"4021" },
      { id:"S-0072", name:"James Park",      role:"Circulating Nurse",  specialty:"General Surgery", grade:"Band 5",     avail:"In Use",    location:"Theatre 2",    skills:"Laparoscopic, open, colorectal, emergency surgery",    bleep:"4022" },
      { id:"S-0114", name:"Amy Nwosu",       role:"Scrub Nurse",        specialty:"Gynecology",      grade:"Band 6",     avail:"Available", location:"Staffroom",    skills:"Laparoscopic gyn, hysteroscopy, robotic assist",        bleep:"4031" },
      { id:"S-0063", name:"Paul Griffiths",  role:"Circulating Nurse",  specialty:"ENT",             grade:"Band 5",     avail:"Available", location:"Theatre 6",    skills:"Microlaryngoscopy, sinus surgery, tonsil/adenoid",     bleep:"4032" },
      { id:"S-0027", name:"Kat Ellis",       role:"ODP",                specialty:"Orthopaedics",    grade:"Band 6",     avail:"In Use",    location:"Theatre 1",    skills:"Spinal, tourniquet, image intensifier, regional block", bleep:"4011" },
      { id:"S-0031", name:"Linda Foster",    role:"ODP",                specialty:"General",         grade:"Band 5",     avail:"Available", location:"Break Room",   skills:"General anaesthesia, TIVA, regional blocks",           bleep:"4012" },
      { id:"S-0082", name:"Mark Owens",      role:"Scrub Nurse",        specialty:"Urology",         grade:"Band 5",     avail:"Absent",    location:"Off Site",     skills:"TURP, flexible cystoscopy, laser lithotripsy, URS",    bleep:"—"    },
      { id:"S-0109", name:"Tanya Reid",      role:"Circulating Nurse",  specialty:"Plastics",        grade:"Band 5",     avail:"Available", location:"Day Surgery",  skills:"Skin graft, microsurgery assist, flap procedures",     bleep:"4041" },
      { id:"S-0047", name:"Elena Marsh",     role:"Scrub Nurse",        specialty:"Cardiac Surgery", grade:"Band 7",     avail:"In Use",    location:"Theatre 5",    skills:"CABG, valve repair, bypass circuit, LVAD support",     bleep:"4051" },
      { id:"S-0061", name:"Fiona West",      role:"Scrub Nurse",        specialty:"Gynecology",      grade:"Band 6",     avail:"In Use",    location:"Theatre 3",    skills:"Open gyn, laparoscopic, myomectomy, ovarian surgery",  bleep:"4033" },
    ],
  },

  shifts: {
    columns: [
      { key:"date",     label:"Date",       width:120            },
      { key:"shift",    label:"Shift",      width:80             },
      { key:"start",    label:"Start",      width:75, mono:true  },
      { key:"end",      label:"End",        width:75, mono:true  },
      { key:"name",     label:"Staff Name", width:180            },
      { key:"role",     label:"Role",       width:150            },
      { key:"site",     label:"Site",       width:150            },
      { key:"hrs",      label:"Hrs",        width:60, align:"right" },
      { key:"approved", label:"Status",     width:115, badge:true },
    ],
    rows: [
      { date:"20 Feb 2026", shift:"AM",  start:"08:00", end:"13:00", name:"Sarah Mitchell", role:"Scrub Nurse",        site:"Main Theatres",  hrs:5.0, approved:"Confirmed"   },
      { date:"20 Feb 2026", shift:"AM",  start:"08:00", end:"13:00", name:"James Park",     role:"Circulating Nurse",  site:"Main Theatres",  hrs:5.0, approved:"Confirmed"   },
      { date:"20 Feb 2026", shift:"AM",  start:"07:30", end:"17:30", name:"Elena Marsh",    role:"Scrub Nurse",        site:"Cardiac Suite",  hrs:10.0,approved:"Confirmed"   },
      { date:"20 Feb 2026", shift:"AM",  start:"07:00", end:"18:00", name:"Dr. H. Chen",    role:"Consultant Anaes.", site:"Cardiac Suite",  hrs:11.0,approved:"Confirmed"   },
      { date:"20 Feb 2026", shift:"PM",  start:"13:00", end:"20:00", name:"Amy Nwosu",      role:"Scrub Nurse",        site:"Main Theatres",  hrs:7.0, approved:"Confirmed"   },
      { date:"20 Feb 2026", shift:"PM",  start:"13:00", end:"20:00", name:"Paul Griffiths", role:"Circulating Nurse",  site:"Main Theatres",  hrs:7.0, approved:"Confirmed"   },
      { date:"21 Feb 2026", shift:"AM",  start:"08:00", end:"13:00", name:"Kat Ellis",      role:"ODP",                site:"Main Theatres",  hrs:5.0, approved:"Confirmed"   },
      { date:"21 Feb 2026", shift:"AM",  start:"08:00", end:"13:00", name:"Linda Foster",   role:"ODP",                site:"Day Surgery",    hrs:5.0, approved:"Confirmed"   },
      { date:"21 Feb 2026", shift:"PM",  start:"13:00", end:"20:00", name:"Tanya Reid",     role:"Circulating Nurse",  site:"Day Surgery",    hrs:7.0, approved:"Pending"     },
      { date:"22 Feb 2026", shift:"AM",  start:"09:00", end:"17:00", name:"Ben Okafor",     role:"HCA",                site:"Day Surgery",    hrs:8.0, approved:"Confirmed"   },
      { date:"22 Feb 2026", shift:"EVE", start:"17:00", end:"21:00", name:"Agency Cover",   role:"Scrub Nurse",        site:"Main Theatres",  hrs:4.0, approved:"Pending"     },
      { date:"23 Feb 2026", shift:"AM",  start:"08:00", end:"13:00", name:"Jane Cooper",    role:"Scrub Nurse",        site:"Main Theatres",  hrs:5.0, approved:"Confirmed"   },
      { date:"23 Feb 2026", shift:"PM",  start:"13:00", end:"20:00", name:"Fiona West",     role:"Scrub Nurse",        site:"Main Theatres",  hrs:7.0, approved:"Confirmed"   },
    ],
  },

  absence: {
    columns: [
      { key:"id",     label:"Staff ID",   width:90,  mono:true  },
      { key:"name",   label:"Name",       width:180             },
      { key:"type",   label:"Type",       width:145             },
      { key:"start",  label:"From",       width:120             },
      { key:"end",    label:"To",         width:120             },
      { key:"days",   label:"Days",       width:65, align:"right" },
      { key:"status", label:"Status",     width:110, badge:true },
      { key:"return", label:"Return",     width:130             },
      { key:"cover",  label:"Cover",      width:120, badge:true },
      { key:"reason", label:"Notes",      width:260             },
    ],
    rows: [
      { id:"S-0082", name:"Mark Owens",     type:"Annual Leave",    start:"17 Feb 2026", end:"21 Feb 2026", days:5,   status:"On Leave",  return:"24 Feb 2026", cover:"Arranged",     reason:"Pre-booked leave" },
      { id:"S-0119", name:"Dr. R. Brown",   type:"Sick Leave",      start:"18 Feb 2026", end:"21 Feb 2026", days:4,   status:"Absent",    return:"TBC",         cover:"Confirmed",    reason:"Self-certified sickness" },
      { id:"S-0031", name:"Linda Foster",   type:"Study Leave",     start:"03 Mar 2026", end:"05 Mar 2026", days:3,   status:"Approved",  return:"06 Mar 2026", cover:"Pending",      reason:"NVQ Assessment Centre" },
      { id:"S-0063", name:"Paul Griffiths", type:"Annual Leave",    start:"10 Mar 2026", end:"14 Mar 2026", days:5,   status:"Approved",  return:"17 Mar 2026", cover:"Pending",      reason:"Pre-booked leave" },
      { id:"S-0041", name:"Sarah Mitchell", type:"Maternity Leave", start:"01 Apr 2026", end:"30 Sep 2026", days:130, status:"Approved",  return:"01 Oct 2026", cover:"Arranged",     reason:"Band 7 secondment planned as cover" },
      { id:"S-0095", name:"Ben Okafor",     type:"Annual Leave",    start:"27 Feb 2026", end:"28 Feb 2026", days:2,   status:"Approved",  return:"03 Mar 2026", cover:"Not Required", reason:"Short leave, low-demand days" },
      { id:"S-0027", name:"Kat Ellis",      type:"Toil",            start:"25 Feb 2026", end:"25 Feb 2026", days:1,   status:"Approved",  return:"26 Feb 2026", cover:"Not Required", reason:"TOIL accrued from eve shift 14 Feb" },
    ],
  },

  // ── SUPPLIES & EQUIPMENT ──────────────────────────────────────────────────

  catalogue: {
    columns: [
      { key:"code",     label:"Product Code",  width:120, mono:true },
      { key:"name",     label:"Product Name",  width:235            },
      { key:"category", label:"Category",      width:145            },
      { key:"supplier", label:"Supplier",      width:160            },
      { key:"unit",     label:"Unit",          width:85             },
      { key:"minStock", label:"Min Stock",     width:100, align:"right" },
      { key:"price",    label:"Unit Price",    width:115, align:"right", mono:true },
      { key:"form",     label:"Formulary",     width:110, badge:true },
      { key:"status",   label:"Status",        width:100, badge:true },
    ],
    rows: [
      { code:"SC-40021", name:"Surgical Gloves — Latex, Size 7.5",         category:"PPE",              supplier:"Mölnlycke",      unit:"Pair",    minStock:500, price:"£0.85",    form:"Confirmed", status:"Active" },
      { code:"SC-40022", name:"Surgical Drape — Large Adhesive",           category:"Draping",          supplier:"3M Health Care",  unit:"Each",    minStock:200, price:"£3.20",    form:"Confirmed", status:"Active" },
      { code:"SC-41100", name:"Suture — Vicryl 2/0 Undyed",               category:"Sutures",          supplier:"Ethicon",         unit:"Pack",    minStock:100, price:"£1.95",    form:"Confirmed", status:"Active" },
      { code:"SC-41201", name:"Suture — PDS II 0 Violet",                 category:"Sutures",          supplier:"Ethicon",         unit:"Pack",    minStock:80,  price:"£2.30",    form:"Confirmed", status:"Active" },
      { code:"AN-10050", name:"Propofol 1% Emulsion 20mL Ampoule",        category:"Anaesthetic Drug", supplier:"Fresenius Kabi",  unit:"Ampoule", minStock:300, price:"£1.10",    form:"Confirmed", status:"Active" },
      { code:"AN-10055", name:"Suxamethonium Chloride 200mg/10mL",        category:"Anaesthetic Drug", supplier:"Aurobindo",       unit:"Vial",    minStock:150, price:"£2.45",    form:"Confirmed", status:"Active" },
      { code:"IM-20101", name:"Total Knee System — Primary (S/M/L)",      category:"Implant",          supplier:"Stryker",         unit:"Set",     minStock:6,   price:"£3,400.00",form:"Confirmed", status:"Active" },
      { code:"IM-20210", name:"Hip Hemiarthroplasty — Austin Moore",      category:"Implant",          supplier:"Depuy Synthes",   unit:"Each",    minStock:4,   price:"£1,850.00",form:"Confirmed", status:"Active" },
      { code:"DI-50011", name:"Laparoscopic Trocar 5mm — Disposable",     category:"Disposable",       supplier:"Karl Storz",      unit:"Each",    minStock:30,  price:"£18.50",   form:"Confirmed", status:"Active" },
      { code:"DI-50012", name:"Laparoscopic Trocar 12mm — Disposable",    category:"Disposable",       supplier:"Karl Storz",      unit:"Each",    minStock:20,  price:"£22.80",   form:"Confirmed", status:"Active" },
      { code:"SC-42001", name:"Chlorhexidine Gluconate 0.05% Solution",   category:"Antiseptic",       supplier:"Ecolab",          unit:"500mL",   minStock:100, price:"£3.60",    form:"Confirmed", status:"Active" },
      { code:"DI-50099", name:"Endotracheal Tube — Cuffed 7.0mm",         category:"Airway",           supplier:"Smiths Medical",  unit:"Each",    minStock:40,  price:"£2.15",    form:"Confirmed", status:"Active" },
      { code:"CA-60011", name:"Bypass Circuit — Adult (Sorin)",           category:"Perfusion",        supplier:"LivaNova",        unit:"Set",     minStock:3,   price:"£550.00",  form:"Confirmed", status:"Active" },
    ],
  },

  equipment: {
    columns: [
      { key:"assetId",  label:"Asset ID",      width:100, mono:true },
      { key:"name",     label:"Equipment",     width:225            },
      { key:"type",     label:"Type",          width:140            },
      { key:"make",     label:"Manufacturer",  width:145            },
      { key:"model",    label:"Model",         width:150            },
      { key:"serial",   label:"Serial No.",    width:135, mono:true },
      { key:"location", label:"Location",      width:145            },
      { key:"lastSvc",  label:"Last Service",  width:120            },
      { key:"nextSvc",  label:"Next Service",  width:120            },
      { key:"status",   label:"Status",        width:120, badge:true},
    ],
    rows: [
      { assetId:"EQ-0041", name:"Arthroscopic Stack System",      type:"Imaging",         make:"Karl Storz",     model:"IMAGE1 S",          serial:"KS-9021448", location:"Theatre 1",   lastSvc:"Jan 2026",  nextSvc:"Jul 2026",  status:"Operational" },
      { assetId:"EQ-0042", name:"Anaesthetic Machine — Dräger",   type:"Anaesthesia",     make:"Dräger",         model:"Perseus A500",       serial:"DR-7710231", location:"Theatre 1",   lastSvc:"Dec 2025",  nextSvc:"Jun 2026",  status:"Operational" },
      { assetId:"EQ-0055", name:"Diathermy — Bipolar/Monopolar",  type:"Electrosurgery",  make:"Medtronic",      model:"Force Triad FX",     serial:"VL-3301119", location:"Theatre 3",   lastSvc:"Nov 2025",  nextSvc:"May 2026",  status:"Operational" },
      { assetId:"EQ-0061", name:"Operating Table — Carbon Fibre", type:"Operating Table", make:"Trumpf Medical", model:"TruSystem 7000dC",   serial:"TM-8840022", location:"Theatre 5",   lastSvc:"Feb 2026",  nextSvc:"Aug 2026",  status:"Operational" },
      { assetId:"EQ-0078", name:"Arthroscopic Scope — Backup",    type:"Imaging",         make:"Olympus",        model:"CLV-S200",           serial:"OL-5540081", location:"Store A",     lastSvc:"Jun 2025",  nextSvc:"Dec 2025",  status:"Overdue"     },
      { assetId:"EQ-0083", name:"Cell Salvage Machine (XTRA)",    type:"Perfusion",       make:"LivaNova",       model:"XTRA",               serial:"SG-1124009", location:"Theatre 5",   lastSvc:"Jan 2026",  nextSvc:"Jul 2026",  status:"Operational" },
      { assetId:"EQ-0091", name:"Ultrasound — Nerve Block",       type:"Diagnostic US",   make:"Sonosite",       model:"M-Turbo",            serial:"SS-6610044", location:"Workshop",    lastSvc:"Sep 2025",  nextSvc:"Mar 2026",  status:"Maintenance" },
      { assetId:"EQ-0103", name:"Image Intensifier (C-Arm)",      type:"Fluoroscopy",     make:"Siemens",        model:"Cios Select",        serial:"SI-9920017", location:"Theatre 4",   lastSvc:"Jan 2026",  nextSvc:"Jul 2026",  status:"Operational" },
      { assetId:"EQ-0114", name:"Tourniquet System — Dual Port",  type:"Surgical Aid",    make:"Zimmer Biomet",  model:"ATS 3000",           serial:"ZB-8830341", location:"Theatre 1",   lastSvc:"Oct 2025",  nextSvc:"Apr 2026",  status:"Operational" },
      { assetId:"EQ-0122", name:"Robotic Arm — Assisted Surgery", type:"Robotics",        make:"Intuitive Surg.",model:"da Vinci Xi",        serial:"IS-0041002", location:"Robotic Suite",lastSvc:"Jan 2026", nextSvc:"Apr 2026",  status:"Operational" },
    ],
  },

  assetTrack: {
    columns: [
      { key:"assetId",  label:"Asset ID",         width:100, mono:true },
      { key:"name",     label:"Asset Name",       width:225            },
      { key:"type",     label:"Type",             width:140            },
      { key:"location", label:"Current Location", width:175            },
      { key:"assigned", label:"Assigned To",      width:170            },
      { key:"lastSeen", label:"Last Seen",        width:145            },
      { key:"status",   label:"Status",           width:120, badge:true},
    ],
    rows: [
      { assetId:"EQ-0041", name:"Arthroscopic Stack System",    type:"Imaging",         location:"Theatre 1",    assigned:"Sarah Mitchell",   lastSeen:"Today 08:15",  status:"In Use"      },
      { assetId:"EQ-0042", name:"Anaesthetic Machine — Dräger", type:"Anaesthesia",     location:"Theatre 1",    assigned:"Dr. T. Kumar",     lastSeen:"Today 07:55",  status:"In Use"      },
      { assetId:"EQ-0055", name:"Diathermy Unit",               type:"Electrosurgery",  location:"Theatre 3",    assigned:"Fiona West",       lastSeen:"Today 09:30",  status:"In Use"      },
      { assetId:"EQ-0061", name:"Operating Table",              type:"Operating Table", location:"Theatre 5",    assigned:"Elena Marsh",      lastSeen:"Today 07:45",  status:"In Use"      },
      { assetId:"EQ-0078", name:"Arthroscopic Scope — Backup",  type:"Imaging",         location:"Store A",      assigned:"Unassigned",       lastSeen:"18 Feb 2026",  status:"Reserved"    },
      { assetId:"EQ-0083", name:"Cell Salvage Machine",         type:"Perfusion",       location:"Theatre 5",    assigned:"Kofi Mensah",      lastSeen:"Today 07:50",  status:"In Use"      },
      { assetId:"EQ-0091", name:"Ultrasound — Nerve Block",     type:"Diagnostic US",   location:"Workshop",     assigned:"Biomedical Eng.",  lastSeen:"19 Feb 2026",  status:"Maintenance" },
      { assetId:"EQ-0103", name:"Image Intensifier (C-Arm)",    type:"Fluoroscopy",     location:"Theatre 4",    assigned:"Theatre 4 Team",   lastSeen:"Today 08:30",  status:"In Use"      },
      { assetId:"EQ-0114", name:"Tourniquet System",            type:"Surgical Aid",    location:"Theatre 1",    assigned:"Sarah Mitchell",   lastSeen:"Today 08:20",  status:"In Use"      },
      { assetId:"EQ-0122", name:"Robotic Arm (da Vinci Xi)",    type:"Robotics",        location:"Robotic Suite",assigned:"Robotic Team",     lastSeen:"Today 07:00",  status:"Standby"     },
    ],
  },

  procurement: {
    columns: [
      { key:"prNo",     label:"PR No.",         width:120, mono:true },
      { key:"date",     label:"Date Raised",    width:120            },
      { key:"by",       label:"Requested By",   width:165            },
      { key:"product",  label:"Product",        width:240            },
      { key:"qty",      label:"Qty",            width:65, align:"right" },
      { key:"unit",     label:"Unit",           width:80             },
      { key:"supplier", label:"Supplier",       width:165            },
      { key:"priority", label:"Priority",       width:100, badge:true},
      { key:"status",   label:"Status",         width:115, badge:true},
      { key:"est",      label:"Est. Cost",      width:115, align:"right", mono:true },
    ],
    rows: [
      { prNo:"PR-2026-0441", date:"18 Feb 2026", by:"Sarah Mitchell",   product:"Arthroscopic Shaver Blade — 4.0mm",     qty:24, unit:"Each",    supplier:"Stryker",          priority:"Routine", status:"Submitted",   est:"£312.00"    },
      { prNo:"PR-2026-0442", date:"18 Feb 2026", by:"Stores Manager",   product:"Surgical Gloves Latex 7.5 — Box 50",    qty:20, unit:"Box",     supplier:"Mölnlycke",        priority:"Routine", status:"Approved",    est:"£170.00"    },
      { prNo:"PR-2026-0443", date:"19 Feb 2026", by:"Amy Nwosu",        product:"Laparoscopic Trocar 5mm — Disposable",  qty:40, unit:"Each",    supplier:"Karl Storz",       priority:"Urgent",  status:"Processing",  est:"£740.00"    },
      { prNo:"PR-2026-0444", date:"19 Feb 2026", by:"Theatre Manager",  product:"Propofol 1% 20mL — Case ×10",           qty:50, unit:"Case",    supplier:"Fresenius Kabi",   priority:"Urgent",  status:"Submitted",   est:"£550.00"    },
      { prNo:"PR-2026-0445", date:"20 Feb 2026", by:"Elena Marsh",      product:"Bypass Circuit — Adult (Sorin XTRA)",   qty:4,  unit:"Set",     supplier:"LivaNova",         priority:"Urgent",  status:"Raised",      est:"£2,200.00"  },
      { prNo:"PR-2026-0446", date:"20 Feb 2026", by:"Stores Manager",   product:"Suture Vicryl 2/0 Undyed — Box ×36",   qty:5,  unit:"Box",     supplier:"Ethicon",          priority:"Routine", status:"Approved",    est:"£351.00"    },
      { prNo:"PR-2026-0447", date:"20 Feb 2026", by:"Dr. T. Kumar",     product:"Endotracheal Tube 7.0mm — Box ×10",     qty:3,  unit:"Box",     supplier:"Smiths Medical",   priority:"Routine", status:"Raised",      est:"£64.50"     },
      { prNo:"PR-2026-0448", date:"20 Feb 2026", by:"Theatre 7 Team",   product:"Skin Stapler — 35W",                    qty:12, unit:"Each",    supplier:"Ethicon",          priority:"Routine", status:"Raised",      est:"£288.00"    },
    ],
  },

  specs: {
    columns: [
      { key:"code",     label:"Product Code",     width:120, mono:true },
      { key:"name",     label:"Product Name",     width:230            },
      { key:"spec",     label:"Specification",    width:280            },
      { key:"cat",      label:"Category",         width:145            },
      { key:"std",      label:"Standard",         width:140            },
      { key:"supplier", label:"Approved Supplier",width:155            },
      { key:"ver",      label:"Version",          width:80             },
      { key:"status",   label:"Status",           width:100, badge:true},
    ],
    rows: [
      { code:"SC-40021", name:"Surgical Gloves Latex 7.5",         spec:"Latex, powder-free, sterile, AQL 0.65, EN 455",            cat:"PPE",          std:"EN 455-1:2020",  supplier:"Mölnlycke",    ver:"v2.1", status:"Active" },
      { code:"SC-41100", name:"Suture Vicryl 2/0 Undyed",          spec:"Braided polyglycolic acid, 70cm, FS-2 needle, sterile",     cat:"Sutures",      std:"EN ISO 10555",   supplier:"Ethicon",      ver:"v1.4", status:"Active" },
      { code:"AN-10050", name:"Propofol 1% Emulsion",              spec:"10mg/mL, soya oil/lecithin base, IV use only, 20mL",        cat:"Anaesthetic",  std:"BP 2025",        supplier:"Fresenius",    ver:"v1.0", status:"Active" },
      { code:"IM-20101", name:"Total Knee System — Primary",       spec:"CoCr/UHMWPE, cemented/uncemented, 3 sizes, trial set incl.",cat:"Implant",      std:"ISO 7207-1",     supplier:"Stryker",      ver:"v3.2", status:"Active" },
      { code:"IM-20210", name:"Hip Hemi Austin Moore",             spec:"316L stainless steel, 44–54mm head, polished taper",       cat:"Implant",      std:"ISO 7207-2",     supplier:"Depuy Synthes",ver:"v2.0", status:"Active" },
      { code:"DI-50011", name:"Laparoscopic Trocar 5mm",           spec:"Disposable, non-bladed, 5mm, universal seal, low-profile",  cat:"Disposable",   std:"ISO 11135",      supplier:"Karl Storz",   ver:"v1.1", status:"Active" },
      { code:"SC-42001", name:"Chlorhexidine 0.05% Solution",      spec:"0.05% w/v, 500mL, aqueous base, skin prep only",           cat:"Antiseptic",   std:"BP 2025",        supplier:"Ecolab",       ver:"v1.3", status:"Active" },
      { code:"CA-60011", name:"Bypass Circuit — Adult",            spec:"Integrated arterial filter, hard-shell reservoir, adult",   cat:"Perfusion",    std:"ISO 7199",       supplier:"LivaNova",     ver:"v2.1", status:"Active" },
    ],
  },

  suppliers: {
    columns: [
      { key:"id",       label:"Supplier ID",   width:100, mono:true },
      { key:"name",     label:"Supplier",      width:185            },
      { key:"type",     label:"Type",          width:140            },
      { key:"contact",  label:"Contact",       width:165            },
      { key:"phone",    label:"Phone",         width:135, mono:true },
      { key:"email",    label:"Email",         width:220, mono:true },
      { key:"contract", label:"Contract No.",  width:140, mono:true },
      { key:"expiry",   label:"Expiry",        width:110            },
      { key:"spend",    label:"Spend YTD",     width:120, align:"right", mono:true },
      { key:"status",   label:"Status",        width:100, badge:true},
    ],
    rows: [
      { id:"SUP-0011", name:"Mölnlycke Health Care",   type:"PPE / Draping",    contact:"John Stannard",  phone:"0161 830 1234", email:"orders@molnlycke.co.uk",        contract:"NHS-F-2024-041", expiry:"Mar 2027", spend:"£48,200",  status:"Active" },
      { id:"SUP-0012", name:"Ethicon (J&J MedTech)",   type:"Sutures / Staples",contact:"Karen Patel",    phone:"0800 783 7032", email:"orders@ethicon.co.uk",           contract:"NHS-F-2024-088", expiry:"Jun 2026", spend:"£72,400",  status:"Active" },
      { id:"SUP-0013", name:"Stryker UK",               type:"Implants / Equip", contact:"David Hollis",   phone:"0118 903 0600", email:"stryker.uk@stryker.com",         contract:"NHS-I-2023-019", expiry:"Dec 2026", spend:"£184,000", status:"Active" },
      { id:"SUP-0014", name:"Karl Storz UK",            type:"Endoscopy / Equip",contact:"Clare Ashford",  phone:"01753 503500",  email:"uk.sales@karlstorz.com",         contract:"NHS-E-2024-012", expiry:"Sep 2026", spend:"£93,100",  status:"Active" },
      { id:"SUP-0015", name:"Fresenius Kabi",           type:"Anaes. Drugs",     contact:"Gita Sharma",    phone:"01928 533 533", email:"orders.uk@fresenius-kabi.com",   contract:"NHS-D-2025-002", expiry:"Jan 2027", spend:"£31,600",  status:"Active" },
      { id:"SUP-0016", name:"Depuy Synthes (J&J)",     type:"Implants",          contact:"Michael Kane",   phone:"01628 645000",  email:"depuysynthes@jnj.com",           contract:"NHS-I-2023-031", expiry:"Apr 2026", spend:"£128,500", status:"Active" },
      { id:"SUP-0017", name:"Smiths Medical",           type:"Airway / IV",       contact:"Sandra Brooks",  phone:"01832 280444",  email:"uk.orders@smithsmedical.com",    contract:"NHS-F-2024-077", expiry:"Aug 2026", spend:"£19,200",  status:"Active" },
      { id:"SUP-0018", name:"LivaNova (Sorin Group)",  type:"Perfusion",         contact:"Luke Travers",   phone:"020 8795 6400", email:"uk.orders@livanova.com",         contract:"NHS-E-2024-055", expiry:"Nov 2026", spend:"£41,700",  status:"Active" },
    ],
  },

  // ── INVENTORY ─────────────────────────────────────────────────────────────

  stockLevels: {
    columns: [
      { key:"code",    label:"Item Code",    width:115, mono:true },
      { key:"name",    label:"Item",         width:240            },
      { key:"cat",     label:"Category",     width:145            },
      { key:"loc",     label:"Location",     width:155            },
      { key:"current", label:"Current",      width:90, align:"right" },
      { key:"min",     label:"Min",          width:65, align:"right" },
      { key:"max",     label:"Max",          width:65, align:"right" },
      { key:"reorder", label:"Reorder Pt",   width:105, align:"right" },
      { key:"uom",     label:"UoM",          width:80             },
      { key:"updated", label:"Last Updated", width:140            },
      { key:"status",  label:"Status",       width:120, badge:true},
    ],
    rows: [
      { code:"SC-40021", name:"Surgical Gloves Latex 7.5",        cat:"PPE",         loc:"Store A, Bay 3",    current:340, min:200, max:800, reorder:250, uom:"Pair",    updated:"Today 07:00",   status:"In Stock"    },
      { code:"SC-40022", name:"Large Adhesive Drape",             cat:"Draping",     loc:"Store A, Bay 4",    current:88,  min:100, max:400, reorder:120, uom:"Each",    updated:"Today 07:00",   status:"Low Stock"   },
      { code:"SC-41100", name:"Vicryl 2/0 Undyed Suture",        cat:"Sutures",     loc:"Dispensary",        current:142, min:80,  max:300, reorder:100, uom:"Pack",    updated:"Today 07:00",   status:"In Stock"    },
      { code:"AN-10050", name:"Propofol 1% 20mL",                cat:"Anaes. Drug", loc:"Drug Cabinet T1-4", current:210, min:150, max:600, reorder:200, uom:"Ampoule", updated:"Today 08:00",   status:"In Stock"    },
      { code:"AN-10055", name:"Suxamethonium 200mg",             cat:"Anaes. Drug", loc:"Drug Cabinet T1-4", current:41,  min:50,  max:200, reorder:60,  uom:"Vial",    updated:"Today 08:00",   status:"Low Stock"   },
      { code:"IM-20101", name:"Total Knee System Primary M",     cat:"Implant",     loc:"Implant Store",     current:4,   min:3,   max:10,  reorder:4,   uom:"Set",     updated:"19 Feb 2026",   status:"In Stock"    },
      { code:"IM-20210", name:"Hip Hemi Austin Moore 48mm",      cat:"Implant",     loc:"Implant Store",     current:2,   min:3,   max:8,   reorder:3,   uom:"Each",    updated:"19 Feb 2026",   status:"Low Stock"   },
      { code:"DI-50011", name:"Laparoscopic Trocar 5mm",         cat:"Disposable",  loc:"Store B, Bay 1",    current:0,   min:20,  max:80,  reorder:25,  uom:"Each",    updated:"Today 07:00",   status:"Out of Stock"},
      { code:"DI-50099", name:"Endotracheal Tube 7.0mm Cuffed",  cat:"Airway",      loc:"Dispensary",        current:28,  min:30,  max:100, reorder:35,  uom:"Each",    updated:"Today 07:00",   status:"Low Stock"   },
      { code:"SC-42001", name:"Chlorhexidine 0.05% 500mL",       cat:"Antiseptic",  loc:"Store A, Bay 6",    current:67,  min:50,  max:200, reorder:60,  uom:"Bottle",  updated:"Today 07:00",   status:"In Stock"    },
      { code:"CA-60011", name:"Bypass Circuit — Adult",          cat:"Perfusion",   loc:"Implant Store",     current:2,   min:2,   max:6,   reorder:3,   uom:"Set",     updated:"19 Feb 2026",   status:"In Stock"    },
    ],
  },

  warehousing: {
    columns: [
      { key:"bay",    label:"Bay",           width:80             },
      { key:"zone",   label:"Zone",          width:115            },
      { key:"code",   label:"Item Code",     width:115, mono:true },
      { key:"name",   label:"Item",          width:240            },
      { key:"qty",    label:"Qty",           width:75, align:"right" },
      { key:"uom",    label:"UoM",           width:80             },
      { key:"lot",    label:"Lot / Batch",   width:130, mono:true },
      { key:"expiry", label:"Expiry",        width:110            },
      { key:"status", label:"Status",        width:120, badge:true},
      { key:"moved",  label:"Last Movement", width:140            },
    ],
    rows: [
      { bay:"A-01", zone:"General",    code:"SC-40021", name:"Surgical Gloves 7.5",         qty:340, uom:"Pair",    lot:"MH-2025-441",  expiry:"Dec 2027",   status:"Good",        moved:"18 Feb 2026"  },
      { bay:"A-02", zone:"General",    code:"SC-40022", name:"Large Adhesive Drape",        qty:88,  uom:"Each",    lot:"3M-2025-882",  expiry:"Nov 2027",   status:"Good",        moved:"18 Feb 2026"  },
      { bay:"A-03", zone:"General",    code:"SC-41100", name:"Vicryl 2/0 Undyed",           qty:142, uom:"Pack",    lot:"ET-2026-001",  expiry:"Mar 2028",   status:"Good",        moved:"19 Feb 2026"  },
      { bay:"B-01", zone:"Disposables",code:"DI-50011", name:"Lap Trocar 5mm",              qty:0,   uom:"Each",    lot:"KS-2025-910",  expiry:"Aug 2027",   status:"Out of Stock",moved:"10 Feb 2026"  },
      { bay:"B-02", zone:"Disposables",code:"DI-50099", name:"ET Tube 7.0mm Cuffed",        qty:28,  uom:"Each",    lot:"SM-2025-340",  expiry:"Jun 2027",   status:"Good",        moved:"19 Feb 2026"  },
      { bay:"C-01", zone:"Implants",   code:"IM-20101", name:"Total Knee System M",         qty:4,   uom:"Set",     lot:"STR-0223-M",   expiry:"No Expiry",  status:"Good",        moved:"15 Feb 2026"  },
      { bay:"C-02", zone:"Implants",   code:"IM-20210", name:"Hip Hemi Austin Moore 48mm",  qty:2,   uom:"Each",    lot:"DPS-0192-48",  expiry:"No Expiry",  status:"Good",        moved:"12 Feb 2026"  },
      { bay:"D-01", zone:"Controlled", code:"AN-10050", name:"Propofol 1% 20mL",            qty:210, uom:"Ampoule", lot:"FK-2026-001",  expiry:"Aug 2026",   status:"Good",        moved:"Today 06:45"  },
      { bay:"D-02", zone:"Controlled", code:"AN-10055", name:"Suxamethonium 200mg",         qty:41,  uom:"Vial",    lot:"AU-2025-511",  expiry:"May 2026",   status:"Near Expiry", moved:"Today 06:45"  },
      { bay:"E-01", zone:"Antiseptics",code:"SC-42001", name:"Chlorhexidine 0.05% 500mL",  qty:67,  uom:"Bottle",  lot:"EC-2025-199",  expiry:"Sep 2027",   status:"Good",        moved:"18 Feb 2026"  },
      { bay:"C-03", zone:"Implants",   code:"CA-60011", name:"Bypass Circuit — Adult",      qty:2,   uom:"Set",     lot:"LV-2026-004",  expiry:"Jun 2027",   status:"Good",        moved:"14 Feb 2026"  },
    ],
  },

  distribution: {
    columns: [
      { key:"distNo",   label:"Dist. No.",    width:125, mono:true },
      { key:"date",     label:"Date",         width:120            },
      { key:"from",     label:"From",         width:155            },
      { key:"to",       label:"To",           width:155            },
      { key:"item",     label:"Item",         width:225            },
      { key:"qty",      label:"Qty",          width:65, align:"right" },
      { key:"by",       label:"Requested By", width:165            },
      { key:"dispatch", label:"Dispatched",   width:110, mono:true },
      { key:"received", label:"Received",     width:110, mono:true },
      { key:"status",   label:"Status",       width:120, badge:true},
    ],
    rows: [
      { distNo:"DS-2026-0091", date:"20 Feb 2026", from:"Store A",      to:"Theatre 1",    item:"Surgical Gloves 7.5 ×20 pr",  qty:20, by:"Sarah Mitchell",  dispatch:"07:30", received:"08:00", status:"Received"   },
      { distNo:"DS-2026-0092", date:"20 Feb 2026", from:"Dispensary",   to:"Theatre 1-4",  item:"Vicryl 2/0 ×12 packs",        qty:12, by:"Theatre Manager", dispatch:"07:30", received:"08:00", status:"Received"   },
      { distNo:"DS-2026-0093", date:"20 Feb 2026", from:"Store B",      to:"Theatre 3",    item:"Lap Trocar 12mm ×6",          qty:6,  by:"Amy Nwosu",       dispatch:"07:45", received:"08:15", status:"Received"   },
      { distNo:"DS-2026-0094", date:"20 Feb 2026", from:"Drug Cabinet", to:"Theatre 5",    item:"Propofol ×8 ampoules",        qty:8,  by:"Dr. H. Chen",     dispatch:"07:00", received:"07:15", status:"Received"   },
      { distNo:"DS-2026-0095", date:"20 Feb 2026", from:"Implant Store",to:"Theatre 1",    item:"Total Knee System M",         qty:1,  by:"Sarah Mitchell",  dispatch:"07:45", received:"08:00", status:"Received"   },
      { distNo:"DS-2026-0096", date:"20 Feb 2026", from:"Store A",      to:"Day Surgery",  item:"Large Adhesive Drape ×10",    qty:10, by:"Linda Foster",    dispatch:"08:00", received:"—",     status:"In Transit" },
      { distNo:"DS-2026-0097", date:"20 Feb 2026", from:"Implant Store",to:"Theatre 5",    item:"Bypass Circuit Adult",        qty:1,  by:"Elena Marsh",     dispatch:"07:00", received:"07:30", status:"Received"   },
      { distNo:"DS-2026-0098", date:"20 Feb 2026", from:"Store B",      to:"Anaes. Room",  item:"ET Tube 7.0mm ×4",            qty:4,  by:"Dr. T. Kumar",    dispatch:"07:30", received:"—",     status:"In Transit" },
    ],
  },

  returns: {
    columns: [
      { key:"retNo",  label:"Return No.",    width:120, mono:true },
      { key:"date",   label:"Date",          width:120            },
      { key:"item",   label:"Item",          width:240            },
      { key:"qty",    label:"Qty",           width:65, align:"right" },
      { key:"lot",    label:"Lot No.",       width:130, mono:true },
      { key:"reason", label:"Reason",        width:215            },
      { key:"by",     label:"Returned By",   width:170            },
      { key:"credit", label:"Credit Exp.",   width:125, align:"right", mono:true },
      { key:"status", label:"Status",        width:120, badge:true},
    ],
    rows: [
      { retNo:"RT-2026-0021", date:"19 Feb 2026", item:"Total Knee System M — Unused",       qty:1, lot:"STR-0223-M",  reason:"Wrong size opened intra-op (M→L)",      by:"Sarah Mitchell",  credit:"£3,400.00", status:"Processing" },
      { retNo:"RT-2026-0022", date:"19 Feb 2026", item:"Hip Hemi 46mm — Patient cancelled",  qty:1, lot:"DPS-0192-46", reason:"Case cancelled pre-op — DNA",            by:"Theatre Manager", credit:"£1,850.00", status:"Submitted"  },
      { retNo:"RT-2026-0023", date:"18 Feb 2026", item:"Laparoscopic Trocar 12mm ×2",        qty:2, lot:"KS-2025-910", reason:"Packaging damaged on delivery",          by:"Stores Manager",  credit:"£45.60",    status:"Approved"   },
      { retNo:"RT-2026-0024", date:"17 Feb 2026", item:"Propofol 1% 20mL ×3",                qty:3, lot:"FK-2026-001", reason:"Near expiry — overstocked",             by:"Theatre Manager", credit:"£3.30",     status:"Completed"  },
      { retNo:"RT-2026-0025", date:"15 Feb 2026", item:"Suture Vicryl 2/0 ×5",               qty:5, lot:"ET-2025-889", reason:"Partial list — unused sterile stock",   by:"Amy Nwosu",       credit:"£9.75",     status:"Completed"  },
    ],
  },

  expiry: {
    columns: [
      { key:"lot",      label:"Batch/Lot No.",    width:135, mono:true },
      { key:"code",     label:"Product Code",     width:115, mono:true },
      { key:"name",     label:"Product",          width:245            },
      { key:"expDate",  label:"Expiry Date",      width:130            },
      { key:"daysLeft", label:"Days Left",        width:100, align:"right" },
      { key:"qty",      label:"Qty",              width:75, align:"right" },
      { key:"uom",      label:"UoM",              width:80             },
      { key:"location", label:"Location",         width:155            },
      { key:"status",   label:"Status",           width:120, badge:true},
      { key:"action",   label:"Action Required",  width:260            },
    ],
    rows: [
      { lot:"FK-2025-710", code:"AN-10050", name:"Propofol 1% 20mL — Batch 710",          expDate:"28 Feb 2026", daysLeft:8,   qty:12,  uom:"Ampoule", location:"Drug Cabinet",  status:"Near Expiry", action:"PRIORITY: Use or return by 25 Feb 2026" },
      { lot:"AU-2025-511", code:"AN-10055", name:"Suxamethonium 200mg",                   expDate:"15 May 2026", daysLeft:84,  qty:41,  uom:"Vial",    location:"Drug Cabinet",  status:"Near Expiry", action:"Monitor — raise return if unused by Apr" },
      { lot:"FK-2026-001", code:"AN-10050", name:"Propofol 1% 20mL — Batch 001",          expDate:"Aug 2026",    daysLeft:169, qty:210, uom:"Ampoule", location:"Drug Cabinet",  status:"Good",        action:"None"                                   },
      { lot:"ET-2026-001", code:"SC-41100", name:"Vicryl 2/0 Undyed Suture",              expDate:"Mar 2028",    daysLeft:738, qty:142, uom:"Pack",    location:"Dispensary",    status:"Good",        action:"None"                                   },
      { lot:"KS-2025-910", code:"DI-50011", name:"Laparoscopic Trocar 5mm",               expDate:"Aug 2027",    daysLeft:553, qty:0,   uom:"Each",    location:"Store B",       status:"Out of Stock",action:"Urgent reorder — PR-2026-0443 raised"   },
      { lot:"SM-2025-340", code:"DI-50099", name:"ET Tube 7.0mm Cuffed",                  expDate:"Jun 2027",    daysLeft:492, qty:28,  uom:"Each",    location:"Dispensary",    status:"Good",        action:"None"                                   },
      { lot:"EC-2025-199", code:"SC-42001", name:"Chlorhexidine 0.05% 500mL",             expDate:"Sep 2027",    daysLeft:573, qty:67,  uom:"Bottle",  location:"Store A",       status:"Good",        action:"None"                                   },
      { lot:"MH-2025-441", code:"SC-40021", name:"Surgical Gloves Latex 7.5",             expDate:"Dec 2027",    daysLeft:664, qty:340, uom:"Pair",    location:"Store A",       status:"Good",        action:"None"                                   },
      { lot:"LV-2026-004", code:"CA-60011", name:"Bypass Circuit — Adult",                expDate:"Jun 2027",    daysLeft:492, qty:2,   uom:"Set",     location:"Implant Store", status:"Good",        action:"None"                                   },
    ],
  },

  stockAdj: {
    columns: [
      { key:"adjNo",  label:"Adj. No.",     width:125, mono:true },
      { key:"date",   label:"Date",         width:120            },
      { key:"code",   label:"Item Code",    width:115, mono:true },
      { key:"name",   label:"Item",         width:220            },
      { key:"type",   label:"Type",         width:110, badge:true},
      { key:"before", label:"Before",       width:90, align:"right" },
      { key:"adjQty", label:"Adj. Qty",     width:90, align:"right" },
      { key:"after",  label:"After",        width:90, align:"right" },
      { key:"reason", label:"Reason",       width:240            },
      { key:"by",     label:"Approved By",  width:165            },
      { key:"status", label:"Status",       width:110, badge:true},
    ],
    rows: [
      { adjNo:"SA-2026-0041", date:"19 Feb 2026", code:"DI-50011", name:"Lap Trocar 5mm",          type:"Write-off",  before:5,   adjQty:"-5",  after:0,   reason:"Damaged on delivery — packaging breach",       by:"Stores Manager",  status:"Approved" },
      { adjNo:"SA-2026-0042", date:"19 Feb 2026", code:"SC-40022", name:"Large Adhesive Drape",    type:"Correction", before:95,  adjQty:"-7",  after:88,  reason:"Stock count discrepancy — recount confirmed",  by:"Theatre Manager", status:"Approved" },
      { adjNo:"SA-2026-0043", date:"18 Feb 2026", code:"IM-20210", name:"Hip Hemi Austin Moore",   type:"Write-off",  before:3,   adjQty:"-1",  after:2,   reason:"Implant returned — incorrect size intra-op",   by:"SDM",             status:"Approved" },
      { adjNo:"SA-2026-0044", date:"18 Feb 2026", code:"AN-10055", name:"Suxamethonium 200mg",     type:"Receipt",    before:33,  adjQty:"+8",  after:41,  reason:"Emergency top-up from pharmacy",               by:"Theatre Manager", status:"Approved" },
      { adjNo:"SA-2026-0045", date:"17 Feb 2026", code:"SC-41100", name:"Vicryl 2/0 Undyed",      type:"Correction", before:138, adjQty:"+4",  after:142, reason:"Missing from delivery — confirmed by supplier", by:"Stores Manager",  status:"Approved" },
    ],
  },

  assetMove: {
    columns: [
      { key:"moveId",  label:"Movement ID",  width:130, mono:true },
      { key:"assetId", label:"Asset ID",     width:100, mono:true },
      { key:"name",    label:"Asset",        width:225            },
      { key:"from",    label:"From",         width:165            },
      { key:"to",      label:"To",           width:165            },
      { key:"date",    label:"Date / Time",  width:145            },
      { key:"by",      label:"Moved By",     width:165            },
      { key:"purpose", label:"Purpose",      width:225            },
      { key:"return",  label:"Return Exp.",  width:130            },
      { key:"status",  label:"Status",       width:120, badge:true},
    ],
    rows: [
      { moveId:"AM-2026-0181", assetId:"EQ-0041", name:"Arthroscopic Stack System",      from:"Store A",       to:"Theatre 1",    date:"Today 07:50",  by:"Sarah Mitchell",  purpose:"Ortho list — Mr. Kapoor",          return:"Today 14:00",  status:"In Use"    },
      { moveId:"AM-2026-0182", assetId:"EQ-0083", name:"Cell Salvage Machine",           from:"Equipment Bay", to:"Theatre 5",    date:"Today 07:45",  by:"Elena Marsh",     purpose:"CABG — Mr. Singh",                 return:"Today 16:00",  status:"In Use"    },
      { moveId:"AM-2026-0183", assetId:"EQ-0103", name:"Image Intensifier (C-Arm)",      from:"Store B",       to:"Theatre 4",    date:"Today 08:30",  by:"Theatre Porter",  purpose:"Urology list — Mr. Patel",         return:"Today 12:00",  status:"In Use"    },
      { moveId:"AM-2026-0184", assetId:"EQ-0091", name:"Ultrasound — Nerve Block",       from:"Anaes. Room",   to:"Workshop",     date:"19 Feb 07:00", by:"Biomedical Eng.", purpose:"Scheduled PPM service",            return:"21 Feb 2026",  status:"Maintenance"},
      { moveId:"AM-2026-0185", assetId:"EQ-0078", name:"Arthroscopic Scope — Backup",    from:"Theatre 7",     to:"Theatre 1",    date:"Today 09:45",  by:"Stores Manager",  purpose:"Scope failure cover — T1",         return:"Today 14:00",  status:"In Use"    },
      { moveId:"AM-2026-0186", assetId:"EQ-0055", name:"Diathermy Unit",                 from:"Equipment Bay", to:"Theatre 3",    date:"Today 09:00",  by:"Chris Obi",       purpose:"GYN list — Mr. Hughes",            return:"Today 17:00",  status:"In Use"    },
      { moveId:"AM-2026-0187", assetId:"EQ-0114", name:"Tourniquet System Dual Port",    from:"Store A",       to:"Theatre 1",    date:"Today 08:00",  by:"Sarah Mitchell",  purpose:"Knee replacement — Mr. Kapoor",    return:"Today 14:00",  status:"In Use"    },
      { moveId:"AM-2026-0180", assetId:"EQ-0103", name:"Image Intensifier (C-Arm)",      from:"Theatre 4",     to:"Store B",      date:"14 Feb 17:30", by:"Theatre Porter",  purpose:"End of session return",            return:"N/A",          status:"Completed" },
    ],
  },

};

// ─── SPREADSHEET TABLE ────────────────────────────────────────────────────────

function SpreadsheetTable({ columns, rows, search }: { columns: Column[]; rows: Row[]; search: string }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const displayed = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = String(a[sortKey] ?? ""), bv = String(b[sortKey] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv, undefined, { numeric: true }) : bv.localeCompare(av, undefined, { numeric: true });
      });
    }
    return result;
  }, [rows, search, sortKey, sortDir]);

  return (
    <div style={{ flex:1, overflow:"auto", borderTop:"1px solid #e2e8f0" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:16, tableLayout:"auto" }}>
        <thead style={{ position:"sticky", top:0, zIndex:10 }}>
          <tr style={{ background:"#f1f5f9", borderBottom:"2px solid #e2e8f0" }}>
            {columns.map(col => (
              <th key={col.key}
                onClick={() => handleSort(col.key)}
                style={{
                  padding:"10px 12px",
                  textAlign:(col.align ?? "left") as ColAlign,
                  fontSize:16, fontWeight:700, color:"#475569",
                  textTransform:"uppercase", letterSpacing:"0.04em",
                  cursor:"pointer", whiteSpace:"nowrap",
                  minWidth:col.width, userSelect:"none",
                  borderRight:"1px solid #e2e8f0",
                }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:4,
                  justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start" }}>
                  {col.label}
                  {sortKey === col.key
                    ? (sortDir === "asc" ? <ChevronUp style={{ width:12, height:12 }} /> : <ChevronDown style={{ width:12, height:12 }} />)
                    : <span style={{ display:"inline-block", width:12 }} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((row, i) => (
            <tr key={i}
              style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc", borderBottom:"1px solid #eef1f5" }}
              className="hover:bg-[#f0f9ff] transition-colors cursor-default">
              {columns.map(col => {
                const val = row[col.key];
                const isNeg = !col.badge && typeof val === "string" && val.startsWith("-");
                const isPos = !col.badge && typeof val === "string" && val.startsWith("+");
                return (
                  <td key={col.key}
                    style={{
                      padding:"8px 12px",
                      textAlign:(col.align ?? "left") as ColAlign,
                      fontSize:16,
                      color: isNeg ? "#dc2626" : isPos ? "#16a34a" : col.mono ? "#475569" : "#0f172a",
                      fontFamily: col.mono ? "'Courier New', monospace" : "inherit",
                      fontWeight: (isNeg || isPos) ? 600 : 400,
                      whiteSpace:"nowrap",
                      borderRight:"1px solid #f1f5f9",
                    }}>
                    {col.badge ? <StatusBadge status={String(val ?? "")} /> : String(val ?? "—")}
                  </td>
                );
              })}
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr>
              <td colSpan={columns.length}
                style={{ textAlign:"center", padding:"48px", color:"#94a3b8", fontSize:16, fontStyle:"italic" }}>
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── LOGISTICS SECTION ────────────────────────────────────────────────────────

function MobileList({
  activeView,
  onSelect,
}: {
  activeView: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div style={{ padding: 12 }}>
      {NAV_GROUPS.map(group => (
        <div key={group.key} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {group.label}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {group.items.map(item => (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
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
  );
}

function MobileTable({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  return (
    <div style={{ padding: "8px 12px 16px", display: "grid", gap: 10 }}>
      {rows.map((row, idx) => (
        <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#ffffff", padding: 10 }}>
          {columns.map((col) => {
            const val = row[col.key];
            if (val === undefined || val === null || val === "") return null;
            return (
              <div key={col.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "3px 0" }}>
                <span style={{ fontSize: 16, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {col.label}
                </span>
                <span style={{ fontSize: 16, color: "#0f172a", fontWeight: 500, textAlign: "right" }}>
                  {col.badge ? <StatusBadge status={String(val ?? "")} /> : String(val ?? "—")}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      {rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "28px 12px", color: "#94a3b8", fontSize: 16 }}>
          No records found
        </div>
      )}
    </div>
  );
}

export default function LogisticsSection({ hideNav, initialView, deepLink }: { hideNav?: boolean; initialView?: string; deepLink?: { view?: string } | null } = {}) {
  const [activeView, setActiveView] = useState(deepLink?.view ?? initialView ?? "roster");

  // Sync activeView when parent drives navigation via deepLink (new object reference = always fires)
  useEffect(() => {
    if (deepLink?.view) setActiveView(deepLink.view);
  }, [deepLink]);

  // Fallback sync from initialView string (for non-deepLink usage)
  useEffect(() => {
    if (!deepLink && initialView) setActiveView(initialView);
  }, [deepLink, initialView]);
  const [search, setSearch]         = useState("");
  const [isMobile, setIsMobile]     = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [liveViews, setLiveViews]   = useState<Record<string, ViewDef>>({});

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
    let isActive = true;
    const loadLive = async () => {
      try {
        const shiftRes = await fetch("/api/roster/shifts?site=Royal%20Infirmary");
        const shiftPayload = await shiftRes.json();
        const shiftRows = Array.isArray(shiftPayload?.data)
          ? shiftPayload.data.map((item: any) => {
              const start = item.startTime ?? "—";
              const end = item.endTime ?? "—";
              const startHour = Number(start.split(":")[0] || 0);
              const endHour = Number(end.split(":")[0] || 0);
              const shiftLabel = startHour < 12 ? "AM" : startHour < 17 ? "PM" : "EVE";
              const hrs = endHour > startHour ? endHour - startHour : 0;
              return {
                date: item.date ?? "—",
                shift: shiftLabel,
                start,
                end,
                name: item.staffName ?? "—",
                role: item.role ?? "—",
                site: item.site ?? "—",
                hrs,
                approved: "Confirmed",
              };
            })
          : [];
        const shiftColumns = VIEWS.shifts?.columns ?? [];

        const stockRes = await fetch("/api/inventory/stock?site=Royal%20Infirmary");
        const stockPayload = await stockRes.json();
        const stockRows = Array.isArray(stockPayload?.data)
          ? stockPayload.data.map((item: any) => {
              const min = item.minLevel ?? 0;
              const max = min * 3;
              const status = item.quantity < min ? "Low Stock" : "In Stock";
              return {
                code: item.id ?? "—",
                name: item.name ?? "—",
                cat: item.category ?? "—",
                loc: item.site ?? "—",
                current: item.quantity ?? 0,
                min,
                max,
                reorder: Math.max(min + 5, min),
                uom: item.unit ?? "—",
                updated: "Today",
                status,
              };
            })
          : [];
        const stockColumns = VIEWS.stockLevels?.columns ?? [];

        if (!isActive) return;
        setLiveViews({
          shifts: { columns: shiftColumns, rows: shiftRows },
          stockLevels: { columns: stockColumns, rows: stockRows },
        });
      } catch {
        // Ignore live load failures
      }
    };
    loadLive();
    return () => {
      isActive = false;
    };
  }, []);

  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.key === activeView));
  const activeItem  = activeGroup?.items.find(i => i.key === activeView);
  const view        = liveViews[activeView] ?? VIEWS[activeView] ?? { columns: [], rows: [] };

  if (isMobile) {
    return (
      <div style={{ height: "100%", background: "#f4f6f9", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {mobileView === "list" ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <MobileList
              activeView={activeView}
              onSelect={(key) => {
                setActiveView(key);
                setMobileView("detail");
              }}
            />
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
              <MobileTable columns={view.columns} rows={view.rows} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"100%", background:"#f4f6f9" }}>

      {/* ── Left navigation ────────────────────────────────────────────── */}
      {!hideNav && <div style={{ width:220, flexShrink:0, background:"#ffffff", borderRight:"1px solid #e2e8f0",
        overflowY:"auto", display:"flex", flexDirection:"column", paddingBottom:60 }}>
        {NAV_GROUPS.map(group => {
          const GroupIcon = group.icon;
          return (
            <div key={group.key}>
              <div style={{ padding:"12px 14px 8px", display:"flex", alignItems:"center", gap:7, background:"#94a3b8" }}>
                <GroupIcon style={{ width:12, height:12, color:"#ffffff", flexShrink:0 }} />
                <span style={{ fontSize:16, fontWeight:700, color:"#ffffff",
                  textTransform:"uppercase", letterSpacing:"0.06em" }}>
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
                      width:"100%", textAlign:"left", display:"flex", alignItems:"center", gap:9,
                      padding:"7px 14px 7px 24px",
                      background: isActive ? "#f0f9ff" : "transparent",
                      color: isActive ? "#0ea5e9" : "#475569",
                      fontWeight: isActive ? 600 : 400,
                      fontSize:16, border:"none", cursor:"pointer",
                      borderLeft: isActive ? "3px solid #0ea5e9" : "3px solid transparent",
                      transition:"background 0.12s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <ItemIcon style={{ width:14, height:14, flexShrink:0, color: isActive ? "#0ea5e9" : "#94a3b8" }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>}

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Toolbar */}
        <div style={{ padding:"11px 20px", background:"#ffffff", borderBottom:"1px solid #e2e8f0",
          display:"flex", alignItems:"center", gap:12, flexShrink:0,
          backgroundImage:"linear-gradient(90deg, rgba(14,165,233,0.55) 0%, rgba(14,165,233,0.0) 70%)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span
              style={{
                fontSize:24,
                fontWeight:700,
                color:"#0f172a",
                padding:"2px 0",
              }}
            >
              {activeGroup && activeItem
                ? <>{activeGroup.label}<span style={{ fontWeight: 700, color: "#0f172a", margin: "0 4px 0 4px" }}>:</span>{activeItem.label}</>
                : activeItem?.label}
            </span>
          </div>
          <div style={{ flex:1 }} />
          <div style={{ position:"relative" }}>
            <Search style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
              width:14, height:14, color:"#94a3b8" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ paddingLeft:32, paddingRight:12, paddingTop:7, paddingBottom:7,
                border:"1px solid #e2e8f0", borderRadius:8, fontSize:16, color:"#0f172a",
                background:"#f8fafc", outline:"none", width:220 }}
            />
          </div>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
            background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:8,
            fontSize:16, color:"#475569", cursor:"pointer", fontWeight:500 }}>
            <Download style={{ width:14, height:14 }} /> Export
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px",
            background:"#0ea5e9", border:"none", borderRadius:8,
            fontSize:16, color:"#ffffff", cursor:"pointer", fontWeight:600 }}>
            <Plus style={{ width:14, height:14 }} /> Add
          </button>
        </div>

        {/* Spreadsheet */}
        <SpreadsheetTable columns={view.columns} rows={view.rows} search={search} />

        {/* Status bar */}
        <div style={{ padding:"6px 16px", background:"#ffffff", borderTop:"1px solid #e2e8f0",
          fontSize:16, color:"#94a3b8", flexShrink:0, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontWeight:500, color:"#64748b" }}>{view.rows.length} records</span>
          <span>·</span>
          <span>{activeItem?.label}</span>
          <span style={{ marginLeft:8, color:"#e2e8f0" }}>|</span>
          <span style={{ color:"#cbd5e1", fontStyle:"italic" }}>
            Future: connects to live Vetara, EPR, Inventory, Finance & Procurement systems
          </span>
        </div>
      </div>

    </div>
  );
}
