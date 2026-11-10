'use strict';
const form = document.getElementById('consultation');
const fields = document.getElementById('business-fields');
const help = document.getElementById('personal-help');
const status = document.getElementById('status');
const submitButton = form.querySelector('[type="submit"]');
const startedAt = performance.now();
let submitting = false;
const keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','adgroup','placement','keyword','matchtype','gclid','wbraid','gbraid','fbclid','sl'];
const params = new URLSearchParams(location.search);
const tracking = Object.fromEntries(keys.map(key => [key, params.get(key) || '']));
Object.assign(tracking, {lpv: LP_CONFIG.lpv, lp_path: location.pathname, source_url: location.href, referrer: document.referrer});
for (const [name,value] of Object.entries(tracking)) {
  const input = document.createElement('input');
  input.type = 'hidden'; input.name = name; input.value = value;
  form.appendChild(input);
}
const receiptUnknown = '受付結果を確認できませんでした。送信済みの可能性があります。重複送信を避けるため、お電話で受付状況をご確認ください。';
const safeMessages = new Set([
  '現在フォームの受付を停止しています。お電話でお問い合わせください。',
  '入力内容をご確認ください。',
  '入力内容をご確認のうえ、もう一度お試しください。',
  '店舗・施設事業者向けのご相談のみ受け付けています。入力内容は送信されていません。',
  '会社・店舗名、お名前、電話番号、メールアドレスをご確認ください。',
  '受付設定を確認中です。お電話でお問い合わせください。',
  '受付先に接続できませんでした。時間をおいて再度お試しください。'
]);
class FormResponseError extends Error {}
async function readContactResponse(response) {
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    throw new FormResponseError(receiptUnknown);
  }
  let result;
  try { result = await response.json(); }
  catch { throw new FormResponseError(receiptUnknown); }
  if (!result || !response.ok || result.ok !== true || typeof result.submission_id !== 'string' || !result.submission_id) {
    throw new FormResponseError(safeMessages.has(result?.message) ? result.message : receiptUnknown);
  }
  return result;
}
function showStatus(message) { status.textContent = message; status.focus({preventScroll: true}); }
form.addEventListener('change', event => {
  if (event.target.name !== 'purpose') return;
  const personal = event.target.value === 'personal';
  fields.hidden = personal; fields.disabled = personal; help.hidden = !personal; status.textContent = '';
  if (personal) help.focus({preventScroll: true});
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || form.elements.purpose.value === 'personal' || !form.reportValidity()) return;
  submitting = true; submitButton.disabled = true; form.setAttribute('aria-busy','true');
  showStatus('送信しています。しばらくお待ちください。');
  const body = new FormData(form);
  body.set('_elapsed_ms', String(Math.round(performance.now() - startedAt)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/contact', {method: 'POST', body, signal: controller.signal});
    const result = await readContactResponse(response);
    const receipt = {id: result.submission_id, at: Date.now(), mode: LP_CONFIG.conversionMode};
    try { sessionStorage.setItem('lp-receipt', JSON.stringify(receipt)); } catch {}
    const goThanks = () => location.assign('/thanks.html');
    if (LP_CONFIG.conversionMode === 'success') {
      window.lpTrack('form_submit_cv', {submission_id: receipt.id, lpv: LP_CONFIG.lpv}, goThanks);
    } else { goThanks(); }
  } catch (error) {
    showStatus(error instanceof FormResponseError ? error.message : receiptUnknown);
    submitting = false; submitButton.disabled = false; form.removeAttribute('aria-busy');
  } finally { clearTimeout(timer); }
});
for (const link of document.querySelectorAll('a[href^="tel:"]')) {
  let waiting = false;
  link.addEventListener('click', event => {
    event.preventDefault();
    if (waiting) return;
    waiting = true;
    window.lpTrack('phone_click_cv', {lpv: LP_CONFIG.lpv}, () => {
      location.href = link.href; waiting = false;
    });
  });
}
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    document.getElementById('mobile-cta').hidden = entries[0].isIntersecting;
  }, {threshold: 0}).observe(form);
}
