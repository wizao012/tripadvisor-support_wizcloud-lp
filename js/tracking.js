'use strict';
window.dataLayer = window.dataLayer || [];
const config = window.LP_CONFIG;
window.lpProduction = !!config.productionOrigin && location.origin === config.productionOrigin;
if (window.lpProduction && /^GTM-[A-Z0-9]+$/.test(config.gtmId)) {
  window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=' + config.gtmId;
  document.head.appendChild(script);
}
window.lpTrack = function(event, fields = {}, callback) {
  let done = false;
  const finish = () => { if (!done) { done = true; if (callback) callback(); } };
  if (window.lpProduction) {
    window.dataLayer.push({event, ...fields, eventCallback: finish, eventTimeout: 2000});
  }
  if (callback) setTimeout(finish, window.lpProduction ? 2000 : 0);
};
