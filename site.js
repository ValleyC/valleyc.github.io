const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const refreshIcons = () => window.lucide?.createIcons();
refreshIcons();

const sections = $$('.page-section');
const pageNames = { about: 'About', publications: 'Publications', teaching: 'Teaching', contact: 'Contact' };
const menu = $('#main-nav');
const menuButton = $('#menu-toggle');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  menuButton.title = open ? 'Close navigation' : 'Open navigation';
  menuButton.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}" aria-hidden="true"></i>`;
  refreshIcons();
}
menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
document.addEventListener('click', (event) => {
  const insideHeader = event.composedPath().some((node) => node instanceof Element && node.classList.contains('site-header'));
  if (!insideHeader) setMenu(false);
});

function showPage(id, { updateHistory = false, focus = false } = {}) {
  if (!pageNames[id]) id = 'about';
  sections.forEach((section) => {
    section.hidden = section.id !== id;
    section.classList.remove('entering');
    if (section.id === id) {
      void section.offsetWidth;
      section.classList.add('entering');
    }
  });
  $$('nav a').forEach((link) => {
    if (link.dataset.pageLink === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = id === 'about' ? 'Ruogu Chen | University of Alberta' : `${pageNames[id]} | Ruogu Chen`;
  if (updateHistory && location.hash !== '#' + id) history.pushState({ page: id }, '', '#' + id);
  setMenu(false);
  if (focus) {
    const section = document.getElementById(id);
    const top = section.getBoundingClientRect().top + window.scrollY - 100;
    if (window.scrollY > top + 20) window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    section.querySelector('h1').focus({ preventScroll: true });
  }
}
$$('[data-page-link]').forEach((link) => link.addEventListener('click', (event) => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showPage(link.dataset.pageLink, { updateHistory: true, focus: true });
}));
const restorePage = () => showPage(location.hash.slice(1), { focus: false });
window.addEventListener('popstate', restorePage);
window.addEventListener('hashchange', restorePage);
restorePage();

const themeButton = $('#theme-toggle');
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const next = theme === 'dark' ? 'light' : 'dark';
  themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
  themeButton.title = `Switch to ${next} theme`;
  themeButton.innerHTML = `<i data-lucide="${next === 'dark' ? 'moon' : 'sun'}" aria-hidden="true"></i>`;
  refreshIcons();
}
try { setTheme(localStorage.getItem('ruogu-homepage-theme') || 'light'); } catch { setTheme('light'); }
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try { localStorage.setItem('ruogu-homepage-theme', theme); } catch {}
});

let selectedFilter = 'all';
const papers = $$('.publication');
const filterButtons = $$('.publication-filters button');
function filterPapers() {
  const query = $('#paper-search').value.trim().toLowerCase();
  const year = $('#paper-year').value;
  let count = 0;
  papers.forEach((paper) => {
    const topicMatches = selectedFilter === 'all' || paper.dataset.topic === selectedFilter;
    const textMatches = paper.textContent.toLowerCase().includes(query);
    const yearMatches = year === 'all' || paper.dataset.year === year;
    paper.hidden = !topicMatches || !textMatches || !yearMatches;
    if (!paper.hidden) count += 1;
  });
  $('#filter-status').textContent = `${count} publication${count === 1 ? '' : 's'}`;
  $('.no-results').hidden = count > 0;
}
filterButtons.forEach((button) => button.addEventListener('click', () => {
  selectedFilter = button.dataset.filter;
  filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  filterPapers();
}));
$('#paper-search').addEventListener('input', filterPapers);
$('#paper-year').addEventListener('change', filterPapers);
$('#reset-filters').addEventListener('click', () => {
  selectedFilter = 'all';
  $('#paper-search').value = '';
  $('#paper-year').value = 'all';
  filterButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')));
  filterPapers();
  $('#paper-search').focus();
});

const citations = new Map();
const citationIds = {
  chen2026edisco: 'edisco',
  chen2026coevo: 'coevo',
  chen2026ppaplace: 'ppaplace',
  yang2026coda: 'coda',
  chen2025hil: 'hil',
  cheng2025transient: 'transient',
};
let activeCitation = '';
let activeCitationId = '';
const citationReady = fetch('assets/references.bib').then((response) => {
  if (!response.ok) throw new Error('Citation file unavailable');
  return response.text();
}).then((text) => {
  text.split(/(?=@(?:misc|article)\{)/).map((entry) => entry.trim()).filter(Boolean).forEach((entry) => {
    const key = entry.match(/^@(?:misc|article)\{([^,]+)/)?.[1];
    const id = citationIds[key];
    if (id) citations.set(id, entry);
  });
}).catch(() => {});
$$('[data-cite]').forEach((button) => button.addEventListener('click', async () => {
  await citationReady;
  activeCitationId = button.dataset.cite;
  activeCitation = citations.get(activeCitationId) || '';
  $('#citation-text').textContent = activeCitation || 'Citation unavailable. Please use the bibliography download.';
  $('#copy-status').textContent = '';
  $('#copy-citation').disabled = !activeCitation;
  $('#download-citation').disabled = !activeCitation;
  $('#citation-dialog').showModal();
}));
$('#close-citation').addEventListener('click', () => $('#citation-dialog').close());
$('#copy-citation').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(activeCitation);
    $('#copy-status').textContent = 'Citation copied.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($('#citation-text'));
    selection.removeAllRanges();
    selection.addRange(range);
    $('#copy-status').textContent = 'Citation selected. Use your browser\'s Copy command.';
  }
});
$('#download-citation').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([activeCitation + '\n'], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = activeCitationId + '.bib';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#citation-dialog').addEventListener('click', (event) => {
  if (event.target !== $('#citation-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
