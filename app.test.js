// ============================================================
// app.test.js — тесты чистых функций из app.js
//
// Запуск: автоматически при открытии index.html в браузере.
// Результаты видны в консоли браузера (F12 → Console).
//
// Используем только встроенный console.assert — никаких библиотек.
// console.assert(условие, 'сообщение если условие false')
// ============================================================


// ============================================================
// Вспомогательная функция для запуска тестов
// ============================================================

/**
 * Запускает один тест и выводит результат в консоль.
 * @param {string} name — название теста
 * @param {Function} fn — функция с проверками через console.assert
 */
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}:`, e.message);
  }
}

// Отделяем тесты визуально в консоли
console.group('🧪 Тесты app.js');


// ============================================================
// Тесты: normalizeToMonth
// ============================================================

test('normalizeToMonth: день × 30', function() {
  const result = normalizeToMonth(100, 'day');
  console.assert(result === 3000, `Ожидалось 3000, получили ${result}`);
});

test('normalizeToMonth: неделя × 4', function() {
  const result = normalizeToMonth(1000, 'week');
  console.assert(result === 4000, `Ожидалось 4000, получили ${result}`);
});

test('normalizeToMonth: месяц × 1', function() {
  const result = normalizeToMonth(5000, 'month');
  console.assert(result === 5000, `Ожидалось 5000, получили ${result}`);
});

test('normalizeToMonth: неизвестный период → 0', function() {
  const result = normalizeToMonth(500, 'year');
  console.assert(result === 0, `Ожидалось 0, получили ${result}`);
});

test('normalizeToMonth: нулевая сумма → 0', function() {
  const result = normalizeToMonth(0, 'day');
  console.assert(result === 0, `Ожидалось 0, получили ${result}`);
});


// ============================================================
// Тесты: calcTotals
// ============================================================

test('calcTotals: несколько категорий, есть остаток', function() {
  const categories = [
    { id: '1', name: 'Еда',       amount: 500,   period: 'day'   }, // 500×30 = 15000
    { id: '2', name: 'Транспорт', amount: 1000,  period: 'week'  }, // 1000×4 = 4000
    { id: '3', name: 'Аренда',    amount: 20000, period: 'month' }  // 20000×1 = 20000
  ];
  // Итого расходов: 15000 + 4000 + 20000 = 39000
  const income = 60000;

  const { totalExpenses, savings } = calcTotals(categories, income);
  console.assert(totalExpenses === 39000, `totalExpenses: ожидалось 39000, получили ${totalExpenses}`);
  console.assert(savings === 21000,       `savings: ожидалось 21000, получили ${savings}`);
});

test('calcTotals: расходы превышают доход → savings отрицательный', function() {
  const categories = [
    { id: '1', name: 'Аренда', amount: 50000, period: 'month' }
  ];
  const income = 30000;

  const { totalExpenses, savings } = calcTotals(categories, income);
  console.assert(totalExpenses === 50000, `totalExpenses: ожидалось 50000, получили ${totalExpenses}`);
  console.assert(savings === -20000,      `savings: ожидалось -20000, получили ${savings}`);
});

test('calcTotals: пустой список категорий → расходы 0', function() {
  const { totalExpenses, savings } = calcTotals([], 40000);
  console.assert(totalExpenses === 0,     `totalExpenses: ожидалось 0, получили ${totalExpenses}`);
  console.assert(savings === 40000,       `savings: ожидалось 40000, получили ${savings}`);
});

test('calcTotals: нулевой доход → savings отрицательный или ноль', function() {
  const categories = [{ id: '1', name: 'Еда', amount: 10000, period: 'month' }];
  const { savings } = calcTotals(categories, 0);
  console.assert(savings === -10000, `savings: ожидалось -10000, получили ${savings}`);
});


// ============================================================
// Тесты: calcMonthsToGoal
// ============================================================

test('calcMonthsToGoal: ровное деление', function() {
  const months = calcMonthsToGoal(10000, 30000);
  console.assert(months === 3, `Ожидалось 3, получили ${months}`);
});

test('calcMonthsToGoal: неполный месяц округляется вверх', function() {
  const months = calcMonthsToGoal(10000, 25000);
  // 25000 / 10000 = 2.5 → Math.ceil → 3
  console.assert(months === 3, `Ожидалось 3, получили ${months}`);
});

test('calcMonthsToGoal: сбережения 0 → null (копить невозможно)', function() {
  const months = calcMonthsToGoal(0, 50000);
  console.assert(months === null, `Ожидалось null, получили ${months}`);
});

test('calcMonthsToGoal: сбережения отрицательные → null', function() {
  const months = calcMonthsToGoal(-5000, 50000);
  console.assert(months === null, `Ожидалось null, получили ${months}`);
});

test('calcMonthsToGoal: цель 0 → null (некорректная цель)', function() {
  const months = calcMonthsToGoal(10000, 0);
  console.assert(months === null, `Ожидалось null, получили ${months}`);
});


// ============================================================
// Тесты: formatMonths
// ============================================================

test('formatMonths: меньше месяца', function() {
  const result = formatMonths(0);
  console.assert(result === 'меньше месяца', `Получили: "${result}"`);
});

test('formatMonths: ровно 1 месяц', function() {
  const result = formatMonths(1);
  console.assert(result === '1 месяц', `Получили: "${result}"`);
});

test('formatMonths: 5 месяцев', function() {
  const result = formatMonths(5);
  console.assert(result === '5 месяцев', `Получили: "${result}"`);
});

test('formatMonths: 12 месяцев = 1 год', function() {
  const result = formatMonths(12);
  console.assert(result === '1 год', `Получили: "${result}"`);
});

test('formatMonths: 14 месяцев = 1 год и 2 месяца', function() {
  const result = formatMonths(14);
  console.assert(result === '1 год и 2 месяца', `Получили: "${result}"`);
});

test('formatMonths: 24 месяца = 2 года', function() {
  const result = formatMonths(24);
  console.assert(result === '2 года', `Получили: "${result}"`);
});


// ============================================================
// Тесты: валидация полей (showFieldError / showFieldSuccess / clearFieldState)
// ============================================================

test('showFieldError: добавляет класс input-error и сообщение', function() {
  const input = document.createElement('input');
  const container = document.createElement('div');
  container.appendChild(input);

  showFieldError(input, 'Тестовая ошибка');

  console.assert(input.classList.contains('input-error'), 'input должен иметь класс input-error');
  console.assert(!input.classList.contains('input-success'), 'input не должен иметь класс input-success');

  const msg = input.nextElementSibling;
  console.assert(msg !== null, 'Сообщение должно быть создано');
  console.assert(msg.textContent === 'Тестовая ошибка', `Текст: "${msg.textContent}"`);
  console.assert(msg.classList.contains('field-message--error'), 'Сообщение должно иметь класс field-message--error');
});

test('showFieldSuccess: добавляет класс input-success и сообщение', function() {
  const input = document.createElement('input');
  const container = document.createElement('div');
  container.appendChild(input);

  showFieldSuccess(input, 'Успех!');

  console.assert(input.classList.contains('input-success'), 'input должен иметь класс input-success');
  console.assert(!input.classList.contains('input-error'), 'input не должен иметь класс input-error');

  const msg = input.nextElementSibling;
  console.assert(msg !== null, 'Сообщение должно быть создано');
  console.assert(msg.textContent === 'Успех!', `Текст: "${msg.textContent}"`);
  console.assert(msg.classList.contains('field-message--success'), 'Сообщение должно иметь класс field-message--success');
});

test('clearFieldState: убирает классы и текст сообщения', function() {
  const input = document.createElement('input');
  const container = document.createElement('div');
  container.appendChild(input);

  showFieldError(input, 'Ошибка');
  clearFieldState(input);

  console.assert(!input.classList.contains('input-error'), 'input-error должен быть убран');
  console.assert(!input.classList.contains('input-success'), 'input-success должен быть убран');

  const msg = input.nextElementSibling;
  console.assert(msg.textContent === '', 'Текст сообщения должен быть пуст');
});

test('showFieldError → showFieldSuccess: замена состояния', function() {
  const input = document.createElement('input');
  const container = document.createElement('div');
  container.appendChild(input);

  showFieldError(input, 'Ошибка');
  showFieldSuccess(input, 'Исправлено');

  console.assert(!input.classList.contains('input-error'), 'input-error должен быть убран');
  console.assert(input.classList.contains('input-success'), 'input-success должен быть добавлен');

  const msg = input.nextElementSibling;
  console.assert(msg.textContent === 'Исправлено', `Текст: "${msg.textContent}"`);
});

test('getMessageAnchor: для input внутри .input-row возвращает .input-row', function() {
  const row = document.createElement('div');
  row.className = 'input-row';
  const input = document.createElement('input');
  row.appendChild(input);
  const wrapper = document.createElement('div');
  wrapper.appendChild(row);

  const anchor = getMessageAnchor(input);
  console.assert(anchor === row, 'Anchor должен быть .input-row');
});

test('getMessageAnchor: для обычного input возвращает сам input', function() {
  const container = document.createElement('div');
  const input = document.createElement('input');
  container.appendChild(input);

  const anchor = getMessageAnchor(input);
  console.assert(anchor === input, 'Anchor должен быть сам input');
});

test('focus на поле ввода очищает состояние валидации', function() {
  var ids = ['income-input', 'cat-name', 'cat-amount', 'goal-name', 'goal-amount'];
  ids.forEach(function(id) {
    var input = document.getElementById(id);
    showFieldError(input, 'Тест');
    console.assert(input.classList.contains('input-error'), id + ': должен быть input-error до focus');

    input.dispatchEvent(new Event('focus'));

    console.assert(!input.classList.contains('input-error'), id + ': input-error должен быть убран после focus');
    console.assert(!input.classList.contains('input-success'), id + ': input-success должен быть убран после focus');
  });
});


// ============================================================
// Тесты: обработчики форм
// (handleSaveIncome, handleAddCategory, handleSaveGoal)
//
// Каждый тест оборачивается в withCleanState, который сохраняет
// глобальный state до теста и восстанавливает его после,
// чтобы тесты не влияли друг на друга и на работу приложения.
// ============================================================

function withCleanState(fn) {
  var saved = {
    income: state.income,
    categories: JSON.parse(JSON.stringify(state.categories)),
    goal: { name: state.goal.name, amount: state.goal.amount }
  };
  try {
    fn();
  } finally {
    state.income = saved.income;
    state.categories = saved.categories;
    state.goal.name = saved.goal.name;
    state.goal.amount = saved.goal.amount;
    saveState();
    ['income-input', 'cat-name', 'cat-amount', 'goal-name', 'goal-amount'].forEach(function(id) {
      clearFieldState(document.getElementById(id));
    });
    render();
  }
}


// --- handleSaveIncome ---

test('handleSaveIncome: пустое поле → ошибка «Введите сумму дохода»', function() {
  withCleanState(function() {
    var input = document.getElementById('income-input');
    input.value = '';

    handleSaveIncome();

    console.assert(input.classList.contains('input-error'), 'input должен иметь класс input-error');
    var msg = getMessageAnchor(input).nextElementSibling;
    console.assert(msg && msg.textContent === 'Введите сумму дохода',
      'Ожидалось "Введите сумму дохода", получили "' + (msg ? msg.textContent : '') + '"');
  });
});

test('handleSaveIncome: отрицательное число → ошибка', function() {
  withCleanState(function() {
    var input = document.getElementById('income-input');
    input.value = '-100';

    handleSaveIncome();

    console.assert(input.classList.contains('input-error'), 'input должен иметь класс input-error');
    var msg = getMessageAnchor(input).nextElementSibling;
    console.assert(msg && msg.textContent === 'Введите корректное число (0 или больше)',
      'Ожидалось сообщение об ошибке, получили "' + (msg ? msg.textContent : '') + '"');
  });
});

test('handleSaveIncome: корректное значение → state.income обновлён, показан успех', function() {
  withCleanState(function() {
    var input = document.getElementById('income-input');
    input.value = '75000';

    handleSaveIncome();

    console.assert(state.income === 75000, 'state.income: ожидалось 75000, получили ' + state.income);
    console.assert(input.classList.contains('input-success'), 'input должен иметь класс input-success');
    var msg = getMessageAnchor(input).nextElementSibling;
    console.assert(msg && msg.textContent === 'Доход сохранён ✓',
      'Ожидалось "Доход сохранён ✓", получили "' + (msg ? msg.textContent : '') + '"');
  });
});


// --- handleAddCategory ---

test('handleAddCategory: оба поля пустые → две ошибки, категория не добавлена', function() {
  withCleanState(function() {
    var nameInput = document.getElementById('cat-name');
    var amountInput = document.getElementById('cat-amount');
    nameInput.value = '';
    amountInput.value = '';
    var countBefore = state.categories.length;

    handleAddCategory();

    console.assert(nameInput.classList.contains('input-error'), 'name: должен быть input-error');
    console.assert(amountInput.classList.contains('input-error'), 'amount: должен быть input-error');
    var nameMsg = getMessageAnchor(nameInput).nextElementSibling;
    console.assert(nameMsg && nameMsg.textContent === 'Введите название категории',
      'Ожидалось "Введите название категории"');
    var amountMsg = getMessageAnchor(amountInput).nextElementSibling;
    console.assert(amountMsg && amountMsg.textContent === 'Введите сумму',
      'Ожидалось "Введите сумму"');
    console.assert(state.categories.length === countBefore,
      'Категория не должна добавиться при ошибке');
  });
});

test('handleAddCategory: сумма 0 → ошибка «Сумма должна быть больше нуля»', function() {
  withCleanState(function() {
    var nameInput = document.getElementById('cat-name');
    var amountInput = document.getElementById('cat-amount');
    nameInput.value = 'Тест';
    amountInput.value = '0';

    handleAddCategory();

    console.assert(!nameInput.classList.contains('input-error'), 'name: НЕ должен быть input-error');
    console.assert(amountInput.classList.contains('input-error'), 'amount: должен быть input-error');
    var msg = getMessageAnchor(amountInput).nextElementSibling;
    console.assert(msg && msg.textContent === 'Сумма должна быть больше нуля',
      'Ожидалось "Сумма должна быть больше нуля", получили "' + (msg ? msg.textContent : '') + '"');
  });
});

test('handleAddCategory: корректные данные → категория добавлена, поля очищены', function() {
  withCleanState(function() {
    var nameInput = document.getElementById('cat-name');
    var amountInput = document.getElementById('cat-amount');
    var periodSelect = document.getElementById('cat-period');
    var countBefore = state.categories.length;

    nameInput.value = 'Тестовая трата';
    amountInput.value = '3000';
    periodSelect.value = 'week';

    handleAddCategory();

    console.assert(state.categories.length === countBefore + 1,
      'Должна добавиться 1 категория');
    var added = state.categories[state.categories.length - 1];
    console.assert(added.name === 'Тестовая трата', 'name: "' + added.name + '"');
    console.assert(added.amount === 3000, 'amount: ' + added.amount);
    console.assert(added.period === 'week', 'period: ' + added.period);

    console.assert(nameInput.classList.contains('input-success'), 'name: должен быть input-success');
    console.assert(nameInput.value === '', 'name input должен быть очищен после добавления');
    console.assert(amountInput.value === '', 'amount input должен быть очищен после добавления');
  });
});


// --- handleSaveGoal ---

test('handleSaveGoal: оба поля пустые → две ошибки, цель не изменена', function() {
  withCleanState(function() {
    var nameInput = document.getElementById('goal-name');
    var amountInput = document.getElementById('goal-amount');
    var goalBefore = { name: state.goal.name, amount: state.goal.amount };
    nameInput.value = '';
    amountInput.value = '';

    handleSaveGoal();

    console.assert(nameInput.classList.contains('input-error'), 'name: должен быть input-error');
    console.assert(amountInput.classList.contains('input-error'), 'amount: должен быть input-error');
    var nameMsg = getMessageAnchor(nameInput).nextElementSibling;
    console.assert(nameMsg && nameMsg.textContent === 'Введите название цели',
      'Ожидалось "Введите название цели"');
    var amountMsg = getMessageAnchor(amountInput).nextElementSibling;
    console.assert(amountMsg && amountMsg.textContent === 'Введите сумму цели',
      'Ожидалось "Введите сумму цели"');
    console.assert(state.goal.name === goalBefore.name && state.goal.amount === goalBefore.amount,
      'Цель не должна измениться при ошибке');
  });
});

test('handleSaveGoal: отрицательная сумма → ошибка суммы', function() {
  withCleanState(function() {
    var nameInput = document.getElementById('goal-name');
    var amountInput = document.getElementById('goal-amount');
    nameInput.value = 'Мечта';
    amountInput.value = '-500';

    handleSaveGoal();

    console.assert(!nameInput.classList.contains('input-error'), 'name: НЕ должен быть input-error');
    console.assert(amountInput.classList.contains('input-error'), 'amount: должен быть input-error');
    var msg = getMessageAnchor(amountInput).nextElementSibling;
    console.assert(msg && msg.textContent === 'Сумма должна быть больше нуля',
      'Ожидалось "Сумма должна быть больше нуля", получили "' + (msg ? msg.textContent : '') + '"');
  });
});

test('handleSaveGoal: корректные данные → цель сохранена, показан успех', function() {
  withCleanState(function() {
    var nameInput = document.getElementById('goal-name');
    var amountInput = document.getElementById('goal-amount');

    nameInput.value = 'Поездка в Японию';
    amountInput.value = '200000';

    handleSaveGoal();

    console.assert(state.goal.name === 'Поездка в Японию',
      'goal.name: ожидалось "Поездка в Японию", получили "' + state.goal.name + '"');
    console.assert(state.goal.amount === 200000,
      'goal.amount: ожидалось 200000, получили ' + state.goal.amount);
    console.assert(amountInput.classList.contains('input-success'), 'amount: должен быть input-success');
    var msg = getMessageAnchor(amountInput).nextElementSibling;
    console.assert(msg && msg.textContent === 'Цель сохранена ✓',
      'Ожидалось "Цель сохранена ✓", получили "' + (msg ? msg.textContent : '') + '"');
  });
});


console.groupEnd();
