'use strict';
let receipt;
try { receipt = JSON.parse(sessionStorage.getItem('lp-receipt') || 'null'); } catch {}
if (receipt && typeof receipt.id === 'string' && Date.now() - receipt.at < 1800000) {
  document.getElementById('thanks-title').textContent = 'お問い合わせを受け付けました';
  document.getElementById('thanks-message').textContent = 'ご相談いただきありがとうございます。内容を確認のうえ、担当者よりご連絡いたします。';
}
