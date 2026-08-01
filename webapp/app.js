// ===== STATE =====
let currentLesson = null;
let currentMode = '';
let cards = [];
let cardIndex = 0;
let score = 0;
let total = 0;
let wrongList = [];
let matchTimer = null;
let matchSeconds = 0;

// ===== INIT =====
function init() {
    const list = document.getElementById('lesson-list');
    list.innerHTML = '';
    LESSONS.forEach(lesson => {
        const btn = document.createElement('button');
        btn.className = 'lesson-btn';
        btn.innerHTML = `
            <div class="l-title">${lesson.title}</div>
            <div class="l-meta">${lesson.date} · ${lesson.words.length} từ</div>
            <div class="l-count">${lesson.words.length}</div>
        `;
        btn.onclick = () => openLesson(lesson);
        list.appendChild(btn);
    });
}

// ===== NAVIGATION =====
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    if (name !== 'match' && matchTimer) { clearInterval(matchTimer); matchTimer = null; }
}

function openLesson(lesson) {
    currentLesson = lesson;
    document.getElementById('lesson-title').textContent = lesson.title;
    document.getElementById('word-count').textContent = lesson.words.length + ' từ';
    showScreen('lesson');
}

// ===== SPEAK (TTS) =====
function speak(text, rate = 0.85) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    // Try to pick a good voice
    const voices = speechSynthesis.getVoices();
    const good = voices.find(v => v.name.includes('Samantha')) ||
                 voices.find(v => v.lang.startsWith('en') && v.localService) ||
                 voices.find(v => v.lang.startsWith('en'));
    if (good) u.voice = good;
    speechSynthesis.speak(u);
}

function speakCurrent() {
    if (cards[cardIndex]) speak(cards[cardIndex].word);
}

// preload voices
if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// ===== SHUFFLE =====
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ===== START MODE =====
function startMode(mode) {
    currentMode = mode;
    cards = shuffle(currentLesson.words);
    cardIndex = 0;
    score = 0;
    wrongList = [];

    if (mode === 'flashcard') {
        total = cards.length;
        showScreen('flashcard');
        renderFlashcard();
    } else if (mode === 'quiz') {
        total = cards.length;
        showScreen('quiz');
        renderQuiz();
    } else if (mode === 'listen') {
        total = cards.length;
        showScreen('listen');
        renderListen();
    } else if (mode === 'match') {
        startMatch();
    }
}

function restartMode() {
    startMode(currentMode);
}

// ===== FLASHCARD =====
function renderFlashcard() {
    const card = cards[cardIndex];
    const fc = document.getElementById('flashcard');
    fc.classList.remove('flipped');

    document.getElementById('fc-front').innerHTML = `
        <div class="fc-topic">${currentLesson.title}</div>
        <div class="fc-word">${card.word}</div>
        <div class="fc-pos">${card.pos}</div>
        <div class="fc-tap">👆 Nhấn để lật thẻ</div>
    `;
    document.getElementById('fc-back').innerHTML = `
        <div class="fc-ipa">${card.ipa}</div>
        <div class="fc-vi">${card.vi}</div>
        <div class="fc-collocation">📎 ${card.collocation}</div>
        <div class="fc-example">📖 ${card.example}</div>
    `;

    updateProgress('fc', cardIndex, total);
    speak(card.word);
}

function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

function nextCard(known) {
    if (known) {
        score++;
    } else {
        wrongList.push(cards[cardIndex]);
    }
    cardIndex++;
    if (cardIndex >= total) {
        showResults();
    } else {
        renderFlashcard();
    }
}

// ===== QUIZ (TYPE) =====
function renderQuiz() {
    const card = cards[cardIndex];
    document.getElementById('quiz-vi').textContent = card.vi;
    document.getElementById('quiz-pos').textContent = card.pos;

    // Hint: show first letter and length
    const hint = card.word[0] + '_ '.repeat(card.word.length - 1).trim() + ` (${card.word.length} chữ cái)`;
    document.getElementById('quiz-hint').textContent = '💡 ' + hint;

    const input = document.getElementById('quiz-input');
    input.value = '';
    input.className = 'quiz-input';
    input.disabled = false;
    input.focus();

    const btn = document.getElementById('btn-check');
    btn.textContent = 'Kiểm tra';
    btn.className = 'btn-check';
    btn.onclick = checkQuiz;

    document.getElementById('quiz-feedback').innerHTML = '';
    updateProgress('quiz', cardIndex, total);
}

