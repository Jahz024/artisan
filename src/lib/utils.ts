export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCourseCode(courseId: string): string {
  const [subject, number] = courseId.split("-");
  if (!subject || !number) return courseId;
  return `${subject} ${number}`;
}

export function termKey(term: { year: number; termType: string }): string {
  return `${term.termType}-${term.year}`;
}
