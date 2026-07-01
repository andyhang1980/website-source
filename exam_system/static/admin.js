// ==================== 管理后台 JS ====================
const A_API = '';
const A_TK = 'exam_tk', A_UK = 'exam_uk';
let aMe = null;
let aTab = 'papers';

// Init
document.addEventListener('DOMContentLoaded', () => {
  const t = localStorage.getItem(A_TK);
  if (t) {
    aMe = JSON.parse(localStorage.getItem(A_UK)||'{}');
    aMe.token = t;
    if (aMe.isAdmin) { showPanel(); initPanel(); }
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('pg-admin-login').classList.contains('active')) {
      doAdminLogin();
    }
  });
});

// API
async function aa(url, opt={}) {
  const h = {'Content-Type':'application/json'};
  if (aMe && aMe.token) h['Authorization'] = aMe.token;
  try {
    const r = await fetch(A_API+url, {headers:h, ...opt});
    if (r.status === 401) { doAdminLogout(); return {code:401, message:'登录已过期'}; }
    return r.json();
  } catch(e) { return {code:-1, message:'网络连接失败'}; }
}

// Admin login — only admin can pass
async function doAdminLogin() {
  const u = av('admin-login-user'), p = av('admin-login-pass');
  if(!u||!p) return alert('请输入管理员账号和密码');
  const r = await aa('/api/login', {method:'POST', body:JSON.stringify({username:u, password:p})});
  if(r.code===200 && r.data.isAdmin){
    aMe = r.data;
    localStorage.setItem(A_TK, r.data.token);
    localStorage.setItem(A_UK, JSON.stringify(aMe));
    showPanel();
    initPanel();
  } else if(r.code===200) {
    alert('该账号不是管理员，请使用管理员账号登录');
  } else {
    alert(r.message||'登录失败');
  }
}

function doAdminLogout() {
  localStorage.removeItem(A_TK); localStorage.removeItem(A_UK);
  aMe = null;
  document.getElementById('pg-admin-panel').classList.remove('active');
  document.getElementById('pg-admin-login').classList.add('active');
}

function showPanel() {
  document.getElementById('pg-admin-login').classList.remove('active');
  document.getElementById('pg-admin-panel').classList.add('active');
}

function initPanel() { switchAdminTab('papers'); }

async function switchAdminTab(tab) {
  aTab = tab;
  const el = document.getElementById('admin-content');
  switch(tab){
    case 'papers': await renderPaperManager(el); break;
    case 'users': await renderUserManager(el); break;
    case 'import': renderImportPage(el); break;
    case 'stats': await renderStats(el); break;
  }
}

// ==================== 试卷管理 ====================
async function renderPaperManager(el) {
  const r = await aa('/api/admin/papers');
  const ps = r.data||[];
  el.innerHTML = `<div class="admin-section">
    <h3>📋 试卷管理</h3>
    <button class="btn-primary btn-sm" onclick="showPaperForm()">+ 新建试卷</button>
    <table class="tbl"><tr><th>标题</th><th>时长</th><th>单选</th><th>多选</th><th>共用题干</th><th>案例分析</th><th>总分</th><th>状态</th><th>操作</th></tr>
    ${ps.map(p=>`<tr>
      <td>${p.title}</td><td>${p.duration}分</td>
      <td>${p.radio_count}</td><td>${p.multi_count}</td>
      <td>${p.material_count}</td><td>${p.case_count}</td>
      <td>${p.total_score}</td>
      <td>${p.status?'🟢 已发布':'🔴 下线'}</td>
      <td>
        <button class="btn-xs" onclick="togglePaper('${p.id}',${p.status})">${p.status?'下线':'发布'}</button>
        <button class="btn-xs btn-del" onclick="delPaper('${p.id}')">删除</button>
      </td>
    </tr>`).join('')||'<tr><td colspan="9">暂无试卷</td></tr>'}
    </table></div>
    <div id="paper-form" style="display:none;"></div>`;
}

function showPaperForm() {
  const el = document.getElementById('paper-form');
  el.style.display = 'block';
  el.innerHTML = `<div class="form-card">
    <h4>新建试卷</h4>
    <input id="pf-title" placeholder="试卷标题">
    <div class="form-row"><input id="pf-dur" placeholder="时长(分钟)" value="120" type="number"><input id="pf-score" placeholder="总分" value="100" type="number"></div>
    <div class="form-row"><input id="pf-radio" placeholder="单选题数" value="30" type="number"><input id="pf-multi" placeholder="多选题数" value="20" type="number"></div>
    <div class="form-row"><input id="pf-mat" placeholder="共用题干题数" value="20" type="number"><input id="pf-case" placeholder="案例分析题数" value="30" type="number"></div>
    <button class="btn-primary" onclick="createPaper()">创建</button>
    <button class="btn-outline" onclick="document.getElementById('paper-form').style.display='none'">取消</button>
  </div>`;
}

