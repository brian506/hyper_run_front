
declare var flatpickr: any;
export type PaymentState = 'PAYMENT_COMPLETED' | 'REFUND_REQUESTED' | 'REFUND_REJECTED' | 'REFUND_COMPLETED';

const paymentStateToKorean: { [key in PaymentState]: string } = {
    'PAYMENT_COMPLETED': '결제 완료',
    'REFUND_REQUESTED': '환불 요청중',
    'REFUND_REJECTED': '환불 거절',
    'REFUND_COMPLETED': '환불 완료'
};

// 인터페이스 정의
interface Payment {
    paymentId: number;
    createDateTime: string;
    paymentMethod: string;
    price: number;
    name: string;
    state: PaymentState;
}

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

interface FilterState {
    page: number;
    sort: string;
    size: number;
    keyword?: string;

    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    state?: PaymentState;
}

const filterState: FilterState = {
    page: 0,
    size: 6,
    sort: 'createDateTime,desc',
};

async function fetchPayments() {
    const params = new URLSearchParams({
        page: filterState.page.toString(),
        size: filterState.size.toString(),
        sort: filterState.sort,
    })

    if (filterState.keyword) params.append('keyword', filterState.keyword);
    if (filterState.startDate) params.append('startDate', filterState.startDate);
    if (filterState.endDate) params.append('endDate', filterState.endDate);
    if (filterState.minAmount) params.append('minAmount', filterState.minAmount.toString());
    if (filterState.maxAmount) params.append('maxAmount', filterState.maxAmount.toString());
    if (filterState.state) params.append('state', filterState.state);

    const PAYMENT_URL = `https://d19a6mzn99qmli.cloudfront.net/v1/api/admin/payments?${params.toString()}`;
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(PAYMENT_URL, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        const data: PageResponse<Payment> = responseData.data;

        renderTable(data);
        renderPagination(data);
        updateTotalCount(data.totalElements);

    } catch (error) {
        console.error("데이터를 불러오는 중 오류 발생:", error);
        const tableBody = document.getElementById('data-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8">데이터를 불러오는 중 오류가 발생했습니다.</td></tr>';
        }
    }
}
    
// --- 렌더링 함수 (Rendering Functions) ---
function renderTable(pageData: PageResponse<Payment>): void {
    const tableBody = document.getElementById('data-table-body') as HTMLTableSectionElement;

    if (!tableBody) return;

    const { content: payment, number: currentPage, size: pageSize } = pageData;

    if (payment.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">데이터가 없습니다.</td></tr>';
        return;
    }
    tableBody.innerHTML = payment.map((payment, index) => {
        // 숫자를 한국 원화 형식으로 변환
        const formattedAmount = payment.price.toLocaleString('ko-KR', { 
            style: 'currency', 
            currency: 'KRW' 
        });

        const rowNum = currentPage * pageSize + index + 1;

        // paymentStateToKorean 맵을 사용하여 한글로 변환
        const koreanPaymentState = paymentStateToKorean[payment.state] || payment.state;

        // '환불 요청중' 상태일 때만 clickable-row 클래스 추가
        const isClickable = payment.state === 'REFUND_REQUESTED';
        const rowClass = isClickable ? 'clickable-row' : '';

        return `
        <tr class="${rowClass}" data-payment-id="${payment.paymentId}"   data-payment-info='${JSON.stringify(payment)}'>
            <td>${rowNum}</td>
            <td>${payment.createDateTime.split('T')[0]}</td>
            <td>${payment.paymentMethod}</td>
            <td>${formattedAmount}</td>
            <td>${payment.name}</td>
            <td>${koreanPaymentState}</td>
        </tr>
    `;
    }).join('');
}



function renderPagination(pageData: PageResponse<Payment>): void {
    const { totalPages, number: currentPage } = pageData;
    const container = document.getElementById('pagination-container');
    if (!container) return;

    container.innerHTML = '';
    
    
    const prevBtn = document.createElement('a');
    prevBtn.href = '#';
    prevBtn.className = 'page-arrow';
    prevBtn.textContent = '<';
    if(currentPage === 0) prevBtn.classList.add('disabled');
    prevBtn.dataset.page = (currentPage - 1).toString();
    container.appendChild(prevBtn);

    for(let i = 0; i < totalPages;i++){
        const pageLink = document.createElement('a');
        pageLink.href = '#'
        pageLink.className = 'page-link';
        pageLink.textContent = (i + 1).toString();
        pageLink.dataset.page = i.toString();
        if(i === currentPage){
            pageLink.classList.add('active');
        }
        container.appendChild(pageLink);
    }

    const nextBtn = document.createElement('a');
    nextBtn.href = '#';
    nextBtn.className = 'page-arrow';
    nextBtn.textContent = '>';
    if(currentPage >= totalPages -1 ) nextBtn.classList.add('disabled');
    nextBtn.dataset.page = (currentPage + 1).toString();
    container.appendChild(nextBtn);
}

