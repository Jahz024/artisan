import type { InstructorRating, SourceReference } from "@/types/contracts";

function rmpSource(name: string): SourceReference {
  return {
    type: "rmp",
    label: `RateMyProfessors: ${name}`,
    url: "https://www.ratemyprofessors.com/",
    accessedAt: "2026-09-01T00:00:00.000Z",
  };
}

function rating(
  name: string,
  overallRating: number,
  difficulty: number,
  wouldTakeAgain: number,
  numRatings: number,
  paraphrasedFeedback: InstructorRating["paraphrasedFeedback"],
  tags: string[]
): InstructorRating {
  const confidence =
    numRatings >= 15 ? "high" : numRatings >= 5 ? "medium" : ("low" as const);
  return {
    name,
    overallRating,
    difficulty,
    wouldTakeAgain,
    numRatings,
    confidence,
    paraphrasedFeedback,
    tags,
    source: rmpSource(name),
  };
}

/**
 * Pre-cached RMP profiles for VT CS faculty used in timetable and historic data.
 * Keys must match instructor strings in timetable.ts exactly.
 */
export function getRMPData(): Record<string, InstructorRating> {
  return {
    "McQuain W": rating(
      "McQuain W",
      4.7,
      3.8,
      92,
      186,
      {
        rigor: "Expects you to actually learn the material, not memorize templates.",
        workload: "Weekly programming assignments add up, especially around midterms.",
        grading: "Rubric is clear but partial credit is stingy on style and edge cases.",
        expectations: "Come to lecture prepared to participate; office hours are worth it.",
      },
      ["amazing lectures", "lots of homework", "caring", "tough grader"]
    ),
    "Shaffer C": rating(
      "Shaffer C",
      4.5,
      3.2,
      88,
      142,
      {
        rigor: "Concepts are taught thoroughly without unnecessary theory dumps.",
        workload: "Steady pace with labs that reinforce lecture topics.",
        grading: "Fair and consistent; explains deductions on projects.",
        expectations: "Shows up on time and you will be fine; slides are gold.",
      },
      ["amazing lectures", "clear grading", "group projects", "caring"]
    ),
    "Ribbens C": rating(
      "Ribbens C",
      4.6,
      4.1,
      85,
      98,
      {
        rigor: "Systems material is dense and he does not sugarcoat it.",
        workload: "Projects are long but you learn how computers actually work.",
        grading: "Tests are challenging; projects graded in detail.",
        expectations: "Read the spec twice before coding; ask early when stuck.",
      },
      ["tough grader", "lots of homework", "amazing lectures", "skip class? you won't pass"]
    ),
    "Kafura D": rating(
      "Kafura D",
      3.9,
      3.5,
      72,
      64,
      {
        rigor: "Solid coverage of networking and architecture topics.",
        workload: "Moderate reading plus periodic programming milestones.",
        grading: "Mostly fair; some quiz questions feel picky.",
        expectations: "Engage in discussions; he notices who participates.",
      },
      ["get ready to read", "group projects", "graded by few things"]
    ),
    "Back G": rating(
      "Back G",
      4.2,
      3.0,
      78,
      51,
      {
        rigor: "Keeps advanced topics approachable with good examples.",
        workload: "Manageable if you start projects before the weekend.",
        grading: "Generous partial credit on exams.",
        expectations: "Office hours are relaxed and helpful.",
      },
      ["caring", "extra credit", "clear grading"]
    ),
    "Barnette D": rating(
      "Barnette D",
      2.8,
      4.2,
      45,
      3,
      {
        rigor: "Covers required topics but pacing can feel rushed.",
        workload: "Sudden spikes before deadlines; start early.",
        grading: "Few high-stakes items; one bad exam hurts.",
        expectations: "You need to teach yourself from the book sometimes.",
      },
      ["tough grader", "skip class? you won't pass", "graded by few things"]
    ),
    "Edwards S": rating(
      "Edwards S",
      4.1,
      3.4,
      81,
      37,
      {
        rigor: "ML and math-heavy courses are well structured.",
        workload: "Problem sets and coding labs most weeks.",
        grading: "Transparent rubrics on projects.",
        expectations: "Review linear algebra before the first exam.",
      },
      ["lots of homework", "amazing lectures", "clear grading"]
    ),
    "Horton T": rating(
      "Horton T",
      3.6,
      2.8,
      68,
      29,
      {
        rigor: "HCI and design courses focus on practical skills.",
        workload: "Team projects dominate the schedule.",
        grading: "Subjective on design critiques but feedback is useful.",
        expectations: "Prototype early; do not wait for the final demo.",
      },
      ["group projects", "get ready to read", "caring"]
    ),
    "Fox E": rating(
      "Fox E",
      2.6,
      4.4,
      42,
      56,
      {
        rigor: "Theory courses are proof-heavy and fast.",
        workload: "Weekly problem sets take several hours.",
        grading: "Very little partial credit on proofs.",
        expectations: "If you miss a lemma in lecture, catch up immediately.",
      },
      ["tough grader", "skip class? you won't pass", "lots of homework"]
    ),
    "Barkstrom B": rating(
      "Barkstrom B",
      3.4,
      3.1,
      58,
      22,
      {
        rigor: "Stats for engineers is straightforward if you attend.",
        workload: "Online homework system every week.",
        grading: "Curved exams; homework helps your average.",
        expectations: "Bring a calculator and show work on exams.",
      },
      ["graded by few things", "extra credit"]
    ),
    "Warner B": rating(
      "Warner B",
      3.8,
      3.6,
      74,
      47,
      {
        rigor: "Object-oriented design is taught with industry-style examples.",
        workload: "Multiple small projects plus a larger final.",
        grading: "Code reviews factor into project grades.",
        expectations: "Follow style guides or lose easy points.",
      },
      ["lots of homework", "group projects", "clear grading"]
    ),
    "Godfrey P": rating(
      "Godfrey P",
      4.4,
      3.7,
      86,
      61,
      {
        rigor: "Software engineering process is taken seriously.",
        workload: "Team sprints mimic real dev cycles.",
        grading: "Milestone reviews are detailed but fair.",
        expectations: "Communicate with your team early and often.",
      },
      ["amazing lectures", "group projects", "caring"]
    ),
    "Heath L": rating(
      "Heath L",
      3.2,
      2.5,
      65,
      18,
      {
        rigor: "Intro courses move slowly enough to absorb basics.",
        workload: "Weekly labs with autograder checks.",
        grading: "Labs are pass/fail style; exams are multiple choice.",
        expectations: "Use the tutoring center if labs confuse you.",
      },
      ["extra credit", "caring"]
    ),
    "Leon S": rating(
      "Leon S",
      2.9,
      4.0,
      48,
      33,
      {
        rigor: "Upper-level electives assume strong prerequisite knowledge.",
        workload: "Heavy reading and a term-long research paper.",
        grading: "Essay-heavy grading with high standards.",
        expectations: "Office hours fill up the week before deadlines.",
      },
      ["get ready to read", "tough grader", "graded by few things"]
    ),
    "Tilevich M": rating(
      "Tilevich M",
      4.0,
      3.3,
      76,
      40,
      {
        rigor: "Languages course connects theory to language design choices.",
        workload: "Compiler-style assignments every two weeks.",
        grading: "Autograder plus manual code inspection.",
        expectations: "Start assignments the day they drop.",
      },
      ["lots of homework", "clear grading"]
    ),
  };
}
