const field = document.getElementById("field");
const toggleSongButton = document.getElementById("toggle-song");
const meterFill = document.getElementById("meter-fill");
const progressFill = document.getElementById("progress-fill");
const statusText = document.getElementById("status-text");
const bunnyCount = document.getElementById("bunny-count");
const comboCount = document.getElementById("combo-count");
const hazardCount = document.getElementById("hazard-count");
const chapterTitle = document.getElementById("chapter-title");
const chapterObjective = document.getElementById("chapter-objective");
const timeLeftLabel = document.getElementById("time-left");
const scoreLabel = document.getElementById("score");
const rageWarning = document.getElementById("rage-warning");
const storyPanel = document.getElementById("story-panel");
const storyTag = document.getElementById("story-tag");
const storyTitle = document.getElementById("story-title");
const storyText = document.getElementById("story-text");
const storySummary = document.getElementById("story-summary");
const startStoryButton = document.getElementById("start-story");
const nextChapterButton = document.getElementById("next-chapter");
const retryChapterButton = document.getElementById("retry-chapter");
const song = document.getElementById("song");

const MAX_BUNNIES = 55;
const MAX_BUBBLES = 5;
const MAX_HAZARDS = 5;
const BUNNY_IMAGES = [
  "Fuzzycute/IMG_3046.png",
  "Fuzzycute/IMG_3047.png",
  "Fuzzycute/IMG_3048.png",
  "Fuzzycute/IMG_3049.png",
  "Fuzzycute/IMG_3050.png",
  "Fuzzycute/IMG_3051.png",
  "Fuzzycute/IMG_3052.png",
  "Fuzzycute/IMG_3053.png",
  "Fuzzycute/IMG_3054.png",
];

const chapters = [
  {
    title: "Chapter 1: Whisper Meadow",
    intro:
      "Bunnies now hop in on their own. Tap bunnies to calm the crowd while mint bubbles keep the mood stable.",
    completeText:
      "You proved the crowd can stay sweet when chaos starts to rise.",
    duration: 30,
    scoreTarget: 220,
    hazardClearTarget: 6,
    maxOverstimulation: 72,
    breachLimit: 3.2,
    startBunnies: 3,
    bunnySpawnEvery: 1800,
    bubbleSpawnEvery: 3900,
    hazardSpawnEvery: 5200,
    ambientRate: 3.1,
    bunnyPressure: 0.5,
    hazardPressure: 0.8,
    hazardPenalty: 18,
    bunnyTapCalm: 4,
  },
  {
    title: "Chapter 2: Sugarstorm Square",
    intro:
      "The chorus gets louder. Red sparks appear more often, and missing them spikes the meter hard.",
    completeText:
      "Sugarstorm held. You kept tapping through rising panic.",
    duration: 34,
    scoreTarget: 320,
    hazardClearTarget: 9,
    maxOverstimulation: 66,
    breachLimit: 3,
    startBunnies: 4,
    bunnySpawnEvery: 1500,
    bubbleSpawnEvery: 3500,
    hazardSpawnEvery: 4300,
    ambientRate: 3.7,
    bunnyPressure: 0.56,
    hazardPressure: 1,
    hazardPenalty: 20,
    bunnyTapCalm: 3.5,
  },
  {
    title: "Chapter 3: Glitter Glacier",
    intro:
      "The air crackles. Burst bubbles are tempting, but hazards and bunny pressure are relentless.",
    completeText:
      "The glacier shimmers calm. Your timing is elite.",
    duration: 38,
    scoreTarget: 440,
    hazardClearTarget: 12,
    maxOverstimulation: 60,
    breachLimit: 2.8,
    startBunnies: 5,
    bunnySpawnEvery: 1250,
    bubbleSpawnEvery: 3200,
    hazardSpawnEvery: 3600,
    ambientRate: 4.3,
    bunnyPressure: 0.64,
    hazardPressure: 1.15,
    hazardPenalty: 22,
    bunnyTapCalm: 3.2,
  },
  {
    title: "Chapter 4: Cuteness Citadel",
    intro:
      "Finale phase: nonstop fuzz, hazard waves, and tiny windows to recover. Control the storm to finish the story.",
    completeText:
      "The city breathes again. Fuzzy fuzzy cute cute is finally balanced.",
    duration: 45,
    scoreTarget: 620,
    hazardClearTarget: 16,
    maxOverstimulation: 54,
    breachLimit: 2.5,
    startBunnies: 6,
    bunnySpawnEvery: 1020,
    bubbleSpawnEvery: 2900,
    hazardSpawnEvery: 3000,
    ambientRate: 5.1,
    bunnyPressure: 0.72,
    hazardPressure: 1.3,
    hazardPenalty: 24,
    bunnyTapCalm: 3,
  },
];

