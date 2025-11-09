"use strict";
// 필요한 dom 값 가져오기
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInp = document.getElementById('password');
const loginBtn = document.getElementById('login-button');
const errorLine = document.getElementById('login-error');
function showError(msg) {
    errorLine.textContent = msg;
    errorLine.classList.remove('hidden');
}
function clearError() {
    errorLine.textContent = '';
    errorLine.classList.add('hidden');
}
// 응답 본문이 없거나 비-JSON일 수 있으므로 안전 파싱
async function safeParseJson(resp) {
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json'))
        return null;
    const text = await resp.text();
    if (!text)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
[emailInput, passwordInp].forEach(el => el.addEventListener('input', () => clearError()));
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();
    const email = emailInput.value.trim();
    const password = passwordInp.value;
    // 간단한 클라이언트 검증
    if (!email || !password) {
        showError('아이디와 비밀번호를 모두 입력해주세요.');
        return;
    }
    loginBtn.disabled = true;
    try {
        const resp = await fetch('https://d19a6mzn99qmli.cloudfront.net/v1/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await safeParseJson(resp); // 실패해도 null
        if (resp.ok) {
            const accessToken = data?.accessToken;
            if (!accessToken) {
                showError('로그인 응답이 올바르지 않습니다. 잠시 후 다시 시도해주세요.');
                return;
            }
            localStorage.setItem('accessToken', accessToken);
            window.location.href = 'games.html';
            return;
        }
        // ----- 상태코드별 사용자 메시지 -----
        if (resp.status === 400 || resp.status === 401) {
            showError('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
        else if (resp.status === 403) {
            showError('아이디/비밀번호를 다시 확인해주세요.');
        }
        else if (resp.status >= 500) {
            showError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        else {
            showError(data?.message ?? `요청 실패 (HTTP ${resp.status})`);
        }
    }
    catch (err) {
        // 네트워크/SSL/CORS 등
        console.error('로그인 중 오류 발생:', err);
        showError('네트워크 오류가 발생했습니다. 인터넷 연결 또는 서버 상태를 확인해주세요.');
    }
    finally {
        loginBtn.disabled = false;
    }
});
