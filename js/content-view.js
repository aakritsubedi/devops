export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

export function formatText(value) {
  return escapeHTML(value).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function highlight(code, language) {
  const prism = globalThis.Prism;
  const grammar = prism?.languages[language];
  return grammar ? prism.highlight(code, grammar, language) : escapeHTML(code);
}

function editor({ filename, code, language = 'plaintext' }, index, terminal = false) {
  const lines = code.replace(/\n$/, '').split('\n').length;
  const action = terminal ? 'copy-command' : 'copy-code';
  const indexAttribute = terminal ? `data-command-index="${index}"` : `data-file-index="${index}"`;
  return `
    <div class="code-editor ${terminal ? 'terminal-editor' : ''}">
      <div class="editor-titlebar">
        <span class="editor-lights" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="editor-filename">${escapeHTML(filename)}</span>
        <div class="editor-actions">
          ${terminal ? '' : `<button data-action="download-code" ${indexAttribute} aria-label="Download ${escapeHTML(filename)}">Download</button>`}
          <button data-action="${action}" ${indexAttribute} aria-label="Copy ${escapeHTML(filename)}">Copy</button>
        </div>
      </div>
      <div class="editor-scroll">
        <div class="editor-source">
          <div class="editor-gutter" aria-hidden="true">${Array.from({length: lines}, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
          <pre class="editor-code" tabindex="0" aria-label="${escapeHTML(filename)} source"><code class="language-${escapeHTML(language)}">${highlight(code, language)}</code></pre>
        </div>
      </div>
      <div class="editor-status"><span>${escapeHTML(language.toUpperCase())}</span><span>${lines} lines <span aria-hidden="true">·</span> UTF-8 <span aria-hidden="true">·</span> Read only</span></div>
    </div>`;
}

export function renderCodeFiles(files) {
  return files.map((file, index) => `
    <li class="course-file">
      <h3 id="code-file-${index}" class="file-section-title"><span class="section-number">${String(index + 1).padStart(2, '0')}</span>${escapeHTML(file.filename)}</h3>
      ${file.description ? `<p class="course-prose file-description">${formatText(file.description)}</p>` : ''}
      ${editor(file, index)}
      ${file.walkthrough?.length ? `<div class="code-walkthrough"><h4>How this code works</h4><ol>${file.walkthrough.map(item => `
        <li><strong>${formatText(item.title)}</strong><p>${formatText(item.explanation)}</p></li>
      `).join('')}</ol></div>` : ''}
    </li>`).join('');
}

export function renderObjectives(chapter) {
  return `<section class="learning-overview" aria-labelledby="learning-heading">
    <div><h2 id="learning-heading">What you will learn</h2><ul>${(chapter.objectives || []).map(item => `<li>${formatText(item)}</li>`).join('')}</ul></div>
    <div class="prerequisites"><h3>Before you start</h3><ul>${(chapter.prerequisites || []).map(item => `<li>${formatText(item)}</li>`).join('')}</ul></div>
  </section>`;
}

export function renderLessons(lessons = []) {
  return `<section class="fundamental-lessons" aria-labelledby="fundamentals-heading">
    <h2 id="fundamentals-heading" class="course-section-heading">Understand the fundamentals</h2>
    ${lessons.map((lesson, index) => `<section class="fundamental-lesson">
      <h3><span class="section-number">${String(index + 1).padStart(2, '0')}</span>${escapeHTML(lesson.title)}</h3>
      ${lesson.body.map(paragraph => `<p class="course-prose">${formatText(paragraph)}</p>`).join('')}
      ${lesson.bullets?.length ? `<ul class="course-prose">${lesson.bullets.map(item => `<li>${formatText(item)}</li>`).join('')}</ul>` : ''}
    </section>`).join('')}
  </section>`;
}

export function renderCommands(commands = []) {
  if (!commands.length) return '';
  return `<section aria-labelledby="commands-heading" class="command-reference">
    <h2 id="commands-heading" class="course-section-heading">Commands: run, understand, verify</h2>
    <ol>${commands.map((item, index) => `<li>
      <h3 class="command-heading"><span class="section-number">${String(index + 1).padStart(2, '0')}</span>${formatText(item.explanation)}</h3>
      ${editor({filename: 'Terminal · repository root', code: item.command, language: 'bash'}, index, true)}
      <p class="expected-result"><strong>Expected result</strong>${formatText(item.expected)}</p>
    </li>`).join('')}</ol>
  </section>`;
}

export function renderSources(sources = []) {
  if (!sources.length) return '';
  return `<section class="course-sources" aria-labelledby="sources-heading"><h2 id="sources-heading" class="course-section-heading">Keep learning: official references</h2><ul>${sources.map(item => `<li><a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>`;
}