const storyOutro =
  "The crowd learns the rhythm: tap bunnies, clear sparks, grab bubbles, stay cool. The chorus can go on forever.";

const bunnies = new Set();
const bunnyHopTimers = new Map();
const bubbles = new Set();
const bubbleExpireTimers = new Map();
const hazards = new Set();
const hazardExpireTimers = new Map();

let overstimulation = 0;
let score = 0;
let timeLeft = 0;
let breachTime = 0;
let combo = 1;
let comboWindow = 0;
let bestCombo = 1;
let hazardsCleared = 0;
let hazardsMissed = 0;
let focusBoostUntil = 0;
let currentChapterIndex = 0;
let gameState = "idle";
let spawnTimer = null;
let bubbleTimer = null;
let hazardTimer = null;
let lastTick = performance.now();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomBetween = (min, max) => Math.random() * (max - min) + min;
const getChapter = () =>
  chapters[Math.min(currentChapterIndex, chapters.length - 1)];
const getRandomBunnyImage = () =>
  BUNNY_IMAGES[Math.floor(Math.random() * BUNNY_IMAGES.length)];

const setEntityPosition = (entity, xPercent, yPercent) => {
  const x = clamp(xPercent, 6, 94);
  const y = clamp(yPercent, 16, 92);
  entity.dataset.x = x.toFixed(2);
  entity.dataset.y = y.toFixed(2);
  entity.style.left = `${x}%`;
  entity.style.top = `${y}%`;
};

const formatObjective = (chapter) =>
  `Survive ${chapter.duration}s, score ${chapter.scoreTarget}, clear ${chapter.hazardClearTarget} hazards.`;

const clearWarningFlash = () => {
  field.classList.remove("is-warning");
};

const flashWarning = () => {
  field.classList.add("is-warning");
  setTimeout(clearWarningFlash, 320);
};

const updateHud = () => {
  const chapter = getChapter();
  const progress = chapter.duration
    ? clamp(((chapter.duration - timeLeft) / chapter.duration) * 100, 0, 100)
    : 0;
  chapterTitle.textContent = chapter.title;
  chapterObjective.textContent = formatObjective(chapter);
  timeLeftLabel.textContent =
    gameState === "playing" ? `${Math.ceil(timeLeft)}s` : "--";
  scoreLabel.textContent = Math.floor(score);
  bunnyCount.textContent = `Bunnies: ${bunnies.size}`;
  comboCount.textContent = `Combo: x${combo.toFixed(1)}`;
  hazardCount.textContent = `Hazards survived: ${hazardsCleared}`;
  progressFill.style.width =
    gameState === "playing" || gameState === "chapterComplete"
      ? `${progress}%`
      : "0%";

  if (gameState !== "playing") {
    rageWarning.textContent = "Resting";
    return;
  }
  if (overstimulation > chapter.maxOverstimulation) {
    rageWarning.textContent = "Fuming!";
  } else if (overstimulation > chapter.maxOverstimulation - 10) {
    rageWarning.textContent = "Rising";
  } else {
    rageWarning.textContent = "Calm";
  }
};

const getMoodText = () => {
  const chapter = getChapter();
  if (gameState === "chapterComplete") {
    return "Chapter complete. The crowd stayed in control.";
  }
  if (gameState === "chapterFailed") {
    return "Too much overstimulation. Retry the chapter.";
  }
  if (gameState === "storyComplete") {
    return "Story complete. You mastered cute chaos.";
  }
  if (gameState !== "playing") {
    return "Start a chapter when you're ready.";
  }
  if (overstimulation > chapter.maxOverstimulation + 6) {
    return "Critical overload! Clear sparks now.";
  }
  if (overstimulation > chapter.maxOverstimulation) {
    return "Overstimulated. Tap bunnies and mint bubbles.";
  }
  if (hazards.size > 2) {
    return "Hazards building up. Pop red sparks.";
  }
  return "Balanced chaos. Keep the rhythm.";
};

