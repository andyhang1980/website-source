// ==================== 全局状态 ====================
const API = '';
const TK = 'exam_tk', UK = 'exam_uk';
let me = null;
let exam = {paperId:'', sections:[], answers:{}, secIdx:0, qIdx:0, startTime:null, _flatQs:[]};
let timerId = null, timeLeft = 7200;
let reviewData = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  const t = localStorage.getItem(TK);
  if (t) {
    me = JSON.parse(localStorage.getItem(UK)||'{}');
    me.token = t;
    // 管理员也让他进考生首页（能看到试卷列表），管理功能走 /admin
    showPage('pg-home');
    document.getElementById('user-name').textContent = (me.realName || me.username) + (me.isAdmin ? ' [管理员]' : '');
    loadPapers();
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const lp = document.getElementById('pg-login');
      if (lp && lp.classList.contains('active')) doLogin();
    }
  });
});

// ==================== API ====================
async function api(url, opt={}) {
  const h = {'Content-Type':'application/json'};
  if (me && me.token) h['Authorization'] = me.token;
  try {
    const r = await fetch(API+url, {headers:h, ...opt});
    if (r.status === 401) { doLogout(); return {code:401, message:'登录已过期'}; }
    return r.json();
  } catch(e) { return {code:-1, message:'网络连接失败'}; }
}

// ==================== 登录/注册 ====================
function switchAuthTab(t) {
  document.querySelectorAll('#pg-login .tab').forEach(x => {
    x.classList.toggle('active', (t==='login' && x.textContent.trim()==='登录') || (t==='register' && x.textContent.trim()==='注册'));
  });
  document.getElementById('form-login').style.display = t==='login'?'block':'none';
  document.getElementById('form-register').style.display = t==='register'?'block':'none';
}

async function doLogin() {
  const u = gv('login-user'), p = gv('login-pass');
  if(!u||!p) return alert('请输入用户名和密码');
  const r = await api('/api/login',{method:'POST',body:JSON.stringify({username:u,password:p})});
  if(r.code===200){
    me = r.data; localStorage.setItem(TK, r.data.token); localStorage.setItem(UK, JSON.stringify(me));
    showPage('pg-home');
    document.getElementById('user-name').textContent = (me.realName || me.username) + (me.isAdmin ? ' [管理员]' : '');
    loadPapers();
  } else alert(r.message||'登录失败');
}

async function doRegister() {
  const u=gv('reg-user'), p=gv('reg-pass'), p2=gv('reg-pass2');
  if(!u||!p) return alert('请输入用户名和密码');
  if(p!==p2) return alert('两次密码不一致');
  if(p.length<4) return alert('密码至少4位');
  const r=await api('/api/register',{method:'POST',body:JSON.stringify({username:u,password:p})});
  if(r.code===200){ alert('注册成功！请登录'); switchAuthTab('login'); document.getElementById('login-user').value = u; }
  else alert(r.message||'注册失败');
}

function doLogout() {
  localStorage.removeItem(TK); localStorage.removeItem(UK);
  me=null; exam={paperId:'',sections:[],answers:{},secIdx:0,qIdx:0,startTime:null,_flatQs:[]};
  reviewData = null;
  if(timerId){ clearInterval(timerId); timerId=null; }
  showPage('pg-login');
}

// ==================== 页面切换 ====================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ==================== 试卷列表 ====================
async function loadPapers() {
  const el=document.getElementById('paper-list');
  const r=await api('/api/papers');
  if(r.code===401){ doLogout(); return; }
  const ps=r.data||[];
  if(!ps.length){ el.innerHTML='<p class="empty">暂无试卷</p>'; return; }
  el.innerHTML=ps.map(p=>`
    <div class="paper-card" onclick="selectPaper('${p.id}')">
      <h3>${p.title}</h3>
      <div class="paper-info">
        <span>⏱ ${p.duration||120}分钟</span>
        <span>📝 ${p.totalQuestions||100}题</span>
        <span>💯 ${p.total_score||100}分</span>
      </div>
      <div class="paper-types">
        ${p.radio_count?`<span>单选×${p.radio_count}</span>`:''}
        ${p.multi_count?`<span>多选×${p.multi_count}</span>`:''}
        ${p.material_count?`<span>共用题干×${p.material_count}</span>`:''}
        ${p.case_count?`<span>案例分析×${p.case_count}</span>`:''}
      </div>
    </div>
  `).join('');
}

