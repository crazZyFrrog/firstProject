// ============================================================
// app.js — логика калькулятора трат и мечты
//
// Структура файла:
//   1. Состояние приложения (state)
//   2. Чистые функции расчёта (не зависят от DOM)
//   3. Работа с localStorage (сохранение / загрузка)
//   4. Рендер — отрисовка UI на основе state
//   5. Обработчики событий (кнопки, клики)
//   6. Старт приложения
// ============================================================


// ============================================================
// 1. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// Один объект хранит все данные. Это удобно: легко сохранить
// в localStorage целиком и легко читать.
// ============================================================

const state = {
  income: 0,            // ежемесячный доход (число)
  categories: [],       // массив объектов { id, name, amount, period }
  goal: {
    name: '',           // название мечты
    amount: 0           // нужная сумма
  }
};


// ============================================================
// 2. ЧИСТЫЕ ФУНКЦИИ РАСЧЁТА
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
  if (period === 'day')   return amount * 30;
  if (period === 'week')  return amount * 4;
  if (period === 'month') return amount;
  return 0; // неизвестный период — считаем 0
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


// ============================================================
// 3. РАБОТА С LOCALSTORAGE
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
    if (Array.isArray(saved.categories))     state.categories = saved.categories;
    if (saved.goal && typeof saved.goal === 'object') {
      state.goal.name   = saved.goal.name   || '';
      state.goal.amount = saved.goal.amount || 0;
    }
  } catch (e) {
    console.warn('Не удалось загрузить сохранённые данные:', e);
  }
}


// ============================================================
// 4. РЕНДЕР — отрисовка UI
// Одна функция render() читает state и обновляет DOM.
// Принцип: state — источник истины, DOM — его отражение.
// ============================================================

function render() {
  renderIncome();
  renderCategories();
  renderGoal();
  renderResult();
}

/** Показывает сохранённый доход в поле ввода */
function renderIncome() {
  const input = document.getElementById('income-input');
  if (state.income > 0) {
    input.value = state.income;
  }
}

/** Рисует список категорий трат */
function renderCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = ''; // очищаем перед перерисовкой

  if (state.categories.length === 0) {
    list.innerHTML = '<li class="hint" style="padding:8px 0">Категорий пока нет. Добавьте первую!</li>';
    return;
  }

  // Словарь для читаемых названий периодов
  const periodLabels = { day: 'день', week: 'неделю', month: 'месяц' };

  state.categories.forEach(function(cat) {
    const li = document.createElement('li');

    const label = document.createElement('span');
    label.className = 'cat-label';
    label.textContent = `${cat.name} — ${formatMoney(cat.amount)} / ${periodLabels[cat.period]}`;

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

  if (hasIncome) {
    html += makeResultRow('Доход в месяц', formatMoney(state.income), '');
  }

  if (hasCategories) {
    html += makeResultRow('Расходы в месяц', formatMoney(totalExpenses), '');
  }

  if (hasIncome && hasCategories) {
    const sign = savings >= 0 ? 'positive' : 'negative';
    html += makeResultRow('Остаток в месяц', formatMoney(savings), sign);

    if (savings < 0) {
      html += `<div class="warning">Расходы превышают доход на ${formatMoney(Math.abs(savings))}. Накопить на мечту не получится, пока не уменьшить траты.</div>`;
    }
  }

  if (hasGoal) {
    html += makeResultRow(`Цель: «${state.goal.name}»`, formatMoney(state.goal.amount), 'highlight');

    if (months !== null) {
      html += makeResultRow('Накоплю за', formatMonths(months), 'highlight');
    } else if (savings <= 0) {
      html += `<div class="warning">Чтобы рассчитать срок накопления, нужно, чтобы остаток был положительным.</div>`;
    }
  }

  container.innerHTML = html;
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
// 5. ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

/** Сохраняет доход из поля ввода */
function handleSaveIncome() {
  const input = document.getElementById('income-input');
  const value = parseFloat(input.value);

  if (isNaN(value) || value < 0) {
    alert('Введите корректную сумму дохода (число больше нуля).');
    return;
  }

  state.income = value;
  saveState();
  render();
}

/** Добавляет новую категорию трат */
function handleAddCategory() {
  const nameInput   = document.getElementById('cat-name');
  const amountInput = document.getElementById('cat-amount');
  const periodSelect = document.getElementById('cat-period');

  const name   = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const period = periodSelect.value;

  if (!name) {
    alert('Введите название категории.');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    alert('Введите корректную сумму (число больше нуля).');
    return;
  }

  // Создаём объект категории
  const newCategory = {
    id: Date.now().toString(), // простой уникальный id на основе времени
    name,
    amount,
    period
  };

  state.categories.push(newCategory);
  saveState();
  render();

  // Очищаем поля формы после добавления
  nameInput.value   = '';
  amountInput.value = '';
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

/** Сохраняет цель из полей ввода */
function handleSaveGoal() {
  const nameInput   = document.getElementById('goal-name');
  const amountInput = document.getElementById('goal-amount');

  const name   = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (!name) {
    alert('Введите название цели.');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    alert('Введите корректную сумму цели (число больше нуля).');
    return;
  }

  state.goal.name   = name;
  state.goal.amount = amount;
  saveState();
  render();
}


// ============================================================
// 6. СТАРТ ПРИЛОЖЕНИЯ
// Вешаем обработчики на кнопки, загружаем данные, рисуем UI.
// ============================================================

document.getElementById('btn-save-income').addEventListener('click', handleSaveIncome);
document.getElementById('btn-add-category').addEventListener('click', handleAddCategory);
document.getElementById('btn-save-goal').addEventListener('click', handleSaveGoal);

// Загружаем данные из localStorage и отрисовываем
loadState();
render();
