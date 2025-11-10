/* =============================================
   app.js – for Markdown Editor Project
   v20251110.1445
   ============================================= */
(() => {
  // === DEBUG MODE ===
  const debug = true;
  const log = (...args) => { if (debug) console.log('[DEBUG]', ...args); };

  const editorPane = document.getElementById('editor-pane');
  const previewPane = document.getElementById('preview-pane');
  const fileInput = document.getElementById('file-input');
  const statusBar = document.createElement('div');

  let editor, updatePreview;
  let spellcheck = true;
  let currentFileName = 'note.md';
  const STORAGE_KEY = 'markdown-editor-content';

  // === STATUS BAR ===
  const initStatusBar = () => {
    log('initStatusBar()');
    statusBar.id = 'status-bar';
    statusBar.style.cssText = `
      padding: 6px 14px;
      background: #2c3e50;
      color: #ecf0f1;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      z-index: 9;
    `;
    document.getElementById('container').appendChild(statusBar);
    updateStatus();
  };

  const updateStatus = () => {
    const text = editor.getValue();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = editor.lineCount();
    statusBar.innerHTML = `
      <span><i class="fas fa-save"></i> ${spellcheck ? 'Spellcheck ON' : 'Spellcheck OFF'}</span>
      <span>${words} words • ${chars} chars • ${lines} lines</span>
      <span id="auto-save-indicator" style="opacity:0; transition:opacity 0.3s">Saved</span>
    `;
    log(`updateStatus: ${words}w ${chars}c ${lines}l | Spellcheck: ${spellcheck}`);
  };

  // === AUTO-SAVE ===
  const autoSave = () => {
    log('autoSave()');
    localStorage.setItem(STORAGE_KEY, editor.getValue());
    const indicator = document.getElementById('auto-save-indicator');
    if (indicator) {
      indicator.style.opacity = '1';
      setTimeout(() => indicator.style.opacity = '0', 1000);
    }
  };

  // === EDITOR INIT ===
  const initEditor = () => {
    log('initEditor()');
    editor = CodeMirror(editorPane, {
      value: localStorage.getItem(STORAGE_KEY) || `# Markdown Editor\n\nStart typing...\n\n\`\`\`js\nconsole.log("Fixed!");\n\`\`\`\n`,
      lineNumbers: true,
      mode: 'markdown',
      theme: 'monokai',
      lineWrapping: true,
      inputStyle: 'contenteditable',
      spellcheck: true,
      autofocus: true,
      indentUnit: 2,
      tabSize: 2,
      extraKeys: {
        'Ctrl-B': () => { log('Ctrl+B'); document.getElementById('bold').click(); },
        'Ctrl-I': () => { log('Ctrl+I'); document.getElementById('italic').click(); },
        'Ctrl-F': () => { log('Ctrl+F → Find'); editor.execCommand('find'); },
        'F11': toggleFullscreen,
        'Ctrl-S': (cm) => { log('Ctrl+S'); autoSave(); return false; },
        'Ctrl-Enter': togglePreviewOnly,
        'Ctrl-Alt-C': () => { log('Ctrl+Alt+C'); document.querySelector('[data-lang]').closest('.dropdown').querySelector('button').click(); },
        Tab: cm => cm.getSelection().includes('\n')
                    ? cm.execCommand('indentMore')
                    : cm.execCommand('insertTab'),
        'Shift-Tab': 'indentLess'
      }
    });

    // FIX BLACK BOX
    const removePadding = () => {
      const scroller = document.querySelector('#editor-pane .cm-scroller');
      if (scroller) scroller.style.paddingBottom = '0';
    };
    editor.on('viewportChange', removePadding);
    setTimeout(removePadding, 100);

    // AUTO-CONTINUE BLOCKQUOTE
    editor.on('keydown', (cm, e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        if (/^>\s?/.test(line)) {
          e.preventDefault();
          cm.replaceSelection('\n> ');
          log('Auto-continued blockquote');
        }
      }
    });

    editor.on('change', () => {
      updatePreview();
      updateStatus();
      autoSave();
    });
  };

  // === LIVE PREVIEW ===
  const initPreview = () => {
    log('initPreview()');
    const deb = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    updatePreview = deb(() => {
      log('updatePreview()');
      const html = marked.parse(editor.getValue());
      previewPane.innerHTML = `<div class="preview">${html}</div>`;
      document.querySelectorAll('pre code').forEach(hljs.highlightElement);
    }, 150);
    editor.on('change', updatePreview);
    updatePreview();
  };

  // === TOOLBAR ===
  const initToolbar = () => {
    log('initToolbar()');
    const btn = id => {
      const el = document.getElementById(id);
      if (!	el && debug) log(`btn('${id}') → null`);
      return el;
    };

    // ---------- BOLD ----------
    btn('bold').onclick = () => {
      log('Bold clicked');
      const doc = editor.getDoc();
      const ranges = doc.listSelections();
      const newRanges = [];
      let changed = false;

      ranges.forEach(range => {
        if (range.from().line !== range.to().line) return;
        const text = doc.getRange(range.from(), range.to());
        const isBold = text.startsWith('**') && text.endsWith('**') && text.length >= 4;
        const newText = isBold ? text.slice(2, -2) : '**' + text + '**';
        doc.replaceRange(newText, range.from(), range.to());
        newRanges.push({
          anchor: range.from(),
          head: { line: range.from().line, ch: range.from().ch + newText.length }
        });
        changed = true;
      });

      if (changed) {
        doc.setSelections(newRanges);
        editor.focus();
      } else {
        btn('bold').style.background = '#e74c3c';
        setTimeout(() => btn('bold').style.background = '', 200);
      }
    };

    // ---------- ITALIC ----------
    btn('italic').onclick = () => {
      log('Italic clicked');
      const doc = editor.getDoc();
      const ranges = doc.listSelections();
      const newRanges = [];
      let changed = false;

      ranges.forEach(range => {
        if (range.from().line !== range.to().line) return;
        const text = doc.getRange(range.from(), range.to());
        const isItalic = text.startsWith('*') && text.endsWith('*') && text.length >= 2;
        const newText = isItalic ? text.slice(1, -1) : '*' + text + '*';
        doc.replaceRange(newText, range.from(), range.to());
        newRanges.push({
          anchor: range.from(),
          head: { line: range.from().line, ch: range.from().ch + newText.length }
        });
        changed = true;
      });

      if (changed) {
        doc.setSelections(newRanges);
        editor.focus();
      } else {
        btn('italic').style.background = '#e74c3c';
        setTimeout(() => btn('italic').style.background = '', 200);
      }
    };

    // ---------- INLINE CODE ----------
    btn('code').onclick = () => {
      log('Inline code clicked');
      const doc = editor.getDoc();
      const ranges = doc.listSelections();
      const newRanges = [];
      let changed = false;

      ranges.forEach(range => {
        if (range.from().line !== range.to().line) return;
        const text = doc.getRange(range.from(), range.to());
        const isCode = text.startsWith('`') && text.endsWith('`') && text.length >= 2;
        const newText = isCode ? text.slice(1, -1) : '`' + text + '`';
        doc.replaceRange(newText, range.from(), range.to());
        newRanges.push({
          anchor: range.from(),
          head: { line: range.from().line, ch: range.from().ch + newText.length }
        });
        changed = true;
      });

      if (changed) {
        doc.setSelections(newRanges);
        editor.focus();
      } else {
        btn('code').style.background = '#e74c3c';
        setTimeout(() => btn('code').style.background = '', 200);
      }
    };

    // ---------- BLOCKQUOTE ----------
    btn('blockquote').onclick = () => {
      log('Blockquote clicked');
      const doc = editor.getDoc();
      const ranges = doc.listSelections();
      const newRanges = [];

      ranges.forEach(range => {
        const fromLine = range.from().line;
        const toLine = range.to().line;
        const lines = [];
        for (let i = fromLine; i <= toLine; i++) {
          lines.push(doc.getLine(i));
        }

        const allQuoted = lines.every(l => /^>\s?/.test(l));
        const someQuoted = lines.some(l => /^>\s?/.test(l));
        const remove = allQuoted || (someQuoted && !allQuoted);

        const newLines = lines.map(l => {
          if (remove && /^>\s?/.test(l)) return l.replace(/^>\s?/, '');
          if (!remove && !/^>\s?/.test(l)) return '> ' + l;
          return l;
        });

        doc.replaceRange(newLines.join('\n'), { line: fromLine, ch: 0 }, { line: toLine, ch: doc.getLine(toLine).length });
        newRanges.push({
          anchor: { line: fromLine, ch: 0 },
          head: { line: fromLine + newLines.length - 1, ch: newLines[newLines.length - 1].length }
        });
      });

      doc.setSelections(newRanges);
      editor.focus();
    };

    // ---------- UNORDERED LIST ----------
    btn('list-ul').onclick = () => {
      log('Unordered list clicked');
      const doc = editor.getDoc();
      const ranges = doc.listSelections();
      const newRanges = [];

      ranges.forEach(range => {
        const fromLine = range.from().line;
        const toLine = range.to().line;
        const lines = [];
        for (let i = fromLine; i <= toLine; i++) {
          lines.push(doc.getLine(i));
        }

        const getBQPrefix = l => l.match(/^\s*>+\s*/)?.[0] || '';
        const stripBQ = l => l.replace(/^\s*>+\s*/, '');

        const allBulleted = lines
          .filter(l => stripBQ(l).trim() !== '')
          .every(l => /^\s*[-*+]\s/.test(stripBQ(l)));
        const someBulleted = lines
          .some(l => /^\s*[-*+]\s/.test(stripBQ(l)));
        const remove = allBulleted || (someBulleted && !allBulleted);

        const newLines = lines.map(l => {
          if (stripBQ(l).trim() === '') return l;
          const prefix = getBQPrefix(l);
          const inner = stripBQ(l);
          return remove
            ? prefix + inner.replace(/^\s*[-*+]\s+/, '').trimStart()
            : prefix + '- ' + inner.trimStart();
        });

        doc.replaceRange(newLines.join('\n'), { line: fromLine, ch: 0 }, { line: toLine, ch: doc.getLine(toLine).length });
        newRanges.push({
          anchor: { line: fromLine, ch: 0 },
          head: { line: fromLine + newLines.length - 1, ch: newLines[newLines.length - 1].length }
        });
      });

      doc.setSelections(newRanges);
      editor.focus();
    };

    // ---------- ORDERED LIST ----------
    btn('list-ol').onclick = () => {
      log('Ordered list clicked');
      const doc = editor.getDoc();
      const ranges = doc.listSelections();
      const newRanges = [];

      ranges.forEach(range => {
        const fromLine = range.from().line;
        const toLine = range.to().line;
        const lines = [];
        for (let i = fromLine; i <= toLine; i++) {
          lines.push(doc.getLine(i));
        }

        const getBQPrefix = l => l.match(/^\s*>+\s*/)?.[0] || '';
        const stripBQ = l => l.replace(/^\s*>+\s*/, '');

        const allNumbered = lines
          .filter(l => stripBQ(l).trim() !== '')
          .every(l => /^\s*\d+\.\s/.test(stripBQ(l)));
        const someNumbered = lines
          .some(l => /^\s*\d+\.\s/.test(stripBQ(l)));
        const remove = allNumbered || (someNumbered && !allNumbered);

        const newLines = lines.map(l => {
          if (stripBQ(l).trim() === '') return l;
          const prefix = getBQPrefix(l);
          const inner = stripBQ(l);
          return remove
            ? prefix + inner.replace(/^\s*\d+\.\s+/, '').trimStart()
            : prefix + '1. ' + inner.trimStart();
        });

        doc.replaceRange(newLines.join('\n'), { line: fromLine, ch: 0 }, { line: toLine, ch: doc.getLine(toLine).length });
        newRanges.push({
          anchor: { line: fromLine, ch: 0 },
          head: { line: fromLine + newLines.length - 1, ch: newLines[newLines.length - 1].length }
        });
      });

      doc.setSelections(newRanges);
      editor.focus();
    };

    // ---------- HEADINGS ----------
    document.querySelectorAll('[data-h]').forEach(b => {
      b.onclick = () => {
        const level = b.dataset.h;
        log(`Heading: ${level === 'remove' ? 'Remove' : `H${level}`}`);
        const doc = editor.getDoc();
        const cursor = doc.getCursor();
        const line = doc.getLine(cursor.line);
        const currentLevel = (line.match(/^(#{1,6})\s/) || [''])[1]?.length || 0;

        let newLine;
        if (level === 'remove') {
          newLine = line.replace(/^#+\s*/, '');
        } else {
          const n = parseInt(level);
          newLine = (currentLevel === n) ? line.replace(/^#+\s*/, '') : '#'.repeat(n) + ' ' + line.replace(/^#+\s*/, '');
        }

        doc.replaceRange(newLine, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
        editor.focus();
      };
    });

    // ---------- CODE BLOCK DROPDOWN ----------
    document.querySelectorAll('[data-lang]').forEach(b => {
      b.onclick = () => {
        const action = b.dataset.lang;
        log(`Code block action: ${action}`);
        const doc = editor.getDoc();
        const ranges = doc.listSelections();
        const newRanges = [];

        ranges.forEach(range => {
          const fromLine = range.from().line;
          const toLine = range.to().line;
          const lines = [];
          for (let i = fromLine; i <= toLine; i++) lines.push(doc.getLine(i));

          const getBQPrefix = l => l.match(/^\s*>+\s*/)?.[0] || '';
          const firstLine = lines[0];
          const lastLine = lines[lines.length - 1];
          const firstPrefix = getBQPrefix(firstLine);
          const lastPrefix = getBQPrefix(lastLine);
          const firstInner = firstLine.slice(firstPrefix.length);
          const lastInner = lastLine.slice(lastPrefix.length);

          const headerMatch = firstInner.match(/^```(\w*)/);
          const isCodeBlock = headerMatch !== null && lastInner.trim() === '```';

          if (action === 'remove' && isCodeBlock) {
            doc.replaceRange('', { line: fromLine, ch: 0 }, { line: fromLine + 1, ch: 0 });
            doc.replaceRange('', { line: toLine - 1, ch: 0 }, { line: toLine, ch: 0 });
            newRanges.push({
              anchor: { line: fromLine, ch: 0 },
              head: { line: toLine - 2, ch: doc.getLine(toLine - 2).length }
            });
          } else if (isCodeBlock) {
            const lang = action === 'none' ? '' : action;
            const top = '```' + lang;
            const bottom = '```';

            doc.replaceRange('', { line: fromLine, ch: 0 }, { line: fromLine + 1, ch: 0 });
            doc.replaceRange('', { line: toLine - 1, ch: 0 }, { line: toLine, ch: 0 });

            const newFrom = fromLine;
            const newTo = toLine - 1;
            doc.replaceRange(firstPrefix + top + '\n', { line:  newFrom, ch: 0 });
            doc.replaceRange('\n' + lastPrefix + bottom, { line: newTo, ch: doc.getLine(newTo).length });

            newRanges.push({
              anchor: { line: newFrom, ch: 0 },
              head: { line: newTo + 1, ch: (lastPrefix + bottom).length }
            });
          } else if (action !== 'remove') {
            const lang = action === 'none' ? '' : action;
            const top = '```' + lang;
            const bottom = '```';

            doc.replaceRange(firstPrefix + top + '\n', { line: fromLine, ch: 0 });
            doc.replaceRange('\n' + lastPrefix + bottom, { line: toLine + 1, ch: doc.getLine(toLine + 1).length });

            newRanges.push({
              anchor: { line: fromLine, ch: 0 },
              head: { line: toLine + 2, ch: (lastPrefix + bottom).length }
            });
          }
        });

        if (newRanges.length) {
          doc.setSelections(newRanges);
          editor.focus();
        }
      };
    });

    btn('link').onclick = () => editor.getDoc().replaceSelection(`[${editor.getDoc().getSelection()}](url)`);
    btn('image').onclick = () => editor.getDoc().replaceSelection(`![alt](url)`);
    btn('hr').onclick = () => editor.getDoc().replaceSelection('\n\n---\n\n');
    btn('table').onclick = () => editor.getDoc().replaceSelection('\n| H | H |\n|---|\n|   |   |\n');

    btn('search-btn').onclick = () => { log('Search → Find'); editor.execCommand('find'); };

    // SPELLCHECK — HIGHLIGHTED
    const spellBtn = btn('spellcheck-btn');
    if (spellBtn) {
      spellBtn.onclick = () => {
        spellcheck = !spellcheck;
        spellBtn.classList.toggle('active', spellcheck);
        editor.getInputField().spellcheck = spellcheck;
        localStorage.setItem('spellcheck', spellcheck);
        updateStatus();
        log(`Spellcheck: ${spellcheck ? 'ON' : 'OFF'}`);
      };
    }

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.title = 'Fullscreen (F11)';
    fullscreenBtn.style.cssText = 'margin-left: auto;';
    fullscreenBtn.onclick = toggleFullscreen;
    document.querySelector('.toolbar-group:last-child').appendChild(fullscreenBtn);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const togglePreviewOnly = () => {
    document.getElementById('split').classList.toggle('preview-only');
  };

  const initFile = () => {
    document.getElementById('file-open').onclick = () => fileInput.click();
    fileInput.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        editor.setValue(ev.target.result);
        currentFileName = f.name;
        autoSave();
      };
      r.readAsText(f);
    };

    const save = () => {
      const blob = new Blob([editor.getValue()], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = currentFileName;
      a.click();
    };
    document.getElementById('file-save').onclick = save;
    document.getElementById('file-saveas').onclick = save;

    document.getElementById('export-html').onclick = () => {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${currentFileName}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
<style>body{font-family:system-ui;max-width:800px;margin:40px auto;line-height:1.8;padding:20px;}</style>
</head><body>${marked.parse(editor.getValue())}</body></html>`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = currentFileName.replace(/\.md$/, '.html');
      a.click();
    };

    // EXPORT PDF
    const exportPDF = async () => {
      const { jsPDF } = window.jspdf;
      const previewDiv = document.querySelector('.preview');
      if (!previewDiv) return;

      const originalOverflow = previewPane.style.overflow;
      previewPane.style.overflow = 'hidden';

      try {
        const canvas = await html2canvas(previewDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#fff',
          width: previewDiv.scrollWidth,
          height: previewDiv.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        const pdf = new jsPDF('p', 'mm', 'a4');
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(currentFileName.replace(/\.md$/i, '.pdf'));
      } catch (e) {
        console.error('PDF Export Error:', e);
        alert('PDF export failed.');
      } finally {
        previewPane.style.overflow = originalOverflow;
      }
    };

    const fileDropdown = document.querySelector('.dropdown .dropdown-content');
    const pdfItem = document.createElement('button');
    pdfItem.innerHTML = '<i class="fas fa-file-pdf"></i> Export PDF';
    pdfItem.onclick = exportPDF;
    fileDropdown.insertBefore(pdfItem, document.getElementById('export-html'));
  };

  const showCheatsheet = () => {
    const sheet = document.createElement('div');
    sheet.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:#2c3e50; color:#ecf0f1; padding:20px; border-radius:10px;
      box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:10000; font-size:14px;
      max-width:400px; line-height:1.6;
    `;
    sheet.innerHTML = `
      <h3 style="margin-top:0; color:#27ae60"><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
      <hr style="border-color:#34495e">
      <b>Ctrl+B</b> Bold • <b>Ctrl+I</b> Italic • <b>Ctrl+F</b> Find<br>
      <b>F11</b> Fullscreen • <b>Ctrl+S</b> Save • <b>Ctrl+Enter</b> Preview Only<br>
      <b>Ctrl+Alt+C</b> Code Block<br>
      Click anywhere to close.
    `;
    sheet.onclick = () => sheet.remove();
    document.body.appendChild(sheet);
  };

  window.addEventListener('load', () => {
    log('=== APP START ===');
    initEditor();
    initPreview();
    initToolbar();
    initFile();
    initStatusBar();

    // RESTORE SPELLCHECK ONLY
    spellcheck = localStorage.getItem('spellcheck') !== 'false';
    const spellBtn = document.getElementById('spellcheck-btn');
    if (spellBtn) {
      spellBtn.classList.toggle('active', spellcheck);
      log(`Spellcheck restored: ${spellcheck ? 'ON' : 'OFF'}`);
    }
    editor.getInputField().spellcheck = spellcheck;

    Split(['#editor-pane', '#preview-pane'], { sizes: [50,50], minSize: 200, gutterSize: 8 });
    statusBar.ondblclick = showCheatsheet;

    const checkMobile = () => {
      document.getElementById('split').style.flexDirection = window.innerWidth < 700 ? 'column' : 'row';
    };
    window.addEventListener('resize', checkMobile);
    checkMobile();

    log('=== APP READY ===');
  });
})();