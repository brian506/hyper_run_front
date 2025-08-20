declare var flatpickr: any;

// --- 타입 정의 (Interfaces) ---
export type AdminGameStatus = 'SCHEDULED' | 'PROGRESS' | 'FINISHED';

/** 서버에서 받아올 단일 경기 데이터의 형태 */
interface Game {
    id: number;
    name: string;
    createdAt: string;
    modifiedAt: string;
    adminGameStatus: AdminGameStatus;
}

/** 서버의 페이지네이션 응답 데이터 전체의 형태 */
interface PageResponse<T> {
    content: T[];          
    totalElements: number; 
    totalPages: number;    
    number: number;    
    size: number;    
}

/** 현재 필터링 상태를 저장하는 객체의 형태 */
interface FilterState {
    adminGameStatus: 'SCHEDULED' | 'PROGRESS' | 'FINISHED';
    page: number;
    sort: string;
    size: number;
    keyword: string;
    startDate?: string;
    endDate?: string;
}
const today = new Date();
const oneWeekAgo = new Date(today.setDate(today.getDate() - 7));
const todayStr = new Date().toISOString().split('T')[0];
const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

// --- 상태 및 상수 관리 ---

/** 필터의 현재 상태를 저장하고 관리하는 전역 변수 */
const filterState: FilterState = {
    adminGameStatus: 'FINISHED',
    page: 0,
    size: 6,
    sort: 'createdAt,desc',
    keyword: '',
    startDate: oneWeekAgoStr,
    endDate: todayStr,
};

