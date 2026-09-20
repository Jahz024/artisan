/**
 * Hokie Pathfinder — Data Contracts
 * Structured JSON schemas for agent-to-agent handoffs.
 */

// ─── Common ──────────────────────────────────────────────────────────────────

export interface SourceReference {
  type: "checksheet" | "timetable" | "historic_timetable" | "rmp" | "catalog" | "pathways";
  url?: string;
  label: string;
  accessedAt: string; // ISO date
}

export type TermType = "fall" | "spring" | "summer";
export type OfferingClassification = "always" | "usually" | "rarely" | "never";
export type CourseStatus = "completed" | "in_progress" | "planned_next" | "planned_future";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface SemesterTerm {
  year: number;
  termType: TermType;
  label: string; // e.g. "Fall 2026"
}

// ─── Agent 1 → Agent 2: RequirementsPackage ─────────────────────────────────

export interface Prerequisite {
  courseId: string;
  minGrade?: string; // e.g. "C-"
  corequisite?: boolean;
}

export interface RequirementBlock {
  id: string;
  name: string; // e.g. "CS Core", "Pathways 5A", "Minor: Math"
  category: "major" | "minor" | "pathways" | "elective" | "free_elective";
  requiredCredits: number;
  coursesNeeded: number;
  eligibleCourses: string[]; // course IDs
  satisfiedBy: string[]; // already completed course IDs
  remaining: number;
  canDoubleCount?: string[]; // requirement block IDs this can share courses with
}

export interface CourseInfo {
  id: string; // e.g. "CS-2114"
  subject: string;
  number: string;
  title: string;
  credits: number;
  prerequisites: Prerequisite[];
  corequisites: string[];
  description?: string;
}

export interface SectionInfo {
  crn: string;
  courseId: string;
  instructor: string;
  days: string; // e.g. "MWF"
  startTime: string; // "HH:MM" 24h
  endTime: string;
  location: string;
  modality: "in_person" | "online" | "hybrid";
  seatsAvailable?: number;
  seatsTotal?: number;
}

export interface HistoricOffering {
  courseId: string;
  termType: TermType;
  classification: OfferingClassification;
  yearsOffered: number;
  yearsChecked: number;
  typicalTimes: { days: string; startTime: string; endTime: string }[];
  historicInstructors: { name: string; timesOffered: number }[];
  trendNotes?: string;
  source: SourceReference;
}

export interface CompletedCourse {
  courseId: string;
  grade: string;
  term: SemesterTerm;
  credits: number;
  satisfiesRequirement?: string; // requirement block ID
  creditType?: "standard" | "ap" | "ib" | "transfer";
}

export interface RequirementsPackage {
  studentId: string;
  major: string;
  minors: string[];
  catalogYear: string;
  completedCourses: CompletedCourse[];
  inProgressCourses: string[];
  requirementBlocks: RequirementBlock[];
  courseDetails: Record<string, CourseInfo>;
  prerequisiteGraph: Record<string, string[]>; // courseId → prereq courseIds
  currentTermSections: SectionInfo[];
  historicOfferings: Record<string, HistoricOffering[]>;
  currentTerm: SemesterTerm;
  sources: SourceReference[];
  /** LLM-generated analysis of the student's transcript and optimal paths */
  llmAnalysis?: {
    criticalPathCourses: string[];
    recommendedFirstSemester: string[];
    insights: string[];
  };
}

// ─── Agent 2 → Agent 3: ExperiencePackage ───────────────────────────────────

export interface InstructorRating {
  name: string;
  overallRating: number; // 1–5
  difficulty: number; // 1–5
  wouldTakeAgain: number; // 0–100 percent
  numRatings: number;
  confidence: ConfidenceLevel;
  paraphrasedFeedback: {
    rigor: string;
    workload: string;
    grading: string;
    expectations: string;
  };
  tags: string[];
  source: SourceReference;
}

export interface CourseRigorSummary {
  courseId: string;
  averageDifficulty: number;
  workloadDescription: string;
  gradingReputation: string;
  summary: string;
}

export interface ExperiencePackage {
  instructorRatings: Record<string, InstructorRating>; // keyed by instructor name
  courseRigorSummaries: Record<string, CourseRigorSummary>;
  sources: SourceReference[];
  /** LLM-generated professor insights and pairing recommendations */
  llmProfInsights?: {
    topRecommendations: Array<{ instructor: string; course: string; reason: string }>;
    avoidWarnings: Array<{ instructor: string; reason: string }>;
    difficultyPairings: string[];
  };
}

// ─── Agent 3 → Verifier → Agent 4: PlanGraph ────────────────────────────────

