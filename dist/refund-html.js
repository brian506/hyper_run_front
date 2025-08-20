"use strict";
function showModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
}
function hideModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
}
// --- API 호출 ---
async function fetchPaymentDetail(paymentId) {
    // const response = await fetch(`/api/admin/payments/${paymentId}`);
    // ... API 호출 로직 ...
    // 임시 가짜 데이터
    return {
        userName: '홍길동',
        userPhone: '010-1234-5678',
        userEmail: 'example@gmail.com',
        transactionId: '968416061615',
        paymentMethod: '농협 3510000111122',
        paymentAt: '2025년 9월 20일 16:12',
        planName: '증시노출',
        price: 180000,
        reason: '다음과 같은 이유로 환불 요청합니다.'
    };
}
async function approveRefund(paymentId) {
    // await fetch(`/api/admin/payments/${paymentId}/approve`, { method: 'POST' });
    console.log(`${paymentId}번 결제 환불 승인 API 호출`);
}
async function rejectRefund(paymentId) {
    // await fetch(`/api/admin/payments/${paymentId}/reject`, { method: 'POST' });
    console.log(`${paymentId}번 결제 환불 거절 API 호출`);
}
// --- 렌더링 함수 ---
function renderDetails(data) {
    const requesterInfo = document.getElementById('requester-info');
    const paymentInfo = document.getElementById('payment-info');
    const reasonText = document.getElementById('refund-reason');
    if (requesterInfo) {
        requesterInfo.innerHTML = `
            <p><strong>이름 :</strong> ${data.userName}</p>
            <p><strong>전화번호 :</strong> ${data.userPhone}</p>
            <p><strong>이메일 :</strong> ${data.userEmail}</p>
        `;
    }
    if (paymentInfo) {
        paymentInfo.innerHTML = `
            <p><strong>거래 ID :</strong> ${data.transactionId}</p>
            <p><strong>결제방법 :</strong> ${data.paymentMethod}</p>
            <p><strong>결제일자 :</strong> ${data.paymentAt}</p>
            <p><strong>플랜 :</strong> ${data.planName}</p>
            <p><strong>금액 :</strong> ${data.price.toLocaleString()} 원</p>
        `;
    }
    if (reasonText) {
        reasonText.value = data.reason;
    }
}
// --- 이벤트 리스너 바인딩 ---
function bindEventListeners(paymentId) {
    // 승인/거절 버튼
    document.getElementById('approve-btn')?.addEventListener('click', () => showModal('approve-confirm-modal'));
    document.getElementById('reject-btn')?.addEventListener('click', () => showModal('reject-confirm-modal'));
    // 승인 확인 모달
    const approveModal = document.getElementById('approve-confirm-modal');
    approveModal?.querySelector('.cancel-btn')?.addEventListener('click', () => hideModal('approve-confirm-modal'));
    approveModal?.querySelector('.confirm-btn')?.addEventListener('click', async () => {
        await approveRefund(paymentId);
        alert('환불이 승인되었습니다.');
        window.location.href = 'payment.html'; // 목록으로 돌아가기
    });
    // 거절 확인 모달
    const rejectModal = document.getElementById('reject-confirm-modal');
    rejectModal?.querySelector('.cancel-btn')?.addEventListener('click', () => hideModal('reject-confirm-modal'));
    rejectModal?.querySelector('.confirm-btn')?.addEventListener('click', async () => {
        await rejectRefund(paymentId);
        alert('환불이 거절되었습니다.');
        window.location.href = 'payment.html'; // 목록으로 돌아가기
    });
}
// --- 앱 초기화 ---
async function initializeApp() {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('paymentId');
    if (!paymentId) {
        alert('잘못된 접근입니다.');
        window.location.href = 'payment.html';
        return;
    }
    const paymentData = await fetchPaymentDetail(paymentId);
    renderDetails(paymentData);
    bindEventListeners(paymentId);
}
document.addEventListener('DOMContentLoaded', initializeApp);
