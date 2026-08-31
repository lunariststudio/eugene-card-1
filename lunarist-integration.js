// Eugene Card ↔ Lunarist Studio integration.
(function(){
  if(typeof window==='undefined'||window.__eugeneLunaristIntegration)return;
  const LUNARIST='https://lunaristudio.vercel.app';
  const style=document.createElement('style');
  style.textContent='.lunarist-cta{position:fixed;right:18px;bottom:18px;z-index:9999;display:inline-flex;align-items:center;gap:8px;padding:11px 15px;border-radius:999px;border:1px solid rgba(201,182,255,.35);background:rgba(16,14,24,.9);backdrop-filter:blur(14px);color:#f7f4ff;text-decoration:none;font:700 13px/1 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35)}.lunarist-cta:hover{transform:translateY(-1px);border-color:rgba(201,182,255,.7)}';
  document.head.appendChild(style);
  const slug=decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0]||'');
  const blocked=/^(admin|analytics|revenue|login|signup|settings|marketplace)$/i.test(slug);
  const target=slug&&!blocked?`${LUNARIST}/${encodeURIComponent(slug)}`:LUNARIST;
  function add(){if(document.getElementById('eugeneLunaristCta'))return;const a=document.createElement('a');a.id='eugeneLunaristCta';a.className='lunarist-cta';a.href=target;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Commission on Lunarist ↗';document.body.appendChild(a)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else setTimeout(add,250);
  window.__eugeneLunaristIntegration=true;
})();