function checkQuiz() {
    const input = document.getElementById('quiz-input');
    const card = cards[cardIndex];
    const answer = input.value.trim().toLowerCase();
    const correct = card.word.toLowerCase();
    const isCorrect = answer === correct;

    input.disabled = true;
    input.className = 'quiz-input ' + (isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
        score++;
    } else {
        wrongList.push(card);
    }

    // Show feedback
    document.getElementById('quiz-feedback').innerHTML = `
        <div class="fb-card">
            <div class="fb-result ${isCorrect ? 'correct' : 'wrong'}">
                ${isCorrect ? '✅ Chính xác!' : '❌ Sai rồi! Đáp án:'}
            </div>
            <div class="fb-word">${card.word}</div>
            <div class="fb-ipa">${card.ipa}</div>
            <div class="fb-example">📖 ${card.example}</div>
        </div>
    `;

    speak(card.word);

    // Change button to "Next"
    const btn = document.getElementById('btn-check');
    btn.textContent = cardIndex < total - 1 ? 'Tiếp →' : 'Xem kết quả';
    btn.className = 'btn-check next-mode';
    btn.onclick = () => {
        cardIndex++;
        if (cardIndex >= total) {
            showResults();
        } else {
            renderQuiz();
        }
    };
}

// Enter key to submit
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const quizScreen = document.getElementById('screen-quiz');
        const listenScreen = document.getElementById('screen-listen');
        if (quizScreen.classList.contains('active')) {
            document.getElementById('btn-check').click();
        } else if (listenScreen.classList.contains('active')) {
            document.querySelector('#screen-listen .btn-check').click();
        }
    }
});

// ===== LISTEN MODE =====
function renderListen() {
    const card = cards[cardIndex];
    const input = document.getElementById('listen-input');
    input.value = '';
    input.className = 'quiz-input';
    input.disabled = false;
    input.focus();

    const btn = document.querySelector('#screen-listen .btn-check');
    btn.textContent = 'Kiểm tra';
    btn.className = 'btn-check';
    btn.onclick = checkListen;

    document.getElementById('listen-feedback').innerHTML = '';
    updateProgress('listen', cardIndex, total);

    // Auto-speak after a short delay
    setTimeout(() => speak(card.word), 300);
}

function checkListen() {
    const input = document.getElementById('listen-input');
    const card = cards[cardIndex];
    const answer = input.value.trim().toLowerCase();
    const correct = card.word.toLowerCase();
    const isCorrect = answer === correct;

    input.disabled = true;
    input.className = 'quiz-input ' + (isCorrect ? 'correct' : 'wrong');

    if (isCorrect) score++;
    else wrongList.push(card);

    document.getElementById('listen-feedback').innerHTML = `
        <div class="fb-card">
            <div class="fb-result ${isCorrect ? 'correct' : 'wrong'}">
                ${isCorrect ? '✅ Chính xác!' : '❌ Sai rồi!'}
            </div>
            <div class="fb-word">${card.word}</div>
            <div class="fb-ipa">${card.ipa}</div>
            <div style="color:var(--green);font-size:18px;font-weight:700;margin:6px 0">${card.vi}</div>
            <div class="fb-example">📖 ${card.example}</div>
        </div>
    `;

    speak(card.word);

    const btn = document.querySelector('#screen-listen .btn-check');
    btn.textContent = cardIndex < total - 1 ? 'Tiếp →' : 'Xem kết quả';
    btn.className = 'btn-check next-mode';
    btn.onclick = () => {
        cardIndex++;
        if (cardIndex >= total) showResults();
        else renderListen();
    };
}

