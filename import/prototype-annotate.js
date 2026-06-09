/**
 * 原型标注（共享）
 * 用法：PrototypeAnnotate.init({ storageKey, exportTitle, scopeLabels, builtins, toast, nowStr })
 */
(function (global) {
  'use strict';

  const DEFAULT_SCOPE_LABELS = { page: '页面' };

  let config = {};
  let annotations = [];
  let annoMode = false;
  let annoEditingId = null;
  let annoPendingCtx = null;

  function toast(msg) {
    if (typeof config.toast === 'function') config.toast(msg);
    else alert(msg);
  }

  function nowStr() {
    if (typeof config.nowStr === 'function') return config.nowStr();
    const n = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
  }

  function escapeAnno(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function scopeLabel(scope) {
    const labels = config.scopeLabels || DEFAULT_SCOPE_LABELS;
    return labels[scope] || scope || '页面';
  }

  function builtinList() {
    return (config.builtins || []).map((a) => ({ ...a }));
  }

  function builtinIds() {
    return new Set(builtinList().map((b) => b.id));
  }

  function normalizeAnnotations() {
    annotations.forEach((a) => {
      if (!a.scope) a.scope = 'page';
    });
  }

  function loadAnnotations() {
    const builtins = builtinList();
    try {
      const raw = localStorage.getItem(config.storageKey);
      const saved = raw ? JSON.parse(raw) : [];
      const ids = builtinIds();
      const extra = (Array.isArray(saved) ? saved : []).filter((a) => !ids.has(a.id));
      annotations = [...builtins, ...extra];
      annotations.forEach((a, i) => {
        a.no = i + 1;
      });
      normalizeAnnotations();
    } catch {
      annotations = builtins;
    }
  }

  function saveAnnotations() {
    localStorage.setItem(config.storageKey, JSON.stringify(annotations));
  }

  function ensureAnnoDOM() {
    if (document.getElementById('annoPins')) return;
    const html = `
<div class="anno-hint anno-ui">标注模式已开启：点击页面任意位置添加标注</div>
<div class="anno-pins anno-ui" id="annoPins"></div>
<div class="anno-bar anno-ui">
  <span class="anno-count" id="annoCount">标注 0</span>
  <button class="btn-anno" id="annoModeBtn" type="button">标注模式</button>
  <button class="btn-anno" id="annoPanelBtn" type="button">标注列表</button>
  <button class="btn-anno" id="annoExportBtn" type="button">导出</button>
  <button class="btn-anno" id="annoClearBtn" type="button">清空</button>
</div>
<div class="anno-panel anno-ui" id="annoPanel">
  <div class="anno-panel-head"><span>标注列表</span><span class="link" id="annoPanelClose" style="cursor:pointer;color:#2f6bff">关闭</span></div>
  <div class="anno-panel-body" id="annoList"></div>
</div>
<div class="anno-editor anno-ui" id="annoEditor">
  <label id="annoEditorLabel">标注 #1</label>
  <textarea id="annoEditorText" placeholder="填写说明，如：此处需二次确认、字段含义等"></textarea>
  <div class="anno-editor-foot">
    <button type="button" id="annoEditorCancel" style="height:28px;padding:0 12px;border:1px solid #e8ebf0;border-radius:6px;background:#fff;cursor:pointer">取消</button>
    <button type="button" id="annoEditorSave" style="height:28px;padding:0 12px;border:none;border-radius:6px;background:#2f6bff;color:#fff;cursor:pointer">保存</button>
  </div>
</div>`;
    const host = document.createElement('div');
    host.innerHTML = html;
    while (host.firstChild) document.body.appendChild(host.firstChild);
  }

  function ensureModalPins() {
    document.querySelectorAll('.overlay').forEach((overlay) => {
      const modal = overlay.querySelector('.modal');
      if (!modal) return;
      if (!overlay.id) return;
      if (modal.querySelector('.anno-scope-pins')) return;
      const pins = document.createElement('div');
      pins.className = 'anno-scope-pins';
      pins.dataset.annoScope = overlay.id;
      modal.appendChild(pins);
    });
  }

  function getAnnoContextFromClick(e) {
    const overlay = e.target.closest('.overlay.show');
    if (overlay) {
      const modal = overlay.querySelector('.modal');
      const rect = modal.getBoundingClientRect();
      return {
        scope: overlay.id,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        editorX: e.pageX,
        editorY: e.pageY,
      };
    }
    return { scope: 'page', x: e.pageX, y: e.pageY, editorX: e.pageX, editorY: e.pageY };
  }

  function getPagePosFromAnno(a) {
    if (!a.scope || a.scope === 'page') return { x: a.x, y: a.y };
    const overlay = document.getElementById(a.scope);
    if (!overlay) return { x: a.x, y: a.y };
    const modal = overlay.querySelector('.modal');
    if (!modal) return { x: a.x, y: a.y };
    const rect = modal.getBoundingClientRect();
    return { x: rect.left + a.x, y: rect.top + a.y };
  }

  function getAnnoPinContainer(a) {
    if (!a.scope || a.scope === 'page') return document.getElementById('annoPins');
    const overlay = document.getElementById(a.scope);
    return overlay ? overlay.querySelector('.anno-scope-pins') : null;
  }

  function bindAnnoPinEvents(pin, id) {
    pin.onclick = (e) => {
      e.stopPropagation();
      if (annoMode) return;
      highlightAnno(id);
    };
    pin.ondblclick = (e) => {
      e.stopPropagation();
      const a = annotations.find((x) => x.id === id);
      if (a) {
        const pos = getPagePosFromAnno(a);
        openAnnoEditor(pos.x, pos.y, id);
      }
    };
  }

  function createAnnoPinElement(a) {
    const pin = document.createElement('div');
    pin.className = 'anno-pin';
    pin.dataset.id = a.id;
    pin.style.left = a.x + 'px';
    pin.style.top = a.y + 'px';
    pin.innerHTML = `<div class="dot">${a.no}</div><div class="tip">${escapeAnno(a.text)}</div>`;
    bindAnnoPinEvents(pin, a.id);
    return pin;
  }

  function updateAnnoCount() {
    const el = document.getElementById('annoCount');
    if (el) el.textContent = `标注 ${annotations.length}`;
  }

  function renderAnnoPins() {
    const root = document.getElementById('annoPins');
    if (!root) return;
    root.innerHTML = '';
    document.querySelectorAll('.anno-scope-pins').forEach((el) => {
      el.innerHTML = '';
    });
    annotations.forEach((a) => {
      if (a.scope && a.scope !== 'page') {
        const overlay = document.getElementById(a.scope);
        if (!overlay || !overlay.classList.contains('show')) return;
      }
      const container = getAnnoPinContainer(a);
      if (container) container.appendChild(createAnnoPinElement(a));
    });
  }

  function renderAnnoList() {
    const box = document.getElementById('annoList');
    if (!box) return;
    if (!annotations.length) {
      box.innerHTML = '<div class="anno-empty">暂无标注<br>开启标注模式后点击页面添加</div>';
      return;
    }
    box.innerHTML = annotations
      .map(
        (a) => `
    <div class="anno-item" data-id="${a.id}">
      <span class="del" data-del="${a.id}">删除</span>
      <span class="no">${a.no}</span>
      <div class="txt">${escapeAnno(a.text)}</div>
      <div class="meta">${scopeLabel(a.scope)}${a.time ? ' · ' + a.time : ''}</div>
    </div>`
      )
      .join('');
    box.querySelectorAll('.anno-item').forEach((item) => {
      item.onclick = () => highlightAnno(+item.dataset.id, true);
    });
    box.querySelectorAll('[data-del]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        deleteAnno(+btn.dataset.del);
      };
    });
  }

  function clearAnnoHighlight() {
    document.querySelectorAll('.anno-pin.active, .anno-item.active').forEach((el) => el.classList.remove('active'));
  }

  function highlightAnno(id, scroll) {
    clearAnnoHighlight();
    const a = annotations.find((x) => x.id === id);
    if (!a) return;
    if (a.scope && a.scope !== 'page') {
      const overlay = document.getElementById(a.scope);
      if (overlay) overlay.classList.add('show');
      renderAnnoPins();
    }
    const pin = document.querySelector(`.anno-pin[data-id="${id}"]`);
    const item = document.querySelector(`.anno-item[data-id="${id}"]`);
    if (pin) pin.classList.add('active');
    if (item) item.classList.add('active');
    document.getElementById('annoPanel')?.classList.add('show');
    if (scroll && (!a.scope || a.scope === 'page')) {
      window.scrollTo({ top: Math.max(0, a.y - window.innerHeight / 3), behavior: 'smooth' });
    }
  }

  function openAnnoEditor(x, y, id, ctx) {
    const editor = document.getElementById('annoEditor');
    if (!editor) return;
    annoEditingId = id || null;
    annoPendingCtx = id ? null : ctx || null;
    const a = id ? annotations.find((item) => item.id === id) : null;
    document.getElementById('annoEditorLabel').textContent = a
      ? `编辑标注 #${a.no}`
      : `新建标注 #${annotations.length + 1}`;
    document.getElementById('annoEditorText').value = a ? a.text : '';
    let left = x + 12;
    let top = y + 12;
    if (left + 300 > window.innerWidth) left = x - 292;
    if (top + 180 > window.innerHeight) top = y - 180;
    editor.style.left = Math.max(8, left) + 'px';
    editor.style.top = Math.max(8, top) + 'px';
    editor.classList.add('show');
    document.getElementById('annoEditorText').focus();
  }

  function closeAnnoEditor() {
    document.getElementById('annoEditor')?.classList.remove('show');
    annoEditingId = null;
    annoPendingCtx = null;
  }

  function saveAnnoEditor() {
    const text = document.getElementById('annoEditorText').value.trim();
    if (!text) {
      toast('请填写标注内容');
      return;
    }
    const time = nowStr();
    if (annoEditingId) {
      const a = annotations.find((x) => x.id === annoEditingId);
      if (a) {
        a.text = text;
        a.time = time;
      }
    } else if (annoPendingCtx) {
      annotations.push({
        id: Date.now(),
        no: annotations.length + 1,
        scope: annoPendingCtx.scope || 'page',
        x: annoPendingCtx.x,
        y: annoPendingCtx.y,
        text,
        time,
      });
    }
    saveAnnotations();
    closeAnnoEditor();
    renderAnnoPins();
    renderAnnoList();
    updateAnnoCount();
    toast('标注已保存');
  }

  function deleteAnno(id) {
    annotations = annotations.filter((a) => a.id !== id);
    annotations.forEach((a, i) => {
      a.no = i + 1;
    });
    saveAnnotations();
    renderAnnoPins();
    renderAnnoList();
    updateAnnoCount();
  }

  function setAnnoMode(on) {
    annoMode = on;
    document.body.classList.toggle('anno-mode', on);
    document.getElementById('annoModeBtn')?.classList.toggle('on', on);
    if (!on) closeAnnoEditor();
  }

  function exportAnnotations() {
    if (!annotations.length) {
      toast('暂无标注可导出');
      return;
    }
    const title = config.exportTitle || '原型';
    const filename = config.exportFilename || `${title}-原型标注.md`;
    const lines = [
      `# ${title} · 原型标注`,
      '',
      ...annotations.map((a) => {
        return `## ${a.no}. ${a.text}\n- 归属：${scopeLabel(a.scope)}\n- 位置：(${Math.round(a.x)}, ${Math.round(a.y)})\n- 时间：${a.time || '—'}`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('标注已导出');
  }

  function bindOverlayAnnoWatch() {
    document.querySelectorAll('.overlay').forEach((overlay) => {
      const observer = new MutationObserver(() => {
        if (overlay.classList.contains('show')) renderAnnoPins();
        else {
          clearAnnoHighlight();
          closeAnnoEditor();
          renderAnnoPins();
        }
      });
      observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function bindEvents() {
    document.getElementById('annoModeBtn')?.addEventListener('click', () => setAnnoMode(!annoMode));
    document.getElementById('annoPanelBtn')?.addEventListener('click', () => {
      document.getElementById('annoPanel')?.classList.toggle('show');
    });
    document.getElementById('annoPanelClose')?.addEventListener('click', () => {
      document.getElementById('annoPanel')?.classList.remove('show');
    });
    document.getElementById('annoExportBtn')?.addEventListener('click', exportAnnotations);
    document.getElementById('annoClearBtn')?.addEventListener('click', () => {
      const extras = annotations.filter((a) => !builtinIds().has(a.id));
      if (!extras.length) {
        toast('无用户标注可清空');
        return;
      }
      if (confirm('确认清空用户添加的标注？内置说明标注将保留。')) {
        const ids = builtinIds();
        annotations = annotations.filter((a) => ids.has(a.id));
        annotations.forEach((a, i) => {
          a.no = i + 1;
        });
        saveAnnotations();
        renderAnnoPins();
        renderAnnoList();
        updateAnnoCount();
        toast('已清空用户标注');
      }
    });
    document.getElementById('annoEditorSave')?.addEventListener('click', saveAnnoEditor);
    document.getElementById('annoEditorCancel')?.addEventListener('click', closeAnnoEditor);
    document.addEventListener(
      'click',
      (e) => {
        if (!annoMode) return;
        if (e.target.closest('.anno-ui')) return;
        e.preventDefault();
        e.stopPropagation();
        const ctx = getAnnoContextFromClick(e);
        openAnnoEditor(ctx.editorX, ctx.editorY, null, ctx);
      },
      true
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAnnoEditor();
        setAnnoMode(false);
      }
    });
  }

  function init(options) {
    if (!options || !options.storageKey) {
      console.error('PrototypeAnnotate.init: storageKey is required');
      return;
    }
    config = options;
    ensureAnnoDOM();
    ensureModalPins();
    loadAnnotations();
    bindEvents();
    bindOverlayAnnoWatch();
    renderAnnoPins();
    renderAnnoList();
    updateAnnoCount();
  }

  global.PrototypeAnnotate = { init, ensureModalPins };
})(typeof window !== 'undefined' ? window : globalThis);