function selectPaper(pid) {
  exam.paperId=pid;
  showPage('pg-intro');
  document.getElementById('exam-title').textContent='加载中...';
  document.getElementById('exam-duration').textContent='--';
  document.getElementById('exam-total').textContent='--';
  document.getElementById('exam-score').textContent='--';
  api('/api/papers').then(r=>{
    if(r.code===200){
      const p = (r.data||[]).find(x=>x.id===pid);
      if(p){
        document.getElementById('exam-title').textContent=p.title;
        document.getElementById('exam-duration').textContent=p.duration||120;
        document.getElementById('exam-total').textContent=p.totalQuestions||100;
        document.getElementById('exam-score').textContent=p.total_score||100;
      }
    }
  });
}

// ==================== 开始考试 ====================
async function startExam() {
  const btn = document.querySelector('#pg-intro .btn-primary');
  if(btn) { btn.disabled = true; btn.textContent = '⏳ 加载中...'; }
  if(!exam.paperId) { alert('请先选择试卷'); if(btn){btn.disabled=false;btn.textContent='🚀 开始考试';} return; }

  const r = await api('/api/exam/'+exam.paperId);
  if(btn) { btn.disabled = false; btn.textContent = '🚀 开始考试'; }
  if(!r || r.code===401) { doLogout(); return; }
  if(r.code!==200) { alert('加载失败: '+(r.message||'')); return; }

  exam.sections = r.data.sections || [];
  exam.answers = {}; exam.secIdx = 0; exam.qIdx = 0;
  exam.startTime = new Date();
  exam._flatQs = [];

  // 扁平化所有题目 + 全局索引
  let gi = 0;
  exam.sections.forEach((sec, si) => {
    sec._secIdx = si;
    sec.questions.forEach((q, qi) => {
      exam._flatQs.push({secIdx:si, qIdx:qi, globalIdx:gi, q:q, secType:sec.type, secName:sec.name});
      q._globalIdx = gi;
      q._secIdx = si;
      q._qIdx = qi;
      gi++;
    });
  });

  timeLeft = (r.data.duration||120)*60;
  reviewData = null;

  showPage('pg-exam');
  renderAnswerSheet();
  renderQuestion(0);
  startTimer();
}

// ==================== 答题卡 ====================
function renderAnswerSheet() {
  const body = document.getElementById('sheet-body');
  let html = '';
  exam.sections.forEach((sec, si) => {
    const icons = {radio:'📝', multi:'☑️', material:'📋', case:'📊'};
    html += `<div class="sheet-section"><div class="sheet-sec-title">${icons[sec.type]||'📋'} ${sec.name}</div><div class="sheet-grid">`;
    sec.questions.forEach((q, qi) => {
      const gi = q._globalIdx;
      html += `<span class="sheet-num" id="sn-${gi}" onclick="jumpToQ(${gi})" title="第${gi+1}题">${gi+1}</span>`;
    });
    html += '</div></div>';
  });
  body.innerHTML = html;
  updateAnswerSheet();
}

function updateAnswerSheet() {
  exam._flatQs.forEach(fq => {
    const el = document.getElementById('sn-'+fq.globalIdx);
    if (!el) return;
    el.classList.remove('done','cur');
    const ans = exam.answers[fq.q.id];
    if(ans && ans.length > 0) el.classList.add('done');
    if(fq.globalIdx === getCurrentGlobalIdx()) el.classList.add('cur');
  });
}