async function createPaper() {
  const d = {
    title: av('pf-title'), duration: parseInt(av('pf-dur')),
    radio_count: parseInt(av('pf-radio')), multi_count: parseInt(av('pf-multi')),
    material_count: parseInt(av('pf-mat')), case_count: parseInt(av('pf-case')),
    total_score: parseInt(av('pf-score')),
  };
  if(!d.title) return alert('请输入标题');
  const r = await aa('/api/admin/papers',{method:'POST',body:JSON.stringify(d)});
  if(r.code===200){ alert('创建成功'); switchAdminTab('papers'); }
  else alert(r.message);
}

async function togglePaper(id, status) {
  await aa('/api/admin/papers/'+id,{method:'PUT',body:JSON.stringify({status:status?0:1})});
  switchAdminTab('papers');
}

async function delPaper(id) {
  if(!confirm('确定删除？')) return;
  await aa('/api/admin/papers/'+id,{method:'DELETE'});
  switchAdminTab('papers');
}

// ==================== 用户管理 ====================
async function renderUserManager(el) {
  const r = await aa('/api/admin/users');
  const us = r.data||[];
  el.innerHTML = `<div class="admin-section">
    <h3>👤 用户管理 <span style="color:#aaa;font-weight:normal;font-size:14px;">共 ${us.length} 个用户</span></h3>
    <div style="margin-bottom:12px;">
      <button class="btn-primary btn-sm" onclick="toggleSelectAllUsers(this)">☐ 全选</button>
      <button class="btn-sm btn-del" onclick="deleteSelectedUsers()" style="background:#e74c3c;color:#fff;border:none;">🗑 删除选中</button>
    </div>
    <table class="tbl">
      <tr><th style="width:40px"><input type="checkbox" id="sel-all-cb" onchange="toggleSelectAllUsers(this)"></th><th>用户名</th><th>姓名</th><th>状态</th><th>考试次数</th><th>注册时间</th></tr>
      ${us.map(u=>`<tr>
        <td><input type="checkbox" class="user-cb" value="${u.id}" data-name="${u.user_name}" ${u.user_name==='admin'?'disabled title="管理员账号不可选"':''}></td>
        <td>${u.user_name}${u.user_name==='admin'?' <span style="color:#e67e22;font-size:11px;">[管理员]</span>':''}</td>
        <td>${u.real_name||'--'}</td>
        <td>${u.state?'🟢 正常':'🔴 禁用'}</td>
        <td>${u.exam_count||0}</td>
        <td>${(u.create_time||'').substring(0,16)}</td>
      </tr>`).join('')||'<tr><td colspan="6">暂无用户</td></tr>'}
    </table>
  </div>`;
}

function toggleSelectAllUsers(el) {
  const cbs = document.querySelectorAll('.user-cb:not(:disabled)');
  const allChecked = el.checked || (el.type !== 'checkbox' && Array.from(cbs).every(c=>c.checked));
  const newState = el.type === 'checkbox' ? el.checked : !Array.from(cbs).every(c=>c.checked);
  cbs.forEach(c => c.checked = newState);
  const selAllCb = document.getElementById('sel-all-cb');
  if (selAllCb && el !== selAllCb) selAllCb.checked = newState;
  if (el.type !== 'checkbox') el.textContent = newState ? '☑ 取消全选' : '☐ 全选';
}

async function deleteSelectedUsers() {
  const cbs = document.querySelectorAll('.user-cb:checked');
  if (!cbs.length) return alert('请先选择要删除的用户');
  const ids = Array.from(cbs).map(c => c.value);
  const names = Array.from(cbs).map(c => c.getAttribute('data-name'));
  if (!confirm(`确定删除以下 ${ids.length} 个用户？\n\n${names.join(', ')}\n\n此操作不可恢复，用户的考试记录也会一并删除。`)) return;
  const r = await aa('/api/admin/users', {method:'DELETE', body:JSON.stringify({ids: ids})});
  alert(r.message || '操作完成');
  switchAdminTab('users');
}

