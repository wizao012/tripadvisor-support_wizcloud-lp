const CONTACT_VERSION = 'contact-fix-v3';
const trace = (stage, details = {}) => console.log(JSON.stringify({component:'contact',version:CONTACT_VERSION,stage,...details}));
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Contact-Version':CONTACT_VERSION,'X-Content-Type-Options':'nosniff'}
});
async function handleContact({request, env}) {
  const origin = new URL(request.url).origin;
  if (env.FORM_ENABLED !== 'true' || !env.PRODUCTION_ORIGIN || origin !== env.PRODUCTION_ORIGIN) {
    return json({ok:false,message:'現在フォームの受付を停止しています。お電話でお問い合わせください。'},503);
  }
  if (request.headers.get('Origin') !== origin) return json({ok:false},403);
  if (Number(request.headers.get('Content-Length') || 0) > 32768) return json({ok:false},413);
  let data;
  try {
    // Content-Lengthを省略したリクエストも実際の読み取りサイズで制限。
    const reader = request.body?.getReader();
    if (!reader) return json({ok:false},422);
    const chunks = []; let size = 0;
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 32768) { await reader.cancel(); return json({ok:false},413); }
      chunks.push(value);
    }
    data = await new Response(new Blob(chunks), {headers:{'Content-Type':request.headers.get('Content-Type') || ''}}).formData();
  } catch { return json({ok:false,message:'入力内容をご確認ください。'},422); }
  const get = key => typeof data.get(key) === 'string' ? data.get(key).trim() : '';
  const elapsed = Number(get('_elapsed_ms'));
  if (get('website') || !Number.isFinite(elapsed) || elapsed < 1500) return json({ok:false,message:'入力内容をご確認のうえ、もう一度お試しください。'},422);
  const purpose = get('purpose');
  if (!['new','operation','inbound'].includes(purpose) || get('business_confirm') !== 'yes') {
    return json({ok:false,message:'店舗・施設事業者向けのご相談のみ受け付けています。入力内容は送信されていません。'},422);
  }
  const tel = get('tel').normalize('NFKC').replace(/[\s()（）ー−‐–—-]/g,'');
  const payload = {purpose, company:get('company'), name:get('name'), tel, email:get('email'), message:get('message'), business_confirm:'yes'};
  if (!payload.company || payload.company.length > 150 || !payload.name || payload.name.length > 100 || !/^\+?\d{10,15}$/.test(tel) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 254 || payload.message.length > 3000) {
    return json({ok:false,message:'会社・店舗名、お名前、電話番号、メールアドレスをご確認ください。'},422);
  }
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','adgroup','placement','keyword','matchtype','gclid','wbraid','gbraid','fbclid','lpv','sl','lp_path','source_url','referrer']) {
    payload[key] = get(key).slice(0,2048);
  }
  Object.assign(payload,{submission_id:crypto.randomUUID(),submitted_at:new Date().toISOString(),country:request.cf?.country || '',_elapsed_ms:elapsed});
  // IP・ユーザーエージェントは保管目的が未確定のため転送しない。
  trace('validated');
  let endpoint;
  try {
    endpoint = new URL(env.ZAPIER_WEBHOOK_URL);
    if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'hooks.zapier.com' || !endpoint.pathname.startsWith('/hooks/catch/')) throw new Error();
  } catch { trace('configuration_invalid'); return json({ok:false,message:'受付設定を確認中です。お電話でお問い合わせください。'},503); }
  try {
    trace('webhook_start');
    const response = await fetch(endpoint.toString(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000),redirect:'manual'});
    trace('webhook_response', {status:response.status});
    if (!response.ok) return json({ok:false,message:'受付先に接続できませんでした。時間をおいて再度お試しください。'},502);
    return json({ok:true,submission_id:payload.submission_id});
  } catch (error) {
    const errorType = ['AbortError','TimeoutError','TypeError'].includes(error?.name) ? error.name : 'OtherError';
    trace('webhook_exception', {errorType});
    return json({ok:false,message:'受付結果を確認できませんでした。送信済みの可能性があります。お電話で受付状況をご確認ください。'},502);
  }
}
export function onRequestGet() { return json({ok:false},405); }

export async function onRequestPost(context) {
  trace('request_received');
  try {
    const response = await handleContact(context);
    trace('request_finished', {status:response.status});
    return response;
  }
  catch {
    trace('handler_exception');
    // 個人情報や例外の詳細をレスポンス・ログへ出さない。
    return json({ok:false,message:'受付結果を確認できませんでした。お電話で受付状況をご確認ください。'},500);
  }
}
