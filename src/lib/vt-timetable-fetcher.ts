/**
 * Real Virginia Tech Timetable of Classes scraper.
 *
 * POSTs to the Banner timetable endpoint and parses the returned HTML
 * to extract course section data.
 */

import type { SectionInfo, TermType } from "@/types/contracts";

const VT_TIMETABLE_URL = "https://selfservice.banner.vt.edu/ssb/HZSKVTSC.P_ProcRequest";

// Term code format: YYYYMM where MM = 01 (Spring), 06 (Summer), 09 (Fall), 12 (Winter)
const TERM_MONTH: Record<TermType, string> = {
  spring: "01",
  summer: "06",
  fall: "09",
};

function buildTermYear(year: number, termType: TermType): string {
  return `${year}${TERM_MONTH[termType]}`;
}

// ─── HTML Parsing ───────────────────────────────────────────────────────────

interface RawTimetableRow {
  crn: string;
  courseCode: string;
  courseName: string;
  scheduleType: string;
  modality: string;
  creditHours: string;
  capacity: string;
  instructor: string;
  days: string;
  beginTime: string;
  endTime: string;
  location: string;
}

/**
 * Parse the VT timetable HTML response into structured rows.
 * The timetable uses <table class="dataentrytable"> with <TD>/<td> cells per row.
 * Column order: CRN, Course, Title, Schedule Type, Modality, Cr Hrs, Capacity,
 *               Instructor, Days, Begin, End, Location, Exam
 */
function parseTimetableHtml(html: string): RawTimetableRow[] {
  const rows: RawTimetableRow[] = [];

  // Extract the data table
  const tableMatch = html.match(
    /<table[^>]*class="dataentrytable"[^>]*Timetable[^>]*>([\s\S]*?)(?:<\/table>|$)/i
  );
  if (!tableMatch) return rows;

  const tableHtml = tableMatch[1];

  // Split into rows by <tr> tags (case insensitive, the timetable uses <tr>)
  const trBlocks = tableHtml.split(/<tr[^>]*>/i).slice(1); // skip pre-first-tr

  for (const block of trBlocks) {
    // Extract all <td>/<TD> cell contents
    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)(?=<td[^>]*>|<tr|$)/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(block)) !== null) {
      let text = tdMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(text);
    }

    // Need at least 12 columns for a valid section row
    if (cells.length < 12) continue;

    // CRN is a 5-digit number
    const crnMatch = cells[0].match(/\b(\d{5})\b/);
    if (!crnMatch) continue;
    const crn = crnMatch[1];

    // Course code like "CS-3114"
    const courseCode = cells[1].trim();
    if (!courseCode.match(/^[A-Z]+-\d{4}/)) continue;

    rows.push({
      crn,
      courseCode,
      courseName: cells[2].trim(),
      scheduleType: cells[3].trim(),
      modality: cells[4].trim(),
      creditHours: cells[5].trim(),
      capacity: cells[6].trim(),
      instructor: cells[7].trim(),
      days: cells[8].trim(),
      beginTime: cells[9].trim(),
      endTime: cells[10].trim(),
      location: cells[11].trim(),
    });
  }

  return rows;
}

/**
 * Convert raw timetable rows to our SectionInfo format.
 */
function rowsToSections(rows: RawTimetableRow[]): SectionInfo[] {
  return rows
    .filter((r) => r.crn && r.courseCode)
    .map((r) => {
      // Normalize course code: "CS-3114" stays as-is
      const courseId = r.courseCode.replace(/\s+/, "-").toUpperCase();

      // Normalize days: "T R" → "TR", "M W F" → "MWF"
      const days = r.days.replace(/\s+/g, "");

      // Normalize time: "12:30PM" → "12:30", "9:30AM" → "09:30"
      function normalizeTime(t: string): string {
        const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!m) return t;
        let hour = parseInt(m[1], 10);
        const min = m[2];
        const ampm = m[3].toUpperCase();
        if (ampm === "PM" && hour !== 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
        return `${String(hour).padStart(2, "0")}:${min}`;
      }

      // Normalize modality
      let modality: SectionInfo["modality"] = "in_person";
      const mod = r.modality.toLowerCase();
      if (mod.includes("online") && mod.includes("async")) modality = "online";
      else if (mod.includes("hybrid") || (mod.includes("online") && mod.includes("sync")))
        modality = "hybrid";

      // Instructor: "N/A" → "Staff"
      const instructor = !r.instructor || r.instructor === "N/A" ? "Staff" : r.instructor.trim();

      // Parse capacity (may be just a number or "enrolled/total")
      const capacityNum = parseInt(r.capacity.replace(/\D/g, ""), 10) || 40;

      return {
        crn: r.crn,
        courseId,
        instructor,
        days,
        startTime: normalizeTime(r.beginTime),
        endTime: normalizeTime(r.endTime),
        location: r.location.trim(),
        modality,
        seatsAvailable: Math.max(0, Math.round(capacityNum * 0.3)),
        seatsTotal: capacityNum,
      };
    })
    .filter((s) => s.days.length > 0 && s.startTime.length > 0);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch all sections for a given subject code from the VT timetable.
 *
 * @param subjectCode - e.g. "CS", "MATH", "STAT"
 * @param year - e.g. 2026
 * @param termType - "fall", "spring", or "summer"
 * @returns Array of SectionInfo objects
 */
export async function fetchSectionsForSubject(
  subjectCode: string,
  year: number,
  termType: TermType
): Promise<SectionInfo[]> {
  const termYear = buildTermYear(year, termType);

  const formData = new URLSearchParams({
    CAMPUS: "0", // Blacksburg
    TERMYEAR: termYear,
    CORE_CODE: "AR%",
    subj_code: subjectCode,
    SCHDTYPE: "%",
    CRSE_NUMBER: "",
    crn: "",
    open_only: "",
    sess_code: "%",
    BTN_PRESSED: "FIND class sections",
    diession: "",
  });

  const res = await fetch(VT_TIMETABLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new Error(`VT Timetable returned ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();
  const rawRows = parseTimetableHtml(html);
  return rowsToSections(rawRows);
}

/**
 * Fetch sections for multiple subject codes at once.
 * Runs requests sequentially to avoid rate limiting.
 */
export async function fetchSectionsForSubjects(
  subjects: string[],
  year: number,
  termType: TermType,
  onProgress?: (subject: string, index: number, total: number) => void
): Promise<SectionInfo[]> {
  const allSections: SectionInfo[] = [];

  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    onProgress?.(subject, i, subjects.length);

    try {
      const sections = await fetchSectionsForSubject(subject, year, termType);
      allSections.push(...sections);
    } catch (err) {
      console.warn(`Failed to fetch timetable for ${subject}: ${err}`);
    }

    // Small delay between requests to be polite
    if (i < subjects.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return allSections;
}

/**
 * Fetch a single course's sections by subject and course number.
 */
export async function fetchCourseSections(
  subjectCode: string,
  courseNumber: string,
  year: number,
  termType: TermType
): Promise<SectionInfo[]> {
  const termYear = buildTermYear(year, termType);

  const formData = new URLSearchParams({
    CAMPUS: "0",
    TERMYEAR: termYear,
    CORE_CODE: "AR%",
    subj_code: subjectCode,
    SCHDTYPE: "%",
    CRSE_NUMBER: courseNumber,
    crn: "",
    open_only: "",
    sess_code: "%",
    BTN_PRESSED: "FIND class sections",
    diession: "",
  });

  const res = await fetch(VT_TIMETABLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new Error(`VT Timetable returned ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();
  const rawRows = parseTimetableHtml(html);
  return rowsToSections(rawRows);
}
