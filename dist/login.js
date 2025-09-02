"use strict";
// 필요한 dom 값 가져오기
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const response = await fetch('https://43.201.192.25:8081/v1/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (response.ok) {
            const data = await response.json();
            const accessToken = data.accessToken;
            if (accessToken) {
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
