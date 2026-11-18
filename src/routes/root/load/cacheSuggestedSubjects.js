import { getSubjectSuggestions, saveCache } from "../../../db";

export default async function cacheSuggestedSubjects() {
  const { subjectsByYear } = await getSubjectSuggestions();
  saveCache("subjects", subjectsByYear);
  return subjectsByYear;
}
