import { loadCourse } from './course-loader.js';
import { drawSimulator } from './simulator.js';
import { escapeHTML, formatText, renderCodeFiles, renderObjectives, renderLessons, renderCommands, renderSources } from './content-view.js';

let courseConfig;
let courseModules = [];
let completedTasks = {};
let currentModuleIndex = 0;

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(courseConfig.storage.themeKey, isDark ? "dark" : "light");
  if (courseModules[currentModuleIndex].simulator) runSimulator();
}

function saveProgress() {
  localStorage.setItem(courseConfig.storage.progressKey, JSON.stringify(completedTasks));
  updateGlobalProgressUI();
  renderSidebar();
}

function toggleTask(taskId) {
  completedTasks[taskId] = !completedTasks[taskId];
  saveProgress();
  renderLesson(currentModuleIndex);
}

function resetProgress() {
  if (confirm("Reset all saved checklist progress?")) {
    completedTasks = {};
    saveProgress();
    renderLesson(currentModuleIndex);
  }
}

function updateGlobalProgressUI() {
  const allTasks = courseModules.flatMap(m => m.checklist);
  const doneCount = allTasks.filter(t => completedTasks[t.id]).length;
  const pct = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;
  document.getElementById("progress-percentage").textContent = `${pct}%`;
  document.getElementById("progress-bar").style.width = `${pct}%`;
  document.getElementById("progress-count").textContent = `${doneCount}/${allTasks.length} completed`;
}

function renderSidebar() {
  const nav = document.getElementById("module-nav");
  nav.innerHTML = courseModules.map((mod, idx) => {
    const modDone = mod.checklist.filter(t => completedTasks[t.id]).length;
    const isComplete = mod.checklist.length > 0 && modDone === mod.checklist.length;
    const isActive = idx === currentModuleIndex;
    const badgeStyle = mod.badgeTone === 'indigo'
      ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
      : "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";

    return `
      <button data-action="select-module" data-index="${idx}" class="w-full text-left px-3 py-2.5 rounded-lg transition flex items-start gap-2.5 group ${
        isActive
          ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100"
          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200"
      }">
        <span class="font-mono text-[11px] mt-0.5 w-5 shrink-0 ${
          isComplete ? "text-emerald-600 dark:text-emerald-400 font-semibold" : isActive ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-400 dark:text-zinc-500"
        }">${isComplete ? "✓" : formatChapterNumber(mod.week)}</span>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate leading-snug ${isActive ? "text-zinc-900 dark:text-zinc-100" : ""}">${formatText(mod.title)}</p>
          <div class="flex items-center justify-between mt-1">
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border ${badgeStyle}">${formatText(mod.mode)}</span>
            <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">${modDone}/${mod.checklist.length}</span>
          </div>
        </div>
      </button>
    `;
  }).join("");
}

function selectModule(idx) {
  currentModuleIndex = idx;
  renderSidebar();
  renderLesson(idx);
  document.getElementById("lesson-container").scrollTop = 0;
}

function navigateModule(delta) {
  const next = currentModuleIndex + delta;
  if (next >= 0 && next < courseModules.length) selectModule(next);
}

async function copyCode(btn) {
  const chapter = courseModules[currentModuleIndex];
  const code = btn.dataset.action === 'copy-command'
    ? chapter.commands[Number(btn.dataset.commandIndex)].command
    : chapter.codeFiles[Number(btn.dataset.fileIndex)].code;
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    btn.textContent = 'Copy failed';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
    return;
  }
  const original = btn.innerHTML;
  btn.textContent = "Copied";
  setTimeout(() => (btn.innerHTML = original), 1400);
}