function getCurrentGlobalIdx() {
  const sec = exam.sections[exam.secIdx];
  if (!sec) return 0;
  const q = sec.questions[exam.qIdx];
  return q ? (q._globalIdx || 0) : 0;
}

function jumpToQ(globalIdx) {
  const fq = exam._flatQs[globalIdx];
  if (!fq) return;
  exam.secIdx = fq.secIdx;
  exam.qIdx = fq.qIdx;
  renderQuestion(exam.qIdx);
  // 移动端关闭答题卡
  if(window.innerWidth < 800) closeAnswerSheet();
}

function toggleAnswerSheet() {
  const sheet = document.getElementById('answer-sheet');
  sheet.classList.toggle('open');
}

function closeAnswerSheet() {
  document.getElementById('answer-sheet').classList.remove('open');
}

// ==================== 板块过渡（已废弃，直接进入） ====================
function enterSection() {
  renderQuestion(0);
}

// ==================== 渲染题目 ====================
function renderQuestion(idx) {
  const sec = exam.sections[exam.secIdx];
  if (!sec) return;
  const qs = sec.questions;
  exam.qIdx = idx;
  const q = qs[idx];
  if (!q) return;

  updateProgress();
  updateAnswerSheet();

  // 共用题干
  const stem = document.getElementById('stem-area');
  if ((sec.type==='material' || sec.type==='case') && q.content) {
    const gi = findStemGroup(sec, idx);
    stem.style.display = 'block';
    document.getElementById('stem-content').textContent = gi.stem;
    document.getElementById('stem-range').textContent = `第${gi.start+1}-${gi.end+1}题共用此题干`;
  } else { stem.style.display = 'none'; }

  // 题型判断
  const isMulti = (sec.type === 'multi' || sec.type === 'case');
  const inputType = isMulti ? 'checkbox' : 'radio';
  const gNum = getGlobalNum();
  const typeLabel = sec.type === 'case' ? '不定项选择' : sec.name;

  // 判断是否有正确选项（多选题需要至少1个正确；单选题必须有唯一答案）
  const correctCount = (q.correct||[]).length;
  const typeHint = isMulti
    ? (sec.type === 'case'
        ? '<span class="hint-tag multi-hint">不定项选择</span>'
        : '<span class="hint-tag multi-hint">多选题</span>')
    : '';

  let optHtml = (q.options||[]).map((o,oi) => {
    const icon = isMulti ? '☐' : '○';
    const shape = isMulti ? 'opt-square' : 'opt-circle';
    return `<div class="opt ${shape}" onclick="toggleOpt(this,'${q.id}','${o.key}','${inputType}')" data-key="${o.key}">
      <span class="opt-icon">${icon}</span>
      <span class="opt-text">${o.text}</span>
    </div>`;
  }).join('');

  document.getElementById('q-area').innerHTML = `
    <div class="q-card">
      <div class="q-header">
        <span class="q-num">第 ${gNum} 题</span>
        <span class="q-type">${typeLabel}</span>
        ${typeHint}
      </div>
      <div class="q-content">${q.content||'(题目内容加载中)'}</div>
      <div class="q-options">${optHtml}</div>
    </div>
  `;

  restoreAnswer(q.id);
  updateNav();
}

function findStemGroup(sec, idx) {
  const qs = sec.questions;
  const gs = Math.floor(idx/5)*5;
  const ge = Math.min(gs+4, qs.length-1);
  return {stem: qs[gs]?.content||'共用题干', start:gs, end:ge};
}

function getGlobalNum() {
  const q = exam.sections[exam.secIdx]?.questions[exam.qIdx];
  return (q?._globalIdx || 0) + 1;
}

