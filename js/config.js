// 公開前に本番URL・GTM ID・計測方式を確定する。秘密情報は書かない。
window.LP_CONFIG = Object.freeze({
  productionOrigin: 'https://wizcloud-inbound.com',
  gtmId: 'GTM-TMLM9JKX',
  conversionMode: 'success', // API成功時だけ計測。サンクスページでは計測しない。
  lpv: 'tripadvisor-support-v1'
});
