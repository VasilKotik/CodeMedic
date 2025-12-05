const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration - secure but permissive for Vercel
app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Handle preflight OPTIONS requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.sendStatus(200);
});

// Body parser with size limit
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request validation middleware
const validateRequest = (req, res, next) => {
    const { code, mode, lang, model, wishes } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing code field', message: 'Code is required' });
    }
    if (!code.trim()) {
        return res.status(400).json({ error: 'Empty code', message: 'Code cannot be empty' });
    }
    if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: 'Missing model', message: 'Model is required' });
    }

    // Sanitize input
    req.body.code = code.trim();
    req.body.model = model.trim();
    req.body.mode = (mode && typeof mode === 'string') ? mode.trim() : 'debug';
    req.body.lang = (lang && typeof lang === 'string') ? lang.trim() : 'en';
    req.body.wishes = (wishes && typeof wishes === 'string') ? wishes.trim() : '';
    req.body.convertFrom = (req.body.convertFrom && typeof req.body.convertFrom === 'string') ? req.body.convertFrom.trim() : null;
    req.body.convertTo = (req.body.convertTo && typeof req.body.convertTo === 'string') ? req.body.convertTo.trim() : null;

    next();
};

// --- PROMPT ENGINEERING ---

// 1. Task Definitions (Specific instructions for each mode)
const TASK_MAP = {
    'debug': {
        'en': 'Act as an expert debugger. Analyze the code for syntax errors, logical bugs, and runtime exceptions. Fix the code to ensure it runs correctly. Explain exactly *why* the bug occurred.',
        'uk': 'Дій як експерт з дебагінгу. Проаналізуй код на синтаксичні помилки, логічні баги та проблеми виконання. Виправи код, щоб він працював ідеально. Поясни точно, *чому* виникла помилка.',
        'ru': 'Действуй как эксперт по отладке. Проанализируй код на синтаксические ошибки, логические баги и проблемы выполнения. Исправь код, чтобы он работал идеально. Объясни точно, *почему* возникла ошибка.',
        'pl': 'Działaj jako ekspert od debugowania. Przeanalizuj kod pod kątem błędów składniowych, logicznych i problemów uruchomieniowych. Napraw kod, aby działał idealnie. Wyjaśnij dokładnie, *dlaczego* wystąpił błąd.',
        'de': 'Handeln Sie als Debugging-Experte. Analysieren Sie den Code auf Syntaxfehler, logische Fehler und Laufzeitprobleme. Korrigieren Sie den Code. Erklären Sie genau, *warum* der Fehler aufgetreten ist.',
        'es': 'Actúa como un experto en depuración. Analiza el código en busca de errores de sintaxis, lógicos y de tiempo de ejecución. Corrige el código. Explica exactamente *por qué* ocurrió el error.'
    },
    'optimize': {
        'en': 'Act as a Performance Engineer. Optimize the code for Time Complexity (Big O) and Memory usage. Improve readability using clean code principles. Keep the functionality unchanged.',
        'uk': 'Дій як інженер з продуктивності. Оптимізуй код за часовою складністю (Big O) та використанням пам\'яті. Покращи читабельність, використовуючи принципи Clean Code. Функціонал має залишитися незмінним.',
        'ru': 'Действуй как инженер по производительности. Оптимизируй код по временной сложности (Big O) и использованию памяти. Улучши читаемость, используя принципы Clean Code.',
        'pl': 'Działaj jako inżynier wydajności. Zoptymalizuj kod pod kątem złożoności czasowej (Big O) i użycia pamięci. Popraw czytelność, stosując zasady Clean Code.',
        'de': 'Handeln Sie als Performance-Ingenieur. Optimieren Sie den Code hinsichtlich Zeitkomplexität (Big O) und Speichernutzung. Verbessern Sie die Lesbarkeit.',
        'es': 'Actúa como un ingeniero de rendimiento. Optimiza el código para la complejidad temporal (Big O) y el uso de memoria. Mejora la legibilidad.'
    },
    'explain': {
        'en': 'Act as a Computer Science Professor. Explain the code logic step-by-step. Break down complex concepts into simple terms. Use analogies if helpful. Do not rewrite the code unless it is broken.',
        'uk': 'Дій як професор інформатики. Поясни логіку коду крок за кроком. Розклади складні концепції на прості терміни. Використовуй аналогії, якщо це допоможе. Не переписуй код, якщо він не зламаний.',
        'ru': 'Действуй как профессор информатики. Объясни логику кода шаг за шагом. Разложи сложные концепции на простые термины.',
        'pl': 'Działaj jak profesor informatyki. Wyjaśnij logikę kodu krok po kroku. Rozbij skomplikowane koncepcje na proste terminy.',
        'de': 'Handeln Sie als Informatikprofessor. Erklären Sie die Codelogik Schritt für Schritt. Brechen Sie komplexe Konzepte herunter.',
        'es': 'Actúa como un profesor de informática. Explica la lógica del código paso a paso. Desglosa conceptos complejos en términos simples.'
    },
    'review': {
        'en': 'Act as a Senior Tech Lead conducting a Code Review. Evaluate the code for best practices, security, style, and maintainability. Be constructive but thorough.',
        'uk': 'Дій як Senior Tech Lead, що проводить Code Review. Оціни код на дотримання найкращих практик, безпеки, стилю та підтримуваності. Будь конструктивним, але ретельним.',
        'ru': 'Действуй как Senior Tech Lead, проводящий Code Review. Оцени код на соблюдение лучших практик, безопасности, стиля и поддерживаемости.',
        'pl': 'Działaj jako Senior Tech Lead przeprowadzający Code Review. Oceń kod pod kątem najlepszych praktyk, bezpieczeństwa i stylu.',
        'de': 'Handeln Sie als Senior Tech Lead bei einem Code Review. Bewerten Sie den Code nach Best Practices, Sicherheit und Stil.',
        'es': 'Actúa como un Senior Tech Lead realizando una revisión de código. Evalúa el código según las mejores prácticas, seguridad y estilo.'
    },
    'security': {
        'en': 'Act as a Cybersecurity Analyst. Audit the code for vulnerabilities (XSS, SQL Injection, etc.). Suggest hardening measures and safer alternatives.',
        'uk': 'Дій як аналітик з кібербезпеки. Проведи аудит коду на вразливості (XSS, SQL Injection тощо). Запропонуй заходи посилення безпеки та безпечніші альтернативи.',
        'ru': 'Действуй как аналитик по кибербезопасности. Проведи аудит кода на уязвимости. Предложи меры усиления безопасности.',
        'pl': 'Działaj jako analityk cyberbezpieczeństwa. Przeprowadź audyt kodu pod kątem luk. Zaproponuj środki wzmacniające bezpieczeństwo.',
        'de': 'Handeln Sie als Cybersicherheitsanalyst. Überprüfen Sie den Code auf Schwachstellen. Schlagen Sie Sicherheitsmaßnahmen vor.',
        'es': 'Actúa como un analista de ciberseguridad. Audita el código en busca de vulnerabilidades. Sugiere medidas de seguridad.'
    },
    'refactor': {
        'en': 'Act as a Software Architect. Refactor the code to improve structure, modularity, and design patterns without changing external behavior (DRY, KISS, SOLID).',
        'uk': 'Дій як архітектор програмного забезпечення. Рефактори код для покращення структури, модульності та патернів проектування без зміни зовнішньої поведінки (DRY, KISS, SOLID).',
        'ru': 'Действуй как архитектор ПО. Рефактори код для улучшения структуры и модульности без изменения внешнего поведения.',
        'pl': 'Działaj jako architekt oprogramowania. Zrefaktoryzuj kod, aby poprawić strukturę i modułowość bez zmiany zachowania zewnętrznego.',
        'de': 'Handeln Sie als Softwarearchitekt. Refaktorisieren Sie den Code, um Struktur und Modularität zu verbessern.',
        'es': 'Actúa como un arquitecto de software. Refactoriza el código para mejorar la estructura y la modularidad.'
    },
    'document': {
        'en': 'Act as a Technical Writer. Add comprehensive DocStrings and comments explaining inputs, outputs, and logic. Follow the standard documentation style for this language.',
        'uk': 'Дій як технічний письменник. Додай вичерпні DocStrings та коментарі, що пояснюють вхідні дані, вихідні дані та логіку. Дотримуйся стандартного стилю документації для цієї мови.',
        'ru': 'Действуй как технический писатель. Добавь исчерпывающие DocStrings и комментарии. Следуй стандартному стилю документации.',
        'pl': 'Działaj jako pisarz techniczny. Dodaj kompleksowe DocStrings i komentarze. Przestrzegaj standardowego stylu dokumentacji.',
        'de': 'Handeln Sie als technischer Redakteur. Fügen Sie umfassende DocStrings und Kommentare hinzu.',
        'es': 'Actúa como un redactor técnico. Agrega DocStrings completos y comentarios que expliquen la lógica.'
    },
    'convert': {
        'en': 'Act as a Polyglot Programmer. Convert the code strictly to the target language. Use idiomatic patterns of the target language, not a line-by-line translation.',
        'uk': 'Дій як програміст-поліглот. Конвертуй код строго у цільову мову. Використовуй ідіоматичні патерни цільової мови, а не дослівний переклад рядків.',
        'ru': 'Действуй как программист-полиглот. Конвертируй код строго в целевой язык. Используй идиоматические паттерны целевого языка.',
        'pl': 'Działaj jako programista poliglota. Skonwertuj kod ściśle na język docelowy. Używaj idiomatycznych wzorców języka docelowego.',
        'de': 'Handeln Sie als polyglotter Programmierer. Konvertieren Sie den Code strikt in die Zielsprache.',
        'es': 'Actúa como un programador políglota. Convierte el código estrictamente al idioma de destino.'
    },
    'format': {
        'en': 'Act as a Code Linter (Prettier/ESLint). Format the code perfectly according to the language\'s style guide. Do not change logic.',
        'uk': 'Дій як Code Linter. Відформатуй код ідеально відповідно до стилю мови. Не змінюй логіку.',
        'ru': 'Действуй как Code Linter. Отформатируй код идеально в соответствии со стилем языка. Не меняй логику.',
        'pl': 'Działaj jako Code Linter. Sformatuj kod idealnie zgodnie ze stylem języka.',
        'de': 'Handeln Sie als Code Linter. Formatieren Sie den Code perfekt gemäß dem Sprachstil.',
        'es': 'Actúa como un Code Linter. Formatea el código perfectamente según el estilo del idioma.'
    },
    'test': {
        'en': 'Act as a QA Engineer. Create a set of unit tests covering edge cases, happy paths, and potential failures for this code.',
        'uk': 'Дій як QA інженер. Створи набір юніт-тестів, що покривають крайові випадки, успішні сценарії та потенційні збої для цього коду.',
        'ru': 'Действуй как QA инженер. Создай набор юнит-тестов, покрывающих граничные случаи и успешные сценарии.',
        'pl': 'Działaj jako inżynier QA. Stwórz zestaw testów jednostkowych obejmujących przypadki brzegowe.',
        'de': 'Handeln Sie als QA-Ingenieur. Erstellen Sie eine Reihe von Unit-Tests.',
        'es': 'Actúa como un ingeniero de QA. Crea un conjunto de pruebas unitarias.'
    }
};