function downloadCode(index) {
  const file = courseModules[currentModuleIndex].codeFiles[index];
  const url = URL.createObjectURL(new Blob([file.code], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename.split('/').pop();
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderLesson(idx) {
  const mod = courseModules[idx];
  document.getElementById("header-week-badge").textContent = `${courseConfig.chapterUnit} ${formatChapterNumber(mod.week)}`;
  document.getElementById("header-mode-badge").textContent = mod.mode;
  document.getElementById("header-title").textContent = mod.title;
  document.getElementById("prev-btn").disabled = idx === 0;
  document.getElementById("next-btn").disabled = idx === courseModules.length - 1;

  const handHoldingHtml = (mod.handHoldingSteps || []).map((step, i) => `
    <li class="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0 border-b last:border-b-0 border-zinc-200/60 dark:border-zinc-800/60">
      <span class="w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-mono text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">${i + 1}</span>
      <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">${formatText(step)}</p>
    </li>
  `).join("");

  const conceptsHtml = mod.concepts.map((c, i) => {
    const [boldPart, ...rest] = c.split(":");
    return `
      <div class="py-3.5 first:pt-0 last:pb-0 border-b last:border-b-0 border-zinc-200/70 dark:border-zinc-800/70 flex items-baseline gap-3.5">
        <span class="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">0${i + 1}</span>
        <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <strong class="text-zinc-900 dark:text-zinc-100 font-medium">${formatText(boldPart)}:</strong>${formatText(rest.join(":"))}
        </p>
      </div>
    `;
  }).join("");

  const codeFilesHtml = renderCodeFiles(mod.codeFiles);

  const simulatorHtml = mod.simulator ? `
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Interactive Capacity Simulator</h2>
        <span id="sim-badge" class="font-mono text-[11px] px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">0s overload</span>
      </div>
      <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-5 space-y-5">
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
          ${Object.entries(mod.simulator.controls).map(([key, control]) => `
            <div><div class="flex justify-between text-xs mb-1.5"><span class="text-zinc-500">${escapeHTML(control.label)}</span><span id="val-${key}" class="font-mono font-medium">${control.value}${control.unit}</span></div><input id="sim-${key}" data-simulator-control type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}" class="w-full"/></div>
          `).join('')}
        </div>
        <div class="pt-2">
          <canvas id="sim-canvas" width="800" height="210" class="w-full h-auto"></canvas>
          <div class="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-400">
            <div class="flex items-center gap-5">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-0.5 bg-zinc-900 dark:bg-zinc-100 inline-block"></span> Demand</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-0.5 bg-emerald-500 inline-block"></span> Ready Capacity</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-rose-500/20 border border-rose-500/50 inline-block rounded-sm"></span> Capacity Deficit</span>
            </div>
            <span>${mod.simulator.caption}</span>
          </div>
        </div>
      </div>
    </section>
  ` : "";

  const recallBulletsHtml = (mod.recallNote?.bullets || []).map(b => `
    <li class="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
      <span class="font-mono text-zinc-400 mt-0.5">&rarr;</span><span>${formatText(b)}</span>
    </li>
  `).join("");

  const checklistHtml = mod.checklist.map(item => {
    const checked = !!completedTasks[item.id];
    return `
      <label class="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition select-none ${
        checked
          ? "bg-zinc-100/70 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
          : "bg-white dark:bg-[#0c0c0e] border-zinc-200 dark:border-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200"
      }">
        <input type="checkbox" ${checked ? "checked" : ""} data-task-id="${escapeHTML(item.id)}" class="w-3.5 h-3.5 rounded accent-zinc-900 dark:accent-zinc-100 cursor-pointer"/>
        <span class="text-xs font-medium ${checked ? "line-through" : ""}">${formatText(item.text)}</span>
      </label>
    `;
    }).join("");

  const container = document.getElementById("lesson-container");
  container.innerHTML = `
    <article class="course-article max-w-4xl mx-auto space-y-12 pb-16">
      <!-- Module Header -->
      <header class="space-y-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-6">
        <div class="flex items-center gap-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          <span>${courseConfig.chapterUnit.toUpperCase()} ${formatChapterNumber(mod.week)}</span>
          <span>&bull;</span>
          <span class="uppercase">${formatText(mod.phase)}</span>
          <span>&bull;</span>
          <span class="text-zinc-700 dark:text-zinc-300">${formatText(mod.mode)}</span>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">${formatText(mod.title)}</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">${formatText(mod.subtitle)}</p>
      </header>

      ${renderObjectives(mod)}

      <!-- Beginner Mental Model / Analogy -->
      <section class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 p-5 space-y-1.5">
        <h2 class="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
          Understand the Mental Model
        </h2>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          ${formatText(mod.analogy)}
        </p>
      </section>

      ${renderLessons(mod.lessons)}

      <!-- Architecture Diagram -->
      <section class="space-y-2.5">
        <h2 class="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Architecture & Mechanism</h2>
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] bg-dot-grid p-4">
          ${mod.svgDiagram}
        </div>
        <p class="course-prose diagram-caption">${formatText(mod.architectureDescription || '')}</p>
      </section>

      ${mod.flowDiagram ? `<section class="space-y-3" aria-labelledby="flow-heading">
        <h2 id="flow-heading" class="course-section-heading">Follow the flow</h2>
        <div class="diagram-panel">${mod.flowDiagram}</div>
        <p class="course-prose diagram-caption">${formatText(mod.flowDescription || '')}</p>
      </section>` : ''}

      <!-- Step-by-Step Beginner Hand-Holding Guide -->
      <section class="space-y-2.5">
        <h2 class="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Follow Along: ${formatText(mod.mode)}
        </h2>
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] px-5 py-4">
          <ol class="list-none">
            ${handHoldingHtml}
          </ol>
        </div>
      </section>

      <!-- Core Engineering Notes -->
      <section class="space-y-2.5">
        <h2 class="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Key Engineering Concepts</h2>
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] px-5 py-4">
          ${conceptsHtml}
        </div>
      </section>

      ${simulatorHtml}

      ${renderCommands(mod.commands)}

      <!-- Code examples in lesson order -->
      <section class="space-y-4" aria-labelledby="code-examples-heading">
        <h2 id="code-examples-heading" class="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Code & Reference Files</h2>
        <ol class="code-files space-y-10">
          ${codeFilesHtml}
        </ol>
      </section>

      <!-- "Break It" Drill -->
      <section class="space-y-2.5">
        <h2 class="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Failure Mode Drill — ${formatText(mod.breakItDrill.title)}</h2>
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] divide-y divide-zinc-200 dark:divide-zinc-800">
          <div class="p-4 space-y-1">
            <div class="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-medium">01 / Inject Fault</div>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${formatText(mod.breakItDrill.scenario)}</p>
          </div>
          <div class="p-4 space-y-1">
            <div class="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">02 / System Behavior</div>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${formatText(mod.breakItDrill.symptom)}</p>
          </div>
          <div class="p-4 space-y-1">
            <div class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">03 / Recovery</div>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${formatText(mod.breakItDrill.fix)}</p>
          </div>
        </div>
      </section>

      <!-- Practice assignment and review -->
      <section class="space-y-6">
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-5 space-y-2.5 flex flex-col justify-between">
          <div class="space-y-2">
            <h2 class="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
              <span>Practice Assignment</span>
            </h2>
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">${formatText(mod.assignment.title)}</h3>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${formatText(mod.assignment.description)}</p>
          </div>
          <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-400">
            ${formatText(mod.assignment.completionHint || "")}
          </div>
        </div>

        <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-5 space-y-3">
          <h2 class="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
            Review & Key Takeaways
          </h2>
          <p class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 border-l-2 border-zinc-900 dark:border-zinc-100 pl-2.5 py-0.5">
            ${formatText(mod.recallNote.keyTakeaway)}
          </p>
          <ul class="space-y-1.5 pt-1">
            ${recallBulletsHtml}
          </ul>
        </div>
      </section>

      <!-- Verification Checklist -->
      <section class="space-y-2.5">
        <h2 class="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Module Verification Checklist</h2>
        <div class="space-y-1.5">
          ${checklistHtml}
        </div>
      </section>
      ${renderSources(mod.sources)}
    </article>
  `;

  if (mod.simulator) {
    setTimeout(runSimulator, 20);
  }
}


function formatChapterNumber(week) {
  return String(week).padStart(2, '0');
}

function runSimulator() {
  const config = courseModules[currentModuleIndex]?.simulator;
  if (config) drawSimulator(config);
}

function bindEvents() {
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  document.getElementById('reset-progress-btn').addEventListener('click', resetProgress);
  document.getElementById('prev-btn').addEventListener('click', () => navigateModule(-1));
  document.getElementById('next-btn').addEventListener('click', () => navigateModule(1));
  document.getElementById('module-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-action="select-module"]');
    if (button) selectModule(Number(button.dataset.index));
  });
  const container = document.getElementById('lesson-container');
  container.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (['copy-code', 'copy-command'].includes(button?.dataset.action)) copyCode(button);
    if (button?.dataset.action === 'download-code') downloadCode(Number(button.dataset.fileIndex));
  });
  container.addEventListener('change', event => {
    if (event.target.matches('[data-task-id]')) toggleTask(event.target.dataset.taskId);
  });
  container.addEventListener('input', event => {
    if (event.target.matches('[data-simulator-control]')) runSimulator();
  });
}

async function boot() {
  try {
    ({config: courseConfig, chapters: courseModules} = await loadCourse());
    document.title = courseConfig.title;
    for (const [id, value] of Object.entries({
      'course-name': courseConfig.name,
      'course-tagline': courseConfig.tagline,
      'course-logo': courseConfig.logoText,
      'course-duration': `${courseModules.length} ${courseConfig.durationUnit}`
    })) document.getElementById(id).textContent = value;
    try {
      const saved = JSON.parse(localStorage.getItem(courseConfig.storage.progressKey) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) completedTasks = saved;
    } catch {
      completedTasks = {};
    }
    if (localStorage.getItem(courseConfig.storage.themeKey) === 'light') {
      document.documentElement.classList.remove('dark');
    }
    bindEvents();
    updateGlobalProgressUI();
    renderSidebar();
    renderLesson(0);
    document.getElementById('theme-btn').disabled = false;
    document.getElementById('reset-progress-btn').disabled = false;
  } catch (error) {
    const container = document.getElementById('lesson-container');
    container.textContent = `Unable to load the course: ${error.message}`;
    container.setAttribute('role', 'alert');
    console.error(error);
  }
}

boot();
