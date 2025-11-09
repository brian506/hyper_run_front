const formatDate = (date) => date.toISOString().split('T')[0];
// --- 상태 및 상수 관리 ---
/** 필터의 현재 상태를 저장하고 관리하는 전역 변수 */
const filterState = {
    page: 0,
    size: 6,
    sort: 'createDateTime,desc',
    keyword: '',
};
let currentExchangeId = null;
async function fetchExchanges() {
    const params = new URLSearchParams({
        page: filterState.page.toString(),
        size: filterState.size.toString(),
        sort: filterState.sort,
    });
    // 필터링 동적 추가
    if (filterState.keyword) {
        params.append('keyword', filterState.keyword);
    }
    if (filterState.startDate && filterState.endDate) {
        params.append('startDate', filterState.startDate);
        params.append('endDate', filterState.endDate);
    }
    if (filterState.exchangeStatus) {
        params.append('exchangeStatus', filterState.exchangeStatus);
    }
    const EXCHANGE_URL = `https://d19a6mzn99qmli.cloudfront.net/v1/api/admin/exchanges?${params.toString()}`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }
    try {
        console.log(`요청 URL: ${EXCHANGE_URL}`);
        const response = await fetch(EXCHANGE_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('인증에 실패했거나 권한이 없습니다.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseDate = await response.json();
        const data = responseDate.data;
        // 3. 받아온 데이터로 각 UI 컴포넌트를 업데이트합니다.
        renderTable(data);
        renderPagination(data);
        updateTotalCount(data.totalElements);
    }
    catch (error) {
        console.error("데이터를 불러오는 중 오류 발생:", error);
        const tableBody = document.getElementById('data-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4">데이터를 불러오는 중 오류가 발생했습니다.</td></tr>';
        }
    }
}
async function confirmExchange(id) {
    const CONFIRM_URL = `https://d19a6mzn99qmli.cloudfront.net/v1/api/admin/exchanges/confirm/${id}`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        return;
    }
    const response = await fetch(CONFIRM_URL, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error('환불 승인에 실패했습니다.');
    }
}
async function cancelExchange(id) {
    const CANCEL_URL = `https://d19a6mzn99qmli.cloudfront.net/v1/api/admin/exchanges/cancel/${id}`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        return;
    }
    const response = await fetch(CANCEL_URL, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error('환불 취소에 실패했습니다.');
    }
}
function renderTable(pageData) {
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody)
        return;
    const { content: ExchangeTransactions, number: currentPage, size: pageSize } = pageData;
    if (ExchangeTransactions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">데이터가 없습니다.</td></tr>';
        return;
    }
    tableBody.innerHTML = ExchangeTransactions.map((exchangeTransaction, index) => {
        const rowNum = currentPage * pageSize + index + 1;
        return `
        <tr class="exchange-row" style="cursor: pointer;" data-exchange-id="${exchangeTransaction.id}" data-exchange-info='${JSON.stringify(exchangeTransaction)}'>
            <td>${rowNum}</td>
            <td>${exchangeTransaction.name}</td>
            <td>${exchangeTransaction.createDateTime.split('T')[0]}</td>
            <td>${exchangeTransaction.amount}</td>
            <td>${exchangeTransaction.bankName}</td>
            <td>${exchangeTransaction.accountNumber}</td>
            <td>${exchangeTransaction.exchangeStatus}</td>
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
    const prevBtn = document.createElement('a');
    prevBtn.href = '#';
    prevBtn.className = 'page-arrow';
    prevBtn.textContent = '<';
    if (currentPage === 0)
        prevBtn.classList.add('disabled');
    prevBtn.dataset.page = (currentPage - 1).toString();
    container.appendChild(prevBtn);
    for (let i = 0; i < totalPages; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.className = 'page-link';
        pageLink.textContent = (i + 1).toString();
        pageLink.dataset.page = i.toString();
        if (i === currentPage) {
            pageLink.classList.add('active');
        }
        container.appendChild(pageLink);
    }
    const nextBtn = document.createElement('a');
    nextBtn.href = '#';
    nextBtn.className = 'page-arrow';
    nextBtn.textContent = '>';
    if (currentPage >= totalPages - 1)
        nextBtn.classList.add('disabled');
    nextBtn.dataset.page = (currentPage + 1).toString();
    container.appendChild(nextBtn);
}
function updateTotalCount(total) {
    const countElement = document.getElementById('total-count');
    if (countElement) {
        countElement.textContent = `총 ${total}건`;
    }
}
function closeAllDropdowns(exceptWrapper = null) {
    document.querySelectorAll('.custom-select-wrapper,.search-select-wrapper').forEach(wrapper => {
        if (wrapper !== exceptWrapper) {
            wrapper.classList.remove('open');
        }
    });
}
function closeModal() {
    document.querySelector('.modal-overlay')?.classList.add('hidden');
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
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        filterState.keyword = searchInput.value;
        filterState.page = 0;
        fetchExchanges();
    }
}
function handlePaginationClick(event) {
    event.preventDefault();
    const target = event.target;
    if (target.tagName === 'A' && !target.classList.contains('disabled') && target.dataset.page) {
        filterState.page = parseInt(target.dataset.page, 6);
        fetchExchanges();
    }
}
function handleTableRowClick(event) {
    const row = event.target.closest('.exchange-row');
    if (!row || !row.dataset.exchangeInfo)
        return;
    const exchangeTransaction = JSON.parse(row.dataset.exchangeInfo);
    currentExchangeId = exchangeTransaction.id;
    document.getElementById('user-name').value = exchangeTransaction.name;
    document.getElementById('amount').value = exchangeTransaction.amount.toString();
    document.getElementById('bank-name').value = exchangeTransaction.bankName;
    document.getElementById('account-number').value = exchangeTransaction.accountNumber;
    document.getElementById('exchange-status').value = exchangeTransaction.exchangeStatus;
    const approveBtn = document.getElementById('approve-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    if (exchangeTransaction.exchangeStatus === 'REQUESTED') {
        approveBtn?.classList.remove('hidden');
        cancelBtn?.classList.remove('hidden');
    }
    else {
        approveBtn?.classList.add('hidden');
        cancelBtn?.classList.add('hidden');
    }
    showModal('exchange-detail-modal');
}
function handleSortOptionClick(event) {
    const clickedOption = event.currentTarget;
    const wrapper = clickedOption.closest('.custom-select-wrapper');
    if (!wrapper)
        return;
    const triggerText = wrapper.querySelector('.custom-select-trigger span');
    if (triggerText)
        triggerText.textContent = clickedOption.textContent;
    filterState.sort = `createDateTime,${clickedOption.dataset.value}`;
    filterState.page = 0;
    fetchExchanges();
    wrapper.querySelector('.custom-option.selected')?.classList.remove('selected');
    clickedOption.classList.add('selected');
    wrapper.classList.remove('open');
}
function handleSearchCategoryOptionClick(event) {
    const clickedOption = event.currentTarget;
    const wrapper = clickedOption.closest('.search-select-wrapper');
    if (!wrapper)
        return;
    const triggerText = wrapper.querySelector('.custom-select-trigger span');
    if (triggerText)
        triggerText.textContent = clickedOption.textContent;
    filterState.exchangeStatus = clickedOption.dataset.value;
    filterState.page = 0;
    fetchExchanges();
    wrapper.querySelector('.custom-option.selected')?.classList.remove('selected');
    clickedOption.classList.add('selected');
    wrapper.classList.remove('open');
}
function handleDropdownTriggerClick(event) {
    event.stopPropagation();
    const wrapper = event.currentTarget.closest('.custom-select-wrapper, .search-select-wrapper');
    if (wrapper) {
        closeAllDropdowns(wrapper);
        wrapper.classList.toggle('open');
    }
}
/// 환전 승인 확인 모달
function handleApproveBtnClick() {
    showModal('approve-confirm-modal');
}
async function handleConfirmApproval() {
    if (!currentExchangeId) {
        alert('No exchange selected.');
        return;
    }
    try {
        await confirmExchange(currentExchangeId);
        hideModal('approve-confirm-modal');
        showModal('approve-success-modal');
    }
    catch (error) {
        console.error(error);
        alert('An error occurred during approval.');
    }
}
function handleCancelApproval() {
    hideModal('approve-confirm-modal');
}
function handleApprovalSuccessOk() {
    hideModal('approve-success-modal');
    hideModal('exchange-detail-modal');
    fetchExchanges(); // Refresh the table
}
/// 환전 취소 확인 모달
function handleCancelBtnClick() {
    showModal('cancel-confirm-modal');
}
async function handleConfirmCancellation() {
    if (!currentExchangeId) {
        alert('No exchange selected.');
        return;
    }
    try {
        await cancelExchange(currentExchangeId);
        hideModal('cancel-confirm-modal');
        showModal('cancel-success-modal');
    }
    catch (error) {
        console.error(error);
        alert('An error occurred during cancellation.');
    }
}
function handleCancelCancellation() {
    hideModal('cancel-confirm-modal');
}
function handleCancellationSuccessOk() {
    hideModal('cancel-success-modal');
    hideModal('exchange-detail-modal');
    fetchExchanges();
}
function bindEventListeners() {
    document.getElementById('searchButton')?.addEventListener('click', handleSearch);
    document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            handleSearch();
    });
    document.getElementById('pagination-container')?.addEventListener('click', handlePaginationClick);
    document.getElementById('data-table-body')?.addEventListener('click', handleTableRowClick);
    document.querySelector('#exchange-detail-modal .close-btn')?.addEventListener('click', () => hideModal('exchange-detail-modal'));
    document.getElementById('approve-btn')?.addEventListener('click', handleApproveBtnClick);
    document.getElementById('cancel-btn')?.addEventListener('click', handleCancelBtnClick);
    document.querySelector('#approve-confirm-modal .confirm-btn')?.addEventListener('click', handleConfirmApproval);
    document.querySelector('#approve-confirm-modal .cancel-btn')?.addEventListener('click', handleCancelApproval);
    document.querySelector('#approve-success-modal .confirm-btn')?.addEventListener('click', handleApprovalSuccessOk);
    document.querySelector('#cancel-confirm-modal .confirm-btn')?.addEventListener('click', handleConfirmCancellation);
    document.querySelector('#cancel-confirm-modal .cancel-btn')?.addEventListener('click', handleCancelCancellation);
    document.querySelector('#cancel-success-modal .confirm-btn')?.addEventListener('click', handleCancellationSuccessOk);
    const sortDropdown = document.getElementById('sort-dropdown');
    if (sortDropdown) {
        sortDropdown.querySelector('.custom-select-trigger')?.addEventListener('click', handleDropdownTriggerClick);
        sortDropdown.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', handleSortOptionClick);
        });
    }
    const searchCategoryDropdown = document.getElementById('search-category-wrapper');
    if (searchCategoryDropdown) {
        searchCategoryDropdown.querySelector('.custom-select-trigger')?.addEventListener('click', handleDropdownTriggerClick);
        searchCategoryDropdown.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', handleSearchCategoryOptionClick);
        });
    }
    document.addEventListener('click', () => closeAllDropdowns());
}
function initializeExchangeApp() {
    flatpickr("#date-range-display", {
        mode: "range",
        dateFormat: "Y-m-d",
        defaultDate: [filterState.startDate, filterState.endDate],
        locale: "ko",
        onClose: function (selectedDates) {
            if (selectedDates.length === 2) {
                filterState.startDate = formatDate(selectedDates[0]);
                filterState.endDate = formatDate(selectedDates[1]);
                filterState.page = 0;
                fetchExchanges();
            }
        }
    });
    bindEventListeners();
    fetchExchanges();
}
document.addEventListener('DOMContentLoaded', initializeExchangeApp);
export {};
