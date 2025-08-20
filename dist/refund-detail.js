"use strict";
const refundTypeToKorean = {
    'LACK_OF_FEATURES': '기능 부족',
    'COMPLICATED_INTERFACE': '복잡한 인터페이스',
    'FREQUENT_ERRORS': '잦은 오류 발생',
    'TOO_EXPENSIVE': '가격 부담',
    'MISTAKEN_PAYMENT': '오인 결제',
    'POOR_CUSTOMER_SUPPORT': '고객 지원 불만족',
    'OTHER': '기타'
};
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}
// --- API 호출 ---
// approveRefund, rejectRefund 함수는 그대로 유지
async function fetchPaymentDetail(paymentId) {
    const REFUND_URL = `http://localhost:8080/v1/api/admin/payments/refunds/${paymentId}`;
    const accessToken = localStorage.getItem('accessToken');
    try {
        const response = await fetch(REFUND_URL, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            throw new Error('상세 정보를 불러오는 데 실패했습니다.');
        }
        const responseData = await response.json();
        return responseData.data; // 서버 응답 구조에 따라 조정
    }
    catch (error) {
        console.error("환불 조회 오류 발생:", error);
        alert(error.message);
    }
}
async function approveRefund(paymentId) {
    const CONFIRM_URL = `http://localhost:8080/v1/api/admin/payments/refunds/${paymentId}/confirm`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch(CONFIRM_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '답변 등록에 실패했습니다.');
        }
        document.getElementById('approve-success-modal')?.classList.add('hidden'); // 모달 닫기
        await fetchPaymentDetail(paymentId); // 목록 새로고침
    }
    catch (error) {
        console.error("처리 중 오류 발생:", error);
        alert(error.message || '요청 처리에 실패했습니다.');
    }
}
async function rejectRefund(paymentId) {
    const REJECT_URL = `http://localhost:8080/v1/api/admin/payments/refunds/${paymentId}/reject`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch(REJECT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '답변 등록에 실패했습니다.');
        }
        document.getElementById('reject-success-modal')?.classList.add('hidden'); // 모달 닫기
        await fetchPaymentDetail(paymentId); // 목록 새로고침
    }
    catch (error) {
        console.error("처리 중 오류 발생:", error);
        alert(error.message || '요청 처리에 실패했습니다.');
    }
}
// --- 렌더링 함수 ---
function renderDetails(data) {
    const requesterInfo = document.getElementById('requester-info');
    const paymentInfo = document.getElementById('payment-info');
    const refundTypeInput = document.getElementById('refund-type');
    const reasonTextarea = document.getElementById('refund-reason');
    if (requesterInfo) {
        requesterInfo.innerHTML = `
        <p><strong>이름 :</strong> ${data.userName}</p>
        <p><strong>전화번호 :</strong> ${data.phoneNumber}</p>
        <p><strong>이메일 :</strong> ${data.email}</p>
        `;
    }
    if (paymentInfo) {
        paymentInfo.innerHTML = `
            <p><strong>결제방법 :</strong> ${data.paymentMethod}</p>
            <p><strong>결제일자 :</strong> ${data.paymentAt.split('T')[0]}</p>
            <p><strong>금액 :</strong> ${data.price.toLocaleString()} 원</p>
        `;
    }
    if (refundTypeInput) {
        // Enum 값을 한글로 변환하여 표시
        refundTypeInput.value = refundTypeToKorean[data.refundType] || '알 수 없음';
    }
    if (reasonTextarea) {
        // 상세 메시지 표시
        reasonTextarea.value = data.message || '';
    }
}
// --- 이벤트 리스너 바인딩 ---
function bindEventListeners(paymentId) {
    const reasonTextarea = document.getElementById('refund-reason');
    // 승인/거절 버튼
    document.getElementById('approve-btn')?.addEventListener('click', () => showModal('approve-confirm-modal'));
    document.getElementById('reject-btn')?.addEventListener('click', () => showModal('reject-confirm-modal'));
    // 승인 확인 모달
    const approveModal = document.getElementById('approve-confirm-modal');
    approveModal?.querySelector('.cancel-btn')?.addEventListener('click', () => hideModal('approve-confirm-modal'));
    approveModal?.querySelector('.confirm-btn')?.addEventListener('click', async () => {
        const reason = reasonTextarea.value;
        await approveRefund(paymentId);
        // [수정] alert 대신, 확인 모달을 닫고 성공 모달을 엽니다.
        hideModal('approve-confirm-modal');
        showModal('approve-success-modal');
    });
    // 거절 확인 모달
    const rejectModal = document.getElementById('reject-confirm-modal');
    rejectModal?.querySelector('.cancel-btn')?.addEventListener('click', () => hideModal('reject-confirm-modal'));
    rejectModal?.querySelector('.confirm-btn')?.addEventListener('click', async () => {
        const reason = reasonTextarea.value;
        await rejectRefund(paymentId);
        // [수정] alert 대신, 확인 모달을 닫고 성공 모달을 엽니다.
        hideModal('reject-confirm-modal');
        showModal('reject-success-modal');
    });
    // --- [추가] 완료 팝업들의 '확인' 버튼 이벤트 리스너 ---
    // 승인 완료 모달의 '확인' 버튼
    const approveSuccessModal = document.getElementById('approve-success-modal');
    approveSuccessModal?.querySelector('.confirm-btn')?.addEventListener('click', () => {
        // 완료 팝업을 닫고 목록 페이지로 이동
        hideModal('approve-success-modal');
        window.location.href = 'payment.html';
    });
    // 거절 완료 모달의 '확인' 버튼
    const rejectSuccessModal = document.getElementById('reject-success-modal');
    rejectSuccessModal?.querySelector('.confirm-btn')?.addEventListener('click', () => {
        // 완료 팝업을 닫고 목록 페이지로 이동
        hideModal('reject-success-modal');
        window.location.href = 'payment.html';
    });
}
// --- 앱 초기화 ---
async function initializeApp() {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('paymentId');
    if (!paymentId) {
        alert('표시할 결제 정보가 없습니다. 목록으로 돌아갑니다.');
        window.location.href = 'payment.html';
        return;
    }
    const paymentData = await fetchPaymentDetail(paymentId);
    if (paymentData) {
        renderDetails(paymentData);
        bindEventListeners(paymentId);
    }
}
document.addEventListener('DOMContentLoaded', initializeApp);