const driftBunny = (bunny) => {
  const currentX = Number.parseFloat(bunny.dataset.x || "50");
  const currentY = Number.parseFloat(bunny.dataset.y || "50");
  setEntityPosition(
    bunny,
    currentX + randomBetween(-4, 4),
    currentY + randomBetween(-3, 3)
  );
};

const removeBunny = (bunny) => {
  const hopTimer = bunnyHopTimers.get(bunny);
  if (hopTimer) {
    clearTimeout(hopTimer);
    bunnyHopTimers.delete(bunny);
  }
  bunny.remove();
  bunnies.delete(bunny);
};

const scheduleBunnyHop = (bunny) => {
  const hop = () => {
    const hopHeight = Math.round(randomBetween(18, 36));
    bunny.style.setProperty("--hop-height", `${hopHeight}px`);
    bunny.style.setProperty("--hop-duration", `${randomBetween(0.55, 0.9)}s`);
    bunny.classList.remove("is-hopping");
    void bunny.offsetWidth;
    bunny.classList.add("is-hopping");
    driftBunny(bunny);
    const timer = setTimeout(hop, randomBetween(680, 1350));
    bunnyHopTimers.set(bunny, timer);
  };
  hop();
};

const onBunnyTap = (bunny, chapter) => {
  if (gameState !== "playing" || bunny.dataset.tapped === "true") {
    return;
  }
  bunny.dataset.tapped = "true";
  combo = clamp(combo + 0.2, 1, 5);
  bestCombo = Math.max(bestCombo, combo);
  comboWindow = 1.8;
  score += 12 * combo;
  overstimulation = clamp(overstimulation - chapter.bunnyTapCalm, 0, 100);
  bunny.classList.add("is-petted");
  setTimeout(() => removeBunny(bunny), 120);
};

const spawnBunny = () => {
  if (gameState !== "playing" || bunnies.size >= MAX_BUNNIES) {
    return;
  }
  const chapter = getChapter();
  const bunny = document.createElement("img");
  bunny.className = "bunny";
  bunny.src = getRandomBunnyImage();
  bunny.alt = "A cute fuzzy bunny";
  setEntityPosition(bunny, randomBetween(8, 92), randomBetween(22, 90));
  bunny.addEventListener("click", (event) => {
    event.stopPropagation();
    onBunnyTap(bunny, chapter);
  });
  field.appendChild(bunny);
  bunnies.add(bunny);
  scheduleBunnyHop(bunny);
};

const removeBubble = (bubble) => {
  const timer = bubbleExpireTimers.get(bubble);
  if (timer) {
    clearTimeout(timer);
    bubbleExpireTimers.delete(bubble);
  }
  bubble.remove();
  bubbles.delete(bubble);
};

const applyBubbleEffect = (type) => {
  if (type === "calm") {
    overstimulation = clamp(overstimulation - 26, 0, 100);
    score += 18;
    return;
  }
  if (type === "spark") {
    score += 32;
    focusBoostUntil = performance.now() + 4200;
    return;
  }
  score += 20;
  overstimulation = clamp(overstimulation + 8, 0, 100);
  spawnBunny();
  spawnBunny();
};

const spawnBubble = () => {
  if (gameState !== "playing" || bubbles.size >= MAX_BUBBLES) {
    return;
  }
  const types = ["calm", "spark", "burst"];
  const type = types[Math.floor(Math.random() * types.length)];
  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.className = `item item--${type}`;
  bubble.setAttribute("aria-label", `${type} bubble`);
  setEntityPosition(bubble, randomBetween(10, 90), randomBetween(20, 88));
  bubble.addEventListener("click", (event) => {
    event.stopPropagation();
    applyBubbleEffect(type);
    removeBubble(bubble);
  });
  field.appendChild(bubble);
  bubbles.add(bubble);
  const timer = setTimeout(() => removeBubble(bubble), 5400);
  bubbleExpireTimers.set(bubble, timer);
};

const removeHazard = (hazard) => {
  const timer = hazardExpireTimers.get(hazard);
  if (timer) {
    clearTimeout(timer);
    hazardExpireTimers.delete(hazard);
  }
  hazard.remove();
  hazards.delete(hazard);
};

