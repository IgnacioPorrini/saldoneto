// charts.js - Chart rendering logic

let monthlyChart = null;
let categoryChart = null;
let netWorthChart = null;

export const renderMonthlyChart = (ctx, monthlyData, getTrans, filterDataCallback) => {
    const sortedForChart = [...monthlyData].reverse();
    const labels = sortedForChart.map(m => m.month);
    const incomeData = sortedForChart.map(m => m.income);
    const expenseData = sortedForChart.map(m => m.expense);

    // Calculate Average Expense
    const totalExpense = expenseData.reduce((a, b) => a + b, 0);
    const avgExpense = expenseData.length > 0 ? (totalExpense / expenseData.length) : 0;
    const avgExpenseData = labels.map(() => avgExpense);

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: getTrans('chart_income'),
                    data: incomeData,
                    backgroundColor: '#4ade80',
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: getTrans('chart_expense'),
                    data: expenseData,
                    backgroundColor: '#f87171',
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: getTrans('chart_avg_expense') || 'Gasto Medio',
                    data: avgExpenseData,
                    type: 'line',
                    borderColor: '#facc15',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const month = labels[index];
                    filterDataCallback(month);
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 20,
                    left: 5,
                    right: 5,
                    top: 5
                }
            },
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 12 } } }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }
            }
        }
    });
};

export const renderNetWorthChart = (ctx, monthlyData, getTrans) => {
    const sortedForChart = [...monthlyData].reverse();
    const labels = sortedForChart.map(m => m.month);

    let runningBalance = 0;
    const balanceData = sortedForChart.map(m => {
        runningBalance += m.balance;
        return runningBalance;
    });

    if (netWorthChart) netWorthChart.destroy();

    netWorthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: getTrans('chart_net_worth'),
                data: balanceData,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 20,
                    left: 5,
                    right: 5,
                    top: 5
                }
            },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }
            }
        }
    });
};

export const renderCategoryChart = (ctx, monthlyData, filterMonth, getTrans, filterCatCallback) => {
    let categories = {};
    if (filterMonth === 'all') {
        monthlyData.forEach(m => {
            m.categories.forEach(c => {
                categories[c.name] = (categories[c.name] || 0) + c.amount;
            });
        });
    } else {
        const monthObj = monthlyData.find(m => m.month === filterMonth);
        if (monthObj && monthObj.categories) {
            monthObj.categories.forEach(c => {
                categories[c.name] = c.amount;
            });
        }
    }

    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const labels = sortedCategories.map(c => getTrans(`cat_${c[0]}`) || c[0]);
    const data = sortedCategories.map(c => c[1].toFixed(2));

    const backgroundColors = ['#38bdf8', '#4ade80', '#facc15', '#f87171', '#a78bfa', '#fb923c', '#cbd5e1', '#94a3b8'];

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const originalCat = sortedCategories[index][0];
                    filterCatCallback(originalCat);
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 }
                }
            }
        }
    });
};