async function fetchGames() {
    
    const params = new URLSearchParams({
        adminGameStatus: filterState.adminGameStatus,
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

    const GAME_URL = `http://localhost:8080/v1/api/admin/games?${params.toString()}`;
    const accessToken = localStorage.getItem('accessToken'); // 토큰이 있는 사용자에게만 허용

    if(!accessToken){
        console.error('인증 토큰이 없습니다.');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        console.log(`요청 URL: ${GAME_URL}`);
        const response = await fetch(GAME_URL,{
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
        const data: PageResponse<Game> = responseDate.data;

        // 3. 받아온 데이터로 각 UI 컴포넌트를 업데이트합니다.
        renderTable(data);
        renderPagination(data);
        updateTotalCount(data.totalElements);

    } catch (error) {
        console.error("데이터를 불러오는 중 오류 발생:", error);
        const tableBody = document.getElementById('data-table-body') as HTMLTableSectionElement;
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4">데이터를 불러오는 중 오류가 발생했습니다.</td></tr>';
        }
    }
}

// fetchGames 가 받아온 데이터를 html 로 변환하여 화면에 표시하는 역할
function renderTable(pageData: PageResponse<Game>): void {
    const tableBody = document.getElementById('data-table-body') as HTMLTableSectionElement;
    if (!tableBody) return;
    
    const { content: games, number: currentPage, size: pageSize } = pageData;

    if (games.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">데이터가 없습니다.</td></tr>';
        return;
    }

    tableBody.innerHTML = games.map((game,index) => {
        const rowNum = currentPage * pageSize + index +1;

        return `
        <tr>
            <td>${rowNum}</td>
            <td>${game.name}</td>
            <td>${game.createdAt.split('T')[0]}</td>
            <td>${game.modifiedAt.split('T')[0]}</td>
        </tr>
    `;
    }).join('');
}

// 전체 데이터 수
function updateTotalCount(total: number): void {
    const countElement = document.getElementById('total-count');
    if (countElement) {
        countElement.textContent = `총 ${total}건`;
    }
}

// 페이지 번호 동적 생성
function renderPagination(pageData: PageResponse<Game>): void {
    const { totalPages, number: currentPage } = pageData;
    const container = document.getElementById('pagination-container');
    if (!container) return;

    container.innerHTML = ''; // 기존 페이지 버튼들 초기화

    // 이전 페이지 버튼
    const prevBtn = document.createElement('a');
    prevBtn.href = '#';
    prevBtn.className = 'page-arrow';
    prevBtn.textContent = '<';
    if (currentPage === 0) prevBtn.classList.add('disabled');
    prevBtn.dataset.page = (currentPage - 1).toString();
    container.appendChild(prevBtn);

    // 페이지 번호 버튼들
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

    // 다음 페이지 버튼
    const nextBtn = document.createElement('a');
    nextBtn.href = '#';
    nextBtn.className = 'page-arrow';
    nextBtn.textContent = '>';
    if (currentPage >= totalPages - 1) nextBtn.classList.add('disabled');
    nextBtn.dataset.page = (currentPage + 1).toString();
    container.appendChild(nextBtn);
}

/** 탭 버튼 클릭을 처리하는 함수 */
function handleTabClick(event: MouseEvent) {
    const clickedButton = event.currentTarget as HTMLElement;
    const allTabButtons = document.querySelectorAll('.tab-btn');
    const newStatus = clickedButton.dataset.status as FilterState['adminGameStatus'];

    if (newStatus && newStatus !== filterState.adminGameStatus) {
        filterState.adminGameStatus = newStatus;
        filterState.page = 0;
        fetchGames();

        // 시각적 활성 상태 변경
        allTabButtons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
    }
}

function handleSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    filterState.sort = selectElement.value;
    fetchGames();
}

/** 검색 실행을 처리하는 함수 */
function handleSearch() {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    filterState.keyword = searchInput.value;
    filterState.page = 0; // 검색 시 항상 첫 페이지로
    fetchGames();
}

/** 페이지네이션 클릭을 처리하는 함수 */
function handlePaginationClick(event: MouseEvent) {
    event.preventDefault();
    const target = event.target as HTMLElement;

    // 'A' 태그이고, 비활성화 상태가 아닐 때만 작동
    if (target.tagName === 'A' && !target.classList.contains('disabled')) {
        const page = target.dataset.page;
        if (page) {
            filterState.page = parseInt(page, 10);
            fetchGames();
        }
    }
}

/** 날짜 범위 변경을 처리하는 함수 (flatpickr용) */
function handleDateChange(selectedDates: Date[]) {
    if (selectedDates.length === 2) {
        filterState.startDate = selectedDates[0].toISOString().split('T')[0];
        filterState.endDate = selectedDates[1].toISOString().split('T')[0];
        filterState.page = 0;
        fetchGames();
    }
}

/** 날짜 선택기 UI의 텍스트를 업데이트하는 함수 (flatpickr용) */
function updateDateInput(selectedDates: Date[], dateStr: string, instance: FlatpickrInstance) {
    // flatpickr의 input 요소에 선택된 날짜 문자열을 표시합니다.
    instance.input.value = dateStr;
}
// --- 페이지 로드 후 실행될 메인 로직 ---
type FlatpickrInstance = {
    input: HTMLInputElement;
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- HTML 요소 선택 ---
    const tabButtons: NodeListOf<HTMLElement> = document.querySelectorAll('.tab-btn');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const paginationContainer = document.getElementById('pagination-container');

    // 1. 탭 버튼 클릭 이벤트
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });

    // 2. 정렬 방식 변경 이벤트
    sortSelect?.addEventListener('change', handleSortChange);



    // 3. 검색 기능 
    searchButton?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 4. 페이지네이션 클릭 이벤트
    paginationContainer?.addEventListener('click', handlePaginationClick);

     // 5. 날짜 선택기 (Flatpickr) 설정
    flatpickr("#date-range-container", {
        wrap: true,
        mode: "range",
        dateFormat: "Y. m. d",
        defaultDate: [filterState.startDate, filterState.endDate],
        locale: "ko",
        onChange: handleDateChange,
        onReady: updateDateInput, // UI 준비 시에도 input 업데이트
    });

    // 페이지가 처음 열릴 때 데이터 로드
    fetchGames();
});