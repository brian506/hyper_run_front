// 텍스트 안에 특수문자가 들어갔을 때 안전한 문자로 인코딩
function encodeHTML(str) {
    return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
// 한글 변환을 위한 맵 객체
const inquiryTypeToKorean = {
    'REFUND': '환불 관련 문의',
    'ACCOUNT': '계정 관련 문의',
    'PAYMENT': '결제 관련 문의',
    'GAME': '경기 관련 문의',
    'APP': '앱 이용 문의',
    'USER': '부적절한 회원 행위 신고',
    'OTHER': '기타 문의'
};
const inquiryStateToKorean = {
    'SUCCESS': '답변 완료',
    'WAITING': '문의중'
};
const filterState = {
    page: 0,
    size: 6, // 페이지 당 데이터 수를 10으로 변경
    sort: 'createDateTime,desc',
};
//  현재 선택된 문의 ID를 저장할 변수 
let currentInquiryId = null;
// --- API 호출 (API Calls) ---
async function fetchInquiry() {
    const params = new URLSearchParams({
        page: filterState.page.toString(),
        size: filterState.size.toString(),
        sort: filterState.sort,
    });
    // 옵셔널 파라미터 추가
    if (filterState.keyword)
        params.append('keyword', filterState.keyword);
    if (filterState.startDate && filterState.endDate) {
        params.append('startDate', filterState.startDate);
        params.append('endDate', filterState.endDate);
    }
    if (filterState.state)
        params.append('state', filterState.state);
    if (filterState.type)
        params.append('type', filterState.type);
    const INQUIRY_URL = `http://43.201.192.25:8081/v1/api/admin/inquiry?${params.toString()}`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch(INQUIRY_URL, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        const responseData = await response.json();
        const data = responseData.data;
        renderTable(data);
        renderPagination(data);
        updateTotalCount(data.totalElements);
    }
    catch (error) {
        console.error("데이터를 불러오는 중 오류 발생:", error);
        document.getElementById('data-table-body').innerHTML = '<tr><td colspan="7">데이터를 불러오는 중 오류가 발생했습니다.</td></tr>';
    }
}
async function deleteInquiry(inquiryId) {
    const DELETE_INQUIRY_URL = `http://43.201.192.25:8081/v1/api/admin/inquiry/${inquiryId}`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        return;
    }
    const response = await fetch(DELETE_INQUIRY_URL, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error('사용자 삭제에 실패했습니다.');
    }
}
async function answerInquiry(inquiryId, answer) {
    const ANSWER_URL = `http://43.201.192.25:8081/v1/api/admin/inquiry/answer/${inquiryId}`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch(ANSWER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ answer: answer })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '답변 등록에 실패했습니다.');
        }
        alert('답변이 성공적으로 등록되었습니다.');
        document.getElementById('inquiry-detail-modal')?.classList.add('hidden'); // 모달 닫기
        await fetchInquiry(); // 목록 새로고침
    }
    catch (error) {
        console.error("답변 등록 중 오류 발생:", error);
        alert(error.message);
    }
}
// --- 렌더링 함수 (Rendering Functions) ---
function renderTable(pageData) {
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody)
        return;
    const { content: inquiries, number: currentPage, size: pageSize } = pageData;
    if (inquiries.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">데이터가 없습니다.</td></tr>';
        return;
    }
    tableBody.innerHTML = inquiries.map((inquiry, index) => {
        const rowNum = currentPage * pageSize + index + 1;
        const formattedDate = new Date(inquiry.createDateTime).toLocaleDateString('ko-KR');
        return `
            <tr class="inquiry-row" data-inquiry-info='${encodeHTML(JSON.stringify(inquiry))}'>
                <td>${rowNum}</td>
                <td>${formattedDate}</td>
                <td>${inquiryStateToKorean[inquiry.state]}</td>
                <td>${inquiryTypeToKorean[inquiry.type]}</td>
                <td>${inquiry.name}</td>
                <td>${inquiry.email}</td>
                <td>${inquiry.phoneNumber}</td>
            </tr>
        `;
    }).join('');
}
function renderPagination(pageData) {
    const { totalPages, number: currentPage } = pageData;
    const container = document.getElementById('pagination-container');
    if (!container)
        return;
    container.innerHTML = '';
    if (totalPages === 0)
        return;
    // 페이지네이션 그룹 로직 (기존과 동일)
    const pageGroupSize = 10;
    const startPage = Math.floor(currentPage / pageGroupSize) * pageGroupSize;
    const endPage = Math.min(startPage + pageGroupSize, totalPages);
    const prevGroupBtn = document.createElement('a');
    prevGroupBtn.href = '#';
    prevGroupBtn.className = 'page-arrow';
    prevGroupBtn.innerHTML = '&lt;';
    if (startPage === 0)
        prevGroupBtn.classList.add('disabled');
    prevGroupBtn.dataset.page = (startPage - 1).toString();
    container.appendChild(prevGroupBtn);
    for (let i = startPage; i < endPage; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.className = 'page-link';
        pageLink.textContent = (i + 1).toString();
        pageLink.dataset.page = i.toString();
        if (i === currentPage)
            pageLink.classList.add('active');
        container.appendChild(pageLink);
    }
    const nextGroupBtn = document.createElement('a');
    nextGroupBtn.href = '#';
    nextGroupBtn.className = 'page-arrow';
    nextGroupBtn.innerHTML = '&gt;';
    if (endPage >= totalPages)
        nextGroupBtn.classList.add('disabled');
    nextGroupBtn.dataset.page = endPage.toString();
    container.appendChild(nextGroupBtn);
}
function updateTotalCount(total) {
    const countElement = document.getElementById('total-count');
    if (countElement) {
        countElement.textContent = `총 ${total.toLocaleString()}건`;
    }
}
function closeAllDropdowns(exceptWrapper = null) {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        if (wrapper !== exceptWrapper)
            wrapper.classList.remove('open');
    });
}
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
// --- 이벤트 핸들러 (Event Handlers) ---
function applyFiltersAndFetch() {
    const sortDropdown = document.getElementById('sort-dropdown');
    const searchInput = document.getElementById('searchInput');
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    const stateDropdown = document.getElementById('filter-state-dropdown');
    const typeDropdown = document.getElementById('filter-type-dropdown');
    if (!sortDropdown || !searchInput || !startDateInput || !endDateInput || !stateDropdown || !typeDropdown)
        return;
    // 1. 정렬 값 가져오기
    const selectedSortOption = sortDropdown.querySelector('.custom-option.selected');
    const ascCheckbox = sortDropdown.querySelector('#sort-asc');
    const sortBy = selectedSortOption?.dataset.value || 'createDateTime';
    const direction = ascCheckbox?.checked ? 'asc' : 'desc';
    // 2. 팝업 필터 값 가져오기
    const selectedStateOption = stateDropdown.querySelector('.custom-option.selected');
    const selectedTypeOption = typeDropdown.querySelector('.custom-option.selected');
    // 3. filterState 전역 변수 업데이트
    filterState.sort = `${sortBy},${direction}`;
    filterState.keyword = searchInput.value;
    filterState.startDate = startDateInput.value;
    filterState.endDate = endDateInput.value;
    filterState.state = selectedStateOption?.dataset.value;
    filterState.type = selectedTypeOption?.dataset.value;
    filterState.page = 0;
    // 4. 검색 필터 팝업 닫기 및 API 호출
    document.getElementById('search-filter-popup')?.classList.add('hidden');
    fetchInquiry();
}
/** (메인) 정렬 기준 옵션 클릭 핸들러 (API 즉시 호출) */
function handleSortOptionClick(event) {
    const clickedOption = event.currentTarget;
    const wrapper = clickedOption.closest('#sort-dropdown');
    if (!wrapper)
        return;
    wrapper.querySelector('.custom-select-trigger span').textContent = clickedOption.textContent;
    wrapper.querySelector('.custom-option.selected')?.classList.remove('selected');
    clickedOption.classList.add('selected');
    wrapper.classList.remove('open');
    applyFiltersAndFetch();
}
/** (팝업 내부) 필터 드롭다운 옵션 클릭 핸들러 (UI만 변경) */
function handlePopupDropdownOptionClick(event) {
    const clickedOption = event.currentTarget;
    const wrapper = clickedOption.closest('.custom-select-wrapper');
    if (!wrapper)
        return;
    wrapper.querySelector('.custom-select-trigger span').textContent = clickedOption.textContent;
    wrapper.querySelector('.custom-option.selected')?.classList.remove('selected');
    clickedOption.classList.add('selected');
    wrapper.classList.remove('open');
}
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    filterState.keyword = searchInput.value;
    filterState.page = 0;
    fetchInquiry();
}
function handlePaginationClick(event) {
    event.preventDefault();
    const target = event.target;
    if (target.matches('a.page-link:not(.disabled), a.page-arrow:not(.disabled)') && target.dataset.page) {
        filterState.page = parseInt(target.dataset.page, 10);
        fetchInquiry();
    }
}
/** 이벤트 위임: 테이블 행 클릭 처리 */
function handleTableRowClick(event) {
    const row = event.target.closest('.inquiry-row');
    if (row && row.dataset.inquiryInfo) {
        const inquiryInfo = JSON.parse(row.dataset.inquiryInfo);
        openInquiryPopup(inquiryInfo);
    }
}
function openInquiryPopup(inquiry) {
    const modal = document.getElementById('inquiry-detail-modal');
    if (!modal)
        return;
    // 팝업이 열릴 때 현재 문의 ID 저장 
    currentInquiryId = inquiry.id;
    // 팝업 내부 요소 값 설정
    modal.querySelector('#inquiry-name').value = inquiry.title;
    modal.querySelector('#user-name').value = inquiry.name;
    modal.querySelector('#inquiry-type').value = inquiryTypeToKorean[inquiry.type];
    modal.querySelector('#inquiry-at').value = new Date(inquiry.createDateTime).toLocaleString('ko-KR');
    modal.querySelector('#user-email').value = inquiry.email;
    modal.querySelector('#user-phoneNumber').value = inquiry.phoneNumber;
    modal.querySelector('#inquiry-content').value = inquiry.message; // textarea로 변경
    // 답변 내용이 있다면 textarea에 표시, 없다면 placeholder 표시
    const answerContent = modal.querySelector('#answer-content');
    answerContent.value = inquiry.answer || '';
    // 팝업 보이기
    modal.classList.remove('hidden');
    // 답변하기/취소하기 버튼 및 섹션 초기화
    document.getElementById('inquiry-answer-section')?.classList.add('hidden');
    document.getElementById('answer-inquiry')?.classList.remove('hidden');
}
// 답변 제출 버튼 클릭 처리 함수 
async function handleSubmitAnswer() {
    if (!currentInquiryId) {
        console.error('처리할 문의 ID가 없습니다.');
        return;
    }
    const answerText = document.getElementById('answer-content').value;
    if (!answerText.trim()) {
        alert('답변 내용을 입력해주세요.');
        return;
    }
    // API 호출
    await answerInquiry(currentInquiryId, answerText);
}
function handleDropdownTriggerClick(event) {
    event.stopPropagation();
    const wrapper = event.currentTarget.closest('.custom-select-wrapper');
    if (wrapper) {
        closeAllDropdowns(wrapper);
        wrapper.classList.toggle('open');
    }
}
function handleShowAnswerForm() {
    document.getElementById('inquiry-answer-section')?.classList.remove('hidden');
    document.getElementById('answer-inquiry')?.classList.add('hidden');
}
function handleCancelAnswer() {
    document.getElementById('inquiry-answer-section')?.classList.add('hidden');
    document.getElementById('answer-inquiry')?.classList.remove('hidden');
    document.getElementById('answer-content').value = '';
}
function handleDeleteBtnClick() {
    showModal('delete-confirm-modal');
}
async function handleConfirmDelete() {
    if (!currentInquiryId) {
        alert('삭제할 사용자가 선택되지 않았습니다.');
        return;
    }
    try {
        await deleteInquiry(currentInquiryId);
        hideModal('delete-confirm-modal');
        showModal('delete-success-modal');
    }
    catch (error) {
        console.error(error);
        alert('삭제 중 오류가 발생했습니다');
    }
}
// 삭제 확인 모달의 '취소' 버튼 클릭 핸들러
function handleCancelDelete() {
    hideModal('delete-confirm-modal');
}
// 삭제 완료 모달의 '확인' 버튼 클릭 핸들러
function handleSuccessOk() {
    hideModal('delete-success-modal');
    hideModal('inquiry-detail-modal'); // 상세 정보 모달도 닫기
    fetchInquiry();
}
// --- 이벤트 리스너 바인딩 (Event Listener Binding) ---
function bindEventListeners() {
    // 검색 버튼 및 Enter 키
    document.getElementById('searchButton')?.addEventListener('click', applyFiltersAndFetch);
    document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            applyFiltersAndFetch();
    });
    // 페이지네이션, 테이블 행 클릭
    document.getElementById('pagination-container')?.addEventListener('click', handlePaginationClick);
    document.getElementById('data-table-body')?.addEventListener('click', handleTableRowClick);
    // 모달 관련 버튼
    document.querySelector('#inquiry-detail-modal .close-btn')?.addEventListener('click', () => hideModal('inquiry-detail-modal'));
    document.getElementById('delete-inquiry-btn')?.addEventListener('click', handleDeleteBtnClick);
    document.querySelector('#delete-confirm-modal .cancel-btn')?.addEventListener('click', handleCancelDelete);
    document.querySelector('#delete-confirm-modal .confirm-btn')?.addEventListener('click', handleConfirmDelete);
    document.querySelector('#delete-success-modal .confirm-btn')?.addEventListener('click', handleSuccessOk);
    // 답변하기 관련 버튼
    document.getElementById('answer-inquiry')?.addEventListener('click', handleShowAnswerForm);
    document.getElementById('cancel-answer-btn')?.addEventListener('click', handleCancelAnswer);
    document.getElementById('submit-answer-btn')?.addEventListener('click', handleSubmitAnswer);
    // 검색 필터 팝업 열기/닫기
    document.getElementById('toggle-filter-popup')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('search-filter-popup')?.classList.toggle('hidden');
    });
    // (메인) 정렬 드롭다운
    const sortDropdown = document.getElementById('sort-dropdown');
    if (sortDropdown) {
        sortDropdown.querySelector('.custom-select-trigger')?.addEventListener('click', handleDropdownTriggerClick);
        sortDropdown.querySelectorAll('.custom-option:not(.checkbox-option)').forEach(option => {
            option.addEventListener('click', handleSortOptionClick);
        });
        sortDropdown.querySelector('#sort-asc')?.addEventListener('click', applyFiltersAndFetch);
    }
    // (팝업 내부) 필터 드롭다운들
    ['filter-state-dropdown', 'filter-type-dropdown'].forEach(id => {
        const dropdown = document.getElementById(id);
        if (dropdown) {
            dropdown.querySelector('.custom-select-trigger')?.addEventListener('click', handleDropdownTriggerClick);
            dropdown.querySelectorAll('.custom-option').forEach(option => {
                option.addEventListener('click', handlePopupDropdownOptionClick); // UI만 변경하는 핸들러 연결
            });
        }
    });
    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', () => closeAllDropdowns());
}
// --- 앱 초기화 (Application Initialization) ---
function initializeApp() {
    bindEventListeners();
    fetchInquiry();
}
document.addEventListener('DOMContentLoaded', initializeApp);
export {};