export interface AlternativeOption {
  courseId?: string;
  sectionCrn?: string;
  instructor?: string;
  score: number;
  reason: string;
}

export interface PlanNode {
  id: string;
  courseId: string;
  status: CourseStatus;
  semester: SemesterTerm;
  sectionCrn?: string; // only for planned_next
  instructor?: string;
  score: number;
  scoreBreakdown: {
    rating: number;
    rigorMatch: number;
    timeFit: number;
    graduationSpeed: number;
  };
  confidence: ConfidenceLevel;
  alternatives: AlternativeOption[];
  requirementBlockId: string;
  warnings: string[];
  sources: SourceReference[];
}

export interface PlanEdge {
  from: string; // node ID (prerequisite)
  to: string; // node ID (dependent)
  type: "prerequisite" | "corequisite";
}

export interface SemesterGroup {
  term: SemesterTerm;
  nodeIds: string[];
  totalCredits: number;
  warnings: string[];
}

export interface PlanGraph {
  id: string;
  studentId: string;
  nodes: PlanNode[];
  edges: PlanEdge[];
  semesters: SemesterGroup[];
  totalRemainingCredits: number;
  estimatedGraduation: SemesterTerm;
  generatedAt: string; // ISO date
  verifierPassed: boolean;
  verifierIssues: VerifierIssue[];
}

// ─── Verifier Types ──────────────────────────────────────────────────────────

export type VerifierIssueType =
  | "prerequisite_violation"
  | "corequisite_violation"
  | "time_conflict"
  | "credit_overload"
  | "credit_underload"
  | "requirement_unsatisfied"
  | "term_unavailable"
  | "rare_offering_warning";

export interface VerifierIssue {
  type: VerifierIssueType;
  severity: "error" | "warning";
  nodeIds: string[];
  message: string;
  suggestedFix?: string;
  responsibleAgent?: "agent1" | "agent2" | "agent3";
}

// ─── Agent 4 → Frontend: PresentationSpec ────────────────────────────────────

export type ArtDirection =
  | "constellation" // stars & space theme
  | "subway_map" // transit-inspired
  | "mountain_trail" // hiking/nature path
  | "circuit_board" // tech/digital
  | "watercolor_garden" // painterly botanical
  | "blueprint"; // architectural

export interface EmphasisItem {
  type: "bottleneck" | "heavy_semester" | "rare_offering" | "long_chain" | "recommendation";
  nodeIds: string[];
  title: string;
  description: string;
  priority: number; // 1 = highest
}

export interface NodeAnnotation {
  nodeId: string;
  text: string;
  tone: "info" | "warning" | "celebration" | "tip";
}

export interface SemesterAnnotation {
  term: SemesterTerm;
  text: string;
  tone: "info" | "warning" | "celebration" | "tip";
}

export interface PresentationSpec {
  suggestedArtDirection: ArtDirection;
  artDirectionReason: string;
  emphasisItems: EmphasisItem[];
  nodeAnnotations: NodeAnnotation[];
  semesterAnnotations: SemesterAnnotation[];
  heroMessage: string; // e.g. "5 semesters to your CS degree — let's make them count"
  colorAccent?: string; // hex suggestion based on theme
}

// ─── User Preferences ────────────────────────────────────────────────────────

export interface UserPreferences {
  targetGraduation?: SemesterTerm;
  creditLoadMin: number;
  creditLoadMax: number;
  allowSummer: boolean;
  timePreferences: {
    preferEvening: boolean;
    noClassesBefore?: string; // "HH:MM"
    noFridayClasses: boolean;
    preferredDays?: string[];
  };
  electiveInterests: string[];
  electiveTags: string[];
  priorityWeights: {
    professorRating: number; // 0–10
    rigorPreference: number; // 0–10, low = easier, high = harder
    timePreferenceFit: number; // 0–10
    graduatingSooner: number; // 0–10
  };
  /** termKey (e.g. spring-2027) → target credits for that semester */
  semesterCreditOverrides?: Record<string, number>;
}

// ─── Agent Pipeline Events (for streaming) ───────────────────────────────────

export type AgentId = "agent1" | "agent2" | "agent3" | "agent4" | "verifier";

export interface AgentEvent {
  agentId: AgentId;
  timestamp: string;
  type: "started" | "progress" | "handoff" | "revision" | "completed" | "error";
  message: string;
  data?: unknown;
  progress?: number; // 0–100
}

export interface PipelineResult {
  planGraph: PlanGraph;
  presentationSpec: PresentationSpec;
  events: AgentEvent[];
  totalDurationMs: number;
}
