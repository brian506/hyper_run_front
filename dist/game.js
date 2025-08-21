// --- 상태 및 상수 관리 ---
/** Flatpickr 인스턴스를 저장할 변수 */
let datePickerInstance = null;
/** 필터의 현재 상태를 저장하고 관리하는 전역 변수 */
const filterState = {
    adminGameStatus: 'FINISHED', // 기본 탭은 '종료된 경기'
    page: 0,
    size: 6,
    sort: 'createDateTime,desc',
    // startDate와 endDate는 초기에 설정하지 않음
};
/** 서버로부터 경기 데이터를 가져오는 함수 */
async function fetchGames() {
    const params = new URLSearchParams({
        adminGameStatus: filterState.adminGameStatus,
        page: filterState.page.toString(),
        size: filterState.size.toString(),
        sort: filterState.sort,
    });
    // 키워드나 날짜가 있을 때만 파라미터에 추가
    if (filterState.keyword) {
        params.append('keyword', filterState.keyword);
    }
    if (filterState.startDate && filterState.endDate) {
        params.append('startDate', filterState.startDate);
        params.append('endDate', filterState.endDate);
    }
    const GAME_URL = `http://localhost:8080/v1/api/admin/games?${params.toString()}`;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }
    try {
        console.log(`요청 URL: ${GAME_URL}`);
        const response = await fetch(GAME_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseDate = await response.json();
        const data = responseDate.data;
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
/** 받아온 데이터를 HTML 테이블로 변환하여 화면에 표시 */
function renderTable(pageData) {
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody)
        return;
    const { content: games, number: currentPage, size: pageSize } = pageData;
    if (games.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">데이터가 없습니다.</td></tr>';
        return;
    }
    tableBody.innerHTML = games.map((game, index) => {
        const rowNum = currentPage * pageSize + index + 1;
        return `
        <tr>
            <td>${rowNum}</td>
            <td>${game.name}</td>
            <td>${game.createDateTime.split('T')[0]}</td>
            <td>${game.modifiedDateTime.split('T')[0]}</td>
        </tr>
    `;
    }).join('');
}
/** 전체 데이터 수 업데이트 */
function updateTotalCount(total) {
    const countElement = document.getElementById('total-count');
    if (countElement) {
        countElement.textContent = `총 ${total}건`;
    }
}
/** 페이지 번호를 동적으로 생성 */
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
/** 탭 버튼 클릭 처리 */
function handleTabClick(event) {
    const clickedButton = event.currentTarget;
    const allTabButtons = document.querySelectorAll('.tab-btn');
    const newStatus = clickedButton.dataset.status;
    if (newStatus && newStatus !== filterState.adminGameStatus) {
        // 상태 변경
        filterState.adminGameStatus = newStatus;
        filterState.page = 0;
        // 날짜 필터 상태와 화면(UI) 모두 초기화
        filterState.startDate = undefined;
        filterState.endDate = undefined;
        if (datePickerInstance) {
            datePickerInstance.clear();
        }
        fetchGames();
        // 시각적 활성 상태 변경
        allTabButtons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
    }
}
/** 정렬 방식 변경 처리 */
function handleSortChange(event) {
    const selectElement = event.target;
    filterState.sort = selectElement.value;
    filterState.page = 0;
    fetchGames();
}
/** 검색 실행 처리 */
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        filterState.keyword = searchInput.value;
        filterState.page = 0;
        fetchGames();
    }
}
/** 페이지네이션 클릭 처리 */
function handlePaginationClick(event) {
    event.preventDefault();
    const target = event.target;
    if (target.tagName === 'A' && !target.classList.contains('disabled')) {
        const page = target.dataset.page;
        if (page) {
            filterState.page = parseInt(page, 10);
            fetchGames();
        }
    }
}
/** 날짜 범위 선택 완료 시 처리 (flatpickr용) */
function handleDateChange(selectedDates) {
    if (selectedDates.length === 2) {
        filterState.startDate = selectedDates[0].toISOString().split('T')[0];
        filterState.endDate = selectedDates[1].toISOString().split('T')[0];
        filterState.page = 0;
        fetchGames();
    }
}
/** DOM 로드 완료 후 앱 초기화 */
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const paginationContainer = document.getElementById('pagination-container');
    tabButtons.forEach(button => button.addEventListener('click', handleTabClick));
    sortSelect?.addEventListener('change', handleSortChange);
    searchButton?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            handleSearch();
    });
    paginationContainer?.addEventListener('click', handlePaginationClick);
    // Flatpickr 인스턴스 생성 및 저장
    datePickerInstance = flatpickr("#date-range-container", {
        wrap: true,
        mode: "range",
        dateFormat: "Y. m. d",
        locale: "ko",
        // defaultDate 제거
        onClose: handleDateChange, // onChange 대신 onClose 사용
    });
    // 페이지가 처음 열릴 때 데이터 로드 (기본: 종료된 경기 전체)
    fetchGames();
});
export {};