// 2. Language Definitions
const getTargetLangName = (lang) => {
    const langMap = {
        'uk': 'Ukrainian',
        'en': 'English',
        'pl': 'Polish',
        'de': 'German',
        'es': 'Spanish',
        'ru': 'Russian'
    };
    return langMap[lang] || 'English';
};

// Main API endpoint
app.post(['/', '/api/ai-request'], validateRequest, async (req, res) => {
    try {
        const { code, mode, lang, model, wishes, convertFrom, convertTo } = req.body;
        const isOpenRouter = model.includes('/');

        // Select task description based on language
        const taskMapEntry = TASK_MAP[mode] || TASK_MAP['debug'];
        const taskDescription = taskMapEntry[lang] || taskMapEntry['en'];
        const targetLangName = getTargetLangName(lang);
        const wishesText = wishes ? wishes.trim() : 'None';

        // --- SYSTEM PROMPT CONSTRUCTION ---
        const systemMessage = `
ROLE: You are FixlyCode, a world-class Senior Software Engineer and Mentor.
LANGUAGE: You MUST respond in ${targetLangName.toUpperCase()}.
FORMAT: You MUST return strictly valid JSON.

YOUR TASK:
${taskDescription}

${mode === 'convert' ? `CONVERSION: Convert FROM ${convertFrom || 'Auto'} TO ${convertTo || 'Target Language'}.` : ''}

USER WISHES: ${wishesText}

RESPONSE STRUCTURE (JSON ONLY):
{
  "fixedCode": "The full, corrected/optimized/converted code string. Use \\n for newlines.",
  "explanation": "A clear, educational explanation in ${targetLangName}. Use markdown (**bold**, \`code\`) for readability. Explain WHAT changed and WHY.",
  "tip": "A short, pro-tip related to the code or best practices in ${targetLangName}.",
  "score": Integer between 0-100 (quality of original code),
  "smells": ["Array", "of", "code smells", "or", "issues", "found", "in ${targetLangName}"]
}

RULES:
1. Do not include markdown code blocks (\`\`\`json) in the response, just the raw JSON object.
2. The 'fixedCode' must be ready to run.
3. Be encouraging but professional.
4. If the code is already perfect, return it as is, give a score of 100, and praise the user.
`;

        const userMessage = `Here is the code to process:\n\n${code}`;

        let url, headers, body;

        if (isOpenRouter) {
            // OpenRouter Configuration
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) throw new Error('OpenRouter API key missing');

            url = "https://openrouter.ai/api/v1/chat/completions";
            headers = {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://fixlycode.com",
                "X-Title": "FixlyCode"
            };

            const supportsJsonMode = model.includes('qwen') || model.includes('gpt') || model.includes('deepseek');

            body = JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.2, // Low temp for precision
                max_tokens: 4000,
                ...(supportsJsonMode && { response_format: { type: "json_object" } })
            });

        } else {
            // Gemini Configuration
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error('Gemini API key missing');

            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            headers = { 'Content-Type': 'application/json' };
            
            // Gemini expects system instructions in a specific format
            body = JSON.stringify({
                contents: [{ parts: [{ text: userMessage }] }],
                systemInstruction: { parts: [{ text: systemMessage }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2
                }
            });
        }

        // --- FETCH REQUEST ---
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI API Error:', errText);
            return res.status(response.status).json({ error: 'AI API Error', message: response.statusText });
        }

        const data = await response.json();
        let rawText = "";

        // Extract text based on provider
        if (isOpenRouter) {
            rawText = data.choices?.[0]?.message?.content || "";
        } else {
            rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }

        // JSON Cleanup (sometimes models add markdown despite instructions)
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json({ success: true, rawText: rawText, model: model });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

app.get(['/', '/api/ai-request'], (req, res) => res.json({ status: 'ok', service: 'FixlyCode API' }));

module.exports = app;
