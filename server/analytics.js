const { dateKey } = require("./seed");

function sumBy(items, getter) {
  return items.reduce((total, item) => total + getter(item), 0);
}

function getDatesForPastWeek() {
  return Array.from({ length: 7 }, (_, index) => dateKey(index - 6));
}

function computeStreak(datesWithStudy, includeToday) {
  let streak = 0;
  let cursor = includeToday ? 0 : -1;

  while (datesWithStudy.has(dateKey(cursor))) {
    streak += 1;
    cursor -= 1;
  }

  return streak;
}

function buildSubjectStats(db, userId) {
  const attempts = db.quizAttempts.filter((attempt) => attempt.userId === userId);
  const sessions = db.studySessions.filter(
    (session) => session.userId === userId && session.status === "completed"
  );

  return db.subjects.map((subject) => {
    const subjectSessions = sessions.filter((session) => session.subjectId === subject.id);
    const subjectAttempts = attempts.filter((attempt) => attempt.subjectId === subject.id);

    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      accent: subject.accent,
      topics: subject.topics,
      recommendedHours: subject.recommendedHours,
      minutes: sumBy(subjectSessions, (session) => session.durationMinutes || 0),
      averageScore: subjectAttempts.length
        ? Math.round(sumBy(subjectAttempts, (attempt) => attempt.score) / subjectAttempts.length)
        : null
    };
  });
}

function buildTomorrowRecommendation(subjectStats) {
  const lowScoreSubject = subjectStats
    .filter((subject) => subject.averageScore !== null)
    .sort((left, right) => left.averageScore - right.averageScore)[0];

  if (lowScoreSubject && lowScoreSubject.averageScore < 75) {
    return {
      subjectId: lowScoreSubject.id,
      subjectName: lowScoreSubject.name,
      reason: `Quiz confidence is at ${lowScoreSubject.averageScore}%, so this needs a recovery block tomorrow.`,
      plan: `Revise ${lowScoreSubject.topics[0]} and ${lowScoreSubject.topics[1] || lowScoreSubject.topics[0]} for 45 minutes, then retake one quiz.`
    };
  }

  const leastStudied = [...subjectStats].sort((left, right) => left.minutes - right.minutes)[0];

  return {
    subjectId: leastStudied.id,
    subjectName: leastStudied.name,
    reason: "This is your least-studied core engineering subject this week.",
    plan: `Spend 40 minutes on ${leastStudied.topics[0]} and build short revision notes.`
  };
}

function buildStudentDashboard(db, user) {
  const today = dateKey(0);
  const completedSessions = db.studySessions.filter(
    (session) => session.userId === user.id && session.status === "completed"
  );
  const activeSession =
    db.studySessions.find((session) => session.userId === user.id && session.status === "active") || null;
  const attempts = db.quizAttempts.filter((attempt) => attempt.userId === user.id);
  const subjectStats = buildSubjectStats(db, user.id);

  const todayMinutes = sumBy(
    completedSessions.filter((session) => session.date === today),
    (session) => session.durationMinutes || 0
  );
  const datesWithStudy = new Set(completedSessions.map((session) => session.date));

  return {
    greeting: `Keep the momentum going, ${user.name.split(" ")[0]}.`,
    snapshot: {
      todayMinutes,
      streakDays: computeStreak(datesWithStudy, todayMinutes > 0),
      weeklyTarget: 300,
      targetCompletion: Math.min(100, Math.round((todayMinutes / 90) * 100)),
      totalMinutes: sumBy(completedSessions, (session) => session.durationMinutes || 0),
      averageQuizScore: attempts.length
        ? Math.round(sumBy(attempts, (attempt) => attempt.score) / attempts.length)
        : 0
    },
    weeklyMinutes: getDatesForPastWeek().map((day) => ({
      date: day,
      minutes: sumBy(
        completedSessions.filter((session) => session.date === day),
        (session) => session.durationMinutes || 0
      )
    })),
    subjects: subjectStats,
    recentNotes: db.notes
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 6)
      .map((note) => ({
        ...note,
        subjectName: db.subjects.find((entry) => entry.id === note.subjectId)?.name || "Unknown Subject"
      })),
    recommendation: buildTomorrowRecommendation(subjectStats),
    activeSession
  };
}

function buildTeacherDashboard(db, user) {
  const teacherNotes = db.notes.filter((note) => note.authorId === user.id);
  const teacherQuizzes = db.quizzes.filter((quiz) => quiz.createdBy === user.id);

  return {
    greeting: `Faculty control center for ${user.name}.`,
    metrics: {
      uploadedNotes: teacherNotes.length,
      createdQuizzes: teacherQuizzes.length,
      activeLearners: new Set(
        db.studySessions
          .filter((session) => session.date >= dateKey(-6) && session.status === "completed")
          .map((session) => session.userId)
      ).size,
      contentCoverage: Math.round(
        (db.subjects.filter((subject) => db.notes.some((note) => note.subjectId === subject.id)).length /
          Math.max(db.subjects.length, 1)) *
          100
      )
    },
    subjectPerformance: db.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      accent: subject.accent,
      notesCount: db.notes.filter((note) => note.subjectId === subject.id).length,
      quizzesCount: db.quizzes.filter((quiz) => quiz.subjectId === subject.id).length,
      studyMinutes: sumBy(
        db.studySessions.filter(
          (session) => session.subjectId === subject.id && session.status === "completed"
        ),
        (session) => session.durationMinutes || 0
      )
    })),
    recentUploads: teacherNotes
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5)
  };
}

module.exports = {
  buildStudentDashboard,
  buildTeacherDashboard
};
