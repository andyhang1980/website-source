#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
病理学高级职称考试系统 - Flask 后端 API
支持用户注册/登录、四题型组卷、答案提交与评分
"""

import os, sys, hashlib, uuid, json, secrets, datetime, re
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pymysql
from pymysql.cursors import DictCursor

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = secrets.token_hex(32)

# ==================== 数据库配置 ====================
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "Zfz19801210*",
    "database": "yf_boot_exam",
    "charset": "utf8mb4",
    "cursorclass": DictCursor,
}

def get_db():
    """获取数据库连接"""
    return pymysql.connect(**DB_CONFIG)

# ==================== 用户认证 ====================

def make_password_hash(password, salt):
    """MD5(MD5(password) + salt)"""
    step1 = hashlib.md5(password.encode()).hexdigest()
    return hashlib.md5((step1 + salt).encode()).hexdigest()

def generate_token(user_id):
    """生成简单 JWT token"""
    import base64, time
    payload = {
        "user_id": user_id,
        "exp": int(time.time()) + 86400 * 7,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hashlib.sha256((payload_b64 + app.config['SECRET_KEY']).encode()).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_token(token):
    import base64, time
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected = hashlib.sha256((payload_b64 + app.config['SECRET_KEY']).encode()).hexdigest()
        if signature != expected:
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + '==').decode())
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except:
        return None

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '')
        if token.startswith('Bearer '):
            token = token[7:]
        payload = verify_token(token)
        if not payload:
            return jsonify({"code": 401, "message": "请先登录"}), 401
        request.user_id = payload['user_id']
        return f(*args, **kwargs)
    return decorated

# ==================== 公开 API ====================

@app.route('/api/public/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    name = data.get('name', username)

    if not username or not password:
        return jsonify({"code": 400, "message": "用户名和密码不能为空"}), 400
    if len(password) < 4:
        return jsonify({"code": 400, "message": "密码至少4位"}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM el_sys_user WHERE user_name = %s", (username,))
            if cur.fetchone():
                return jsonify({"code": 400, "message": "用户名已存在"}), 400

            user_id = str(int(datetime.datetime.now().timestamp() * 1000))
            salt = secrets.token_hex(3)
            pwd_hash = make_password_hash(password, salt)

            cur.execute("""
                INSERT INTO el_sys_user (id, user_name, real_name, password, salt, state, create_time, update_time)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (user_id, username, name, pwd_hash, salt, 1))
            db.commit()
        return jsonify({"code": 200, "message": "注册成功"})
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        db.close()

