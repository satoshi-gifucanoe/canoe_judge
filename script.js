document.addEventListener('DOMContentLoaded', () => {
    const TOURNAMENT_CONFIG = {
        1: { startGate: 1,  numGates: 4 },
        2: { startGate: 5,  numGates: 5 },
        3: { startGate: 10, numGates: 3 },
        4: { startGate: 13, numGates: 6 },
        5: { startGate: 19, numGates: 4 }
    };

    const arraysContainer = document.getElementById('arrays-container');
    const sectionSelector = document.getElementById('section-selector');
    const roundSelector = document.getElementById('round-selector');
    const prevArrayBtn = document.getElementById('prev-array-btn');
    const nextArrayBtn = document.getElementById('next-array-btn');
    const prevCellBtn = document.getElementById('prev-cell-btn');
    const nextCellBtn = document.getElementById('next-cell-btn');
    const clearBtn = document.getElementById('clear-btn');
    const fileSetupDiv = document.getElementById('file-setup');

    // ★重要：ご自身の新しいGASウェブアプリURLに書き換えてください
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzCBH8WFzwbCcdpuJn7vGT67teFo8_E6wp8XJf5XtHkiOZB05eU8vrikFmUTNI1n0x6cQ/exec"; 

    let GATE_START_NUMBER, NUM_GATES, TOTAL_CELLS_IN_ARRAY;
    let allData = [];
    let TOTAL_ARRAYS = 0;
    let currentInputArrayIndex = 0; 
    let currentInputCellIndex = 2; 
    const NUM_ARRAYS_TO_DISPLAY = 3;

    // --- 音声設定 ---
    const sounds = {
        0: new Audio('sound_0.mp3'),
        2: new Audio('sound_2.mp3'),
        50: new Audio('sound_50.mp3')
    };

    function playSound(number) {
        if (number !== null && sounds[number]) {
            sounds[number].currentTime = 0;
            sounds[number].play().catch(e => console.warn("Audio error:", e));
        }
    }

    // セクション設定の適用
    function applySelectedSection() {
        const config = TOURNAMENT_CONFIG[sectionSelector.value];
        GATE_START_NUMBER = config.startGate;
        NUM_GATES = config.numGates;
        TOTAL_CELLS_IN_ARRAY = NUM_GATES + 2; 
        updateHeaders();
        if (allData.length > 0) {
            // 名簿を保持したままデータ構造（列数）だけリセット
            allData = allData.map(row => {
                const newRow = Array(TOTAL_CELLS_IN_ARRAY).fill(null);
                newRow[0] = row[0]; // Category
                newRow[1] = row[1]; // Bib
                return newRow;
            });
            currentInputArrayIndex = 0;
            currentInputCellIndex = 2;
            renderArrays();
        }
    }

    // ヘッダーの表示更新
    function updateHeaders() {
        document.querySelector('h1').textContent = `区間${sectionSelector.value} ジャッジ - ${roundSelector.value}`;
        const headerContainer = document.getElementById('column-headers');
        headerContainer.innerHTML = '';
        const headerRow = document.createElement('div');
        headerRow.classList.add('header-row');

        ['Category', 'Bib No.'].forEach(text => {
            const cell = document.createElement('div');
            cell.classList.add('header-cell', 'array-number-cell');
            cell.textContent = text;
            headerRow.appendChild(cell);
        });

        for (let i = 0; i < NUM_GATES; i++) {
            const gHeader = document.createElement('div');
            gHeader.classList.add('header-cell', 'gate-header');
            gHeader.textContent = `G${GATE_START_NUMBER + i}`;
            headerRow.appendChild(gHeader);
        }
        headerContainer.appendChild(headerRow);
    }

    // ★スプレッドシートから名簿を取得する関数
    async function loadBibListFromSheets() {
        const round = roundSelector.value;
        const fetchUrl = `${GAS_URL}?round=${encodeURIComponent(round)}`;
        
        try {
            fileSetupDiv.style.display = 'block';
            fileSetupDiv.innerHTML = `<p style="padding:20px;">${round}の名簿を読み込み中...</p>`;
            
            const response = await fetch(fetchUrl);
            const list = await response.json(); 

            if (!list || list.length === 0) {
                fileSetupDiv.innerHTML = `<p style="padding:20px; color:red;">${round}シートに名簿がありません。<br>A列にカテゴリー、B列にBibを入力してください。</p>`;
                return;
            }

            allData = list.map(item => {
                const row = Array(TOTAL_CELLS_IN_ARRAY).fill(null);
                row[0] = item[0]; // Category
                row[1] = item[1]; // Bib
                return row;
            });

            TOTAL_ARRAYS = allData.length;
            fileSetupDiv.style.display = 'none'; // 読み込み完了したら消す
            currentInputArrayIndex = 0;
            currentInputCellIndex = 2;
            renderArrays();
        } catch (err) {
            console.error("Fetch Error:", err);
            fileSetupDiv.innerHTML = `<p style="padding:20px; color:red;">名簿の取得に失敗しました。<br>GASのデプロイURLを確認してください。</p>`;
        }
    }

    // スプレッドシートへデータを送信
    async function syncToGoogleSheets() {
        if (allData.length === 0) return;
        const payload = {
            section: sectionSelector.value,
            round: roundSelector.value,
            startGate: GATE_START_NUMBER,
            numGates: NUM_GATES,
            data: allData
        };
        try {
            await fetch(GAS_URL, { 
                method: "POST", 
                mode: "no-cors", 
                headers: { "Content-Type": "text/plain" }, 
                body: JSON.stringify(payload) 
            });
        } catch (err) { console.error("Sync Error:", err); }
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

    // 描画処理
    function renderArrays() {
        if (allData.length === 0) return;
        arraysContainer.innerHTML = '';
        let start = Math.max(0, currentInputArrayIndex - 1);
        if (start + NUM_ARRAYS_TO_DISPLAY > TOTAL_ARRAYS) start = Math.max(0, TOTAL_ARRAYS - NUM_ARRAYS_TO_DISPLAY);
        const end = Math.min(start + NUM_ARRAYS_TO_DISPLAY, TOTAL_ARRAYS);

        for (let i = start; i < end; i++) {
            const row = document.createElement('div');
            row.classList.add('array-row');
            for (let j = 0; j < TOTAL_CELLS_IN_ARRAY; j++) {
                const cell = document.createElement('div');
                cell.classList.