function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function pickRelevantNotes(db, subjectId, topic) {
  return db.notes.filter((note) => {
    const subjectMatch = subjectId ? note.subjectId === subjectId : true;
    const topicMatch = topic
      ? note.topic.toLowerCase().includes(topic.toLowerCase()) ||
        note.title.toLowerCase().includes(topic.toLowerCase())
      : true;
    return subjectMatch && topicMatch;
  });
}

function firstSentences(text, count) {
  return text
    .split(".")
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, count)
    .map((sentence) => `${sentence}.`);
}

function buildSummary(db, subjectId, topic) {
  const subject = db.subjects.find((entry) => entry.id === subjectId);
  const notes = pickRelevantNotes(db, subjectId, topic);

  if (!subject || notes.length === 0) {
    return {
      headline: "No matching engineering notes were found yet.",
      bullets: [
        "Pick another topic or ask the teacher to upload notes.",
        "You can still start a manual study timer to track work."
      ],
      flashcards: []
    };
  }

  const allBullets = dedupe(notes.flatMap((note) => firstSentences(note.content, 2)));

  return {
    headline: `${subject.name}${topic ? ` · ${topic}` : ""} in one focused revision block`,
    bullets: allBullets.slice(0, 4),
    flashcards: notes.slice(0, 3).map((note) => ({
      front: `${note.topic}: what should you remember first?`,
      back: firstSentences(note.content, 1)[0] || note.content.slice(0, 120)
    })),
    nextStep: `Revise ${notes[0].topic} first, then solve one short problem or one quiz immediately after reading.`
  };
}

function buildExplanation(db, subjectId, topic, question) {
  const subject = db.subjects.find((entry) => entry.id === subjectId);
  const notes = pickRelevantNotes(db, subjectId, topic);

  if (!subject || notes.length === 0) {
    return {
      title: "AI explainer needs more source material",
      explanation:
        "There is not enough note content for that subject/topic yet. Upload notes first or switch to a seeded topic.",
      examples: [],
      practice: "Try selecting a seeded engineering topic like Dynamic Programming or CPU Scheduling Algorithms."
    };
  }

  const note = notes[0];

  return {
    title: `${note.topic} explained simply`,
    explanation: firstSentences(note.content, 3).join(" "),
    examples: [
      `In ${subject.name}, think of ${note.topic} as a reusable exam pattern rather than a one-off definition.`,
      question
        ? `For your question "${question}", first identify the core keyword, then connect it to the note summary and one use case.`
        : "A strong explanation should connect the concept to a practical engineering use case and one exam shortcut."
    ],
    practice: `Explain ${note.topic} aloud in 60 seconds, then write two formulas or rules from memory.`
  };
}

function cleanSentence(sentence) {
  return sentence.replace(/\s+/g, " ").trim();
}

