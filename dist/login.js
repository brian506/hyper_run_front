"use strict";
// 필요한 dom 값 가져오기
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // 폼의 기본 제출 동작(새로고침)을 막고 해당 이벤트의 다음 동작 수행
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const response = await fetch('http://localhost:8080/v1/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (response.ok) {
            // 서버에서 보낸 엑세스 토큰을 헤더에서 추룰
            // 서버에서 보낸 리프레시토큰 쿠키는 'set-cookie' 로 자동 저장되므로 처리 x
            const accessToken = response.headers.get('Authorization');
            if (accessToken) {
                // localStorage 에 저장함으로써 다른 페이지에서도 해당 토큰을 사용
                localStorage.setItem('accessToken', accessToken);
                window.location.href = 'games.html';
            }
            else {
                console.error('엑세스 토큰이 없습니다.');
                alert('로그인에 실패했습니다. 다시 시도해주세요.');
            }
        }
        else {
            const errorData = await response.json();
            alert('로그인 실패 : ${errorData.message}');
        }
    }
    catch (error) {
        console.error('로그인 중 오류 발생 : ', error);
        alert('네트워크 오류 발생');
    }
});
