// 病理学高级职称考试系统 H5 - 对接 Flask 后端
const API_BASE = 'http://47.82.98.61:8090';
const TOKEN_KEY = 'exam_token';
const USER_KEY = 'exam_user';

let currentUser = null;
let examData = { sections: [], answers: {}, currentSectionIdx: 0, currentQIdx: 0 };
let timer = null;
let timeRemaining = 7200;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    currentUser = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    showPage('home-page');
    loadPapers();
  } else {
    showPage('login-page');
  }
});

// ==================== 登录 & 注册 ====================
function showRegister() { showPage('register-page'); }
function showLogin() { showPage('login-page'); }

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username || !password) { alert('请输入用户名和密码'); return; }
  
  try {
    const resp = await fetch(`${API_BASE}/api/public/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await resp.json();
    if (data.code === 200 && data.data) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      currentUser = { username: data.data.username, realName: data.data.realName };
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      showPage('home-page');
      loadPapers();
    } else {
      alert(data.message || '登录失败');
    }
  } catch (e) {
    console.error(e);
    alert('登录失败：服务器连接异常。请确认后端已启动。');
  }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm-password').value;
  if (!username || !password) { alert('请输入用户名和密码'); return; }
  if (password !== confirm) { alert('两次密码不一致'); return; }
  if (password.length < 4) { alert('密码至少4位'); return; }
  
  try {
    const resp = await fetch(`${API_BASE}/api/public/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name: username })
    });
    const data = await resp.json();
    if (data.code === 200) {
      alert('注册成功！请登录');
      showLogin();
    } else {
      alert(data.message || '注册失败');
    }
  } catch (e) {
    console.error(e);
    alert('注册失败：服务器连接异常');
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  currentUser = null;
  showPage('login-page');
}