function splitIntoSentences(text) {
  return text
    .split(/[.!?]\s+/)
    .map(cleanSentence)
    .filter((sentence) => sentence.length > 35);
}

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function shortenOption(text) {
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function pickAttachedNotes(attachedNotes, subject, topic) {
  const topicNeedle = String(topic || "").toLowerCase();
  const subjectNeedle = String(subject?.name || "").toLowerCase();
  const blockedQuizFileTypes = new Set(["PY", "C", "SQL"]);

  return attachedNotes.filter((note) => {
    const haystack = `${note.title || ""} ${note.subject || ""} ${note.category || ""} ${note.sourcePath || ""} ${note.contentText || ""}`.toLowerCase();
    const subjectMatch = subjectNeedle ? haystack.includes(subjectNeedle) : true;
    const topicMatch = topicNeedle ? haystack.includes(topicNeedle) : true;
    return subjectMatch && topicMatch && note.contentText && !blockedQuizFileTypes.has(note.fileType);
  });
}

function buildGeneratedQuizFromNotes(subject, topic, noteEntries) {
  const sentences = dedupe(
    noteEntries.flatMap((entry) => splitIntoSentences(entry.content || entry.contentText || ""))
  );

  if (sentences.length < 4) {
    return null;
  }

  const chosen = sentences.slice(0, Math.min(5, sentences.length));
  const questions = chosen.map((sentence, index) => {
    const distractors = shuffle(sentences.filter((entry) => entry !== sentence)).slice(0, 3);
    const options = shuffle([sentence, ...distractors]).map(shortenOption);

    return {
      id: `ai_q_${index + 1}`,
      prompt: `Which statement best matches the notes for ${topic || subject.name}?`,
      options,
      answerIndex: options.indexOf(shortenOption(sentence)),
      explanation: sentence
    };
  });

  return {
    generatedByAI: true,
    subjectId: subject.id,
    topic: topic || subject.topics[0] || subject.name,
    title: `AI Generated Quiz · ${topic || subject.name}`,
    questions
  };
}

function buildMetadataQuiz(subject, db, topic) {
  const otherSubjects = db.subjects.filter((entry) => entry.id !== subject.id);
  const distractorTopics = dedupe(otherSubjects.flatMap((entry) => entry.topics)).slice(0, 6);
  const branchOptions = dedupe([subject.branch, ...otherSubjects.map((entry) => entry.branch)]).slice(0, 4);
  const hourOptions = dedupe([
    subject.recommendedHours,
    Math.max(1, subject.recommendedHours - 1),
    subject.recommendedHours + 1,
    subject.recommendedHours + 2
  ]);

  const questions = [
    {
      id: "ai_meta_1",
      prompt: `Which topic belongs to ${subject.name}?`,
      options: shuffle([subject.topics[0], ...distractorTopics.slice(0, 3)]),
      explanation: `${subject.topics[0]} is part of ${subject.name}.`
    },
    {
      id: "ai_meta_2",
      prompt: `What weekly study recommendation is set for ${subject.name} in SkillHub?`,
      options: shuffle(hourOptions.map((value) => `${value} hours`)),
      explanation: `${subject.name} is currently configured for ${subject.recommendedHours} recommended study hours per week.`
    },
    {
      id: "ai_meta_3",
      prompt: `Which branch/category is ${subject.name} mapped to?`,
      options: shuffle(branchOptions),
      explanation: `${subject.name} is mapped to ${subject.branch}.`
    }
  ].map((question) => ({
    ...question,
    answerIndex:
      question.id === "ai_meta_1"
        ? question.options.indexOf(subject.topics[0])
        : question.id === "ai_meta_2"
          ? question.options.indexOf(`${subject.recommendedHours} hours`)
          : question.options.indexOf(subject.branch)
  }));

  return {
    generatedByAI: true,
    subjectId: subject.id,
    topic: topic || subject.topics[0] || subject.name,
    title: `AI Generated Quiz · ${topic || subject.name}`,
    questions
  };
}

function buildAdaptiveQuiz(db, subjectId, topic, attachedNotes = []) {
  const subject = db.subjects.find((entry) => entry.id === subjectId);
  const candidates = db.quizzes.filter((quiz) => {
    const subjectMatch = subjectId ? quiz.subjectId === subjectId : true;
    const topicMatch = topic ? quiz.topic.toLowerCase().includes(topic.toLowerCase()) : true;
    return subjectMatch && topicMatch;
  });

  if (!subject || candidates.length === 0) {
    if (!subject) {
      return {
        generatedReason: "No matching subject was found.",
        quiz: null
      };
    }

    const localNotes = pickRelevantNotes(db, subjectId, topic);
    const relevantAttachedNotes = pickAttachedNotes(attachedNotes, subject, topic);
    const generatedQuiz =
      buildGeneratedQuizFromNotes(subject, topic, [...localNotes, ...relevantAttachedNotes]) ||
      buildMetadataQuiz(subject, db, topic);

    return {
      generatedReason:
        localNotes.length || relevantAttachedNotes.length
          ? `Generated from your available ${subject.name} notes and study resources.`
          : `Generated from ${subject.name} topics and study plan metadata because no stored quiz was available.`,
      quiz: generatedQuiz
    };
  }

  const selectedQuiz = candidates[0];

  return {
    generatedReason: `Curated from your existing ${subject.name} question bank for faster self-checking.`,
    quiz: {
      id: selectedQuiz.id,
      subjectId: selectedQuiz.subjectId,
      topic: selectedQuiz.topic,
      title: `AI Practice · ${selectedQuiz.title}`,
      questions: selectedQuiz.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: question.options
      }))
    }
  };
}

module.exports = {
  buildSummary,
  buildExplanation,
  buildAdaptiveQuiz
};
