// --- i18n ---
const translations = {};
export let currentLang = localStorage.getItem('sralify-lang') || 'en';

async function loadTranslations(lang) {
  try {
    const res = await fetch(`locales/${lang}.json`);
    translations[lang] = await res.json();
  } catch (e) {
    console.error('Failed to load translations:', e);
    translations[lang] = {};
  }
}

export async function initI18n() {
  await Promise.all([loadTranslations('en'), loadTranslations('km')]);
  applyLanguage();
}

export function t(key, vars) {
  let str = (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('sralify-lang', currentLang);
  applyLanguage();
}

export function applyLanguage() {
  document.documentElement.lang = currentLang === 'km' ? 'km' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (el.dataset.i18nHtml) {
      el.innerHTML = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = t('description');
  const langBtn = document.getElementById('lang-btn');
  if (langBtn) langBtn.textContent = t('lang-btn');
  const fileCountEl = document.getElementById('file-count');
  if (fileCountEl) {
    const heading = document.querySelector('[data-i18n="files-heading"]');
    if (heading) heading.textContent = t('files-heading', { count: fileCountEl.textContent });
  }
}
