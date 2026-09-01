// Eugene Card ↔ Lunarist Studio OAuth 2.0 integration.
(function(){
  'use strict';
  if(typeof window==='undefined'||window.__eugeneLunaristIntegration)return;
  window.__eugeneLunaristIntegration=true;

  const LUNARIST='https://lunaristudio.vercel.app';
  const CLIENT_ID='eugene-card';
  const REDIRECT=`${location.origin}/?connect=lunarist`;
  const STORAGE='eugene_lunarist_oauth';
  const CODE_VERIFIER='eugene_lunarist_pkce_verifier';
  const STATE='eugene_lunarist_oauth_state';

  const style=document.createElement('style');
  style.textContent=`
  .lunarist-cta{position:fixed;right:18px;bottom:18px;z-index:9999;display:inline-flex;align-items:center;gap:8px;padding:11px 15px;border-radius:999px;border:1px solid rgba(201,182,255,.35);background:rgba(16,14,24,.92);backdrop-filter:blur(14px);color:#f7f4ff;text-decoration:none;font:700 13px/1 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35)}
  .lunarist-cta:hover{transform:translateY(-1px);border-color:rgba(201,182,255,.7)}
  .lunarist-connect-panel{position:fixed;right:24px;bottom:86px;z-index:9998;width:min(360px,calc(100vw - 32px));padding:18px;border:1px solid rgba(99,102,241,.28);border-radius:18px;background:rgba(8,7,13,.94);backdrop-filter:blur(18px);box-shadow:0 22px 70px rgba(0,0,0,.5);color:#f7f4ff;font:13px/1.5 system-ui,sans-serif}
  .lunarist-connect-panel h3{margin:0 0 4px;font-size:16px}.lunarist-connect-panel p{margin:0;color:#aaa3b6}.lunarist-connect-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.03)}
  .lunarist-dot{width:8px;height:8px;border-radius:50%;background:#64748b;box-shadow:0 0 0 4px rgba(100,116,139,.12)}.lunarist-dot.connected{background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12)}.lunarist-dot.pending{background:#f59e0b;animation:lunaristPulse 1s infinite}.lunarist-status{display:flex;align-items:center;gap:9px;font-weight:800}.lunarist-sub{font-size:11px;color:#8d8796;margin-top:3px}
  .lunarist-connect-actions{display:flex;gap:8px;flex-wrap:wrap}.lunarist-connect-actions button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}.lunarist-connect-actions .primary{background:#f7f4ff;color:#09070d;border-color:#f7f4ff}.lunarist-connect-actions button:disabled{opacity:.55;cursor:wait}
  @keyframes lunaristPulse{50%{opacity:.35}}
  @media(max-width:640px){.lunarist-connect-panel{right:12px;bottom:74px}.lunarist-cta{right:12px;bottom:14px}}
  `;
  document.head.appendChild(style);

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const readTokens=()=>{try{return JSON.parse(sessionStorage.getItem(STORAGE)||'null')}catch{return null}};
  const saveTokens=t=>sessionStorage.setItem(STORAGE,JSON.stringify(t));
  const clearTokens=()=>sessionStorage.removeItem(STORAGE);
  const b64url=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  async function challenge(verifier){return b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))}
  function randomVerifier(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return b64url(bytes)}
  function firebaseUser(){try{return typeof auth!=='undefined'?auth?.currentUser:null}catch{return null}}

  async function oauthFetch(path,options={}){
    const r=await fetch(`${LUNARIST}${path}`,options);
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data?.error_description||data?.error||'Lunarist OAuth request failed.');
    return data;
  }

  async function connect(){
    const user=firebaseUser();
    if(!user){render('not_connected','Sign in to Eugene Card first.');return}
    const verifier=randomVerifier();
    const state=crypto.randomUUID();
    sessionStorage.setItem(CODE_VERIFIER,verifier);
    sessionStorage.setItem(STATE,state);
    const ch=await challenge(verifier);
    const u=new URL(`${LUNARIST}/oauth/authorize`);
    u.searchParams.set('response_type','code');
    u.searchParams.set('client_id',CLIENT_ID);
    u.searchParams.set('redirect_uri',REDIRECT);
    u.searchParams.set('scope','identity profile offline_access');
    u.searchParams.set('code_challenge',ch);
    u.searchParams.set('code_challenge_method','S256');
    u.searchParams.set('state',state);
    location.href=u.toString();
  }

  async function exchangeCallback(){
    const p=new URLSearchParams(location.search);const code=p.get('code');
    if(p.get('connect')!=='lunarist'||!code)return false;
    const state=p.get('state')||'';const expected=sessionStorage.getItem(STATE)||'';
    if(!state||state!==expected){clearPending();render('error','OAuth state verification failed.');return true}
    const verifier=sessionStorage.getItem(CODE_VERIFIER)||'';
    if(!verifier){clearPending();render('error','OAuth session expired. Please reconnect.');return true}
    try{
      render('pending','Completing secure connection…');
      const body=new URLSearchParams({grant_type:'authorization_code',client_id:CLIENT_ID,redirect_uri:REDIRECT,code,code_verifier:verifier});
      const tokens=await oauthFetch('/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
      saveTokens({...tokens,obtained_at:Date.now()});
      clearPending();
      await loadStatus();
    }catch(e){clearPending();render('error',e.message||'Connection failed.');}
    return true;
  }

  function clearPending(){sessionStorage.removeItem(CODE_VERIFIER);sessionStorage.removeItem(STATE);try{const u=new URL(location.href);u.searchParams.delete('connect');u.searchParams.delete('code');u.searchParams.delete('state');history.replaceState({},'',u.pathname+(u.search?u.search:'')+(u.hash||''))}catch{}}

  async function refresh(){
    const t=readTokens();if(!t?.refresh_token)return null;
    const body=new URLSearchParams({grant_type:'refresh_token',client_id:CLIENT_ID,refresh_token:t.refresh_token});
    try{const next=await oauthFetch('/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});saveTokens({...next,obtained_at:Date.now()});return next}catch{clearTokens();return null}
  }

  async function loadStatus(){
    let t=readTokens();
    if(!t){render('not_connected','Connect your Lunarist account.');return}
    if(t.obtained_at&&Date.now()-t.obtained_at>(t.expires_in||900)*1000-30000)t=await refresh();
    if(!t){render('not_connected','Your Lunarist connection expired.');return}
    try{const profile=await oauthFetch('/oauth/userinfo',{headers:{Authorization:`Bearer ${t.access_token}`}});render('connected',`@${profile.username||'Lunarist member'}`,profile)}catch{t=await refresh();if(!t){render('not_connected','Your Lunarist connection expired.');return}try{const profile=await oauthFetch('/oauth/userinfo',{headers:{Authorization:`Bearer ${t.access_token}`}});render('connected',`@${profile.username||'Lunarist member'}`,profile)}catch{clearTokens();render('not_connected','Reconnect your Lunarist account.')}}
  }

  async function disconnect(){const t=readTokens();try{if(t?.refresh_token)await fetch(`${LUNARIST}/oauth/revoke`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,token:t.refresh_token,token_type_hint:'refresh_token'})})}catch{}clearTokens();render('not_connected','Lunarist disconnected.')}

  function panel(){if(document.getElementById('lunaristConnectPanel'))return;const box=document.createElement('aside');box.id='lunaristConnectPanel';box.className='lunarist-connect-panel';box.innerHTML=`<div style="font-size:10px;letter-spacing:.14em;color:#a995ff;font-weight:800">LUNARIST CONNECTION</div><h3>Connect your Lunarist account</h3><p>Use secure OAuth 2.0 authorization to link your Eugene Card account.</p><div class="lunarist-connect-row"><div><div class="lunarist-status"><span class="lunarist-dot" id="lunaristDot"></span><span id="lunaristStatus">Checking…</span></div><div class="lunarist-sub" id="lunaristSub">No Lunarist account linked</div></div><span style="color:#64748b">L</span></div><div class="lunarist-connect-actions"><button class="primary" id="lunaristConnectBtn">Connect Lunarist</button><button id="lunaristDisconnectBtn" style="display:none">Disconnect</button></div></aside>`;document.body.appendChild(box);box.querySelector('#lunaristConnectBtn').onclick=connect;box.querySelector('#lunaristDisconnectBtn').onclick=disconnect}
  function render(state,sub,profile){panel();const dot=document.getElementById('lunaristDot'),status=document.getElementById('lunaristStatus'),extra=document.getElementById('lunaristSub'),connectBtn=document.getElementById('lunaristConnectBtn'),disconnectBtn=document.getElementById('lunaristDisconnectBtn');dot.className=`lunarist-dot ${state==='connected'?'connected':state==='pending'?'pending':''}`;status.textContent=state==='connected'?'Connected':state==='pending'?'Connecting…':state==='error'?'Connection error':'Not connected';extra.textContent=state==='connected'?(sub||'Lunarist account linked'):(sub||'No Lunarist account linked');connectBtn.textContent=state==='connected'?'Open Lunarist':'Connect Lunarist';connectBtn.onclick=state==='connected'?()=>window.open(LUNARIST,'_blank','noopener,noreferrer'):connect;disconnectBtn.style.display=state==='connected'?'inline-flex':'none'}

  function addCta(){if(document.getElementById('eugeneLunaristCta'))return;const slug=decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0]||'');const blocked=/^(admin|analytics|revenue|login|signup|settings|marketplace)$/i.test(slug);const a=document.createElement('a');a.id='eugeneLunaristCta';a.className='lunarist-cta';a.href=slug&&!blocked?`${LUNARIST}/${encodeURIComponent(slug)}`:LUNARIST;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Commission on Lunarist ↗';document.body.appendChild(a)}

  async function boot(){panel();addCta();if(await exchangeCallback())return;await loadStatus()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,250);
})();
