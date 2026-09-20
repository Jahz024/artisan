import type { SectionInfo } from "@/types/contracts";

type SectionInput = Omit<SectionInfo, "crn"> & { crn?: string };

let crnSeq = 91000;

function section(s: SectionInput): SectionInfo {
  crnSeq += 1;
  return {
    crn: s.crn ?? String(crnSeq),
    courseId: s.courseId,
    instructor: s.instructor,
    days: s.days,
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    modality: s.modality,
    seatsAvailable: s.seatsAvailable ?? 12,
    seatsTotal: s.seatsTotal ?? 40,
  };
}

/**
 * Fall 2026 timetable snapshot for CS degree planning demo.
 * Sections for CS-3114 and CS-3214 share a peak-time slot (MWF 10:10–11:00)
 * so the Verifier can surface time conflicts when both are planned_next.
 */
export function getTimetableData(): SectionInfo[] {
  return [
    // CS 3114 — Data Structures
    section({ courseId: "CS-3114", instructor: "McQuain W", days: "MWF", startTime: "10:10", endTime: "11:00", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-3114", instructor: "Shaffer C", days: "TR", startTime: "09:05", endTime: "09:55", location: "Torgersen 1100", modality: "in_person" }),
    section({ courseId: "CS-3114", instructor: "Staff", days: "MWF", startTime: "14:30", endTime: "15:20", location: "McBryde 100", modality: "in_person" }),

    // CS 3214 — Computer Systems (top instructor section conflicts with CS-3114 McQuain)
    section({ courseId: "CS-3214", instructor: "Ribbens C", days: "MWF", startTime: "10:10", endTime: "11:00", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-3214", instructor: "Kafura D", days: "TR", startTime: "11:15", endTime: "12:05", location: "Data & Decision Sciences 150", modality: "in_person" }),
    section({ courseId: "CS-3214", instructor: "Back G", days: "MW", startTime: "15:30", endTime: "16:45", location: "Torgersen 1100", modality: "in_person" }),

    // CS 3304
    section({ courseId: "CS-3304", instructor: "Barnette D", days: "MWF", startTime: "11:15", endTime: "12:05", location: "Goodwin 135", modality: "in_person" }),
    section({ courseId: "CS-3304", instructor: "Edwards S", days: "TR", startTime: "14:30", endTime: "15:20", location: "McBryde 100", modality: "in_person" }),

    // CS 3744
    section({ courseId: "CS-3744", instructor: "Horton T", days: "MWF", startTime: "12:20", endTime: "13:10", location: "Torgersen 1100", modality: "in_person" }),
    section({ courseId: "CS-3744", instructor: "Staff", days: "TR", startTime: "17:00", endTime: "18:15", location: "Online", modality: "online" }),

    // CS 4104
    section({ courseId: "CS-4104", instructor: "Fox E", days: "MWF", startTime: "13:25", endTime: "14:15", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-4104", instructor: "Barkstrom B", days: "TR", startTime: "10:10", endTime: "11:00", location: "Data & Decision Sciences 150", modality: "in_person" }),

    // CS 4114
    section({ courseId: "CS-4114", instructor: "Fox E", days: "TR", startTime: "13:25", endTime: "14:15", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-4114", instructor: "Staff", days: "MW", startTime: "17:00", endTime: "18:15", location: "Online", modality: "hybrid" }),

    // CS 4254
    section({ courseId: "CS-4254", instructor: "Kafura D", days: "MWF", startTime: "09:05", endTime: "09:55", location: "Torgersen 1100", modality: "in_person" }),
    section({ courseId: "CS-4254", instructor: "Back G", days: "TR", startTime: "15:30", endTime: "16:45", location: "McBryde 100", modality: "in_person" }),

    // CS 4264
    section({ courseId: "CS-4264", instructor: "Ribbens C", days: "MW", startTime: "14:30", endTime: "15:20", location: "Data & Decision Sciences 150", modality: "in_person" }),
    section({ courseId: "CS-4264", instructor: "Shaffer C", days: "TR", startTime: "12:20", endTime: "13:10", location: "Goodwin 135", modality: "in_person" }),

    // CS 4284 — rarely offered in fall historically; still listed when offered
    section({ courseId: "CS-4284", instructor: "Kafura D", days: "MWF", startTime: "08:00", endTime: "08:50", location: "Torgersen 1100", modality: "in_person" }),
    section({ courseId: "CS-4284", instructor: "Staff", days: "TR", startTime: "08:00", endTime: "08:50", location: "Online", modality: "online" }),

    // CS 4604
    section({ courseId: "CS-4604", instructor: "McQuain W", days: "TR", startTime: "11:15", endTime: "12:05", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-4604", instructor: "Barnette D", days: "MWF", startTime: "15:30", endTime: "16:45", location: "Goodwin 135", modality: "in_person" }),

    // CS 4624
    section({ courseId: "CS-4624", instructor: "Edwards S", days: "MWF", startTime: "10:10", endTime: "11:00", location: "Data & Decision Sciences 150", modality: "in_person" }),
    section({ courseId: "CS-4624", instructor: "Horton T", days: "TR", startTime: "09:05", endTime: "09:55", location: "Torgersen 1100", modality: "in_person" }),

    // CS 4644
    section({ courseId: "CS-4644", instructor: "Barkstrom B", days: "MW", startTime: "12:20", endTime: "13:10", location: "Goodwin 135", modality: "in_person" }),
    section({ courseId: "CS-4644", instructor: "Staff", days: "TR", startTime: "14:30", endTime: "15:20", location: "Online", modality: "online" }),

    // CS 4654
    section({ courseId: "CS-4654", instructor: "Shaffer C", days: "MWF", startTime: "11:15", endTime: "12:05", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-4654", instructor: "Fox E", days: "TR", startTime: "15:30", endTime: "16:45", location: "Torgersen 1100", modality: "in_person" }),

    // CS 4784 — spring-only historic pattern; fall section for edge-case demo scheduling
    section({ courseId: "CS-4784", instructor: "Back G", days: "MWF", startTime: "13:25", endTime: "14:15", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-4784", instructor: "Ribbens C", days: "TR", startTime: "17:00", endTime: "18:15", location: "Data & Decision Sciences 150", modality: "in_person" }),

    // CS 2506 (sophomore bridge — still offered)
    section({ courseId: "CS-2506", instructor: "Barnette D", days: "MWF", startTime: "09:05", endTime: "09:55", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "CS-2506", instructor: "Staff", days: "TR", startTime: "13:25", endTime: "14:15", location: "Torgersen 1100", modality: "in_person" }),

    // STAT 4705
    section({ courseId: "STAT-4705", instructor: "Barkstrom B", days: "MWF", startTime: "08:00", endTime: "08:50", location: "Goodwin 135", modality: "in_person" }),
    section({ courseId: "STAT-4705", instructor: "Staff", days: "TR", startTime: "10:10", endTime: "11:00", location: "Online", modality: "online" }),

    // MATH 3214 (minor)
    section({ courseId: "MATH-3214", instructor: "Horton T", days: "MWF", startTime: "14:30", endTime: "15:20", location: "McBryde 100", modality: "in_person" }),
    section({ courseId: "MATH-3214", instructor: "Edwards S", days: "TR", startTime: "08:00", endTime: "08:50", location: "Data & Decision Sciences 150", modality: "in_person" }),

    // MATH 4225
    section({ courseId: "MATH-4225", instructor: "Fox E", days: "MW", startTime: "09:05", endTime: "09:55", location: "Goodwin 135", modality: "in_person" }),
    section({ courseId: "MATH-4225", instructor: "Staff", days: "TR", startTime: "11:15", endTime: "12:05", location: "Online", modality: "online" }),
  ];
}
