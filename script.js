const state = {
  running: false,
  stopwatchMs: 0,
  sysMs: 0,
  ledDelayIndex: 0,
  ledDelays: [3000, 1500, 750, 375],
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

const els = {
  lcdLine1: document.getElementById("lcdLine1"),
  lcdLine2: document.getElementById("lcdLine2"),
  metricStopwatch: document.getElementById("metricStopwatch"),
  metricLedDelay: document.getElementById("metricLedDelay"),
  statusDot: document.getElementById("statusDot"),
  systemStatus: document.getElementById("systemStatus"),
  ledLamp: document.getElementById("ledLamp"),
  buzzerLamp: document.getElementById("buzzerLamp"),
  startPauseButton: document.getElementById("startPauseButton"),
  resetButton: document.getElementById("resetButton"),
  speedButton: document.getElementById("speedButton"),
  extiButton: document.getElementById("extiButton"),
  speedHardwareButton: document.getElementById("speedHardwareButton"),
  soundButton: document.getElementById("soundButton"),
  timeScale: document.getElementById("timeScale"),
  timeScaleValue: document.getElementById("timeScaleValue"),
  eventLog: document.getElementById("eventLog"),
  systickPulse: document.getElementById("systickPulse"),
  tim2Pulse: document.getElementById("tim2Pulse"),
  lcdPulse: document.getElementById("lcdPulse"),
  extiPulse: document.getElementById("extiPulse")
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

function currentLedDelay() {
  return state.ledDelays[state.ledDelayIndex];
}

function pulse(element) {
  element.classList.remove("active");
  void element.offsetWidth;
  element.classList.add("active");
}

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = `${formatStopwatch(state.stopwatchMs)}  ${message}`;
  els.eventLog.prepend(item);

  while (els.eventLog.children.length > 9) {
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
  gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + 0.12);
  oscillator.connect(gain);
  gain.connect(state.audioContext.destination);
  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + 0.13);
}

function setRunning(nextValue) {
  state.running = nextValue;
  pulse(els.extiPulse);
  logEvent(nextValue ? "EXTI4: Start button pressed, stopwatch running" : "EXTI4: Pause button pressed, stopwatch stopped");
  updateUi();
}

function toggleRun() {
  setRunning(!state.running);
}

function resetStopwatch() {
  state.stopwatchMs = 0;
  state.sysMs = 0;
  state.running = false;
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
  logEvent(`PE5: LED delay changed to ${currentLedDelay()} ms`);
  updateUi(true);
}

function updateLcd() {
  const runState = state.running ? "RUN" : "PAU";
  els.lcdLine1.textContent = `${formatStopwatch(state.stopwatchMs)} ${runState}`;
  els.lcdLine2.textContent = `LED:${String(currentLedDelay()).padStart(4, " ")} ms`;
}

function updateUi(forceLcd = false) {
  els.statusDot.classList.toggle("running", state.running);
  els.systemStatus.textContent = state.running ? "Running" : "Paused";
  els.startPauseButton.textContent = state.running ? "Pause" : "Start";
  els.metricStopwatch.textContent = `${Math.floor(state.stopwatchMs)} ms`;
  els.metricLedDelay.textContent = `${currentLedDelay()} ms`;
  els.ledLamp.classList.toggle("on", state.ledOn);
  els.buzzerLamp.classList.toggle("on", state.sysMs < state.buzzerUntil);
  els.soundButton.textContent = state.soundEnabled ? "Sound On" : "Sound Off";
  els.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));

  if (forceLcd) {
    updateLcd();
  }
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

  if (Math.floor(state.sysMs / 250) !== Math.floor((state.sysMs - delta) / 250)) {
    pulse(els.systickPulse);
  }

  if (state.sysMs - state.lastLedToggle >= currentLedDelay()) {
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

  if (state.sysMs >= state.buzzerUntil) {
    els.buzzerLamp.classList.remove("on");
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
  logEvent(state.soundEnabled ? "Sound enabled for buzzer pulses" : "Sound disabled");
  updateUi();
});
els.timeScale.addEventListener("input", (event) => {
  state.timeScale = Number(event.target.value);
  els.timeScaleValue.textContent = `${state.timeScale}x`;
});

logEvent("System initialized: HSI clock, TIM2, SysTick, GPIO, EXTI4");
updateUi(true);
requestAnimationFrame(tick);
