document.addEventListener('DOMContentLoaded', () => {
    const TOURNAMENT_CONFIG = {
        1: { startGate: 1,  numGates: 4 },
        2: { startGate: 5,  numGates: 5 },
        3: { startGate: 10, numGates: 3 },
        4: { startGate: 13, numGates: 6 },
        5: { startGate: 19, numGates: 4 }
    };

    const GAS_URL = "https://script.google.com/macros/s/AKfycbzVqQ5E8_WoM4LCR5o_PwqzfLl30KVgfEvNWuUcTZldeOaAhZNo1TE9mJhPsXBm_6EQqw/exec"; 

    const arraysContainer = document.getElementById('arrays-container');
    const sectionSelector = document.getElementById('section-selector');
    const roundSelector = document.getElementById('round-selector');
    const fileSetupDiv = document.getElementById('file-setup');
    const loadRosterBtn = document.getElementById('load-roster-btn');
    const loadingMessage = document.getElementById('loading-message');
    
    const prevArrayBtn = document.getElementById('prev-array-btn');
    const nextArrayBtn = document.getElementById('next-array-btn');
    const prevCellBtn = document.getElementById('prev-cell-btn');
    const nextCellBtn = document.getElementById('next-cell-btn');
    const clearBtn = document.getElementById('clear-btn');

    let GATE_START_NUMBER, NUM_GATES, TOTAL_CELLS_IN_ARRAY;
    let allData = [];
    let TOTAL_ARRAYS = 0;
    let currentInputArrayIndex = 0; 
    let currentInputCellIndex = 2; 
    const NUM_ARRAYS_TO_DISPLAY = 3;

    // 音声ファイルの読み込み（パスに問題がないか確認用）
    const sounds = {
        0: new Audio('sound_0.mp3'),
        2: new Audio('sound_2.mp3'),
        50: new Audio('sound_50.mp3')
    };

    function playSound(num) {
        if (num !== null && sounds[num]) {
            sounds[num].pause();
            sounds[num].currentTime = 0;
            const playPromise = sounds[num].play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("再生ブロック: 画面を一度タップしてください", error);
                });
            }
        }
    }

    function applySelectedSection() {
        const config = TOURNAMENT_CONFIG[sectionSelector.value];
        GATE_START_NUMBER = config.startGate;
        NUM_GATES = config.numGates;
        TOTAL_CELLS_IN_ARRAY = NUM_GATES + 2; 
        updateHeaders();
        if (allData.length > 0) {
            allData = allData.map(row => {
                const newRow = Array(TOTAL_CELLS_IN_ARRAY).fill(null);
                newRow[0] = row[0]; newRow[1] = row[1];
                return newRow;
            });
            currentInputArrayIndex = 0;
            currentInputCellIndex = 2;
            renderArrays();
        }
    }

    function updateHeaders() {
        document.querySelector('h1').textContent = `区間${sectionSelector.value} - ${roundSelector.value}`;
        const headerContainer = document.getElementById('column-headers');
        headerContainer.innerHTML = '';
        const headerRow = document.createElement('div');
        headerRow.classList.add('header-row');
        ['Category', 'Bib'].forEach(text => {
            const cell = document.createElement('div');
            cell.className = 'header-cell array-number-cell';
            cell.textContent = text;
            headerRow.appendChild(cell);
        });
        for (let i = 0; i < NUM_GATES; i++) {
            const gHeader = document.createElement('div');
            gHeader.className = 'header-cell gate-header';
            gHeader.textContent = `G${GATE_START_NUMBER + i}`;
            headerRow.appendChild(gHeader);
        }
        headerContainer.appendChild(headerRow);
    }

    async function loadBibListFromSheets() {
        const round = roundSelector.value;
        const fetchUrl = `${GAS_URL}?round=${encodeURIComponent(round)}`;
        try {
            loadRosterBtn.disabled = true;
            loadingMessage.textContent = `${round}の名簿を取得中...`;
            const response = await fetch(fetchUrl);
            const list = await response.json(); 
            if (!list || list.length === 0 || list.error) throw new Error(list.error || "空のデータ");
            allData = list.map(item => {
                const row = Array(TOTAL_CELLS_IN_ARRAY).fill(null);
                row[0] = item[0]; row[1] = item[1];
                return row;
            });
            TOTAL_ARRAYS = allData.length;
            fileSetupDiv.style.display = 'none';
            currentInputArrayIndex = 0;
            currentInputCellIndex = 2;
            renderArrays();
        } catch (err) {
            console.error(err);
            loadingMessage.innerHTML = `<span style="color:red;">取得失敗</span>`;
            loadRosterBtn.disabled = false;
        }
    }

    async function syncToGoogleSheets() {
        if (allData.length === 0) return;
        try {
            await fetch(GAS_URL, { 
                method: "POST", 
                mode: "no-cors", 
                body: JSON.stringify({
                    section: sectionSelector.value,
                    round: roundSelector.value,
                    startGate: GATE_START_NUMBER,
                    numGates: NUM_GATES,
                    data: allData
                }) 
            });
        } catch (err) { console.error(err); }
    }

    function inputData(num) {
        if (allData.length === 0) return;
        allData[currentInputArrayIndex][currentInputCellIndex] = num;
        if (num !== null) {
            playSound(num);
            if (currentInputCellIndex < TOTAL_CELLS_IN_ARRAY - 1) {
                currentInputCellIndex++;
            } else if (currentInputArrayIndex < TOTAL_ARRAYS - 1) {
                currentInputCellIndex = 2;
                currentInputArrayIndex++;
            }
        }
        renderArrays();
        syncToGoogleSheets();
    }

    function renderArrays() {
        if (allData.length === 0) return;
        arraysContainer.innerHTML = '';
        let start = Math.max(0, currentInputArrayIndex - 1);
        if (start + NUM_ARRAYS_TO_DISPLAY > TOTAL_ARRAYS) start = Math.max(0, TOTAL_ARRAYS - NUM_ARRAYS_TO_DISPLAY);
        const end = Math.min(start + NUM_ARRAYS_TO_DISPLAY, TOTAL_ARRAYS);

        for (let i = start; i < end; i++) {
            const row = document.createElement('div');
            row.className = 'array-row';
            for (let j = 0; j < TOTAL_CELLS_IN_ARRAY; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                if (j < 2) {
                    cell.textContent = allData[i][j];
                    cell.classList.add('array-number-cell');
                    const cat = String(allData[i][0]).toUpperCase();
                    if (j === 0) {
                        if (cat.includes('MK1')) cell.classList.add('cat-mk1');
                        else if (cat.includes('WK1')) cell.classList.add('cat-wk1');
                        else if (cat.includes('MC1')) cell.classList.add('cat-mc1');
                        else if (cat.includes('WC1')) cell.classList.add('cat-wc1');
                    }
                } else {
                    cell.textContent = allData[i][j] !== null ? allData[i][j] : '';
                    if (allData[i][j] === 2) cell.classList.add('is-two');
                    if (allData[i][j] === 50) cell.classList.add('is-fifty');
                    if (i === currentInputArrayIndex && j === currentInputCellIndex) cell.classList.add('cell-highlight');
                    
                    // addEventListenerを使用してCSPエラーを回避
                    cell.addEventListener('click', () => {
                        currentInputArrayIndex = i;
                        currentInputCellIndex = j;
                        renderArrays();
                    });
                }
                row.appendChild(cell);
            }
            arraysContainer.appendChild(row);
        }
        prevArrayBtn.disabled = currentInputArrayIndex === 0;
        nextArrayBtn.disabled = currentInputArrayIndex === TOTAL_ARRAYS - 1;
    }

    function moveFocus(dir) {
        if (dir === 'prevArray' && currentInputArrayIndex > 0) currentInputArrayIndex--;
        else if (dir === 'nextArray' && currentInputArrayIndex < TOTAL_ARRAYS - 1) currentInputArrayIndex++;
        else if (dir === 'prevCell') {
            if (currentInputCellIndex > 2) currentInputCellIndex--;
            else if (currentInputArrayIndex > 0) { currentInputArrayIndex--; currentInputCellIndex = TOTAL_CELLS_IN_ARRAY - 1; }
        } else if (dir === 'nextCell') {
            if (currentInputCellIndex < TOTAL_CELLS_IN_ARRAY - 1) currentInputCellIndex++;
            else if (currentInputArrayIndex < TOTAL_ARRAYS - 1) { currentInputArrayIndex++; currentInputCellIndex = 2; }
        }
        renderArrays();
    }

    sectionSelector.addEventListener('change', applySelectedSection);
    roundSelector.addEventListener('change', () => { 
        applySelectedSection(); 
        fileSetupDiv.style.display = 'block'; 
        arraysContainer.innerHTML = ''; 
    });
    loadRosterBtn.addEventListener('click', loadBibListFromSheets);
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', () => inputData(parseInt(btn.dataset.value)));
    });
    clearBtn.addEventListener('click', () => inputData(null));
    prevArrayBtn.addEventListener('click', () => moveFocus('prevArray'));
    nextArrayBtn.addEventListener('click', () => moveFocus('nextArray'));
    prevCellBtn.addEventListener('click', () => moveFocus('prevCell'));
    nextCellBtn.addEventListener('click', () => moveFocus('nextCell'));

    applySelectedSection();
});