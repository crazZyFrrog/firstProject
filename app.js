// ============================================================
// app.js — логика калькулятора трат и мечты (V2)
//
// Структура файла:
//   1. Шаблоны популярных трат
//   2. Состояние приложения (state)
//   3. Чистые функции расчёта (не зависят от DOM)
//   4. Работа с localStorage (сохранение / загрузка)
//   5. Рендер — отрисовка UI на основе state
//   6. Обработчики событий (кнопки, клики)
//   7. Старт приложения
// ============================================================


// ============================================================
// 1. ШАБЛОНЫ ПОПУЛЯРНЫХ ТРАТ
// Готовые пресеты: клик на чип заполняет форму добавления.
// Чтобы добавить новый шаблон — просто добавьте объект в массив.
// ============================================================

const TEMPLATES = [
  { name: 'Аренда',        amount: 30000, period: 'month' },
  { name: 'Еда',           amount: 15000, period: 'month' },
  { name: 'Транспорт',     amount: 3000,  period: 'month' },
  { name: 'Кафе',          amount: 5000,  period: 'month' },
  { name: 'Связь',         amount: 500,   period: 'month' },
  { name: 'Одежда',        amount: 5000,  period: 'month' },
  { name: 'Развлечения',   amount: 3000,  period: 'month' },
  { name: 'Здоровье',      amount: 2000,  period: 'month' },
  { name: 'Спорт',         amount: 2000,  period: 'month' },
  { name: 'Подписки',      amount: 500,   period: 'month' },
];


// ============================================================
// 2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// Один объект хранит все данные. Это удобно: легко сохранить
// в localStorage целиком и легко читать.
// ============================================================

const state = {
  income: 0,            // ежемесячный доход (число)
  categories: [],       // массив объектов { id, name, amount, period, limit }
  goal: {
    name: '',           // название мечты
    amount: 0           // нужная сумма
  },
  expenses: []          // история фактических расходов { id, categoryName, amount, date }
};


// ============================================================
// 3. ЧИСТЫЕ ФУНКЦИИ РАСЧЁТА
// "Чистые" значит: не меняют state, не трогают DOM,
// принимают данные → возвращают результат.
// Их легко тестировать.
// ============================================================

/**
 * Приводит трату к месячному значению.
 * @param {number} amount — сумма траты
 * @param {string} period — 'day' | 'week' | 'month'
 * @returns {number} сумма в месяц
 */
function normalizeToMonth(amount, period) {
  if (period === 'month') return amount;
  return 0;
}

/**
 * Считает итоговые суммы за месяц.
 * @param {Array} categories — массив категорий из state
 * @param {number} income — ежемесячный доход
 * @returns {{ totalExpenses: number, savings: number }}
 */
function calcTotals(categories, income) {
  // Суммируем все категории, предварительно нормализовав к месяцу
  const totalExpenses = categories.reduce((sum, cat) => {
    return sum + normalizeToMonth(cat.amount, cat.period);
  }, 0);

  const savings = income - totalExpenses; // может быть отрицательным
  return { totalExpenses, savings };
}

/**
 * Считает, через сколько месяцев накопим на цель.
 * @param {number} monthlySavings — сколько остаётся в месяц
 * @param {number} goalAmount — нужная сумма цели
 * @returns {number|null} количество месяцев или null, если копить невозможно
 */
function calcMonthsToGoal(monthlySavings, goalAmount) {
  if (monthlySavings <= 0 || goalAmount <= 0) return null;
  // Math.ceil — округляем вверх: неполный месяц тоже считается
  return Math.ceil(goalAmount / monthlySavings);
}

/**
 * Переводит количество месяцев в читаемую строку.
 * Например: 14 → "1 год и 2 месяца"
 * @param {number} months
 * @returns {string}
 */
function formatMonths(months) {
  if (months < 1) return 'меньше месяца';

  const years  = Math.floor(months / 12);
  const remain = months % 12;

  const yearStr  = years  > 0 ? `${years} ${pluralize(years, 'год', 'года', 'лет')}`     : '';
  const monthStr = remain > 0 ? `${remain} ${pluralize(remain, 'месяц', 'месяца', 'месяцев')}` : '';

  if (yearStr && monthStr) return `${yearStr} и ${monthStr}`;
  return yearStr || monthStr;
}