// ==================== 试题导入 ====================
function renderImportPage(el) {
  el.innerHTML = `<div class="admin-section">
    <h3>📥 试题导入 <a href="${A_API}/api/admin/template" class="btn-sm">📥 下载导入模板</a></h3>
    <div class="import-tabs">
      <button class="tab active" onclick="showImportTab('excel')">📄 Excel导入</button>
      <button class="tab" onclick="showImportTab('text')">📝 文本粘贴导入</button>
    </div>
    <div id="import-excel" class="import-panel">
      <h4>上传 Excel 文件（支持 SurveyKing 格式）</h4>
      <p class="hint">Excel中每个Sheet对应一种题型：单选题 / 多选题 / 共用题干题 / 案例分析题</p>
      <input type="file" id="excel-file" accept=".xlsx,.xls">
      <button class="btn-primary" onclick="doImportExcel()">上传并导入</button>
      <div id="import-excel-msg"></div>
    </div>
    <div id="import-text" class="import-panel" style="display:none">
      <h4>粘贴文本格式试题</h4>
      <p class="hint">每道题之间用空行分隔。格式：1. 题干\nA. 选项A\nB. 选项B\n答案：C\n解析：...</p>
      <select id="text-type">
        <option value="radio">单选题</option><option value="multi">多选题</option>
        <option value="material">共用题干题</option><option value="case">案例分析题</option>
      </select>
      <textarea id="text-content" rows="15" placeholder="在此粘贴试题内容..."></textarea>
      <button class="btn-primary" onclick="doImportText()">导入</button>
      <div id="import-text-msg"></div>
    </div>
    <div id="question-counts" style="margin-top:20px;">
      <h4>题库统计</h4><div id="qc-data">加载中...</div>
    </div>
  </div>`;
  loadQuestionCounts();
}

function showImportTab(t) {
  document.querySelectorAll('#import-excel, #import-text').forEach(x=>x.style.display='none');
  document.getElementById('import-'+t).style.display='block';
}

async function doImportExcel() {
  const f = document.getElementById('excel-file').files[0];
  if(!f) return alert('请选择文件');
  const fd = new FormData(); fd.append('file',f);
  try {
    const r = await fetch(A_API+'/api/admin/import/excel',{method:'POST',headers:{'Authorization':aMe.token},body:fd});
    if(r.status===401){ doAdminLogout(); return; }
    const d = await r.json();
    document.getElementById('import-excel-msg').innerHTML = `<p style="color:${d.code===200?'green':'red'}">${d.message}</p>`;
    if(d.code===200) loadQuestionCounts();
  } catch(e){ document.getElementById('import-excel-msg').innerHTML='<p style="color:red">上传失败</p>'; }
}

async function doImportText() {
  const type = document.getElementById('text-type').value;
  const text = document.getElementById('text-content').value.trim();
  if(!text) return alert('请输入内容');
  const r = await aa('/api/admin/import/text',{method:'POST',body:JSON.stringify({type,text})});
  document.getElementById('import-text-msg').innerHTML = `<p style="color:${r.code===200?'green':'red'}">${r.message}</p>`;
  if(r.code===200) loadQuestionCounts();
}

async function loadQuestionCounts() {
  const r = await aa('/api/admin/questions/counts');
  const d = r.data||{};
  const names = {radio:'单选题',multi:'多选题',material:'共用题干题',case:'案例分析题'};
  document.getElementById('qc-data').innerHTML = Object.entries(names).map(([k,v]) =>
    `<span class="qc-badge">${v}: ${d[k]||0} 题</span>`
  ).join(' ');
}

// ==================== 数据统计 ====================
async function renderStats(el) {
  const qr = await aa('/api/admin/questions/counts');
  const rr = await aa('/api/admin/records');
  const qd = qr.data||{}, rs = rr.data||[];
  const names = {radio:'单选题',multi:'多选题',material:'共用题干题',case:'案例分析题'};
  el.innerHTML = `<div class="admin-section">
    <h3>📊 数据统计</h3>
    <div class="stats-grid">
      <div class="stat-card"><h4>题库总量</h4><div class="big-num">${Object.values(qd).reduce((a,b)=>a+b,0)}</div></div>
      ${Object.entries(names).map(([k,v])=>`<div class="stat-card"><h4>${v}</h4><div class="big-num">${qd[k]||0}</div></div>`).join('')}
      <div class="stat-card"><h4>考试记录</h4><div class="big-num">${rs.length}</div></div>
    </div>
    <h4>最近考试记录</h4>
    <table class="tbl">
      <tr><th>考生</th><th>试卷</th><th>得分</th><th>正确率</th><th>时间</th></tr>
      ${rs.slice(0,20).map(x=>`<tr>
        <td>${x.user_name||x.real_name||'--'}</td><td>${x.paper_title||'--'}</td>
        <td>${x.score}/${x.total}</td><td>${x.percentage}%</td>
        <td>${(x.create_time||'').substring(0,16)}</td>
      </tr>`).join('')||'<tr><td colspan="5">暂无记录</td></tr>'}
    </table>
  </div>`;
}

function av(id) { return document.getElementById(id)?.value?.trim()||''; }
