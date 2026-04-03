const state = {
  config: null,
  questions: [],
  currentIndex: 0,
  correctCount: 0,
  answers: [],
  secondsLeft: 0,
  timerId: null
};

const screens = {
  landing: document.querySelector('[data-screen="landing"]'),
  quiz: document.querySelector('[data-screen="quiz"]'),
  results: document.querySelector('[data-screen="results"]')
};

const configForm = document.querySelector("[data-config-form]");
const answerForm = document.querySelector("[data-answer-form]");
const answerInput = document.getElementById("answer-input");
const scoreChip = document.querySelector("[data-score-chip]");
const formMessage = document.querySelector("[data-form-message]");
const progressLabel = document.querySelector("[data-progress-label]");
const timerLabel = document.querySelector("[data-timer-label]");
const questionText = document.querySelector("[data-question-text]");
const questionHint = document.querySelector("[data-question-hint]");
const resultsSummary = document.querySelector("[data-results-summary]");
const resultsGrid = document.querySelector("[data-results-grid]");
const restartButton = document.querySelector("[data-restart-button]");

function setActiveScreen(screenName) {
  Object.entries(screens).forEach(([name, element]) => {
    element.classList.toggle("screen-active", name === screenName);
  });

  const showScore = screenName !== "landing";
  scoreChip.classList.toggle("hidden", !showScore);
}

function shuffle(values) {
  const clone = [...values];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateTracker() {
  scoreChip.textContent = `Correct: ${state.correctCount}`;
}

function buildQuestionSet(selectedTables, questionCount) {
  const pool = [];
  const multipliers = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  for (let index = 0; index < questionCount; index += 1) {
    const table = selectedTables[index % selectedTables.length];
    const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    pool.push({
      table,
      multiplier,
      answer: table * multiplier
    });
  }

  return shuffle(pool);
}

function renderCurrentQuestion() {
  const currentQuestion = state.questions[state.currentIndex];
  if (!currentQuestion) {
    finishQuiz("completed");
    return;
  }

  progressLabel.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length}`;
  questionText.textContent = `${currentQuestion.table} x ${currentQuestion.multiplier}`;
  questionHint.textContent = `This one is from the ${currentQuestion.table} times table.`;
  answerForm.reset();
  answerInput.focus();
}

function startTimer() {
  clearInterval(state.timerId);
  timerLabel.textContent = `Time left: ${formatTime(state.secondsLeft)}`;

  state.timerId = window.setInterval(() => {
    state.secondsLeft -= 1;
    timerLabel.textContent = `Time left: ${formatTime(Math.max(state.secondsLeft, 0))}`;

    if (state.secondsLeft <= 0) {
      finishQuiz("time");
    }
  }, 1000);
}

function readConfig() {
  const formData = new FormData(configForm);
  const tables = formData.getAll("tables").map((value) => Number(value));
  const questionCount = Number(formData.get("questionCount"));
  const timeLimit = Number(formData.get("timeLimit"));
  return { tables, questionCount, timeLimit };
}

function startQuiz() {
  const config = readConfig();

  if (!config.tables.length) {
    formMessage.textContent = "Pick at least one multiplication table before starting.";
    return;
  }

  formMessage.textContent = "Select at least one table to begin the challenge.";
  state.config = config;
  state.questions = buildQuestionSet(config.tables, config.questionCount);
  state.currentIndex = 0;
  state.correctCount = 0;
  state.answers = [];
  state.secondsLeft = config.timeLimit;
  updateTracker();
  setActiveScreen("quiz");
  renderCurrentQuestion();
  startTimer();
}

function getAnalysisForTable(table) {
  const assigned = state.questions.filter((entry) => entry.table === table);
  const attempts = state.answers.filter((entry) => entry.table === table);
  const total = attempts.length;
  const questionTotal = assigned.length;
  const unanswered = Math.max(questionTotal - total, 0);
  const correct = attempts.filter((entry) => entry.correct).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  let label = "Needs more work";
  let badgeClass = "badge-soft";
  let note = "More practice will help this table feel automatic.";

  if (unanswered > 0) {
    label = "Unanswered questions";
    badgeClass = "badge-soft";
    note = "Some questions in this table were left unanswered before the test ended.";
  } else if (accuracy >= 80) {
    label = "Learnt properly";
    badgeClass = "badge-strong";
    note = "Strong recall. This table looks confident and well understood.";
  } else if (accuracy >= 50) {
    label = "Almost there";
    badgeClass = "badge-mid";
    note = "The basics are settling in, but a few more rounds would help.";
  }

  return { table, total, questionTotal, unanswered, correct, accuracy, label, badgeClass, note };
}

function finishQuiz(reason) {
  clearInterval(state.timerId);
  state.timerId = null;
  setActiveScreen("results");

  const answeredCount = state.answers.length;
  const totalCount = state.questions.length;
  const unansweredCount = Math.max(totalCount - answeredCount, 0);
  const overallAccuracy = answeredCount
    ? Math.round((state.correctCount / answeredCount) * 100)
    : 0;

  const reasonText =
    reason === "time"
      ? `Time ran out after ${answeredCount} of ${totalCount} questions.`
      : `You completed all ${totalCount} questions.`;

  resultsSummary.textContent = `${reasonText} You answered ${state.correctCount} correctly, left ${unansweredCount} unanswered, and had an overall accuracy of ${overallAccuracy}% on attempted questions.`;

  resultsGrid.innerHTML = "";
  state.config.tables
    .slice()
    .sort((left, right) => left - right)
    .map(getAnalysisForTable)
    .forEach((tableResult) => {
      const card = document.createElement("article");
      card.className = "analysis-card";
      card.innerHTML = `
        <span class="analysis-badge ${tableResult.badgeClass}">${tableResult.label}</span>
        <h3>${tableResult.table} times table</h3>
        <p class="analysis-copy">${tableResult.correct}/${tableResult.total} correct · ${tableResult.accuracy}% accuracy</p>
        <p class="analysis-copy">${tableResult.unanswered}/${tableResult.questionTotal} unanswered</p>
        <p class="analysis-copy">${tableResult.note}</p>
      `;
      resultsGrid.appendChild(card);
    });
}

function submitAnswer(event) {
  event.preventDefault();

  const currentQuestion = state.questions[state.currentIndex];
  if (!currentQuestion) {
    return;
  }

  const submittedValue = Number(answerInput.value);
  const correct = submittedValue === currentQuestion.answer;

  state.answers.push({
    table: currentQuestion.table,
    multiplier: currentQuestion.multiplier,
    expected: currentQuestion.answer,
    submitted: submittedValue,
    correct
  });

  if (correct) {
    state.correctCount += 1;
    updateTracker();
  }

  state.currentIndex += 1;

  if (state.currentIndex >= state.questions.length) {
    finishQuiz("completed");
    return;
  }

  renderCurrentQuestion();
}

configForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startQuiz();
});

answerForm.addEventListener("submit", submitAnswer);

restartButton.addEventListener("click", () => {
  clearInterval(state.timerId);
  state.timerId = null;
  state.currentIndex = 0;
  state.correctCount = 0;
  state.answers = [];
  updateTracker();
  setActiveScreen("landing");
});

updateTracker();
setActiveScreen("landing");