@app.route('/api/public/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"code": 400, "message": "请输入用户名和密码"}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id, user_name, real_name, password, salt FROM el_sys_user WHERE user_name = %s", (username,))
            user = cur.fetchone()
            if not user:
                return jsonify({"code": 401, "message": "用户名或密码错误"}), 401

            pwd_hash = make_password_hash(password, user['salt'])
            if pwd_hash != user['password']:
                return jsonify({"code": 401, "message": "用户名或密码错误"}), 401

            token = generate_token(user['id'])
            return jsonify({
                "code": 200,
                "data": {
                    "token": token,
                    "userId": user['id'],
                    "username": user['user_name'],
                    "realName": user['real_name'] or user['user_name'],
                }
            })
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        db.close()

@app.route('/api/public/getPublicKey', methods=['GET'])
def get_public_key():
    """获取公钥（兼容 SurveyKing 前端调用）"""
    return jsonify({"code": 200, "data": {"publicKey": "no-rsa"}})

# ==================== 系统信息 ====================

@app.route('/api/system', methods=['GET'])
def system_info():
    """系统信息（兼容 SurveyKing 前端）"""
    return jsonify({
        "code": 200,
        "data": {
            "name": "病理学高级职称考试系统",
            "publicKey": "no-rsa",
            "registerEnabled": True,
        }
    })

# ==================== 考试相关 API ====================

@app.route('/api/paper/list', methods=['GET'])
@login_required
def paper_list():
    """获取试卷列表"""
    return jsonify({
        "code": 200,
        "data": [{
            "id": "default",
            "title": "病理学副高级职称考试模拟试卷",
            "duration": 120,
            "totalScore": 262,
            "questionCount": 225,
            "sections": [
                {"type": "radio", "name": "单选题", "count": 30, "score": 30},
                {"type": "multi", "name": "多选题", "count": 20, "score": 40},
                {"type": "material", "name": "共用题干题", "count": 25, "score": 25},
                {"type": "case", "name": "案例分析题", "count": 60, "score": 60},
            ]
        }]
    })

@app.route('/api/paper/<paper_id>', methods=['GET'])
@login_required
def get_paper(paper_id):
    """获取试卷完整内容（含题目）"""
    db = get_db()
    try:
        sections = []

        # 单选题
        radio_qs = _get_questions(db, 'radio', 30)
        if radio_qs:
            sections.append({
                "type": "radio",
                "name": "单选题",
                "desc": "共{}题，每题1分，共{}分。请选择1个最佳答案。".format(len(radio_qs), len(radio_qs)),
                "questions": radio_qs,
            })

        # 多选题
        multi_qs = _get_questions(db, 'multi', 20)
        if multi_qs:
            sections.append({
                "type": "multi",
                "name": "多选题",
                "desc": "共{}题，每题2分，共{}分。请选择2个或以上正确答案。".format(len(multi_qs), len(multi_qs) * 2),
                "questions": multi_qs,
            })

        # 共用题干题
        material_qs = _get_questions(db, 'material', 20)
        if material_qs:
            sections.append({
                "type": "material",
                "name": "共用题干题",
                "desc": "共{}题，每题1分，共{}分。每组题共用同一题干。".format(len(material_qs), len(material_qs)),
                "questions": material_qs,
            })

        # 案例分析题
        case_qs = _get_questions(db, 'case', 30)
        if case_qs:
            sections.append({
                "type": "case",
                "name": "案例分析题",
                "desc": "共{}题，每题1分，共{}分。不定项选择题。".format(len(case_qs), len(case_qs)),
                "questions": case_qs,
            })

        return jsonify({
            "code": 200,
            "data": {
                "id": paper_id,
                "title": "病理学副高级职称考试模拟试卷",
                "duration": 120,
                "sections": sections,
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        db.close()

def _get_questions(db, qu_type, limit):
    """获取指定类型和数量的题目"""
    with db.cursor() as cur:
        cur.execute("""
            SELECT q.id, q.content, q.analysis, q.qu_type
            FROM el_repo_qu q
            WHERE q.qu_type = %s AND q.repo_id = '3000000000000000001'
            ORDER BY RAND()
            LIMIT %s
        """, (qu_type, limit))
        questions = cur.fetchall()

    result = []
    for q in questions:
        with db.cursor() as cur:
            cur.execute("""
                SELECT tag, content, is_right FROM el_repo_qu_answer
                WHERE qu_id = %s ORDER BY tag
            """, (q['id'],))
            answers = cur.fetchall()

        options = []
        correct = []
        for ans in answers:
            options.append({"key": ans['tag'], "text": ans['content']})
            if ans['is_right'] == 1:
                correct.append(ans['tag'])

        # 清理 HTML 标签
        content_clean = _strip_html(q['content'])
        analysis_clean = _strip_html(q.get('analysis', ''))

        result.append({
            "id": q['id'],
            "content": content_clean,
            "options": options,
            "correct": correct,
            "analysis": analysis_clean,
            "type": q['qu_type'],
        })

    return result

def _strip_html(text):
    """清除 HTML 标签"""
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    return text.strip()

# ==================== 提交答案 ====================

@app.route('/api/paper/<paper_id>/submit', methods=['POST'])
@login_required
def submit_paper(paper_id):
    """提交试卷答案（含完整解析数据）"""
    data = request.get_json()
    answers = data.get('answers', {})

    correct_count = 0
    total_count = 0
    score = 0
    details = []

    db = get_db()
    try:
        for qu_id, user_answer in answers.items():
            total_count += 1
            with db.cursor() as cur:
                # 获取题目信息
                cur.execute("""
                    SELECT content, analysis, qu_type FROM el_repo_qu WHERE id = %s
                """, (qu_id,))
                qinfo = cur.fetchone()

                # 获取选项和正确答案
                cur.execute("""
                    SELECT tag, content, is_right FROM el_repo_qu_answer
                    WHERE qu_id = %s ORDER BY tag
                """, (qu_id,))
                ans_rows = cur.fetchall()

            correct_tags = [r['tag'] for r in ans_rows if r['is_right'] == 1]
            options = [{"key": r['tag'], "text": _strip_html(r['content']), "isRight": r['is_right'] == 1} for r in ans_rows]

            if isinstance(user_answer, str):
                user_answer = [user_answer]

            is_correct = set(user_answer) == set(correct_tags)
            if is_correct:
                correct_count += 1

            # 多选题每题2分，其他每题1分
            qu_type = qinfo['qu_type'] if qinfo else ''
            weight = 2 if qu_type == 'multi' else 1
            if is_correct:
                score += weight

            details.append({
                "quId": qu_id,
                "content": _strip_html(qinfo['content']) if qinfo else '',
                "type": qu_type,
                "analysis": _strip_html(qinfo['analysis']) if qinfo else '',
                "options": options,
                "userAnswer": user_answer,
                "correctAnswer": correct_tags,
                "isCorrect": is_correct,
            })

        percentage = round(score / total_count * 100, 1) if total_count > 0 else 0

        # 保存考试记录
        try:
            record_id = str(int(datetime.datetime.now().timestamp() * 1000))
            with db.cursor() as cur:
                cur.execute("""
                    INSERT INTO exam_record (id, user_id, paper_id, answers, score, total, percentage, create_time)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (record_id, request.user_id, paper_id, json.dumps(answers, ensure_ascii=False),
                      score, total_count, percentage))
            db.commit()
        except Exception as e:
            app.logger.warning(f"Failed to save exam record: {e}")

        return jsonify({
            "code": 200,
            "data": {
                "totalCount": total_count,
                "correctCount": correct_count,
                "score": score,
                "percentage": percentage,
                "details": details,
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "message": str(e)}), 500
    finally:
        db.close()

# ==================== 静态文件 ====================

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

def _count_type(qu_type):
    try:
        db = get_db()
        with db.cursor() as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM el_repo_qu WHERE qu_type = %s", (qu_type,))
            return cur.fetchone()['cnt']
    except:
        return '?'
    finally:
        db.close()

# ==================== 启动 ====================

if __name__ == '__main__':
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    os.makedirs(static_dir, exist_ok=True)

    print("=" * 60)
    print("病理学高级职称考试系统 - API 服务")
    print(f"数据库: {DB_CONFIG['database']}@{DB_CONFIG['host']}")
    print(f"题型: 单选({_count_type('radio')}) 多选({_count_type('multi')}) "
          f"共用题干({_count_type('material')}) 案例分析({_count_type('case')})")
    print("=" * 60)

    app.run(host='0.0.0.0', port=8090, debug=False)