const spawnHazard = () => {
  if (gameState !== "playing" || hazards.size >= MAX_HAZARDS) {
    return;
  }
  const chapter = getChapter();
  const hazard = document.createElement("button");
  hazard.type = "button";
  hazard.className = "hazard";
  hazard.setAttribute("aria-label", "Hazard spark");
  setEntityPosition(hazard, randomBetween(10, 90), randomBetween(20, 88));
  hazard.addEventListener("click", (event) => {
    event.stopPropagation();
    if (gameState !== "playing") {
      return;
    }
    hazardsCleared += 1;
    score += 26;
    overstimulation = clamp(overstimulation - 5, 0, 100);
    hazard.classList.add("is-cleared");
    setTimeout(() => removeHazard(hazard), 140);
  });
  field.appendChild(hazard);
  hazards.add(hazard);

  const timer = setTimeout(() => {
    if (!hazards.has(hazard)) {
      return;
    }
    if (gameState !== "playing") {
      removeHazard(hazard);
      return;
    }
    hazardsMissed += 1;
    overstimulation = clamp(overstimulation + chapter.hazardPenalty, 0, 100);
    flashWarning();
    removeHazard(hazard);
  }, 2800);
  hazardExpireTimers.set(hazard, timer);
};

const clearBunnies = () => {
  Array.from(bunnies).forEach((bunny) => removeBunny(bunny));
};

const clearBubbles = () => {
  Array.from(bubbles).forEach((bubble) => removeBubble(bubble));
};

const clearHazards = () => {
  Array.from(hazards).forEach((hazard) => removeHazard(hazard));
};

const clearSpawnSystems = () => {
  if (spawnTimer) {
    clearInterval(spawnTimer);
    spawnTimer = null;
  }
  if (bubbleTimer) {
    clearInterval(bubbleTimer);
    bubbleTimer = null;
  }
  if (hazardTimer) {
    clearInterval(hazardTimer);
    hazardTimer = null;
  }
};

const resetChapterState = () => {
  clearSpawnSystems();
  clearBunnies();
  clearBubbles();
  clearHazards();
  overstimulation = 22;
  score = 0;
  breachTime = 0;
  combo = 1;
  comboWindow = 0;
  bestCombo = 1;
  hazardsCleared = 0;
  hazardsMissed = 0;
  focusBoostUntil = 0;
};

const showStoryPanel = (mode, reasonText = "") => {
  const chapter = getChapter();
  storyPanel.classList.remove("is-hidden");
  storySummary.textContent = "";

  if (mode === "intro") {
    storyTag.textContent = `Chapter ${currentChapterIndex + 1} of ${chapters.length}`;
    storyTitle.textContent = chapter.title;
    storyText.textContent = chapter.intro;
    startStoryButton.hidden = false;
    startStoryButton.textContent = "Start chapter";
    nextChapterButton.hidden = true;
    retryChapterButton.hidden = true;
    return;
  }

  if (mode === "complete") {
    storyTag.textContent = `Chapter ${currentChapterIndex + 1} complete`;
    storyTitle.textContent = "Chapter cleared";
    storyText.textContent = chapter.completeText;
    storySummary.textContent = `Score ${Math.floor(score)} • Best combo x${bestCombo.toFixed(1)} • Hazards survived ${hazardsCleared}`;
    startStoryButton.hidden = true;
    nextChapterButton.hidden = false;
    retryChapterButton.hidden = true;
    return;
  }

  if (mode === "failed") {
    storyTag.textContent = "Chapter failed";
    storyTitle.textContent = "The crowd overloaded";
    storyText.textContent =
      reasonText || "Too many stress spikes stacked up. Try again.";
    storySummary.textContent = `Score ${Math.floor(score)} • Hazards survived ${hazardsCleared} • Hazards missed ${hazardsMissed}`;
    startStoryButton.hidden = true;
    nextChapterButton.hidden = true;
    retryChapterButton.hidden = false;
    return;
  }

  storyTag.textContent = "Story complete";
  storyTitle.textContent = "Fuzzy fuzzy cute cute finale";
  storyText.textContent = storyOutro;
  storySummary.textContent = `Final score ${Math.floor(score)} • Best combo x${bestCombo.toFixed(1)}`;
  startStoryButton.hidden = false;
  startStoryButton.textContent = "Play again";
  nextChapterButton.hidden = true;
  retryChapterButton.hidden = true;
};

const hideStoryPanel = () => {
  storyPanel.classList.add("is-hidden");
};

const finishChapter = (success, reasonText = "") => {
  if (gameState !== "playing") {
    return;
  }
  clearSpawnSystems();
  clearBubbles();
  clearHazards();
  clearBunnies();
  if (!success) {
    gameState = "chapterFailed";
    showStoryPanel("failed", reasonText);
    return;
  }
  if (currentChapterIndex === chapters.length - 1) {
    gameState = "storyComplete";
    showStoryPanel("final");
    return;
  }
  gameState = "chapterComplete";
  showStoryPanel("complete");
};