// ===== MATCH MODE =====
function startMatch() {
    // Pick 6 random words for matching
    const picked = shuffle(currentLesson.words).slice(0, 6);
    const enTiles = shuffle(picked.map((w, i) => ({ id: i, text: w.word, type: 'en', pairId: i })));
    const viTiles = shuffle(picked.map((w, i) => ({ id: i, text: w.vi, type: 'vi', pairId: i })));

    // Interleave: en column | vi column
    const container = document.getElementById('match-container');
    container.innerHTML = '';

    const allTiles = [];
    for (let i = 0; i < enTiles.length; i++) {
        allTiles.push(enTiles[i]);
    }
    for (let i = 0; i < viTiles.length; i++) {
        allTiles.push(viTiles[i]);
    }

    // Render in 2 columns: left = EN, right = VI
    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    enTiles.forEach(t => {
        const tile = createMatchTile(t);
        leftCol.appendChild(tile);
    });
    viTiles.forEach(t => {
        const tile = createMatchTile(t);
        rightCol.appendChild(tile);
    });

    container.innerHTML = '';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = '1fr 1fr';
    container.style.gap = '12px';
    container.appendChild(leftCol);
    container.appendChild(rightCol);

    total = picked.length;
    score = 0;
    document.getElementById('match-total').textContent = total;
    document.getElementById('match-pairs').textContent = '0';

    // Start timer
    matchSeconds = 0;
    document.getElementById('match-timer').textContent = '0';
    if (matchTimer) clearInterval(matchTimer);
    matchTimer = setInterval(() => {
        matchSeconds++;
        document.getElementById('match-timer').textContent = matchSeconds;
    }, 1000);

    showScreen('match');
}

let selectedTile = null;

function createMatchTile(t) {
    const div = document.createElement('div');
    div.className = `match-tile ${t.type}`;
    div.textContent = t.text;
    div.dataset.pairId = t.pairId;
    div.dataset.type = t.type;
    div.onclick = () => onMatchTileClick(div);
    return div;
}

function onMatchTileClick(tile) {
    if (tile.classList.contains('matched')) return;

    if (!selectedTile) {
        selectedTile = tile;
        tile.classList.add('selected');
        if (tile.dataset.type === 'en') speak(tile.textContent);
        return;
    }

    if (selectedTile === tile) {
        tile.classList.remove('selected');
        selectedTile = null;
        return;
    }

    // Must be different types
    if (selectedTile.dataset.type === tile.dataset.type) {
        selectedTile.classList.remove('selected');
        selectedTile = tile;
        tile.classList.add('selected');
        if (tile.dataset.type === 'en') speak(tile.textContent);
        return;
    }

    // Check match
    if (selectedTile.dataset.pairId === tile.dataset.pairId) {
        selectedTile.classList.remove('selected');
        selectedTile.classList.add('matched');
        tile.classList.add('matched');
        score++;
        document.getElementById('match-pairs').textContent = score;

        if (score >= total) {
            clearInterval(matchTimer);
            matchTimer = null;
            setTimeout(() => showResults(), 600);
        }
    } else {
        // Wrong
        tile.classList.add('wrong-flash');
        selectedTile.classList.add('wrong-flash');
        const prev = selectedTile;
        setTimeout(() => {
            tile.classList.remove('wrong-flash');
            prev.classList.remove('wrong-flash');
            prev.classList.remove('selected');
        }, 500);
    }
    selectedTile = null;
}

// ===== RESULTS =====
function showResults() {
    const pct = Math.round((score / total) * 100);
    let emoji, title;
    if (pct >= 90) { emoji = '🏆'; title = 'Xuất sắc!'; }
    else if (pct >= 70) { emoji = '🎉'; title = 'Tốt lắm!'; }
    else if (pct >= 50) { emoji = '💪'; title = 'Cố lên!'; }
    else { emoji = '📚'; title = 'Cần ôn thêm!'; }

    document.getElementById('results-emoji').textContent = emoji;
    document.getElementById('results-title').textContent = title;
    document.getElementById('results-score').textContent = pct + '%';

    let details = `${score}/${total} câu đúng`;
    if (currentMode === 'match') {
        details += ` · ⏱️ ${matchSeconds} giây`;
    }
    if (wrongList.length > 0 && currentMode !== 'match') {
        details += '<br><br>📝 Từ cần ôn lại:<br>';
        details += wrongList.map(w => `<span style="color:var(--yellow)">${w.word}</span> — ${w.vi}`).join('<br>');
    }
    document.getElementById('results-details').innerHTML = details;
    showScreen('results');
}

// ===== PROGRESS =====
function updateProgress(prefix, current, total) {
    const pct = ((current + 1) / total) * 100;
    document.getElementById(prefix + '-progress').style.width = pct + '%';
    document.getElementById(prefix + '-count').textContent = `${current + 1}/${total}`;
}

// ===== START =====
init();
