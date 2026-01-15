const DB_FOLDER = './lessons_db/';
const ui = {
    selector: document.getElementById('match-selector'),
    title: document.getElementById('lesson-title'),
    level: document.getElementById('lesson-level'),
    intro: document.getElementById('lesson-intro'),
    concept: document.getElementById('core-concept'),
    vocabList: document.getElementById('vocabulary-list'),
    quizQuestion: document.getElementById('quiz-question'),
    quizOptions: document.getElementById('options-container'),
    feedback: document.getElementById('feedback-zone')
};

// 1. START SEASON
async function initLeague() {
    try {
        const response = await fetch(DB_FOLDER + 'index.json');
        if (!response.ok) throw new Error("Index not found");
        
        const lessonsIndex = await response.json();
        populateMenu(lessonsIndex);

        if (lessonsIndex.length > 0) {
            loadMatch(lessonsIndex[0].file);
        } else {
            ui.title.innerText = "No Matches Found";
            ui.intro.innerText = "Please run factory.py to generate lessons.";
        }

    } catch (error) {
        console.error(error);
        ui.title.innerText = "❌ SERVER ERROR";
        ui.intro.innerText = "Make sure python -m http.server is running.";
    }
}

// 2. BUILD MENU
function populateMenu(lessons) {
    ui.selector.innerHTML = ''; 
    lessons.forEach(lesson => {
        const option = document.createElement('option');
        option.value = lesson.file;
        option.innerText = `${lesson.title}`;
        ui.selector.appendChild(option);
    });

    ui.selector.addEventListener('change', (e) => {
        loadMatch(e.target.value);
    });
}

// 3. LOAD LESSON
async function loadMatch(filename) {
    ui.title.innerText = "Warming up...";
    ui.feedback.className = 'hidden';
    
    try {
        const response = await fetch(DB_FOLDER + filename);
        if (!response.ok) throw new Error("File not found");
        
        const data = await response.json();
        renderTactics(data);
        
    } catch (error) {
        console.error(error);
        ui.title.innerText = "❌ Match Suspended";
    }
}

// 4. RENDER UI
function renderTactics(lesson) {
    ui.title.innerText = lesson.content.title;
    ui.level.innerText = `Level: ${lesson.meta.difficulty_elo} ELO`;
    ui.intro.innerText = lesson.content.intro_hook;
    ui.concept.innerHTML = `<p>${lesson.content.core_concept.explanation}</p><p style="margin-top:10px"><em>💡 Insight: ${lesson.content.core_concept.analogy}</em></p>`;

    ui.vocabList.innerHTML = '';
    lesson.content.vocabulary_rich.forEach(word => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="term">${word.term}</span><span>${word.meaning}</span>`;
        ui.vocabList.appendChild(li);
    });

    setupPenaltyShootout(lesson.interactive_engine);
}

function setupPenaltyShootout(engine) {
    ui.quizQuestion.innerText = engine.scenario_text;
    ui.quizOptions.innerHTML = '';
    ui.feedback.className = 'hidden';

    engine.options.forEach(option => {
        const btn = document.createElement('button');
        btn.innerText = option.text;
        btn.onclick = () => {
            // Check for keywords like "CORRECT" or "RIGHT"
            const isCorrect = /CORRECT|RIGHT/.test(option.outcome.toUpperCase());
            ui.feedback.innerText = option.feedback;
            ui.feedback.className = isCorrect ? 'feedback-box feedback-success' : 'feedback-box feedback-error';
            ui.feedback.style.display = 'block';
        };
        ui.quizOptions.appendChild(btn);
    });
}

initLeague();