/**
 * Вспомогательная функция: склонение числительных.
 * @param {number} n
 * @param {string} one   — 1 год
 * @param {string} few   — 2 года
 * @param {string} many  — 5 лет
 * @returns {string}
 */
function pluralize(n, one, few, many) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/**
 * Форматирует число как сумму в рублях.
 * Например: 15000 → "15 000 ₽"
 * @param {number} amount
 * @returns {string}
 */
function formatMoney(amount) {
  return amount.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Возвращает ключ месяца в формате "YYYY-M" по UTC.
 * @param {Date} date
 * @returns {string}
 */
function getUtcMonthKey(date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

/**
 * Считает фактические расходы за текущий месяц по категориям.
 * @param {Array} expenses — история расходов
 * @param {Date} [nowDate] — опциональная дата "сейчас" для тестов
 * @returns {Object} объект { [categoryName]: сумма }
 */
function calcMonthlyExpensesByCategory(expenses, nowDate) {
  const now = nowDate instanceof Date ? nowDate : new Date();
  const currentMonthKey = getUtcMonthKey(now);
  const totals = {};

  expenses.forEach(function(expense) {
    if (!expense || !expense.date) return;
    const expenseDate = new Date(expense.date);
    if (Number.isNaN(expenseDate.getTime())) return;
    if (getUtcMonthKey(expenseDate) !== currentMonthKey) return;
    if (!expense.categoryName) return;

    totals[expense.categoryName] = (totals[expense.categoryName] || 0) + expense.amount;
  });

  return totals;
}

/**
 * Сравнивает лимиты категорий с фактом за месяц.
 * @param {Array} categories — категории из state
 * @param {Array} expenses — история расходов
 * @param {Date} [nowDate]
 * @returns {Object} объект { [categoryId]: { spent, limit, isExceeded, overBy } }
 */
function calcCategoryLimitInfo(categories, expenses, nowDate) {
  const spentByCategory = calcMonthlyExpensesByCategory(expenses, nowDate);
  const result = {};

  categories.forEach(function(cat) {
    const limit = typeof cat.limit === 'number' ? cat.limit : 0;
    const spent = spentByCategory[cat.name] || 0;
    const isExceeded = limit > 0 && spent > limit;
    result[cat.id] = {
      spent,
      limit,
      isExceeded,
      overBy: isExceeded ? spent - limit : 0
    };
  });

  return result;
}


// ============================================================
// 4. РАБОТА С LOCALSTORAGE
// Сохраняем весь state как JSON-строку под ключом 'dream_calc'.
// ============================================================

const STORAGE_KEY = 'dream_calc';

/** Сохраняет текущий state в localStorage */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Загружает state из localStorage и заполняет текущий state */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return; // первый запуск — данных нет

  try {
    const saved = JSON.parse(raw);
    // Переносим только известные поля, чтобы не сломать структуру
    if (typeof saved.income === 'number')    state.income = saved.income;
    if (Array.isArray(saved.categories)) {
      state.categories = saved.categories.map(function(cat) {
        return {
          id: cat.id,
          name: cat.name,
          amount: cat.amount,
          period: cat.period,
          limit: typeof cat.limit === 'number' ? cat.limit : 0
        };
      });
    }
    if (saved.goal && typeof saved.goal === 'object') {
      state.goal.name   = saved.goal.name   || '';
      state.goal.amount = saved.goal.amount || 0;
    }
    if (Array.isArray(saved.expenses))       state.expenses = saved.expenses;
  } catch (e) {
    console.warn('Не удалось загрузить сохранённые данные:', e);
  }
}


// ============================================================
// 5. РЕНДЕР — отрисовка UI
// Одна функция render() читает state и обновляет DOM.
// Принцип: state — источник истины, DOM — его отражение.
// ============================================================

function render() {
  renderIncome();
  renderTemplates(); // чипы-шаблоны для быстрого заполнения формы
  renderCategories();
  renderGoal();
  renderExpenseHistory();
  renderResult();
}

/** Показывает сохранённый доход в поле ввода */
function renderIncome() {
  const input = document.getElementById('income-input');
  if (state.income > 0) {
    input.value = state.income;
  }
}

/**
 * Рисует чипы-шаблоны популярных трат.
 * Клик на чип заполняет форму — пользователь может сразу нажать "Добавить".
 */
function renderTemplates() {
  const container = document.getElementById('templates-chips');
  container.innerHTML = ''; // очищаем перед перерисовкой

  TEMPLATES.forEach(function(tpl) {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = tpl.name;
    // Сохраняем данные шаблона в атрибутах кнопки
    btn.dataset.name   = tpl.name;
    btn.dataset.amount = tpl.amount;
    btn.dataset.period = tpl.period;
    btn.addEventListener('click', handleTemplateClick);
    container.appendChild(btn);
  });
}

/** Рисует список категорий трат */
function renderCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = ''; // очищаем перед перерисовкой

  if (state.categories.length === 0) {
    list.innerHTML = '<li class="hint" style="padding:8px 0">Категорий пока нет. Добавьте первую!</li>';
    return;
  }

  const periodLabels = { month: 'месяц' };
  const limitInfo = calcCategoryLimitInfo(state.categories, state.expenses);

  state.categories.forEach(function(cat) {
    const li = document.createElement('li');

    const label = document.createElement('span');
    label.className = 'cat-label';
    label.textContent = `${cat.name} — ${formatMoney(cat.amount)} / ${periodLabels[cat.period]}`;

    const info = limitInfo[cat.id];
    if (info && info.isExceeded) {
      const warn = document.createElement('span');
      warn.className = 'cat-warning';
      warn.textContent = `Превышено на ${formatMoney(info.overBy)}`;
      label.appendChild(warn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '✕';
    // Сохраняем id категории в атрибуте, чтобы знать, что удалять
    deleteBtn.dataset.id = cat.id;
    deleteBtn.addEventListener('click', handleDeleteCategory);

    li.appendChild(label);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

/** Показывает сохранённую цель в полях ввода */
function renderGoal() {
  if (state.goal.name) {
    document.getElementById('goal-name').value = state.goal.name;
  }
  if (state.goal.amount > 0) {
    document.getElementById('goal-amount').value = state.goal.amount;
  }
}

/** Рисует историю фактических расходов */
function renderExpenseHistory() {
  const list = document.getElementById('expenses-list');
  if (!list) return;
  
  list.innerHTML = '';

  if (state.expenses.length === 0) {
    list.innerHTML = '<li class="hint" style="padding:8px 0">Расходов пока нет.</li>';
    return;
  }

  // Сортируем по дате (новые сверху)
  const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(function(expense) {
    const li = document.createElement('li');
    
    const label = document.createElement('span');
    label.className = 'expense-label';
    const dateStr = new Date(expense.date).toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    label.textContent = `${expense.categoryName} — ${formatMoney(expense.amount)} (${dateStr})`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.dataset.id = expense.id;
    deleteBtn.addEventListener('click', handleDeleteExpense);

    li.appendChild(label);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

/** Рисует блок итогов */
function renderResult() {
  const container = document.getElementById('result-content');

  // Если данных недостаточно — показываем подсказку
  const hasIncome     = state.income > 0;
  const hasCategories = state.categories.length > 0;
  const hasGoal       = state.goal.amount > 0 && state.goal.name;

  if (!hasIncome && !hasCategories && !hasGoal) {
    container.innerHTML = '<p class="hint">Заполните доход, категории трат и цель — здесь появится расчёт.</p>';
    return;
  }

  const { totalExpenses, savings } = calcTotals(state.categories, state.income);
  const months = calcMonthsToGoal(savings, state.goal.amount);

  // Строим HTML итогов
  let html = '';

  // Строки "Доход" и "Расходы" — оставляем
  if (hasIncome) {
    html += makeResultRow('Доход в месяц', formatMoney(state.income), '');
  }
  if (hasCategories) {
    html += makeResultRow('Расходы в месяц', formatMoney(totalExpenses), '');
  }

  // Строка "Остаток в месяц" убрана — см. правки V2

  // Предупреждение о перерасходе
  if (hasIncome && hasCategories && savings < 0) {
    html += `<div class="warning">Расходы превышают доход на ${formatMoney(Math.abs(savings))}. Накопить на мечту не получится, пока не уменьшить траты.</div>`;
  }

  // Progress bar мечты — объединяет "Цель" и "Накоплю за" в один блок
  if (hasGoal) {
    html += makeGoalProgressBar(state.goal.name, state.goal.amount, savings, months);
  }

  container.innerHTML = html;
}

/**
 * Возвращает HTML progress bar для мечты.
 * Полоса заполняется пропорционально: сколько откладывается за месяц
 * относительно суммы цели (1 месяц = X% от цели).
 *
 * @param {string} goalName    — название мечты
 * @param {number} goalAmount  — нужная сумма
 * @param {number} savings     — сколько остаётся в месяц
 * @param {number|null} months — месяцев до цели (null если копить нельзя)
 */
function makeGoalProgressBar(goalName, goalAmount, savings, months) {
  // Процент заполнения = сбережения за 1 месяц / сумма цели × 100
  // Ограничиваем 100% сверху на случай, если откладывается больше цели
  const percent = savings > 0
    ? Math.min(Math.round((savings / goalAmount) * 100), 100)
    : 0;

  // Текст под полосой: срок или предупреждение
  const timeText = months !== null
    ? `Накоплю за <strong>${formatMonths(months)}</strong>`
    : 'Укажите доход и траты, чтобы рассчитать срок';

  return `
    <div class="goal-progress">
      <div class="goal-progress-header">
        <span class="goal-name">«${goalName}»</span>
        <span class="goal-amount-label">${formatMoney(goalAmount)}</span>
      </div>
      <div class="progress-track">
        <!-- Ширина полосы задаётся через style, процент вычислен выше -->
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="goal-progress-footer">
        <span class="goal-savings-label">
          ${savings > 0 ? `Откладываю ${formatMoney(savings)}/мес` : 'Нет свободных средств'}
        </span>
        <span class="goal-time-label">${timeText}</span>
      </div>
    </div>
  `;
}

/**
 * Возвращает HTML одной строки итогов.
 * @param {string} label — название
 * @param {string} value — значение
 * @param {string} modifier — CSS-модификатор строки (positive | negative | highlight | '')
 */
function makeResultRow(label, value, modifier) {
  return `
    <div class="result-row ${modifier}">
      <span class="result-label">${label}</span>
      <span class="result-value">${value}</span>
    </div>
  `;
}


// ============================================================
// 6. ВАЛИДАЦИЯ ПОЛЕЙ
// ============================================================

/**
 * Определяет, куда вставлять сообщение валидации.
 * Если input внутри .input-row — сообщение идёт после .input-row,
 * иначе — после самого input.
 */
function getMessageAnchor(input) {
  const parent = input.parentNode;
  if (parent.classList.contains('input-row')) return parent;
  return input;
}

/**
 * Находит или создаёт элемент .field-message рядом с полем.
 */
function getOrCreateMessage(input) {
  const anchor = getMessageAnchor(input);
  let msg = anchor.nextElementSibling;
  if (!msg || !msg.classList.contains('field-message')) {
    msg = document.createElement('span');
    msg.className = 'field-message';
    anchor.parentNode.insertBefore(msg, anchor.nextSibling);
  }
  return msg;
}

/** Убирает состояние валидации с поля */
function clearFieldState(input) {
  input.classList.remove('input-error', 'input-success');
  const anchor = getMessageAnchor(input);
  const msg = anchor.nextElementSibling;
  if (msg && msg.classList.contains('field-message')) {
    msg.textContent = '';
    msg.className = 'field-message';
  }
}

/** Показывает ошибку на поле */
function showFieldError(input, text) {
  input.classList.remove('input-success');
  input.classList.add('input-error');
  const msg = getOrCreateMessage(input);
  msg.textContent = text;
  msg.className = 'field-message field-message--error';
}

/** Показывает успех на поле (автоочистка через 2 сек) */
function showFieldSuccess(input, text) {
  input.classList.remove('input-error');
  input.classList.add('input-success');
  const msg = getOrCreateMessage(input);
  msg.textContent = text;
  msg.className = 'field-message field-message--success';
  setTimeout(function() { clearFieldState(input); }, 2000);
}


// ============================================================
// 7. ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

/** Сохраняет доход из поля ввода */
function handleSaveIncome() {
  const input = document.getElementById('income-input');
  const raw   = input.value.trim();

  if (!raw) {
    showFieldError(input, 'Введите сумму дохода');
    return;
  }

  const value = parseFloat(raw);
  if (isNaN(value) || value < 0) {
    showFieldError(input, 'Введите корректное число (0 или больше)');
    return;
  }

  state.income = value;
  saveState();
  showFieldSuccess(input, 'Доход сохранён ✓');
  render();
}

/** Добавляет новую категорию трат */
function handleAddCategory() {
  const nameInput    = document.getElementById('cat-name');
  const amountInput  = document.getElementById('cat-amount');
  const limitInput   = document.getElementById('cat-limit');
  const periodSelect = document.getElementById('cat-period');

  const name   = nameInput.value.trim();
  const rawAmt = amountInput.value.trim();
  const rawLimit = limitInput.value.trim();
  const period = periodSelect.value;

  clearFieldState(nameInput);
  clearFieldState(amountInput);
  clearFieldState(limitInput);

  let hasErrors = false;

  if (!name) {
    showFieldError(nameInput, 'Введите название категории');
    hasErrors = true;
  }

  if (!rawAmt) {
    showFieldError(amountInput, 'Введите сумму');
    hasErrors = true;
  } else {
    const amount = parseFloat(rawAmt);
    if (isNaN(amount) || amount <= 0) {
      showFieldError(amountInput, 'Сумма должна быть больше нуля');
      hasErrors = true;
    }
  }

  if (rawLimit) {
    const limitValue = parseFloat(rawLimit);
    if (isNaN(limitValue) || limitValue <= 0) {
      showFieldError(limitInput, 'Лимит должен быть больше нуля');
      hasErrors = true;
    }
  }

  if (hasErrors) return;

  const amount = parseFloat(rawAmt);
  const limit = rawLimit ? parseFloat(rawLimit) : 0;

  const newCategory = {
    id: Date.now().toString(),
    name,
    amount,
    period,
    limit
  };

  state.categories.push(newCategory);
  saveState();

  showFieldSuccess(nameInput, 'Категория добавлена ✓');

  render();

  nameInput.value   = '';
  amountInput.value = '';
  limitInput.value  = '';
}

/** Удаляет категорию по id (id берём из data-атрибута кнопки) */
function handleDeleteCategory(event) {
  const id = event.target.dataset.id;
  // Оставляем все категории кроме удалённой
  state.categories = state.categories.filter(function(cat) {
    return cat.id !== id;
  });
  saveState();
  render();
}

/**
 * Заполняет форму добавления категории данными из шаблона.
 * Пользователь может скорректировать значения и нажать "Добавить".
 */
function handleTemplateClick(event) {
  const btn = event.target;
  document.getElementById('cat-name').value   = btn.dataset.name;
  document.getElementById('cat-amount').value = btn.dataset.amount;
  document.getElementById('cat-period').value = btn.dataset.period;
  // Фокусируемся на поле суммы, чтобы удобно было поправить
  document.getElementById('cat-amount').focus();
}

/** Сохраняет цель из полей ввода */
function handleSaveGoal() {
  const nameInput   = document.getElementById('goal-name');
  const amountInput = document.getElementById('goal-amount');

  const name   = nameInput.value.trim();
  const rawAmt = amountInput.value.trim();

  clearFieldState(nameInput);
  clearFieldState(amountInput);

  let hasErrors = false;

  if (!name) {
    showFieldError(nameInput, 'Введите название цели');
    hasErrors = true;
  }

  if (!rawAmt) {
    showFieldError(amountInput, 'Введите сумму цели');
    hasErrors = true;
  } else {
    const amount = parseFloat(rawAmt);
    if (isNaN(amount) || amount <= 0) {
      showFieldError(amountInput, 'Сумма должна быть больше нуля');
      hasErrors = true;
    }
  }

  if (hasErrors) return;

  state.goal.name   = name;
  state.goal.amount = parseFloat(rawAmt);
  saveState();
  showFieldSuccess(amountInput, 'Цель сохранена ✓');
  render();
}

/** Добавляет фактический расход */
function handleAddExpense() {
  const nameInput   = document.getElementById('expense-name');
  const dateInput   = document.getElementById('expense-date');
  const amountInput = document.getElementById('expense-amount');

  const name   = nameInput.value.trim();
  const dateRaw = dateInput.value.trim();
  const rawAmt = amountInput.value.trim();

  clearFieldState(nameInput);
  clearFieldState(dateInput);
  clearFieldState(amountInput);

  let hasErrors = false;

  if (!name) {
    showFieldError(nameInput, 'Введите название расхода');
    hasErrors = true;
  }

  if (!rawAmt) {
    showFieldError(amountInput, 'Введите сумму');
    hasErrors = true;
  } else {
    const amount = parseFloat(rawAmt);
    if (isNaN(amount) || amount <= 0) {
      showFieldError(amountInput, 'Сумма должна быть больше нуля');
      hasErrors = true;
    }
  }

  let dateIso = '';
  if (!dateRaw) {
    showFieldError(dateInput, 'Введите дату');
    hasErrors = true;
  } else {
    const parsed = parseExpenseDateInput(dateRaw);
    if (!parsed) {
      showFieldError(dateInput, 'Формат: день/месяц/год');
      hasErrors = true;
    } else {
      dateIso = parsed;
    }
  }

  if (hasErrors) return;

  const amount = parseFloat(rawAmt);

  const newExpense = {
    id: Date.now().toString(),
    categoryName: name,
    amount,
    date: dateIso
  };

  state.expenses.push(newExpense);
  saveState();

  showFieldSuccess(nameInput, 'Расход добавлен ✓');

  render();

  nameInput.value   = '';
  dateInput.value   = '';
  amountInput.value = '';
}

/** Удаляет расход по id */
function handleDeleteExpense(event) {
  const id = event.target.dataset.id;
  state.expenses = state.expenses.filter(function(exp) {
    return exp.id !== id;
  });
  saveState();
  render();
}

/** Парсит дату день/месяц/год в ISO-строку */
function parseExpenseDateInput(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }
  return utcDate.toISOString();
}


// ============================================================
// 8. ТЕМА (светлая / тёмная)
// Тема хранится в localStorage отдельно от данных приложения.
// Активируется через атрибут data-theme="dark" на <html>.
// ============================================================

const THEME_KEY = 'dream_calc_theme';

/**
 * Применяет тему и обновляет иконку кнопки.
 * @param {string} theme — 'light' | 'dark'
 */
function applyTheme(theme) {
  const html = document.documentElement; // это тег <html>
  const btn  = document.getElementById('btn-theme-toggle');

  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    btn.textContent = '☀️'; // в тёмной теме предлагаем переключиться на свет
    btn.title = 'Светлая тема';
  } else {
    html.removeAttribute('data-theme');
    btn.textContent = '🌙'; // в светлой теме предлагаем тёмную
    btn.title = 'Тёмная тема';
  }
}

/** Загружает сохранённую тему из localStorage и применяет её */
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
}

// Флаг: ждём второго клика для подтверждения сброса
let resetPending = false;
// Таймер: если второго клика не было — отменяем режим подтверждения
let resetTimer   = null;

/**
 * Сбрасывает все данные по схеме двойного клика:
 *   1-й клик — кнопка просит подтверждения (меняет текст)
 *   2-й клик в течение 3 секунд — выполняет сброс
 *   Если 3 секунды прошли — возвращается в исходное состояние.
 *
 * Причина отказа от confirm(): браузер при открытии через file://
 * может заблокировать confirm(), и кнопка казалась нерабочей.
 */
function handleResetData() {
  const btn = document.getElementById('btn-reset');
  const CONFIRM_TIMEOUT_MS = 3000;

  function setResetButtonPending() {
    resetPending    = true;
    btn.textContent = '❓';
    btn.title       = 'Кликните ещё раз для подтверждения';
    btn.classList.add('btn-icon--pending'); // мигающая подсветка

    // Через 3 секунды без второго клика — отменяем
    resetTimer = setTimeout(function() {
      resetPending    = false;
      btn.textContent = '🗑';
      btn.title       = 'Сбросить все данные';
      btn.classList.remove('btn-icon--pending');
    }, CONFIRM_TIMEOUT_MS);
  }

  function restoreResetButtonDefault() {
    btn.textContent = '🗑';
    btn.title       = 'Сбросить все данные';
    btn.classList.remove('btn-icon--pending');
  }

  function clearInputs() {
    document.getElementById('income-input').value = '';
    document.getElementById('goal-name').value    = '';
    document.getElementById('goal-amount').value  = '';
    document.getElementById('cat-name').value     = '';
    document.getElementById('cat-amount').value   = '';
    document.getElementById('cat-limit').value    = '';
    document.getElementById('cat-period').value   = 'month';
    document.getElementById('expense-name').value = '';
    document.getElementById('expense-date').value = '';
    document.getElementById('expense-amount').value = '';
  }

  if (!resetPending) {
    setResetButtonPending();

    return;
  }

  // Второй клик: выполняем сброс
  clearTimeout(resetTimer);
  resetPending = false;

  // Обнуляем state
  state.income      = 0;
  state.categories  = [];
  state.goal.name   = '';
  state.goal.amount = 0;
  state.expenses    = [];

  // Удаляем данные из localStorage (тему не трогаем — у неё свой ключ)
  localStorage.removeItem(STORAGE_KEY);

  // Очищаем все поля ввода
  clearInputs();

  // Возвращаем кнопке исходный вид
  restoreResetButtonDefault();

  render();
}

/** Переключает тему и сохраняет выбор */
function handleThemeToggle() {
  // Смотрим текущее состояние атрибута на <html>
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}


// ============================================================
// 9. СТАРТ ПРИЛОЖЕНИЯ
// Вешаем обработчики на кнопки, загружаем данные, рисуем UI.
// ============================================================

document.getElementById('btn-save-income').addEventListener('click', handleSaveIncome);
document.getElementById('btn-add-category').addEventListener('click', handleAddCategory);
document.getElementById('btn-save-goal').addEventListener('click', handleSaveGoal);
document.getElementById('btn-add-expense').addEventListener('click', handleAddExpense);
document.getElementById('btn-theme-toggle').addEventListener('click', handleThemeToggle);
document.getElementById('btn-reset').addEventListener('click', handleResetData);

['income-input', 'cat-name', 'cat-amount', 'cat-limit', 'goal-name', 'goal-amount', 'expense-name', 'expense-date', 'expense-amount'].forEach(function(id) {
  document.getElementById(id).addEventListener('focus', function() {
    clearFieldState(this);
  });
});

// Маска даты: день/месяц/год
const expenseDateInput = document.getElementById('expense-date');
if (expenseDateInput) {
  expenseDateInput.addEventListener('input', function() {
    const digits = this.value.replace(/\D/g, '').slice(0, 8);
    let day = digits.slice(0, 2);
    let month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    if (day.length === 2) {
      let dayNum = Math.max(1, Math.min(31, Number(day)));
      day = String(dayNum).padStart(2, '0');
    }

    if (month.length === 2) {
      let monthNum = Math.max(1, Math.min(12, Number(month)));
      month = String(monthNum).padStart(2, '0');
    }

    if (year.length === 4 && day.length === 2 && month.length === 2) {
      const yearNum = Number(year);
      const monthNum = Number(month);
      const maxDay = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();
      let dayNum = Math.max(1, Math.min(maxDay, Number(day)));
      day = String(dayNum).padStart(2, '0');
    }

    const parts = [];
    if (day) parts.push(day);
    if (month) parts.push(month);
    if (year) parts.push(year);
    this.value = parts.join('/');
  });

  expenseDateInput.addEventListener('blur', function() {
    const parts = this.value.split('/').map(part => part.replace(/\D/g, ''));
    if (parts.length !== 3) return;
    const day = parts[0] ? parts[0].padStart(2, '0') : '';
    const month = parts[1] ? parts[1].padStart(2, '0') : '';
    const year = parts[2] ? parts[2].padStart(4, '0') : '';
    this.value = [day, month, year].filter(Boolean).join('/');
  });
}

// Тему загружаем первой — до рендера, чтобы не было "мигания" светлого фона
loadTheme();

// Загружаем данные из localStorage и отрисовываем
loadState();
render();
