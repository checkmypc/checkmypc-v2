import type { Technician } from "./types.ts";
import { SAMPLE_REPORT, USED_LISTINGS, type InspectionReport } from "./used.ts";

function isoDaysAgo(n: number, hour = 11) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 20, 0, 0);
  return d.toISOString();
}

export const SEED_TEAM: Technician[] = [
  {
    id: "tech-youssef",
    name: "Youssef B.",
    city: "Casablanca",
    phone: "0661001100",
    skills: ["inspection", "assembly"],
    active: true,
  },
  {
    id: "tech-amina",
    name: "Amina K.",
    city: "Rabat",
    phone: "0661002200",
    skills: ["inspection", "cleaning"],
    active: true,
  },
  {
    id: "tech-hamza",
    name: "Hamza T.",
    city: "Agadir",
    phone: "0661003300",
    skills: ["inspection", "assembly", "cleaning"],
    active: true,
  },
];

export const SEED_REPORTS: InspectionReport[] = [
  SAMPLE_REPORT,
  {
    id: "rep-office-rabat",
    publicId: "rep-office-rabat",
    listingId: "used-rabat-office",
    title: "Office PC · i5-12400F",
    date: isoDaysAgo(3, 16).slice(0, 10),
    city: "Rabat",
    technician: "Amina K.",
    verdict: "BUY",
    risk: "low",
    asking: 2800,
    fairValue: 3000,
    suggestOffer: 2800,
    hardware: [
      ["CPU", "Intel Core i5-12400F", "Matches listing"],
      ["GPU", "UHD 730 (no dGPU)", "Expected"],
      ["RAM", "2×8 GB DDR4-3200", "Stable"],
      ["Storage", "512 GB NVMe", "SMART 98%"],
      ["PSU", "Bronze 550W branded", "OK"],
    ],
    temps: { cpuIdle: 34, cpuLoad: 64, gpuIdle: 0, gpuLoad: 0 },
    issues: ["Missing Wi-Fi antenna screw (cosmetic)"],
    published: true,
  },
  {
    id: "rep-fake-3070",
    publicId: "rep-fake-3070",
    listingId: "used-agadir-fake",
    title: "Fake RTX 3070 tower",
    date: isoDaysAgo(12, 11).slice(0, 10),
    city: "Agadir",
    technician: "Hamza T.",
    verdict: "DONT",
    risk: "high",
    asking: 4500,
    fairValue: 0,
    suggestOffer: 0,
    hardware: [
      ["CPU", "Listed as i7 (unverified)", "Could not confirm"],
      ["GPU", "GTX 1660 Super with 3070 shroud", "GPU-Z mismatch — fake"],
      ["RAM", "16 GB mixed sticks", "One slot unstable"],
      ["Storage", "500 GB used HDD", "SMART 71%"],
      ["Motherboard", "Unknown H81", "Dust, no shield"],
      ["PSU", "Unbranded 400W", "Unsafe — replace"],
    ],
    temps: { cpuIdle: 48, cpuLoad: 88, gpuIdle: 52, gpuLoad: 84 },
    issues: [
      "GPU-Z read as a 1660 Super with a 3070 shroud. Do not buy.",
      "PSU is unbranded and underspec",
      "Seller photos hid the card's rear sticker",
    ],
    published: true,
  },
];

export function seedListings() {
  return USED_LISTINGS.map((l) => ({ ...l }));
}
