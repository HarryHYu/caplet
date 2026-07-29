import catalogue from '../../shared/nswSubjectCatalog.json';

export const NSW_CATALOGUE_SOURCE = catalogue.source;
export const NSW_STAGES = catalogue.stages;
export const NSW_SUBJECTS = catalogue.subjects;

export const stageForYear = (year) =>
  NSW_STAGES.find((stage) => stage.years.includes(Number(year))) || null;

export const subjectsForYear = (year) =>
  NSW_SUBJECTS.filter((subject) => subject.years.includes(Number(year)));

export const subjectById = (id) =>
  NSW_SUBJECTS.find((subject) => subject.id === id) || null;

export const canonicalSubjectId = (value) => {
  const candidate = String(value || '').trim().toLowerCase();
  const match = NSW_SUBJECTS.find((subject) =>
    subject.id === candidate
    || subject.label.toLowerCase() === candidate
    || subject.aliases.some((alias) => alias.toLowerCase() === candidate));
  return match?.id || null;
};

export const canonicalSubjectLabel = (value) => {
  const id = canonicalSubjectId(value);
  return subjectById(id)?.label || String(value || '');
};

export const canonicalSubjectLabelForYear = (value, year) => {
  const candidate = String(value || '').trim().toLowerCase();
  const match = subjectsForYear(year).find((subject) =>
    subject.id === candidate
    || subject.label.toLowerCase() === candidate
    || subject.aliases.some((alias) => alias.toLowerCase() === candidate));
  return match?.label || null;
};