function updateTotalCount(total: number): void {
    const countElement = document.getElementById('total-count');
    if (countElement) {
        countElement.textContent = `총 ${total}건`;
    }
}


function closeAllDropdowns(exceptWrapper: HTMLElement | null = null): void {
    document.querySelectorAll<HTMLElement>('.custom-select-wrapper').forEach(wrapper => {
        if (wrapper !== exceptWrapper) {
            wrapper.classList.remove('open');
        }
    });
}

// 이벤트 헨들러
function applyFiltersAndFetch(): void {
    // 팝업 필터 값 가져오기
    const startDate = (document.getElementById('filter-start-date') as HTMLInputElement).value;
    const endDate = (document.getElementById('filter-end-date') as HTMLInputElement).value;
    const minAmount = (document.getElementById('filter-min-amount') as HTMLInputElement).value;
    const maxAmount = (document.getElementById('filter-max-amount') as HTMLInputElement).value;
    const statusDropdown = document.getElementById('filter-status-dropdown');
    const selectedStatusOption = statusDropdown?.querySelector<HTMLElement>('.custom-option.selected');
    const state = selectedStatusOption?.dataset.value;

    // 메인 필터 값 가져오기
    const sortDropdown = document.getElementById('sort-dropdown');
    const selectedSortOption = sortDropdown?.querySelector<HTMLElement>('.custom-option.selected');
    const ascCheckbox = sortDropdown?.querySelector<HTMLInputElement>('#sort-asc');
    const sortBy = selectedSortOption?.dataset.value || 'createDateTime';
    const direction = ascCheckbox?.checked ? 'asc' : 'desc';
    const keyword = (document.getElementById('searchInput') as HTMLInputElement).value;

    // filterState 업데이트
    filterState.startDate = startDate;
    filterState.endDate = endDate;
    filterState.minAmount = minAmount ? parseInt(minAmount, 10) : undefined;
    filterState.maxAmount = maxAmount ? parseInt(maxAmount, 10) : undefined;
    filterState.state = state as PaymentState | undefined;
    filterState.sort = `${sortBy},${direction}`;
    filterState.keyword = keyword;
    filterState.page = 0;

    // 검색 필터 팝업 닫기
    document.getElementById('search-filter-popup')?.classList.add('hidden');
    
    fetchPayments();
}
/** (메인) 정렬 기준 옵션 클릭 핸들러 */
function handleSortOptionClick(event: MouseEvent): void {
    const clickedOption = event.currentTarget as HTMLElement;
    const wrapper = clickedOption.closest<HTMLElement>('#sort-dropdown');
    if (!wrapper) return;

    const triggerText = wrapper.querySelector('.custom-select-trigger span');
    if (triggerText) triggerText.textContent = clickedOption.textContent;

    wrapper.querySelector('.custom-option.selected')?.classList.remove('selected');
    clickedOption.classList.add('selected');
    wrapper.classList.remove('open');
    
    applyFiltersAndFetch();
}

/** (팝업 내부) 필터 드롭다운 옵션 클릭 핸들러 (UI만 변경) */
function handlePopupDropdownOptionClick(event: MouseEvent): void {
    const clickedOption = event.currentTarget as HTMLElement;
    const wrapper = clickedOption.closest<HTMLElement>('.custom-select-wrapper');
    if (!wrapper) return;

    (wrapper.querySelector('.custom-select-trigger span') as HTMLElement).textContent = clickedOption.textContent;
    wrapper.querySelector('.custom-option.selected')?.classList.remove('selected');
    clickedOption.classList.add('selected');
    wrapper.classList.remove('open');
}

