const state = {
  running: false,
  stopwatchMs: 0,
  sysMs: 0,
  ledDelays: [3000, 1500, 750, 375],
  ledDelayIndex: 0,
  ledOn: false,
  lastLedToggle: 0,
  lastLcdUpdate: 0,
  lastEvenSecond: -1,
  buzzerUntil: 0,
  soundEnabled: false,
  timeScale: 1,
  lastFrame: performance.now(),
  audioContext: null
};

const $ = (id) => document.getElementById(id);

const els = {
  themeToggle: $("themeToggle"),
  themeText: $("themeText"),
  heroState: $("heroState"),
  heroLcdLine1: $("heroLcdLine1"),
  heroLcdLine2: $("heroLcdLine2"),
  heroLed: $("heroLed"),
  heroBuzzer: $("heroBuzzer"),
  lcdLine1: $("lcdLine1"),
  lcdLine2: $("lcdLine2"),
  statusDot: $("statusDot"),
  systemStatus: $("systemStatus"),
  metricStopwatch: $("metricStopwatch"),
  metricLedDelay: $("metricLedDelay"),
  ledLamp: $("ledLamp"),
  buzzerLamp: $("buzzerLamp"),
  startPauseButton: $("startPauseButton"),
  resetButton: $("resetButton"),
  speedButton: $("speedButton"),
  extiButton: $("extiButton"),
  speedHardwareButton: $("speedHardwareButton"),
  soundButton: $("soundButton"),
  timeScale: $("timeScale"),
  timeScaleValue: $("timeScaleValue"),
  eventLog: $("eventLog"),
  systickPulse: $("systickPulse"),
  tim2Pulse: $("tim2Pulse"),
  lcdPulse: $("lcdPulse"),
  extiPulse: $("extiPulse")
};

function pad(value, size) {
  return String(value).padStart(size, "0");
}

function formatStopwatch(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.min(99, Math.floor(totalSeconds / 60));
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);
  return `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
}

function ledDelay() {
  return state.ledDelays[state.ledDelayIndex];
}

function pulse(element) {
  if (!element) return;
  element.classList.remove("active");
  void element.offsetWidth;
  element.classList.add("active");
}

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = `${formatStopwatch(state.stopwatchMs)}  ${message}`;
  els.eventLog.prepend(item);
  while (els.eventLog.children.length > 10) {
    els.eventLog.lastElementChild.remove();
  }
}

function beep() {
  if (!state.soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
  }
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, state.audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, state.audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + 0.13);
  oscillator.connect(gain);
  gain.connect(state.audioContext.destination);
  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + 0.14);
}

function updateLcd() {
  const mode = state.running ? "RUN" : "PAU";
  const line1 = `${formatStopwatch(state.stopwatchMs)} ${mode}`;
  const line2 = `LED:${String(ledDelay()).padStart(4, " ")} ms`;
  els.lcdLine1.textContent = line1;
  els.lcdLine2.textContent = line2;
  els.heroLcdLine1.textContent = line1;
  els.heroLcdLine2.textContent = line2;
}

function updateUi(forceLcd = false) {
  const running = state.running;
  document.querySelectorAll(".live-dot").forEach((dot) => dot.classList.toggle("running", running));
  els.statusDot.classList.toggle("running", running);
  els.systemStatus.textContent = running ? "Running" : "Paused";
  els.heroState.textContent = running ? "RUNNING" : "PAUSED";
  els.startPauseButton.textContent = running ? "Pause" : "Start";
  els.metricStopwatch.textContent = `${Math.floor(state.stopwatchMs)} ms`;
  els.metricLedDelay.textContent = `${ledDelay()} ms`;
  els.ledLamp.classList.toggle("on", state.ledOn);
  els.heroLed.classList.toggle("on", state.ledOn);
  const buzzing = state.sysMs < state.buzzerUntil;
  els.buzzerLamp.classList.toggle("on", buzzing);
  els.heroBuzzer.classList.toggle("on", buzzing);
  els.soundButton.textContent = state.soundEnabled ? "Sound On" : "Sound Off";
  els.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
  if (forceLcd) updateLcd();
}

function setRunning(next) {
  state.running = next;
  pulse(els.extiPulse);
  logEvent(next ? "EXTI4: Start/Pause button toggled RUN" : "EXTI4: Start/Pause button toggled PAUSE");
  updateUi(true);
}

function toggleRun() {
  setRunning(!state.running);
}

function resetStopwatch() {
  state.running = false;
  state.stopwatchMs = 0;
  state.sysMs = 0;
  state.ledOn = false;
  state.lastLedToggle = 0;
  state.lastEvenSecond = -1;
  state.buzzerUntil = 0;
  logEvent("Reset: stopwatch_ms cleared");
  updateUi(true);
}

function changeSpeed() {
  state.ledDelayIndex = (state.ledDelayIndex + 1) % state.ledDelays.length;
  state.lastLedToggle = state.sysMs;
  logEvent(`PE5: LED delay changed to ${ledDelay()} ms`);
  updateUi(true);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("stm32-demo-theme", theme);
  els.themeText.textContent = theme === "dark" ? "Light" : "Dark";
}

function tick(now) {
  const rawDelta = Math.min(80, now - state.lastFrame);
  const delta = rawDelta * state.timeScale;
  state.lastFrame = now;
  state.sysMs += delta;

  if (state.running) {
    state.stopwatchMs += delta;
    pulse(els.tim2Pulse);
  }

  if (Math.floor(state.sysMs / 260) !== Math.floor((state.sysMs - delta) / 260)) {
    pulse(els.systickPulse);
  }

  if (state.sysMs - state.lastLedToggle >= ledDelay()) {
    state.lastLedToggle = state.sysMs;
    state.ledOn = !state.ledOn;
    logEvent(`GPIOC: PC13 LED ${state.ledOn ? "ON" : "OFF"}`);
  }

  const currentSecond = Math.floor(state.stopwatchMs / 1000);
  if (state.running && currentSecond > 0 && currentSecond % 2 === 0 && currentSecond !== state.lastEvenSecond) {
    state.lastEvenSecond = currentSecond;
    state.buzzerUntil = state.sysMs + 100;
    pulse(els.lcdPulse);
    beep();
    logEvent(`GPIOB: PB6 buzzer pulse at second ${currentSecond}`);
  }

  if (state.sysMs - state.lastLcdUpdate >= 50) {
    state.lastLcdUpdate = state.sysMs;
    updateLcd();
    pulse(els.lcdPulse);
  }

  updateUi();
  requestAnimationFrame(tick);
}

els.startPauseButton.addEventListener("click", toggleRun);
els.extiButton.addEventListener("click", toggleRun);
els.resetButton.addEventListener("click", resetStopwatch);
els.speedButton.addEventListener("click", changeSpeed);
els.speedHardwareButton.addEventListener("click", changeSpeed);
els.soundButton.addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  logEvent(state.soundEnabled ? "Browser sound enabled" : "Browser sound disabled");
  updateUi();
});
els.timeScale.addEventListener("input", (event) => {
  state.timeScale = Number(event.target.value);
  els.timeScaleValue.textContent = `${state.timeScale}x`;
});
els.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme;
  setTheme(current === "dark" ? "light" : "dark");
});

setTheme(localStorage.getItem("stm32-demo-theme") || "dark");
logEvent("System initialized: RCC, GPIO, SysTick, TIM2, EXTI4");
updateUi(true);
requestAnimationFrame(tick);