// ==================== 试卷列表 ====================
async function loadPapers() {
  const token = localStorage.getItem(TOKEN_KEY);
  const container = document.getElementById('paper-container');
  
  try {
    const resp = await fetch(`${API_BASE}/api/paper/list`, {
      headers: { 'Authorization': token }
    });
    const data = await resp.json();
    const papers = data.data || [];
    
    if (papers.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无试卷，请联系管理员</p>';
      return;
    }
    
    container.innerHTML = papers.map(p => `
      <div class="paper-card" onclick="selectPaper('${p.id}', '${p.title}')">
        <h4>${p.title}</h4>
        <div class="paper-info">
          <span>题型：单选/多选/共用题干/案例分析</span>
          <span>时长：${p.duration || 120}分钟</span>
        </div>
        ${p.sections ? p.sections.map(s => `<span class="badge">${s.name} ${s.count}题</span>`).join(' ') : ''}
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<p class="empty-text">连接服务器失败，请确认后端已启动</p>';
  }
}

// ==================== 选择试卷 ====================
function selectPaper(paperId, title) {
  document.getElementById('paper-title').textContent = title;
  examData.paperId = paperId;
  examData.paperTitle = title;
  showPage('intro-page');
}

// ==================== 开始考试 ====================
async function startExam() {
  const token = localStorage.getItem(TOKEN_KEY);
  
  try {
    const resp = await fetch(`${API_BASE}/api/paper/${examData.paperId || 'default'}`, {
      headers: { 'Authorization': token }
    });
    const data = await resp.json();
    
    if (data.code === 200 && data.data) {
      examData.sections = data.data.sections || [];
      examData.answers = {};
      examData.startTime = new Date();
      
      if (examData.sections.length > 0) {
        showSectionIntro(0);
      } else {
        alert('试卷加载失败：没有题目数据');
      }
    } else {
      alert('加载试卷失败: ' + (data.message || '未知错误'));
    }
  } catch (e) {
    console.error(e);
    alert('加载试卷失败，请检查后端是否已启动');
  }
}

// ==================== 板块过渡 ====================
function showSectionIntro(idx) {
  examData.currentSectionIdx = idx;
  examData.currentQIdx = 0;
  
  const section = examData.sections[idx];
  if (!section) {
    // 所有板块完成，交卷
    finishExam();
    return;
  }
  
  document.getElementById('section-badge').textContent = section.name;
  document.getElementById('section-title').textContent = section.name;
  document.getElementById('section-desc').textContent = section.desc || '';
  
  const range = document.getElementById('section-range');
  const score = document.getElementById('section-score');
  range.textContent = section.questions ? `${section.questions.length}题` : '';
  score.textContent = '';
  
  // 题型图标
  const icons = { radio: '📝', multi: '☑️', material: '📋', case: '📊' };
  document.getElementById('section-badge').textContent = (icons[section.type] || '📋') + ' ' + section.name;
  
  showPage('section-intro-page');
}

function startSection() {
  const section = examData.sections[examData.currentSectionIdx];
  if (!section || !section.questions || section.questions.length === 0) {
    alert('该板块没有题目');
    return;
  }
  
  showQuestion(0);
  if (!timer) startTimer();
}

// ==================== 答题界面 ====================
function showQuestion(idx) {
  const section = examData.sections[examData.currentSectionIdx];
  const questions = section.questions;
  examData.currentQIdx = idx;
  
  // 更新进度
  updateProgress(idx, questions.length);
  
  // 共用题干处理
  const q = questions[idx];
  if ((section.type === 'material' || section.type === 'case') && q.content) {
    // 尝试找到共用题干组
    const stemInfo = findSharedStem(section, idx);
    if (stemInfo) {
      document.getElementById('shared-stem-area').style.display = 'block';
      document.getElementById('shared-stem-content').textContent = stemInfo.stem;
      document.getElementById('shared-range').textContent = 
        `第${stemInfo.start+1}-${stemInfo.end+1}题共用此题干`;
    } else {
      document.getElementById('shared-stem-area').style.display = 'none';
    }
  } else {
    document.getElementById('shared-stem-area').style.display = 'none';
  }
  
  // 渲染题目
  const container = document.getElementById('question-container');
  const globalNum = getGlobalQuestionNum(idx);
  
  const isMulti = section.type === 'multi' || section.type === 'case';
  const inputType = isMulti ? 'checkbox' : 'radio';
  
  let optionsHtml = (q.options || []).map(opt => `
    <div class="option" onclick="toggleOption(this, '${q.id}', '${opt.key}', '${inputType}')">
      <span class="option-key">${opt.key}</span>
      <span class="option-text">${opt.text.replace(/^[A-H][.、)]\s*/, '')}</span>
    </div>
  `).join('');
  
  if (!q.options || q.options.length === 0) {
    const defaultLabels = 'ABCDEFGH'.split('');
    optionsHtml = defaultLabels.map(l => `
      <div class="option" onclick="toggleOption(this, '${q.id}', '${l}', '${inputType}')">
        <span class="option-key">${l}</span>
        <span class="option-text">选项${l}</span>
      </div>
    `).join('');
  }
  
  container.innerHTML = `
    <div class="question-card">
      <div class="question-header">
        <span class="q-num">第${globalNum}题</span>
        <span class="q-type-tag">${section.name}</span>
      </div>
      <div class="question-text">${q.content || '（题目内容待加载）'}</div>
      <div class="options">${optionsHtml}</div>
    </div>
  `;
  
  // 恢复已选答案
  restoreAnswer(q.id);
  
  // 更新导航按钮
  document.getElementById('btn-prev').style.display = idx === 0 ? 'none' : 'inline-block';
  const isLastQ = idx === questions.length - 1;
  const isLastSection = examData.currentSectionIdx === examData.sections.length - 1;
  document.getElementById('btn-next').textContent = isLastQ ? (isLastSection ? '交卷' : '进入下一部分') : '下一题';
}

function findSharedStem(section, idx) {
  const questions = section.questions;
  // 简化处理：如果是材料题，每组的题干存储在第一题或最后一题
  // 这里我们假设每个题都是独立的（内容中可能包含题干）
  // 实际上，我们需要根据实际数据结构来分组
  
  // 对于 case/multi 类型，如果题目内容包含题干信息
  // 在这里我们简单处理：每5个题一组共享题干
  const groupSize = 5;
  const groupStart = Math.floor(idx / groupSize) * groupSize;
  const groupEnd = Math.min(groupStart + groupSize - 1, questions.length - 1);
  
  if (groupStart === idx) {
    return {
      stem: questions[idx].content || '共用题干内容',
      start: groupStart,
      end: groupEnd
    };
  }
  
  // 同一组的其他题：用第一题的题干
  if (questions[groupStart]) {
    return {
      stem: questions[groupStart].content || '共用题干内容',
      start: groupStart,
      end: groupEnd
    };
  }
  
  return null;
}

function getGlobalQuestionNum(sectionIdx) {
  let num = examData.currentQIdx + 1;
  for (let i = 0; i < examData.currentSectionIdx; i++) {
    num += examData.sections[i].questions.length;
  }
  return num;
}

function toggleOption(el, qid, key, type) {
  if (type === 'radio') {
    // 单选：清除其他选中
    const siblings = el.parentElement.querySelectorAll('.option');
    siblings.forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    examData.answers[qid] = [key];
  } else {
    // 多选：切换
    el.classList.toggle('selected');
    if (!examData.answers[qid]) examData.answers[qid] = [];
    const arr = examData.answers[qid];
    const idx = arr.indexOf(key);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(key);
    if (arr.length === 0) delete examData.answers[qid];
  }
}

function restoreAnswer(qid) {
  const selected = examData.answers[qid];
  if (!selected || selected.length === 0) return;
  const options = document.getElementById('question-container').querySelectorAll('.option');
  options.forEach(opt => {
    const keyEl = opt.querySelector('.option-key');
    if (keyEl && selected.includes(keyEl.textContent.trim())) {
      opt.classList.add('selected');
    }
  });
}

function updateProgress(current, total) {
  const pct = ((current + 1) / total * 100).toFixed(1);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `已答 ${current + 1}/${total}`;
}

// ==================== 导航 ====================
function prevQuestion() {
  if (examData.currentQIdx > 0) {
    showQuestion(examData.currentQIdx - 1);
  }
}

function nextQuestion() {
  const section = examData.sections[examData.currentSectionIdx];
  const questions = section.questions;
  
  if (examData.currentQIdx < questions.length - 1) {
    showQuestion(examData.currentQIdx + 1);
  } else {
    // 当前板块最后一道题
    if (examData.currentSectionIdx < examData.sections.length - 1) {
      showSectionIntro(examData.currentSectionIdx + 1);
    } else {
      // 所有板块完成
      finishExam();
    }
  }
}

// ==================== 计时器 ====================
function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeRemaining--;
    if (timeRemaining <= 0) {
      clearInterval(timer);
      alert('考试时间到！');
      finishExam();
      return;
    }
    const m = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
    const s = String(timeRemaining % 60).padStart(2, '0');
    document.getElementById('time-left').textContent = m + ':' + s;
  }, 1000);
}

// ==================== 交卷 ====================
function finishExam() {
  if (!confirm('确定要交卷吗？交卷后将无法继续作答。')) return;
  
  clearInterval(timer);
  timer = null;
  
  // 提交到后端
  submitAnswers();
}

async function submitAnswers() {
  const token = localStorage.getItem(TOKEN_KEY);
  
  try {
    const resp = await fetch(`${API_BASE}/api/paper/${examData.paperId || 'default'}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ answers: examData.answers })
    });
    const data = await resp.json();
    
    if (data.code === 200 && data.data) {
      displayResult(data.data);
    } else {
      // 本地计算
      displayLocalResult();
    }
  } catch (e) {
    console.error(e);
    displayLocalResult();
  }
}