/** 테이블 행 클릭 시 상세 페이지로 이동하는 핸들러 */
function handleTableRowClick(event: MouseEvent) {
    const row = (event.target as HTMLElement).closest<HTMLTableRowElement>('tr');
    if (!row || !row.classList.contains('clickable-row')) return;

    // --- 모든 선택 해제 후 현재 행만 선택 ---
    document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    const paymentId = row.dataset.paymentId;
    const paymentInfoString = row.dataset.paymentInfo;
    if (!paymentId || !paymentInfoString) return;

    // 상세 페이지 이동 (필요 시 유지)
    sessionStorage.setItem('selectedPaymentDetail', paymentInfoString);
    window.location.href = `refund-detail.html?paymentId=${paymentId}`;
}


function handlePaginationClick(event: MouseEvent) {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && !target.classList.contains('disabled') && target.dataset.page) {
        filterState.page = parseInt(target.dataset.page, 10);
        fetchPayments();
    }
}
function handleDropdownTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    const wrapper = (event.currentTarget as HTMLElement).closest<HTMLElement>('.custom-select-wrapper');
    if (wrapper) {
        closeAllDropdowns(wrapper);
        wrapper.classList.toggle('open');
    }
}

// 이벤트 리스너 바인딩 
function bindEventListeners(): void {
    // 검색 버튼 및 Enter 키
    document.getElementById('searchButton')?.addEventListener('click', applyFiltersAndFetch);
    document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyFiltersAndFetch();
    });

    // 페이지네이션, 테이블 행 클릭
    document.getElementById('pagination-container')?.addEventListener('click', handlePaginationClick);
    document.getElementById('data-table-body')?.addEventListener('click', handleTableRowClick);

    // 검색 필터 팝업 열기/닫기
    document.getElementById('toggle-filter-popup')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('search-filter-popup')?.classList.toggle('hidden');
    });

    // (메인) 정렬 드롭다운
    const sortDropdown = document.getElementById('sort-dropdown');
    if (sortDropdown) {
        sortDropdown.querySelector<HTMLElement>('.custom-select-trigger')?.addEventListener('click', handleDropdownTriggerClick);
        sortDropdown.querySelectorAll<HTMLElement>('.custom-option:not(.checkbox-option)').forEach(option => {
            option.addEventListener('click', handleSortOptionClick);
        });
        sortDropdown.querySelector<HTMLInputElement>('#sort-asc')?.addEventListener('click', applyFiltersAndFetch);
    }
    
    // (팝업 내부) 결제 상태 드롭다운
    const statusDropdown = document.getElementById('filter-status-dropdown');
    if (statusDropdown) {
        statusDropdown.querySelector<HTMLElement>('.custom-select-trigger')?.addEventListener('click', handleDropdownTriggerClick);
        statusDropdown.querySelectorAll<HTMLElement>('.custom-option').forEach(option => {
            option.addEventListener('click', handlePopupDropdownOptionClick); // UI만 변경하는 핸들러 연결
        });
    }

    // 드롭다운 및 팝업 외부 클릭 시 닫기
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const filterPopup = document.getElementById('search-filter-popup');
        const toggleButton = document.getElementById('toggle-filter-popup');

        // 드롭다운 닫기
        if (!target.closest('.custom-select-wrapper')) {
            closeAllDropdowns();
        }
        // 필터 팝업 닫기
        if (filterPopup && toggleButton && !filterPopup.contains(target) && target !== toggleButton) {
            filterPopup.classList.add('hidden');
        }
    });
}

/** 날짜 범위 변경을 처리하는 함수 (flatpickr용) */
function handleDateChange(selectedDates: Date[]) {
    if (selectedDates.length === 2) {
        filterState.startDate = selectedDates[0].toISOString().split('T')[0];
        filterState.endDate = selectedDates[1].toISOString().split('T')[0];
        filterState.page = 0;
        fetchPayments();
    }
}


function updateDateInput(selectedDates: Date[], dateStr: string, instance: FlatpickrInstance) {
    instance.input.value = dateStr;
}
type FlatpickrInstance = {
    input: HTMLInputElement;
};


function initializeApp(): void {
    bindEventListeners();
    fetchPayments();

    flatpickr("#date-range-container", {
        wrap: true,
        mode: "range",
        dateFormat: "Y. m. d",
        defaultDate: [filterState.startDate, filterState.endDate],
        locale: "ko",
        onChange: handleDateChange,
        onReady: updateDateInput, // UI 준비 시에도 input 업데이트
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);