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


console.groupEnd();
