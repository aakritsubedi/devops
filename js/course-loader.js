async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url.pathname}: HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${url.pathname}: invalid JSON`);
  }
}

function validateChapter(chapter, source, taskIds) {
  const require = (condition, field) => {
    if (!condition) throw new Error(`${source}: invalid or missing ${field}`);
  };
  require(chapter && typeof chapter === 'object', 'chapter object');
  require(Number.isInteger(chapter.week) && chapter.week > 0, 'week');
  for (const field of ['mode', 'title', 'subtitle', 'phase', 'analogy', 'svgDiagram']) {
    require(typeof chapter[field] === 'string', field);
  }
  for (const field of ['handHoldingSteps', 'concepts']) {
    require(Array.isArray(chapter[field]) && chapter[field].every(item => typeof item === 'string'), field);
  }
  require(Array.isArray(chapter.codeFiles) && chapter.codeFiles.length > 0, 'codeFiles (at least one)');
  require(chapter.codeFiles.every(file => file && typeof file.filename === 'string' && typeof file.code === 'string'), 'codeFiles');
  for (const file of chapter.codeFiles) {
    if (file.language !== undefined) require(typeof file.language === 'string', 'codeFiles.language');
    if (file.description !== undefined) require(typeof file.description === 'string', 'codeFiles.description');
    if (file.walkthrough !== undefined) {
      require(Array.isArray(file.walkthrough) && file.walkthrough.every(item => item &&
        typeof item.title === 'string' && typeof item.explanation === 'string'), 'codeFiles.walkthrough');
    }
  }
  for (const field of ['objectives', 'prerequisites']) {
    if (chapter[field] !== undefined) {
      require(Array.isArray(chapter[field]) && chapter[field].every(item => typeof item === 'string'), field);
    }
  }
  if (chapter.lessons !== undefined) {
    require(Array.isArray(chapter.lessons) && chapter.lessons.every(item => item &&
      typeof item.title === 'string' && Array.isArray(item.body) && item.body.every(text => typeof text === 'string') &&
      (item.bullets === undefined || (Array.isArray(item.bullets) && item.bullets.every(text => typeof text === 'string')))), 'lessons');
  }
  if (chapter.commands !== undefined) {
    require(Array.isArray(chapter.commands) && chapter.commands.every(item => item &&
      ['command', 'explanation', 'expected'].every(key => typeof item[key] === 'string')), 'commands');
  }
  for (const field of ['flowDiagram', 'flowDescription', 'architectureDescription']) {
    if (chapter[field] !== undefined) require(typeof chapter[field] === 'string', field);
  }
  if (chapter.sources !== undefined) {
    require(Array.isArray(chapter.sources) && chapter.sources.every(item => item &&
      typeof item.label === 'string' && typeof item.url === 'string' && /^https:\/\//.test(item.url)), 'sources');
  }
  for (const [field, properties] of Object.entries({
    breakItDrill: ['title', 'scenario', 'symptom', 'fix'],
    assignment: ['title', 'description'],
    recallNote: ['keyTakeaway']
  })) {
    require(chapter[field] && properties.every(key => typeof chapter[field][key] === 'string'), field);
  }
  require(Array.isArray(chapter.recallNote.bullets) && chapter.recallNote.bullets.every(item => typeof item === 'string'), 'recallNote.bullets');
  require(Array.isArray(chapter.checklist), 'checklist');
  for (const item of chapter.checklist) {
    require(item && typeof item.id === 'string' && item.id.length > 0 && typeof item.text === 'string', 'checklist item');
    require(!taskIds.has(item.id), `unique checklist ID (${item.id})`);
    taskIds.add(item.id);
  }
  if (!chapter.simulator) return;
  const { controls, scenario } = chapter.simulator;
  for (const key of ['cpu', 'min', 'max', 'boot', 'cool']) {
    const control = controls?.[key];
    require(control && ['min', 'max', 'step', 'value'].every(field => Number.isFinite(control[field])) &&
      control.min > 0 && control.max >= control.min && control.step > 0 &&
      control.value >= control.min && control.value <= control.max &&
      typeof control.label === 'string' && typeof control.unit === 'string', `simulator.controls.${key}`);
  }
  require(scenario && ['steps', 'stepSeconds', 'capacityPerTask', 'chartMax', 'scaleInThreshold'].every(key => Number.isFinite(scenario[key]) && scenario[key] > 0) &&
    Number.isInteger(scenario.steps) && scenario.steps > 1 &&
    Number.isFinite(scenario.baseDemand) && scenario.baseDemand >= 0 &&
    Number.isInteger(scenario.schedulingDelaySteps) && scenario.schedulingDelaySteps >= 0,
    'simulator.scenario');
  require(Array.isArray(scenario.waves) && scenario.waves.every(wave => wave &&
    ['start', 'end', 'baseline', 'amplitude'].every(key => Number.isFinite(wave[key])) && wave.end > wave.start), 'simulator.scenario.waves');
  require(typeof chapter.simulator.caption === 'string', 'simulator.caption');
}

export async function loadCourse(url = new URL('../config/course.json', import.meta.url)) {
  const configURL = new URL(url, import.meta.url);
  const config = await readJSON(configURL);
  if (!config || !Array.isArray(config.chapters) || config.chapters.length === 0 ||
    !config.chapters.every(path => typeof path === 'string' && path.length > 0)) {
    throw new Error('course.json: chapters must list at least one chapter file');
  }
  for (const field of ['title', 'name', 'tagline', 'logoText', 'chapterUnit', 'durationUnit']) {
    if (typeof config[field] !== 'string') throw new Error(`course.json: invalid or missing ${field}`);
  }
  if (!config.storage || !['progressKey', 'themeKey'].every(key => typeof config.storage[key] === 'string' && config.storage[key].length > 0)) {
    throw new Error('course.json: storage requires progressKey and themeKey');
  }
  const chapters = await Promise.all(config.chapters.map(path => readJSON(new URL(path, configURL))));
  const taskIds = new Set();
  chapters.forEach((chapter, index) => validateChapter(chapter, config.chapters[index], taskIds));
  return { config, chapters };
}
