document.addEventListener('DOMContentLoaded', () => {
    const TOURNAMENT_CONFIG = {
        1: { startGate: 1,  numGates: 5 },
        2: { startGate: 6,  numGates: 4 },
        3: { startGate: 10, numGates: 3 },
        4: { startGate: 13, numGates: 6 },
        5: { startGate: 19, numGates: 4 }
    };

    const arraysContainer = document.getElementById('arrays-container');
    const fileInput = document.getElementById('bib-file-input');
    const sectionSelector = document.getElementById('section-selector');
    const roundSelector = document.getElementById('round-selector');
    const prevArrayBtn = document.getElementById('prev-array-btn');
    const nextArrayBtn = document.getElementById('next-array-btn');
    const prevCellBtn = document.getElementById('prev-cell-btn');
    const nextCellBtn = document.getElementById('next-cell-btn');
    const clearBtn = document.getElementById('clear-btn');

    const GAS_URL = "https://script.google.com/macros/s/AKfycbxne3PWjx0xYaDk79B6poe8jrHsDUfqBkWPb3kUOn-QNiTaV4NL5mycvCqUN6xQiPim1g/exec"; 

    let GATE_START_NUMBER, NUM_GATES, TOTAL_CELLS_IN_ARRAY;
    let allData = [];
    let TOTAL_ARRAYS = 0;
    let currentInputArrayIndex = 0; 
    let currentInputCellIndex = 2; 
    const NUM_ARRAYS_TO_DISPLAY = 3;

/*
    // --- 音声設定 ---
    const sounds = {
        0: new Audio('sound_0.mp3'),
        2: new Audio('sound_2.mp3'),
        50: new Audio('sound_50.mp3')
    };

    function playSound(number) {
        if (number !== null && sounds[number]) {
            sounds[number].currentTime = 0;
            sounds[number].play().catch(e => console.warn("Audio playback failed:", e));
        }
    }
*/

    function applySelectedSection() {
        const config = TOURNAMENT_CONFIG[sectionSelector.value];
        GATE_START_NUMBER = config.startGate;
        NUM_GATES = config.numGates;
        TOTAL_CELLS_IN_ARRAY = NUM_GATES + 2; 
        updateHeaders();
        if (allData.length > 0) resetDataStructure(); 
    }

    function updateHeaders() {
        const section = sectionSelector.value;
        const round = roundSelector.value;
        document.querySelector('h1').textContent = `区間${section} ジャッジ - ${round}`;
        
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

    function resetDataStructure() {
        allData = allData.map(row => {
            const newRow = Array(TOTAL_CELLS_IN_ARRAY).fill(null);
            newRow[0] = row[0]; newRow[1] = row[1];
            return newRow;
        });
        currentInputArrayIndex = 0;
        currentInputCellIndex = 2;
        renderArrays();
    }

    sectionSelector.addEventListener('change', applySelectedSection);
    roundSelector.addEventListener('change', applySelectedSection);
    applySelectedSection();

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
            await fetch(GAS_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        } catch (err) { console.error("Sync Error:", err); }
    }

    function inputData(num) {
        if (allData.length === 0) return;
        allData[currentInputArrayIndex][currentInputCellIndex] = num;
        
        if (num !== null) {
            //playSound(num); // 音を鳴らす
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

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const lines = event.target.result.trim().split(/\r?\n/);
            allData = lines.filter(l => l.trim() !== "").map(line => {
                const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
                const row = Array(TOTAL_CELLS_IN_ARRAY).fill(null);
                row[0] = cols.length >= 2 ? cols[0] : "-";
                row[1] = cols.length >= 2 ? cols[1] : cols[0];
                return row;
            });
            TOTAL_ARRAYS = allData.length;
            document.getElementById('file-setup').style.display = 'none';
            renderArrays();
        };
        reader.readAsText(file);
    });

    document.querySelectorAll('.number-btn').forEach(button => {
        button.onclick = () => inputData(parseInt(button.dataset.value));
    });
    if (clearBtn) clearBtn.onclick = () => inputData(null);

    // キーボード入力にも対応
    window.addEventListener('keydown', (e) => {
        if (allData.length === 0) return;
        switch (e.key) {
            case '0': inputData(0); break;
            case '2': inputData(2); break;
            case '5': inputData(50); break;
            case 'Backspace':
            case 'Delete': inputData(null); break;
        }
    });

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
                cell.classList.add('cell');
                
                if (j === 0 || j === 1) {
                    cell.textContent = allData[i][j];
                    cell.classList.add('array-number-cell');
                    if (j === 0) {
                        const cat = String(allData[i][j]).toUpperCase();
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
                    cell.onclick = () => { currentInputArrayIndex = i; currentInputCellIndex = j; renderArrays(); };
                }
                row.appendChild(cell);
            }
            arraysContainer.appendChild(row);
        }
        updateButtonStates();
    }

    function updateButtonStates() {
        prevArrayBtn.disabled = currentInputArrayIndex === 0;
        nextArrayBtn.disabled = currentInputArrayIndex === TOTAL_ARRAYS - 1;
        prevCellBtn.disabled = currentInputArrayIndex === 0 && currentInputCellIndex === 2;
        nextCellBtn.disabled = currentInputArrayIndex === TOTAL_ARRAYS - 1 && currentInputCellIndex === TOTAL_CELLS_IN_ARRAY - 1;
    }

    function moveFocus(direction) {
        if (direction === 'prevArray' && currentInputArrayIndex > 0) currentInputArrayIndex--;
        else if (direction === 'nextArray' && currentInputArrayIndex < TOTAL_ARRAYS - 1) currentInputArrayIndex++;
        else if (direction === 'prevCell') {
            if (currentInputCellIndex > 2) currentInputCellIndex--;
            else if (currentInputArrayIndex > 0) { currentInputArrayIndex--; currentInputCellIndex = TOTAL_CELLS_IN_ARRAY - 1; }
        } else if (direction === 'nextCell') {
            if (currentInputCellIndex < TOTAL_CELLS_IN_ARRAY - 1) currentInputCellIndex++;
            else if (currentInputArrayIndex < TOTAL_ARRAYS - 1) { currentInputArrayIndex++; currentInputCellIndex = 2; }
        }
        renderArrays();
    }

    prevArrayBtn.onclick = () => moveFocus('prevArray');
    nextArrayBtn.onclick = () => moveFocus('nextArray');
    prevCellBtn.onclick = () => moveFocus('prevCell');
    nextCellBtn.onclick = () => moveFocus('nextCell');
});