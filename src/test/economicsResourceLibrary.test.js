import { describe, expect, it } from 'vitest';

import {
  economicsOutcomes,
  economicsResourceLibrary,
  getEconomicsAreaResources,
  getEconomicsResourceStats,
} from '../data/economicsResourceLibrary';

const allResources = economicsResourceLibrary.focusAreas.flatMap((area) => getEconomicsAreaResources(area));
const requiredTypes = ['multipleChoice', 'shortAnswer', 'extendedResponse', 'topicDrill', 'stimulusSet'];

describe('economicsResourceLibrary', () => {
  it('tracks the full current syllabus coverage shape', () => {
    const stats = getEconomicsResourceStats();

    expect(stats.focusAreas).toBe(9);
    expect(stats.contentGroups).toBe(45);
    expect(stats.outcomes).toBe(20);
    expect(stats.questions).toBe(99);
    expect(stats.examPacks).toBe(2);
    expect(stats.examItems).toBe(56);
    expect(stats.byType).toEqual({
      extendedResponse: 9,
      multipleChoice: 18,
      shortAnswer: 18,
      stimulusSet: 9,
      topicDrill: 45,
    });
  });

  it('gives every focus area a complete resource mix', () => {
    economicsResourceLibrary.focusAreas.forEach((area) => {
      const types = getEconomicsAreaResources(area).map((resource) => resource.type);

      requiredTypes.forEach((type) => {
        expect(types, `${area.title} is missing ${type}`).toContain(type);
      });
    });
  });

  it('creates one topic drill for every official content group', () => {
    economicsResourceLibrary.focusAreas.forEach((area) => {
      expect(area.topicDrills.map((drill) => drill.title)).toEqual(area.contentGroups);
    });
  });

  it('only maps resources to known economics outcomes', () => {
    const validOutcomes = new Set(Object.keys(economicsOutcomes));

    allResources.forEach((resource) => {
      expect(resource.outcomes.length, `${resource.id} has no outcomes`).toBeGreaterThan(0);
      resource.outcomes.forEach((outcome) => {
        expect(validOutcomes.has(outcome), `${resource.id} uses unknown outcome ${outcome}`).toBe(true);
      });
    });
  });

  it('keeps the assessment blueprint internally consistent', () => {
    const { externalExam, schoolAssessmentComponents } = economicsResourceLibrary.assessmentBlueprint;
    const examSectionMarks = externalExam.sections.reduce((sum, section) => sum + section.marks, 0);
    const schoolWeighting = schoolAssessmentComponents.reduce((sum, component) => sum + component.weighting, 0);

    expect(examSectionMarks).toBe(externalExam.totalMarks);
    expect(schoolWeighting).toBe(100);
  });

  it('builds stimulus sets with data, marking guides and sample interpretation', () => {
    const stimulusSets = allResources.filter((resource) => resource.type === 'stimulusSet');

    expect(stimulusSets).toHaveLength(economicsResourceLibrary.focusAreas.length);
    stimulusSets.forEach((resource) => {
      const questionMarks = resource.questions.reduce((sum, question) => sum + question.marks, 0);

      expect(resource.data.length, `${resource.id} needs enough data`).toBeGreaterThanOrEqual(5);
      expect(resource.questions).toHaveLength(3);
      expect(resource.marks).toBe(questionMarks);
      expect(resource.sourceNote).toContain('Original Caplet practice stimulus');
      expect(resource.sampleResponse.length, `${resource.id} needs a real sample response`).toBeGreaterThan(120);
      resource.questions.forEach((question) => {
        expect(question.markingGuide.length, `${resource.id} has a thin marking guide`).toBeGreaterThanOrEqual(2);
      });
    });
  });

  it('includes transition-aware HSC exam practice packs with complete section structures', () => {
    expect(economicsResourceLibrary.examPracticePacks).toHaveLength(2);

    economicsResourceLibrary.examPracticePacks.forEach((pack) => {
      const sectionMarks = pack.sections.reduce((sum, section) => sum + section.marks, 0);
      const sectionI = pack.sections.find((section) => section.label === 'Section I');
      const sectionII = pack.sections.find((section) => section.label === 'Section II');

      expect(sectionMarks, `${pack.id} section marks should total the paper`).toBe(pack.totalMarks);
      expect(pack.sourceLinks.length, `${pack.id} should link official NESA anchors`).toBeGreaterThanOrEqual(4);
      expect(pack.markerBrief.length, `${pack.id} needs marker guidance`).toBeGreaterThanOrEqual(3);
      expect(sectionI.itemCount).toBe(20);
      expect(sectionI.sampleItems).toHaveLength(sectionI.itemCount);
      expect(sectionII.items.reduce((sum, item) => sum + item.marks, 0)).toBe(40);

      sectionII.items.forEach((item) => {
        expect(item.parts.reduce((sum, part) => sum + part.marks, 0)).toBe(item.marks);
      });
    });
  });

  it('maps exam-pack items to known outcomes where item-level outcomes are present', () => {
    const validOutcomes = new Set(Object.keys(economicsOutcomes));
    const examItems = economicsResourceLibrary.examPracticePacks.flatMap((pack) =>
      pack.sections.flatMap((section) => [...(section.sampleItems || []), ...(section.items || [])])
    );

    examItems.forEach((item) => {
      expect(item.outcomes.length, `${item.title || item.stem} has no outcomes`).toBeGreaterThan(0);
      item.outcomes.forEach((outcome) => {
        expect(validOutcomes.has(outcome), `${item.title || item.stem} uses unknown outcome ${outcome}`).toBe(true);
      });
    });
  });
});
