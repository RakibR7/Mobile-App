// data/SubjectsData.js
export const subjectsData = {
  biology: {
    name: "Biology",
    model: "ft:gpt-3.5-turbo-0125:personal:csp-biology-finetuning-data10-20000:BJN7IqeS",
    subtopics: [
      { id: 'cells', name: 'Cell Structure & Function', icon: '🔬' },
      { id: 'genetics', name: 'Genetics & Heredity', icon: '🧬' },
      { id: 'evolution', name: 'Evolution & Natural Selection', icon: '🦖' },
      { id: 'ecosystems', name: 'Ecosystems & Environment', icon: '🌳' },
      { id: 'anatomy', name: 'Human Anatomy', icon: '🫀' }
    ]
  },
  python: {
    name: "Python",
    model: "ft:gpt-3.5-turbo-0125:personal:dr1-csv6-shortened-3381:B0DlvD7p",
    subtopics: [
      { id: 'variables', name: 'Variables & Data Types', icon: '🔤' },
      { id: 'functions', name: 'Functions & Methods', icon: '⚙️' },
      { id: 'loops', name: 'Loops & Control Flow', icon: '🔄' },
      { id: 'oop', name: 'Object-Oriented Programming', icon: '📦' },
      { id: 'libraries', name: 'Libraries & Modules', icon: '📚' }
    ]
  }
};

// Find a subtopic by its ID within a subject
export const findSubtopic = (subjectId, subtopicId) => {
  const subject = subjectsData[subjectId];
  if (!subject) return null;

  return subject.subtopics.find(st => st.id === subtopicId) || null;
};

// Get all subtopics for a subject
export const getSubtopics = (subjectId) => {
  return subjectsData[subjectId]?.subtopics || [];
};

// Get subject info
export const getSubject = (subjectId) => {
  return subjectsData[subjectId] || null;
};