// ==================== 选项交互 ====================
function toggleOpt(el, qid, key, type) {
  if (type === 'radio') {
    // 单选题：取消所有选中，选中当前
    el.parentElement.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
    el.classList.add('sel');
    exam.answers[qid] = [key];
  } else {
    // 多选题：切换选中
    el.classList.toggle('sel');
    if (!exam.answers[qid]) exam.answers[qid] = [];
    const arr = exam.answers[qid];
    const i = arr.indexOf(key);
    if (i >= 0) arr.splice(i, 1); else arr.push(key);
    if (!arr.length) delete exam.answers[qid];
  }
  updateAnswerSheet();
}

function restoreAnswer(qid) {
  const sel = exam.answers[qid];
  if (!sel || !sel.length) return;
  document.querySelectorAll('#q-area .opt').forEach(o => {
    const k = o.getAttribute('data-key');
    if (k && sel.includes(k)) o.classList.add('sel');
  });
}

// ==================== 进度 & 导航 ====================
function updateProgress() {
  let total = exam._flatQs.length;
  let done = Object.keys(exam.answers).length;
  const pct = total > 0 ? (done/total*100).toFixed(1) : '0';
  document.getElementById('prog-fill').style.width = pct+'%';
  document.getElementById('prog-text').textContent = `${done}/${total}`;
}

function updateNav() {
  const sec = exam.sections[exam.secIdx];
  const qs = sec.questions;
  document.getElementById('btn-prev').style.display = (exam.secIdx===0 && exam.qIdx===0) ? 'none' : 'inline-block';
  const isLastQ = exam.qIdx === qs.length-1;
  const isLastSec = exam.secIdx === exam.sections.length-1;
  document.getElementById('btn-next').textContent = isLastQ ? (isLastSec ? '📝 交卷' : '下一部分 ▶▶') : '下一题 ▶';
  document.getElementById('q-indicator').textContent = `${getGlobalNum()}/${exam._flatQs.length}`;
}

function prevQ() {
  if (exam.qIdx > 0) {
    renderQuestion(exam.qIdx - 1);
  } else if (exam.secIdx > 0) {
    exam.secIdx--;
    exam.qIdx = exam.sections[exam.secIdx].questions.length - 1;
    renderQuestion(exam.qIdx);
  }
}

function nextQ() {
  const sec = exam.sections[exam.secIdx];
  if (exam.qIdx < sec.questions.length - 1) {
    renderQuestion(exam.qIdx + 1);
  } else if (exam.secIdx < exam.sections.length - 1) {
    exam.secIdx++;
    exam.qIdx = 0;
    renderQuestion(0);
  } else {
    confirmSubmit();
  }
}

// ==================== 计时器 ====================
function startTimer() {
  if (timerId) clearInterval(timerId);
  const m = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const s = String(timeLeft%60).padStart(2,'0');
  document.getElementById('timer-display').textContent = '⏱ '+m+':'+s;
  timerId = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) { clearInterval(timerId); alert('时间到！'); finishExam(); return; }
    const mm = String(Math.floor(timeLeft/60)).padStart(2,'0');
    const ss = String(timeLeft%60).padStart(2,'0');
    document.getElementById('timer-display').textContent = '⏱ '+mm+':'+ss;
    if (timeLeft <= 300) document.getElementById('timer-display').style.color = '#e74c3c';
  }, 1000);
}

// ==================== 交卷 ====================
function confirmSubmit() {
  const answered = Object.keys(exam.answers).length;
  const total = exam._flatQs.length;
  const msg = `确定交卷吗？\n\n已答: ${answered} / 未答: ${total-answered}\n\n交卷后不可修改，系统将自动评分。`;
  if (!confirm(msg)) return;
  finishExam();
}

async function finishExam() {
  if (timerId) { clearInterval(timerId); timerId = null; }
  const dur = exam.startTime ? Math.floor((new Date()-exam.startTime)/1000) : 0;

  const r = await api('/api/exam/'+exam.paperId+'/submit', {
    method: 'POST', body: JSON.stringify({answers: exam.answers, duration: dur})
  });

  if (r.code === 200 && r.data) {
    const d = r.data;
    // 成绩
    document.getElementById('res-score').textContent = d.score||0;
    document.getElementById('res-total').textContent = d.totalCount||0;
    document.getElementById('res-correct').textContent = d.correctCount||0;
    document.getElementById('res-wrong').textContent = (d.totalCount||0)-(d.correctCount||0);
    document.getElementById('res-rate').textContent = (d.percentage||0)+'%';

    // 回顾数据
    reviewData = d.details || [];
    renderReview();
  }
  showPage('pg-result');
}

