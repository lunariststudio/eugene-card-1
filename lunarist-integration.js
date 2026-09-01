// Eugene Card ↔ Lunarist Studio integration.
(function(){
  if(typeof window==='undefined'||window.__eugeneLunaristIntegration)return;
  const LUNARIST='https://lunaristudio.vercel.app';
  const style=document.createElement('style');
  style.textContent='.lunarist-cta{position:fixed;right:18px;bottom:18px;z-index:9999;display:inline-flex;align-items:center;gap:8px;padding:11px 15px;border-radius:999px;border:1px solid rgba(201,182,255,.35);background:rgba(16,14,24,.9);backdrop-filter:blur(14px);color:#f7f4ff;text-decoration:none;font:700 13px/1 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35)}.lunarist-cta:hover{transform:translateY(-1px);border-color:rgba(201,182,255,.7)}.lunarist-connect-banner{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:10000;width:min(560px,calc(100vw - 28px));padding:18px;border:1px solid rgba(201,182,255,.28);border-radius:18px;background:rgba(8,7,13,.94);backdrop-filter:blur(18px);box-shadow:0 22px 70px rgba(0,0,0,.45);color:#f7f4ff;font:14px/1.5 system-ui,sans-serif}.lunarist-connect-banner h3{margin:0 0 5px;font-size:17px}.lunarist-connect-banner p{margin:0;color:#aaa3b6}.lunarist-connect-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.lunarist-connect-actions button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}.lunarist-connect-actions .primary{background:#f7f4ff;color:#09070d;border-color:#f7f4ff}.lunarist-connect-status{margin-top:10px;color:#8ee0ba;font-size:12px;font-weight:800}';
  document.head.appendChild(style);
  const slug=decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0]||'');
  const blocked=/^(admin|analytics|revenue|login|signup|settings|marketplace)$/i.test(slug);
  const target=slug&&!blocked?`${LUNARIST}/${encodeURIComponent(slug)}`:LUNARIST;
  function add(){if(document.getElementById('eugeneLunaristCta'))return;const a=document.createElement('a');a.id='eugeneLunaristCta';a.className='lunarist-cta';a.href=target;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Commission on Lunarist ↗';document.body.appendChild(a)}

  function getConnectRequest(){
    const params=new URLSearchParams(location.search);
    const code=String(params.get('code')||'').trim();
    return params.get('connect')==='lunarist'&&code?code:'';
  }

  function removeConnectParams(){
    try{const u=new URL(location.href);u.searchParams.delete('connect');u.searchParams.delete('code');history.replaceState({},'',u.pathname+(u.search?u.search:'')+(u.hash||''));}catch{}
  }

  function showConnectBanner(code){
    if(document.getElementById('lunaristConnectBanner'))return;
    const box=document.createElement('div');
    box.id='lunaristConnectBanner';
    box.className='lunarist-connect-banner';
    box.innerHTML='<h3>Connect Eugene Card to Lunarist</h3><p>Link the Eugene Card account you are signed in with to your Lunarist account. This one-time connection code expires after 10 minutes.</p><div class="lunarist-connect-actions"><button class="primary" id="lunaristConnectNow">Connect this account</button><button id="lunaristConnectCancel">Cancel</button></div><div class="lunarist-connect-status" id="lunaristConnectStatus"></div>';
    document.body.appendChild(box);
    const status=document.getElementById('lunaristConnectStatus');
    document.getElementById('lunaristConnectCancel').onclick=()=>{removeConnectParams();box.remove()};
    document.getElementById('lunaristConnectNow').onclick=async()=>{
      const button=document.getElementById('lunaristConnectNow');
      try{
        const user=auth?.currentUser;
        if(!user){status.textContent='Please sign in to Eugene Card first.';return}
        button.disabled=true;button.textContent='Connecting…';
        const token=await user.getIdToken(true);
        const r=await fetch(`${LUNARIST}/api/eugene-connect`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'exchange',code,firebase_id_token:token})});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data?.error||'Connection failed.');
        status.textContent='✓ Connected to Lunarist.';
        button.textContent='Connected';
        setTimeout(()=>{removeConnectParams();box.remove()},900);
      }catch(e){button.disabled=false;button.textContent='Connect this account';status.textContent=e?.message||'Connection failed.'}
    };
  }

  function initConnection(){
    const code=getConnectRequest();
    if(!code)return;
    const ready=()=>showConnectBanner(code);
    if(typeof auth!=='undefined'&&auth?.onAuthStateChanged){auth.onAuthStateChanged(()=>ready())}else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else setTimeout(ready,500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else setTimeout(add,250);
  initConnection();
  window.__eugeneLunaristIntegration=true;
})();