let reviewData = [];

function displayResult(result) {
  document.getElementById('final-score').textContent = result.score || 0;
  document.getElementById('correct-count').textContent = result.correctCount || 0;
  document.getElementById('wrong-count').textContent =
    (result.totalCount || 0) - (result.correctCount || 0);
  document.getElementById('unanswered-count').textContent =
    (result.totalCount || 0) - Object.keys(examData.answers).length;

  reviewData = result.details || [];
  renderReview();
  showPage('result-page');
}

function renderReview() {
  const container = document.getElementById('detailed-result');
  if (!container) return;
  if (!reviewData || !reviewData.length) {
    container.innerHTML = '<p style="text-align:center;color:#999;">暂无回顾数据</p>';
    return;
  }

  const typeNames = { radio: '单选题', multi: '多选题', material: '共用题干题', case: '案例分析题' };
  let html = '<h3 style="text-align:center;margin:20px 0 10px;color:#333;">试题解析</h3>';

  reviewData.forEach((q, i) => {
    const isCorrect = q.isCorrect;
    const userAns = q.userAnswer || [];
    const correctAns = q.correctAnswer || [];
    const borderClass = isCorrect ? 'border-left:4px solid #4CAF50' : 'border-left:4px solid #f44336';

    let optHtml = (q.options || []).map(o => {
      let bg = '#f9f9f9';
      let mark = '';
      if (o.isRight) { bg = '#e8f5e9'; mark = ' ✓'; }
      if (userAns.includes(o.key) && !o.isRight) { bg = '#ffebee'; mark = ' ✗'; }
      if (isCorrect && userAns.includes(o.key)) { bg = '#e8f5e9'; mark = ' ✓'; }
      return '<div style="padding:6px 10px;margin:3px 0;border-radius:4px;background:' + bg + ';">' +
        '<b>' + o.key + '.</b> ' + (o.text || '') + '<span style="color:' + (o.isRight ? '#4CAF50' : '#f44336') + ';">' + mark + '</span></div>';
    }).join('');

    html += '<div style="margin:12px 0;padding:12px;border-radius:8px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1);' + borderClass + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<span style="font-weight:bold;">第' + (i + 1) + '题</span>' +
        '<span style="font-size:12px;color:#888;">' + (typeNames[q.type] || q.type || '') + '</span>' +
        '<span style="font-size:12px;padding:2px 8px;border-radius:10px;' +
          (isCorrect ? 'background:#e8f5e9;color:#4CAF50' : 'background:#ffebee;color:#f44336') + ';">' +
          (isCorrect ? '✓ 正确' : '✗ 错误') + '</span>' +
      '</div>' +
      '<div style="margin:8px 0;color:#333;line-height:1.6;">' + (q.content || '') + '</div>' +
      '<div style="margin:8px 0;">' + optHtml + '</div>' +
      '<div style="font-size:13px;color:#666;margin-top:8px;">' +
        '<span>你的答案：<b style="color:' + (isCorrect ? '#4CAF50' : '#f44336') + ';">' + (userAns.join(', ') || '未作答') + '</b></span>' +
        '&nbsp;&nbsp;正确答案：<b style="color:#4CAF50;">' + correctAns.join(', ') + '</b>' +
      '</div>' +
      (q.analysis ? '<div style="margin-top:10px;padding:10px;background:#fff8e1;border-radius:4px;font-size:13px;line-height:1.6;color:#555;">' +
        '<b style="color:#f57c00;">📖 解析：</b>' + q.analysis + '</div>' : '') +
    '</div>';
  });

  container.innerHTML = html;
}

function displayLocalResult() {
  const totalAnswered = Object.keys(examData.answers).length;
  const totalQuestions = examData.sections.reduce((sum, s) => sum + (s.questions ? s.questions.length : 0), 0);
  
  document.getElementById('final-score').textContent = '已统计';
  document.getElementById('correct-count').textContent = totalAnswered;
  document.getElementById('wrong-count').textContent = 0;
  document.getElementById('unanswered-count').textContent = totalQuestions - totalAnswered;
  
  showPage('result-page');
}

function backToHome() {
  clearInterval(timer);
  timer = null;
  examData = { sections: [], answers: {}, currentSectionIdx: 0, currentQIdx: 0 };
  showPage('home-page');
  loadPapers();
}

// ==================== 页面切换 ====================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}