// ==================== 题目回顾 ====================
function renderReview() {
  if (!reviewData || !reviewData.length) {
    document.getElementById('review-area').innerHTML = '<p class="empty">暂无回顾数据</p>';
    return;
  }

  const typeNames = {radio:'单选题', multi:'多选题', material:'共用题干题', case:'案例分析题'};
  let html = '<h3 style="color:#fff;text-align:center;margin:20px 0;">📖 全部试题答案解析</h3>';

  reviewData.forEach((q, i) => {
    const isCorrect = q.isCorrect;
    const userAns = q.userAnswer || [];
    const correctAns = q.correctAnswer || [];
    const cardClass = isCorrect ? 'review-correct' : 'review-wrong';

    let optHtml = (q.options||[]).map(o => {
      let cls = 'review-opt';
      if (o.isRight) cls += ' opt-right';
      if (userAns.includes(o.key) && !o.isRight) cls += ' opt-user-wrong';
      if (isCorrect && userAns.includes(o.key)) cls += ' opt-user-right';
      const marker = o.isRight ? '✓' : (userAns.includes(o.key) ? '✗' : '');
      const markerCls = o.isRight ? 'marker-correct' : 'marker-wrong';
      return `<div class="${cls}">
        <span class="review-opt-key">${o.key}</span>
        <span class="review-opt-text">${o.text}</span>
        ${marker ? `<span class="${markerCls}">${marker}</span>` : ''}
      </div>`;
    }).join('');

    html += `
      <div class="review-card ${cardClass}">
        <div class="review-q-header">
          <span class="review-q-num">第${i+1}题</span>
          <span class="review-q-type">${typeNames[q.type]||q.type||''}</span>
          <span class="review-result ${isCorrect?'tag-correct':'tag-wrong'}">${isCorrect?'✓ 回答正确':'✗ 回答错误'}</span>
        </div>
        <div class="review-q-content">${q.content||''}</div>
        <div class="review-options">${optHtml}</div>
        <div class="review-answer-row">
          <div class="review-user-ans"><span class="ans-label">你的答案：</span><span class="ans-val ${isCorrect?'ans-correct':'ans-wrong'}">${userAns.join(', ') || '未作答'}</span></div>
          <div class="review-correct-ans"><span class="ans-label">正确答案：</span><span class="ans-val ans-correct">${correctAns.join(', ')}</span></div>
        </div>
        ${q.analysis ? `<div class="review-analysis"><span class="ans-label">📖 解析：</span>${q.analysis}</div>` : ''}
      </div>
    `;
  });

  document.getElementById('review-area').innerHTML = html;
}

// ==================== 成绩记录 ====================
async function showRecords() {
  const p = document.getElementById('records-panel');
  p.style.display = 'block';
  const r = await api('/api/records');
  const rs = r.data||[];
  if (!rs.length) { p.innerHTML = '<p class="empty">暂无记录</p>'; return; }
  p.innerHTML = '<h3>📊 我的考试成绩</h3>' + rs.map(x => `
    <div class="record-item">
      <strong>${x.paper_title||'试卷'}</strong>
      <span>得分: ${x.score}/${x.total} (${x.percentage}%)</span>
      <small>${(x.create_time||'').substring(0,16)}</small>
    </div>
  `).join('');
}

// ==================== Helper ====================
function gv(id) { return document.getElementById(id)?.value?.trim()||''; }

// ==================== Helper ====================
function gv(id) { return document.getElementById(id)?.value?.trim()||''; }
