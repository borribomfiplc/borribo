import React from "react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Building2, Calendar, BarChart3, Settings,
  Fingerprint, Send, Target, Package, WalletCards
} from "lucide-react";

export const navSections = [
  {
    label: "ផ្ទាំងគ្រប់គ្រង",
    icon: LayoutDashboard,
    single: true,
    key: "dashboard",
  },
  {
    label: "បុគ្គលិក",
    icon: Users,
    key: "employees",
    items: ["បញ្ជីបុគ្គលិក", "បន្ថែមបុគ្គលិក"],
  },
  {
    label: "វត្តមាន",
    icon: Clock,
    key: "attendance",
    items: ["វត្តមានប្រចាំថ្ងៃ", "ប្រវត្តិវត្តមាន", "កែតម្រូវវត្តមាន"],
  },
  {
    label: "ច្បាប់ឈប់សម្រាក",
    icon: CalendarDays,
    key: "leave",
    items: ["សំណើសុំច្បាប់", "អនុម័តច្បាប់", "សមតុល្យច្បាប់"],
  },
  {
    label: "អង្គភាព",
    icon: Building2,
    key: "org",
    items: ["រចនាសម្ព័ន្ធអង្គភាព", "សាខា", "នាយកដ្ឋាន", "តួនាទីការងារ"],
  },
  { label: "ប្រតិទិន", icon: Calendar, single: true, key: "calendar" },
  {
    label: "ប្រតិបត្តិការ MFI",
    icon: Target,
    key: "mfiOperations",
    items: ["KPI Dashboard", "គ្រប់គ្រងទ្រព្យសម្បត្តិ", "កម្ចីបុគ្គលិក", "ប្រាក់ខែ"],
  },
  {
    label: "របាយការណ៍",
    icon: BarChart3,
    key: "reports",
    items: ["របាយការណ៍វត្តមាន", "របាយការណ៍ច្បាប់", "របាយការណ៍ប្រចាំខែ"],
  },
  {
    label: "ការកំណត់",
    icon: Settings,
    key: "settings",
    items: ["ក្រុមហ៊ុន", "អ្នកប្រើប្រាស់ និងតួនាទី", "ម៉ោងធ្វើការ", "ថ្ងៃឈប់សម្រាក", "GPS និង QR", "ប្រព័ន្ធ"],
  },
  {
    label: "ការភ្ជាប់ប្រព័ន្ធ",
    icon: Fingerprint,
    key: "integrations",
    items: ["Fingerprint ម៉ាស៊ីន", "Telegram Bot"],
  },
];
