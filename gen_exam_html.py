#!/usr/bin/env python3
"""Generate clean exam student page"""
import json

# Minimal clean version - no history API, no SW killers, simple and direct
html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>病理学副高级职称机考系统</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:#0f0f1a;color:#ccc;height:100vh;overflow:hidden}
.page{display:none}
.page.active{display:block}

.auth-bg{display:flex;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg,#0f0f1a,#1a1a2e)}
.auth-card{background:#1a1a2e;border-radius:16px;padding:40px;width:400px;box-shadow:0 8px 40px rgba(0,0,0,.5)}
.auth-card h2{color:#fff;text-align:center;margin-bottom:24px;font-size:20px}
.auth-tabs{display:flex;margin-bottom:24px}
.auth-tab{flex:1;text-align:center;padding:10px;cursor:pointer;background:#2a2a4a;color:#aaa;border:none;font-size:14px}
.auth-tab:first-child{border-radius:8px 0 0 8px}
.auth-tab:last-child{border-radius:0 8px 8px 0}
.auth-tab.active{background:#4a6cf7;color:#fff}
.fg{margin-bottom:16px}
.fg label{display:block;margin-bottom:6px;color:#aaa;font-size:13px}
.fg input{width:100%;padding:12px;border-radius:8px;border:1px solid #333;background:#0f0f1a;color:#fff;font-size:14px}
.fg input:focus{outline:none;border-color:#4a6cf7}
.btn{width:100%;padding:12px;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-weight:bold}
.btn-primary{background:#4a6cf7;color:#fff}
.btn-primary:hover{background:#3b5de7}
.btn-primary:disabled{opacity:.6;cursor:not-allowed}
.err{color:#e74c3c;font-size:13px;text-align:center;margin-top:8px}

.home-page{height:100vh;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:#1a1a2e;border-bottom:1px solid #2a2a4a}
.topbar .logo{font-size:18px;color:#fff;font-weight:bold}
.topbar .user-info{color:#aaa;font-size:13px}
.topbar .btn-logout{background:none;border:none;color:#e74c3c;cursor:pointer;font-size:13px}
.paper-grid{flex:1;overflow-y:auto;padding:24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;align-content:start}
.paper-card{background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #2a2a4a;cursor:pointer;transition:border-color .2s}
.paper-card:hover{border-color:#4a6cf7}
.paper-card h3{color:#fff;font-size:17px;margin-bottom:12px}
.paper-card .meta{display:flex;gap:16px;color:#aaa;font-size:13px;margin-bottom:16px}
.btn-start{display:inline-block;background:#4a6cf7;color:#fff;padding:8px 20px;border-radius:6px;font-size:14px;cursor:pointer;border:none;font-weight:bold}

.intro-page{height:100vh;display:flex;align-items:flex-start;justify-content:center;background:#0f0f1a;overflow-y:auto;padding:60px 20px}
.intro-card{background:#1a1a2e;border-radius:16px;padding:36px;width:500px;max-width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.3)}
.intro-card h2{color:#fff;font-size:22px;margin-bottom:16px}
.intro-card .meta{display:flex;justify-content:center;gap:20px;margin-bottom:20px;color:#aaa;flex-wrap:wrap}
.intro-card .rules{text-align:left;background:rgba(255,255,255,.05);border-radius:12px;padding:16px 20px;margin-bottom:20px;font-size:13px;line-height:1.8}
.intro-card .rules li{margin-bottom:6px}
.btn-back-link{color:#4a90d9;cursor:pointer;font-size:14px;margin-bottom:12px;display:inline-block}

.exam-page{height:100vh;display:flex;flex-direction:column}
.etop{display:flex;align-items:center;padding:10px 16px;background:#1a1a2e;border-bottom:1px solid #2a2a4a;gap:12px}
.etop .btn-back-red{color:#e74c3c;cursor:pointer;font-size:13px;text-decoration:none;white-space:nowrap}
.etop .timer{color:#fff;font-weight:bold;font-size:15px;min-width:70px}
.etop .prog{flex:1;display:flex;align-items:center;gap:8px}
.etop .prog-bar{flex:1;height:6px;background:#2a2a4a;border-radius:3px;overflow:hidden}
.etop .prog-fill{height:100%;background:#4a6cf7;transition:width .3s}
.etop .prog-text{color:#aaa;font-size:12px;white-space:nowrap}
.etop .btn-sm{padding:6px 12px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:#2a2a4a;color:#ccc}
.etop .btn-submit{padding:6px 16px;border:none;border-radius:6px;background:#e74c3c;color:#fff;font-weight:bold;cursor:pointer;font-size:13px}
.emain{flex:1;display:flex;overflow:hidden}
.eleft{flex:1;display:flex;flex-direction:column;overflow:hidden}
.eright{width:280px;background:#1a1a2e;border-left:1px solid #2a2a4a;display:flex;flex-direction:column;overflow-y:auto}
.stem-area{background:#2a2a1e;padding:12px 20px;border-bottom:1px solid #3a3a2e}
.stem-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.stem-badge{background:#e67e22;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px}
.stem-range{color:#aaa;font-size:12px}
.stem-content{color:#f0e68c;font-size:14px;line-height:1.6}
.q-scroll{flex:1;overflow-y:auto;padding:24px}
.q-card{background:#1a1a2e;border-radius:12px;padding:24px;border:1px solid #2a2a4a}
.q-header{display:flex;align-items:center;gap:8px;margin-bottom:16px}
.q-num{color:#4a6cf7;font-weight:bold;font-size:15px}
.q-type{background:#2a2a4a;color:#aaa;padding:2px 8px;border-radius:4px;font-size:12px}
.q-content{color:#eee;font-size:15px;line-height:1.8;margin-bottom:20px}
.q-options{display:flex;flex-direction:column;gap:8px}
.opt{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:8px;border:1px solid #2a2a4a;cursor:pointer;transition:all .15s;font-size:14px}
.opt:hover{border-color:#4a6cf7;background:rgba(74,108,247,.05)}
.opt.sel{border-color:#4a6cf7;background:rgba(74,108,247,.15);color:#fff}
.opt-icon{font-size:16px;min-width:20px;text-align:center}
.hint-tag{background:#e67e22;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:4px}
.nav-bar{display:flex;align-items:center;justify-content:center;gap:16px;padding:12px 20px;background:#0f0f1a;border-top:1px solid #2a2a4a}
.nav-bar .btn-nav{padding:8px 20px;border:none;border-radius:6px;background:#2a2a4a;color:#ccc;cursor:pointer;font-size:14px}
.q-indicator{color:#aaa;font-size:13px}
.sheet-header{padding:14px 16px;border-bottom:1px solid #2a2a4a;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:14px;font-weight:bold}
.sheet-legend{display:flex;gap:10px;font-size:11px;font-weight:normal;color:#aaa}
.sheet-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:3px}
.sheet-dot.done{background:#4a6cf7}
.sheet-dot.cur{border:2px solid #e67e22;width:6px;height:6px}
.sheet-dot.und{background:#333}
.sheet-body{flex:1;overflow-y:auto;padding:12px}
.sheet-section{margin-bottom:16px}
.sheet-sec-title{color:#4a6cf7;font-size:13px;margin-bottom:8px;font-weight:bold}
.sheet-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.sheet-num{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#2a2a4a;border-radius:4px;font-size:12px;cursor:pointer}
.sheet-num:hover{background:#3a3a5a}
.sheet-num.done{background:#4a6cf7;color:#fff}
.sheet-num.cur{border:2px solid #e67e22;color:#fff}
.result-page{height:100vh;overflow-y:auto;background:#0f0f1a}
.result-header{text-align:center;padding:32px 20px 20px;background:#1a1a2e}
.result-header h2{color:#fff;font-size:24px;margin-bottom:16px}
.score-row{display:flex;justify-content:center;gap:40px;flex-wrap:wrap}
.score-item{text-align:center}
.score-item .val{font-size:36px;font-weight:bold;color:#4a6cf7}
.score-item .lbl{font-size:13px;color:#aaa;margin-top:4px}
.review-list{padding:20px;max-width:900px;margin:0 auto}
.review-card{background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #2a2a4a}
.review-card.ok{border-left:4px solid #27ae60}
.review-card.ng{border-left:4px solid #e74c3c}
.review-header{display:flex;justify-content:space-between;margin-bottom:12px}
.review-num{color:#4a6cf7;font-weight:bold}
.review-status{font-size:12px;padding:2px 8px;border-radius:4px}
.review-status.ok{background:#27ae60;color:#fff}
.review-status.ng{background:#e74c3c;color:#fff}
.review-content{color:#eee;font-size:14px;line-height:1.7;margin-bottom:12px}
.review-opts{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-size:13px}
.review-opt{padding:6px 12px;border-radius:6px;background:#2a2a4a;display:flex;gap:8px;flex-wrap:wrap}
.review-opt.your{border:1px solid #4a6cf7;background:rgba(74,108,247,.1)}
.review-opt.corr{border:1px solid #27ae60;background:rgba(39,174,96,.1)}
.review-badge{font-size:10px;padding:1px 6px;border-radius:3px}
.review-badge.your{background:#4a6cf7;color:#fff}
.review-badge.corr{background:#27ae60;color:#fff}
.review-analysis{background:rgba(255,255,255,.05);padding:12px;border-radius:8px;font-size:13px;color:#aaa;line-height:1.6}
.empty{text-align:center;color:#666;padding:60px 20px;font-size:15px}
.btn-row{text-align:center;padding:20px}

@media (max-width:768px){
  .eright{position:fixed;right:-280px;top:0;bottom:0;z-index:100;transition:right .3s}
  .eright.open{right:0}
  .paper-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>

<div id="pg-login" class="page active">
<div class="auth-bg">
<div class="auth-card">
<h2>病理学副高级职称机考系统</h2>
<div class="auth-tabs">
<button class="auth-tab active" id="tab-login-btn" onclick="switchAuth('login')">考生登录</button>
<button class="auth-tab" id="tab-reg-btn" onclick="switchAuth('reg')">注册账号</button>
</div>
<form id="form-login" onsubmit="return doLogin()">
<div class="fg"><label>用户名</label><input id="login-user" placeholder="输入用户名" required></div>
<div class="fg"><label>密码</label><input type="password" id="login-pass" placeholder="输入密码" required></div>
<button type="submit" class="btn btn-primary">登录</button>
<div class="err" id="login-err"></div>
</form>
<form id="form-register" style="display:none" onsubmit="return doReg()">
<div class="fg"><label>用户名</label><input id="reg-user" placeholder="输入用户名" required></div>
<div class="fg"><label>真实姓名</label><input id="reg-name" placeholder="输入真实姓名" required></div>
<div class="fg"><label>密码</label><input type="password" id="reg-pass" placeholder="至少6位" required></div>
<button type="submit" class="btn btn-primary">注册</button>
<div class="err" id="reg-err"></div>
</form>
</div></div></div>

<div id="pg-home" class="page">
<div class="home-page">
<div class="topbar">
<span class="logo">病理学机考系统</span>
<span class="user-info"><span id="show-user">---</span></span>
<button class="btn-logout" onclick="doLogout()">退出登录</button>
</div>
<div class="paper-grid" id="paper-list"><div class="empty">加载中...</div></div>
</div></div>

<div id="pg-intro" class="page">
<div class="intro-page">
<div class="intro-card">
<a class="btn-back-link" onclick="goHome()">返回试卷列表</a>
<h2 id="intro-title"></h2>
<div class="meta">
<span>时长：<b id="intro-dur"></b> 分钟</span>
<span>题数：<b id="intro-cnt"></b> 题</span>
<span>总分：<b id="intro-score"></b> 分</span>
</div>
<div class="rules">
<strong>考试须知：</strong>
<ol>
<li>共100道题：单选30题、多选20题、共用题干20题、案例分析30题</li>
<li>总时长120分钟，点击开始后计时</li>
<li>答题卡可随时跳转题目</li>
<li>交卷后不可修改</li>
</ol>
</div>
<button class="btn btn-primary" onclick="startExam()" id="btn-start">开始考试</button>
</div></div></div>

<div id="pg-exam" class="page">
<div class="exam-page">
<div class="etop">
<a class="btn-back-red" onclick="confirmExit()">退出考试</a>
<span class="timer" id="timer-display">120:00</span>
<div class="prog">
<div class="prog-bar"><div class="prog-fill" id="prog-fill" style="width:0%"></div></div>
<span class="prog-text" id="prog-text">0/100</span>
</div>
<button class="btn-sm" onclick="toggleSheet()">答题卡</button>
<button class="btn-submit" onclick="confirmSubmit()">交卷</button>
</div>
<div class="emain">
<div class="eleft">
<div class="stem-area" id="stem-area" style="display:none">
<div class="stem-header"><span class="stem-badge">共用题干</span><span class="stem-range" id="stem-range"></span></div>
<div class="stem-content" id="stem-content"></div>
</div>
<div class="q-scroll" id="q-area"></div>
<div class="nav-bar">
<button class="btn-nav" id="btn-prev" onclick="prevQ()">上一题</button>
<span class="q-indicator" id="q-indicator"></span>
<button class="btn-nav" id="btn-next" onclick="nextQ()">下一题</button>
</div>
</div>
<div class="eright" id="answer-sheet-panel">
<div class="sheet-header">
<span>答题卡</span>
<span class="sheet-legend">
<span class="sheet-dot done"></span>已答
<span class="sheet-dot cur"></span>当前
<span class="sheet-dot und"></span>未答
</span>
</div>
<div class="sheet-body" id="sheet-body"></div>
</div>
</div></div></div>

<div id="pg-result" class="page">
<div class="result-page">
<div class="result-header">
<h2>考试完成</h2>
<div class="score-row">
<div class="score-item"><div class="val" id="res-score">0</div><div class="lbl">得分</div></div>
<div class="score-item"><div class="val" id="res-correct">0</div><div class="lbl">正确</div></div>
<div class="score-item"><div class="val" id="res-wrong">0</div><div class="lbl">错误</div></div>
<div class="score-item"><div class="val" id="res-rate">0%</div><div class="lbl">正确率</div></div>
</div>
</div>
<div id="review-area" class="review-list"></div>
<div class="btn-row"><button class="btn btn-primary" style="width:auto;padding:10px 40px" onclick="goHome()">返回首页</button></div>
</div></div>

<script>
var M = null; // me
var X = {};   // exam
var T = null; // timerId
var L = 0;    // timeLeft
var R = null; // reviewData

function $(id){return document.getElementById(id);}
function V(id){var e=$(id);return e?e.value.trim():'';}

async function A(url,opt){
  opt=opt||{};
  var h={};
  if(M&&M.token)h['Authorization']=M.token;
  if(opt.method&&opt.method!=='GET')h['Content-Type']='application/json';
  try{var r=await fetch(url,{headers:h,...opt});return await r.json();}
  catch(e){console.error(e);return null;}
}

function SP(id){ // showPage
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  var el=$(id); if(el)el.classList.add('active');
}

// === LOGIN ===
function switchAuth(m){
  $('#form-login').style.display=m==='login'?'block':'none';
  $('#form-register').style.display=m==='reg'?'block':'none';
  $('#tab-login-btn').classList.toggle('active',m==='login');
  $('#tab-reg-btn').classList.toggle('active',m==='reg');
}

async function doLogin(){
  var u=V('login-user'),p=V('login-pass');
  if(!u||!p)return false;
  var r=await A('/api/login',{method:'POST',body:JSON.stringify({username:u,password:p})});
  if(!r){$('#login-err').textContent='网络错误';return false;}
  if(r.code!==200){$('#login-err').textContent=r.message||'登录失败';return false;}
  if(r.data&&r.data.isAdmin){$('#login-err').textContent='管理员请从管理后台登录';return false;}
  M=r.data;
  localStorage.setItem('exm_u',JSON.stringify(M));
  $('#show-user').textContent=M.realName||M.username;
  SP('pg-home');loadPapers();
  return false;
}

async function doReg(){
  var u=V('reg-user'),n=V('reg-name'),p=V('reg-pass');
  if(!u||!n||!p)return false;
  if(p.length<6){$('#reg-err').textContent='密码至少6位';return false;}
  var r=await A('/api/register',{method:'POST',body:JSON.stringify({username:u,password:p,realName:n})});
  if(!r){$('#reg-err').textContent='网络错误';return false;}
  if(r.code!==200){$('#reg-err').textContent=r.message||'注册失败';return false;}
  alert('注册成功，请登录');
  switchAuth('login');$('#login-user').value=u;
  return false;
}

function doLogout(){
  M=null;localStorage.removeItem('exm_u');
  if(T){clearInterval(T);T=null;}
  X={};SP('pg-login');
}

// === HOME ===
async function loadPapers(){
  var r=await A('/api/papers');
  var list=$('paper-list');
  if(!r||r.code===401){doLogout();return;}
  if(!r||!r.data||!r.data.length){list.innerHTML='<div class="empty">暂无试卷</div>';return;}
  var h='';
  r.data.forEach(function(p){
    h+='<div class="paper-card" onclick="selPaper(\''+p.id+'\',\''+(p.title||'').replace(/'/g,'\\\'')+'\','+(p.duration||120)+','+(p.totalScore||100)+')"><h3>'+p.title+'</h3><div class="meta"><span>'+(p.duration||120)+'分钟</span><span>'+(p.totalScore||100)+'分</span></div><button class="btn-start">进入考试</button></div>';
  });
  list.innerHTML=h;
}

function selPaper(pid,title,dur,score){
  X.paperId=pid;
  $('#intro-title').textContent=title;
  $('#intro-dur').textContent=dur;
  $('#intro-cnt').textContent='100';
  $('#intro-score').textContent=score;
  SP('pg-intro');
}

function goHome(){
  if(T){clearInterval(T);T=null;}
  X={};R=null;SP('pg-home');loadPapers();
}

// === START EXAM ===
async function startExam(){
  var btn=$('btn-start');
  if(!X.paperId){alert('请先选择试卷');return;}
  if(btn){btn.disabled=true;btn.textContent='正在组卷，请稍候...';}
  
  var r=await A('/api/exam/'+X.paperId);
  
  if(btn){btn.disabled=false;btn.textContent='开始考试';}
  
  if(!r||r.code===401){doLogout();return;}
  if(r.code!==200){alert('加载失败: '+(r.message||'请重试'));return;}
  
  X.sections=r.data.sections||[];
  X.answers={};
  X.secIdx=0;X.qIdx=0;
  X.startTime=new Date();
  X._flatQs=[];
  var gi=0;
  X.sections.forEach(function(sec,si){
    sec._si=si;
    (sec.questions||[]).forEach(function(q,qi){
      X._flatQs.push({si:si,qi:qi,gi:gi,q:q,st:sec.type,sn:sec.name});
      q._gi=gi;q._si=si;q._qi=qi;gi++;
    });
  });
  
  L=(r.data.duration||120)*60;
  R=null;
  
  SP('pg-exam');
  renderSheet();
  renderQ(0);
  startTimer();
}

// === RENDER ===
function renderSheet(){
  var b=$('sheet-body'),h='';
  var ico={radio:'[单]',multi:'[多]',material:'[题干]','case':'[案例]'};
  X.sections.forEach(function(sec){
    h+='<div class="sheet-section"><div class="sheet-sec-title">'+(ico[sec.type]||'')+' '+sec.name+'</div><div class="sheet-grid">';
    (sec.questions||[]).forEach(function(q){h+='<span class="sheet-num" id="sn-'+q._gi+'" onclick="jumpQ('+q._gi+')">'+(q._gi+1)+'</span>';});
    h+='</div></div>';
  });
  b.innerHTML=h;updateSheet();
}

function updateSheet(){
  X._flatQs.forEach(function(fq){
    var el=$('sn-'+fq.gi);if(!el)return;
    el.classList.remove('done','cur');
    var ans=X.answers[fq.q.id];
    if(ans&&ans.length)el.classList.add('done');
    if(fq.gi===curGi())el.classList.add('cur');
  });
}

function curGi(){
  var sec=X.sections[X.secIdx];if(!sec)return 0;
  var q=sec.questions[X.qIdx];return q?q._gi||0:0;
}

function renderQ(idx){
  var sec=X.sections[X.secIdx];if(!sec)return;
  X.qIdx=idx;
  var q=sec.questions[idx];if(!q)return;
  updateSheet();
  
  var stem=$('stem-area');
  if((sec.type==='material'||sec.type==='case')&&q.content){
    var gs=Math.floor(idx/5)*5,ge=Math.min(gs+4,(sec.questions||[]).length-1);
    stem.style.display='block';
    $('#stem-content').textContent=(sec.questions[gs]||{}).content||'';
    $('#stem-range').textContent='第'+(gs+1)+'-'+(ge+1)+'题共用';
  }else{stem.style.display='none';}
  
  var isM=sec.type==='multi'||sec.type==='case';
  var it=isM?'checkbox':'radio';
  var gn=(q._gi||0)+1;
  var tl=sec.type==='case'?'不定项选择':sec.name;
  var ht=isM?'<span class="hint-tag">'+(sec.type==='case'?'不定项':'多选')+'</span>':'';
  
  var oh='';
  (q.options||[]).forEach(function(o){
    var ic=isM?'&#9744;':'&#9675;';
    oh+='<div class="opt" onclick="toggleOpt(this,\\''+q.id+'\\',\\''+o.key+'\\',\\''+it+'\\')" data-key="'+o.key+'"><span class="opt-icon">'+ic+'</span><span>'+o.text+'</span></div>';
  });
  
  $('#q-area').innerHTML='<div class="q-card"><div class="q-header"><span class="q-num">第 '+gn+' 题</span><span class="q-type">'+tl+'</span>'+ht+'</div><div class="q-content">'+(q.content||'')+'</div><div class="q-options">'+oh+'</div></div>';
  restoreA(q.id);updateNav();
}

// === ANSWER ===
function toggleOpt(el,qid,key,type){
  if(type==='radio'){
    var p=el.parentElement;
    if(p)p.querySelectorAll('.opt').forEach(function(o){o.classList.remove('sel');});
    el.classList.add('sel');X.answers[qid]=[key];
  }else{
    el.classList.toggle('sel');
    if(!X.answers[qid])X.answers[qid]=[];
    var arr=X.answers[qid],i=arr.indexOf(key);
    if(i>=0)arr.splice(i,1);else arr.push(key);
    if(!arr.length)delete X.answers[qid];
  }
  updateSheet();
}

function restoreA(qid){
  var sel=X.answers[qid];if(!sel||!sel.length)return;
  document.querySelectorAll('#q-area .opt').forEach(function(o){
    var k=o.getAttribute('data-key');if(k&&sel.indexOf(k)>=0)o.classList.add('sel');
  });
}

function jumpQ(gi){
  var fq=X._flatQs[gi];if(!fq)return;
  X.secIdx=fq.si;renderQ(fq.qi);
  if(window.innerWidth<800)toggleSheet();
}

// === NAV ===
function updateNav(){
  $('#btn-prev').style.display=(X.secIdx===0&&X.qIdx===0)?'none':'inline-block';
  var sec=X.sections[X.secIdx];
  var total=sec&&sec.questions?sec.questions.length:0;
  var isL=X.qIdx>=total-1,isLS=X.secIdx>=X.sections.length-1;
  $('#btn-next').textContent=isL?(isLS?'交卷':'下一部分'):'下一题';
  $('#q-indicator').textContent=((X.sections[X.secIdx]||{}).questions||[])[X.qIdx]?((X.sections[X.secIdx].questions[X.qIdx]._gi||0)+1):0)+'/'+X._flatQs.length;
}

function prevQ(){
  if(X.qIdx>0){renderQ(X.qIdx-1);}
  else if(X.secIdx>0){X.secIdx--;var sec=X.sections[X.secIdx];X.qIdx=(sec.questions||[]).length-1;renderQ(X.qIdx);}
}

function nextQ(){
  var sec=X.sections[X.secIdx];var total=sec&&sec.questions?sec.questions.length:0;
  if(X.qIdx<total-1){renderQ(X.qIdx+1);}
  else if(X.secIdx<X.sections.length-1){X.secIdx++;X.qIdx=0;renderQ(0);}
  else{confirmSubmit();}
}

// === TIMER ===
function startTimer(){
  if(T)clearInterval(T);
  T=setInterval(function(){
    L--;
    if(L<=0){clearInterval(T);alert('时间到，自动交卷');doSubmit();return;}
    var m=Math.floor(L/60),s=L%60;
    $('#timer-display').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    var done=Object.keys(X.answers).length;
    $('#prog-fill').style.width=(done/X._flatQs.length*100).toFixed(1)+'%';
    $('#prog-text').textContent=done+'/'+X._flatQs.length;
  },1000);
}

function toggleSheet(){$('answer-sheet-panel').classList.toggle('open');}

function confirmExit(){
  if(!confirm('确定退出？已作答不会保存。'))return;
  if(T){clearInterval(T);T=null;}
  X={};goHome();
}

function confirmSubmit(){
  if(!confirm('确定交卷？交卷后不可修改。'))return;
  doSubmit();
}

async function doSubmit(){
  if(T){clearInterval(T);T=null;}
  var dur=Math.floor((new Date()-X.startTime)/1000);
  var allA={};
  X.sections.forEach(function(sec){(sec.questions||[]).forEach(function(q){allA[q.id]=X.answers[q.id]||[];});});
  $('#q-area').innerHTML='<div style="text-align:center;padding:40px;color:#aaa;">提交中...</div>';
  var r=await A('/api/exam/'+X.paperId+'/submit',{method:'POST',body:JSON.stringify({answers:allA,duration:dur})});
  if(!r||r.code===401){doLogout();return;}
  if(r.code!==200){alert('提交失败: '+(r.message||''));return;}
  R=r.data;showResult();
}

function showResult(){
  var d=R;
  $('#res-score').textContent=d.score||0;
  $('#res-correct').textContent=d.correctCount||0;
  $('#res-wrong').textContent=(d.totalCount||0)-(d.correctCount||0);
  $('#res-rate').textContent=(d.percentage||0)+'%';
  var h='';
  (d.details||[]).forEach(function(item,i){
    var cls=item.isCorrect?'ok':'ng',st=item.isCorrect?'正确':'错误';
    h+='<div class="review-card '+cls+'"><div class="review-header"><span class="review-num">第'+(i+1)+'题</span><span class="review-status '+cls+'">'+st+'</span></div>';
    h+='<div class="review-content">'+(item.content||'')+'</div><div class="review-opts">';
    (item.options||[]).forEach(function(o){
      var c1=(item.userAnswer||[]).indexOf(o.key)>=0?'your':'';
      var c2=(item.correctAnswer||[]).indexOf(o.key)>=0?'corr':'';
      h+='<div class="review-opt '+c1+' '+c2+'">';
      if(c1)h+='<span class="review-badge your">你的答案</span>';
      if(c2)h+='<span class="review-badge corr">正确答案</span>';
      h+='<span>'+o.key+'. '+o.text+'</span></div>';
    });
    h+='</div>';
    if(item.analysis)h+='<div class="review-analysis"><strong>解析：</strong>'+item.analysis+'</div>';
    h+='</div>';
  });
  $('#review-area').innerHTML=h;
  SP('pg-result');
}

// === INIT ===
(function init(){
  var s=localStorage.getItem('exm_u');
  if(s){try{M=JSON.parse(s);if(M&&M.token){$('#show-user').textContent=M.realName||M.username;SP('pg-home');loadPapers();return;}}catch(e){}}
  SP('pg-login');
})();
</script>
</body>
</html>"""

with open('/opt/exam_system/static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"OK: {len(html)} bytes written")