const startChapter = () => {
  const chapter = getChapter();
  resetChapterState();
  timeLeft = chapter.duration;
  gameState = "playing";
  lastTick = performance.now();
  hideStoryPanel();
  for (let i = 0; i < chapter.startBunnies; i += 1) {
    spawnBunny();
  }
  spawnTimer = setInterval(spawnBunny, chapter.bunnySpawnEvery);
  bubbleTimer = setInterval(spawnBubble, chapter.bubbleSpawnEvery);
  hazardTimer = setInterval(spawnHazard, chapter.hazardSpawnEvery);
  updateHud();
};

const updateSimulation = (delta) => {
  if (gameState !== "playing") {
    return;
  }
  const chapter = getChapter();
  const focusedMultiplier = performance.now() < focusBoostUntil ? 0.7 : 1;
  const ambient = chapter.ambientRate * focusedMultiplier;
  const bunnyStress = bunnies.size * chapter.bunnyPressure;
  const hazardStress = hazards.size * chapter.hazardPressure;
  overstimulation = clamp(
    overstimulation + (ambient + bunnyStress + hazardStress) * delta,
    0,
    100
  );

  timeLeft = Math.max(0, timeLeft - delta);
  if (comboWindow > 0) {
    comboWindow = Math.max(0, comboWindow - delta);
  } else {
    combo = Math.max(1, combo - delta * 0.9);
  }

  if (overstimulation > chapter.maxOverstimulation) {
    breachTime += delta;
  } else {
    breachTime = Math.max(0, breachTime - delta * 0.6);
  }

  if (breachTime >= chapter.breachLimit) {
    finishChapter(false, "Overstimulation stayed too high for too long.");
    return;
  }

  if (timeLeft <= 0) {
    if (score < chapter.scoreTarget) {
      finishChapter(
        false,
        `You need ${chapter.scoreTarget} score, but reached ${Math.floor(score)}.`
      );
      return;
    }
    if (hazardsCleared < chapter.hazardClearTarget) {
      finishChapter(
        false,
        `You need ${chapter.hazardClearTarget} hazards survived, but got ${hazardsCleared}.`
      );
      return;
    }
    finishChapter(true);
  }
};

const updateUiFrame = () => {
  statusText.textContent = getMoodText();
  meterFill.style.width = `${overstimulation}%`;
  if (gameState === "playing" && overstimulation > getChapter().maxOverstimulation) {
    document.body.classList.add("angry");
  } else {
    document.body.classList.remove("angry");
  }
  updateHud();
};

const gameLoop = () => {
  const now = performance.now();
  const delta = (now - lastTick) / 1000;
  lastTick = now;
  updateSimulation(delta);
  updateUiFrame();
};

const playFallbackChant = () => {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance("fuzzy fuzzy cute cute");
  utterance.rate = 1.05;
  utterance.pitch = 1.6;
  window.speechSynthesis.speak(utterance);
};

toggleSongButton.addEventListener("click", () => {
  if (song.paused) {
    song.currentTime = 0;
    const playPromise = song.play();
    toggleSongButton.textContent = "Pause fuzzy fuzzy cute cute";
    if (playPromise) {
      playPromise.catch(() => {
        toggleSongButton.textContent = "Play fuzzy fuzzy cute cute";
        playFallbackChant();
      });
    }
  } else {
    song.pause();
    toggleSongButton.textContent = "Play fuzzy fuzzy cute cute";
  }
});

song.addEventListener("ended", () => {
  toggleSongButton.textContent = "Play fuzzy fuzzy cute cute";
});

startStoryButton.addEventListener("click", () => {
  if (gameState === "storyComplete") {
    currentChapterIndex = 0;
  }
  startChapter();
});

nextChapterButton.addEventListener("click", () => {
  currentChapterIndex += 1;
  if (currentChapterIndex >= chapters.length) {
    currentChapterIndex = chapters.length - 1;
    gameState = "storyComplete";
    showStoryPanel("final");
    return;
  }
  gameState = "idle";
  showStoryPanel("intro");
});

retryChapterButton.addEventListener("click", () => {
  gameState = "idle";
  showStoryPanel("intro");
});

showStoryPanel("intro");
setInterval(gameLoop, 120);
updateUiFrame();
