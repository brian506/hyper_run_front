// 필요한 dom 값 가져오기
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const loginButton = document.getElementById('login-button') as HTMLButtonElement;

loginForm.addEventListener('submit',async (event: Event) => {
    event.preventDefault();  

    const email = emailInput.value;
    const password = passwordInput.value;

    try{
        const response = await fetch('http://localhost:8080/v1/api/admin/login',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            });

        if(response.ok) {
            const accessToken = response.headers.get('Authorization');

            if(accessToken){            
              localStorage.setItem('accessToken',accessToken);

              window.location.href = 'games.html';
            } else {
                console.error('엑세스 토큰이 없습니다.');
                alert('로그인에 실패했습니다. 다시 시도해주세요.');
            }
        } else {
            const errorData = await response.json();
            alert('로그인 실패 : ${errorData.message}');
        }
    } catch(error){
        console.error('로그인 중 오류 발생 : ', error);
        alert('네트워크 오류 발생')
    }
})
