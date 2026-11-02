export function drawSimulator(config) {
  const cpuInput = document.getElementById("sim-cpu");
  if (!cpuInput) return;

  const targetCpu = Number(cpuInput.value);
  const minTasks = Number(document.getElementById("sim-min").value);
  let maxTasks = Number(document.getElementById("sim-max").value);
  if (maxTasks < minTasks) {
    maxTasks = minTasks;
    document.getElementById("sim-max").value = maxTasks;
  }
  const bootSec = Number(document.getElementById("sim-boot").value);
  const coolInSec = Number(document.getElementById("sim-cool").value);

  for (const [key, control] of Object.entries(config.controls)) {
    document.getElementById(`val-${key}`).textContent = `${document.getElementById(`sim-${key}`).value}${control.unit}`;
  }

  const { steps, stepSeconds: stepSec, capacityPerTask, chartMax, baseDemand, schedulingDelaySteps, scaleInThreshold, waves } = config.scenario;
  const bootSteps = Math.max(1, Math.round(bootSec / stepSec));
  const coolInSteps = Math.max(1, Math.round(coolInSec / stepSec));

  const demandSeries = [];
  const capacitySeries = [];

  let readyTasks = minTasks;
  let pendingTasks = [];
  let lastScaleInStep = -999;
  let overloadSteps = 0;

  for (let t = 0; t < steps; t++) {
    const newlyReady = pendingTasks.filter(rem => rem <= 1).length;
    readyTasks += newlyReady;
    pendingTasks = pendingTasks.filter(rem => rem > 1).map(rem => rem - 1);

    let demand = baseDemand;
    const wave = waves.find(wave => t >= wave.start && t <= wave.end);
    if (wave) {
      demand = wave.baseline + Math.sin(((t - wave.start) / (wave.end - wave.start)) * Math.PI) * wave.amplitude;
    }

    const totalCapacity = readyTasks * capacityPerTask;
    demandSeries.push(demand);
    capacitySeries.push(totalCapacity);

    if (demand > totalCapacity) overloadSteps++;

    const currentAvgCpu = (demand / (readyTasks * capacityPerTask)) * 100;
    const totalScheduled = readyTasks + pendingTasks.length;

    if (currentAvgCpu > targetCpu && totalScheduled < maxTasks) {
      const desired = Math.min(maxTasks, Math.ceil(demand / (capacityPerTask * targetCpu / 100)));
      const toAdd = desired - totalScheduled;
      for (let i = 0; i < toAdd; i++) {
        pendingTasks.push(bootSteps + schedulingDelaySteps);
      }
    } else if (currentAvgCpu < targetCpu * scaleInThreshold && totalScheduled > minTasks) {
      if (t - lastScaleInStep >= coolInSteps) {
        readyTasks = Math.max(minTasks, readyTasks - 1);
        lastScaleInStep = t;
      }
    }
  }

  const badge = document.getElementById("sim-badge");
  if (overloadSteps === 0) {
    badge.className = "font-mono text-[11px] px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    badge.textContent = "0s capacity deficit";
  } else {
    badge.className = "font-mono text-[11px] px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    badge.textContent = `${overloadSteps * stepSec}s capacity deficit`;
  }

  const isDark = document.documentElement.classList.contains("dark");
  const canvas = document.getElementById("sim-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const maxVal = chartMax;
  const padL = 36, padR = 10, padT = 10, padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xAt = i => padL + (i / (steps - 1)) * plotW;
  const yAt = val => padT + plotH - (Math.min(val, maxVal) / maxVal) * plotH;

  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  for (let g = chartMax / 6; g < chartMax; g += chartMax / 6) {
    const y = yAt(g);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.fillStyle = isDark ? "#71717a" : "#a1a1aa";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(`${Math.round(g / capacityPerTask * 10) / 10}x`, 4, y + 3);
  }

  for (let i = 0; i < steps - 1; i++) {
    if (demandSeries[i] > capacitySeries[i]) {
      ctx.fillStyle = "rgba(244, 63, 94, 0.22)";
      const x1 = xAt(i), x2 = xAt(i + 1);
      const yDem = yAt(demandSeries[i]), yCap = yAt(capacitySeries[i]);
      ctx.fillRect(x1, yDem, x2 - x1 + 1, yCap - yDem);
    }
  }

  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  for (let i = 0; i < steps; i++) {
    const x = xAt(i), y = yAt(capacitySeries[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = isDark ? "#f4f4f5" : "#18181b";
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  for (let i = 0; i < steps; i++) {
    const x = xAt(i), y = yAt(demandSeries[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
