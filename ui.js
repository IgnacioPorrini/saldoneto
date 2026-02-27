// ui.js - DOM rendering and UI management

export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(amount);
};

export const animateNumber = (elementId, targetValue) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 1000; // 1 second
    const start = 0;
    const startTime = performance.now();

    const update = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = (t) => t * (2 - t);
        const currentValue = start + (targetValue - start) * easeOutQuad(progress);

        el.textContent = formatCurrency(currentValue);

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = formatCurrency(targetValue);
        }
    };

    requestAnimationFrame(update);
};

export const applyTranslations = (getTrans) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = getTrans(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = getTrans(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = getTrans(key);
    });
    document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
        const key = el.getAttribute('data-i18n-tooltip');
        el.setAttribute('data-tooltip', getTrans(key));
    });
};

export const updateHealthPanel = (currentFinanceData, ANT_THRESHOLD, getTrans, filterMonth = 'all') => {
    if (!currentFinanceData || !currentFinanceData.summary) return;

    const healthSavingsRateEl = document.getElementById('health-savings-rate');
    const healthRunwayEl = document.getElementById('health-runway');
    const healthAntExpensesEl = document.getElementById('health-ant-expenses');
    const healthProjectionEl = document.getElementById('health-projection');

    // 1. Savings Rate (%)
    const savingsRate = (currentFinanceData.summary.total_income > 0)
        ? ((currentFinanceData.summary.net_balance / currentFinanceData.summary.total_income) * 100)
        : 0;

    if (healthSavingsRateEl) {
        healthSavingsRateEl.textContent = `${savingsRate.toFixed(1)}%`;
        healthSavingsRateEl.className = savingsRate >= 20 ? 'success' : (savingsRate > 0 ? 'warning' : 'danger');
    }

    // 2. Runway (Days)
    const totalExpense = currentFinanceData.summary.total_expense;
    const numMonths = currentFinanceData.monthly.length || 1;
    const dailyExpenseOverall = totalExpense / (numMonths * 30);
    const runway = dailyExpenseOverall > 0 ? (currentFinanceData.summary.net_balance / dailyExpenseOverall) : 0;

    if (healthRunwayEl) {
        healthRunwayEl.textContent = Math.max(0, Math.round(runway));
        healthRunwayEl.className = runway >= 90 ? 'success' : (runway >= 30 ? 'warning' : 'danger');
    }

    // 3. Ant Expenses (Gastos Hormiga)
    let totalAntExpenses = 0;
    if (currentFinanceData.monthly) {
        currentFinanceData.monthly.forEach(month => {
            const monthlyAnts = month.transactions
                .filter(t => t.amount < 0 && Math.abs(t.amount) <= ANT_THRESHOLD)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            totalAntExpenses += monthlyAnts;
        });
    }

    if (healthAntExpensesEl) {
        healthAntExpensesEl.textContent = formatCurrency(totalAntExpenses);
    }

    // 4. End of Month Projection
    let projection = 0;
    let targetMonthName = filterMonth;

    if (targetMonthName === 'all' && currentFinanceData.monthly.length > 0) {
        // Use latest month for projection if none selected
        targetMonthName = currentFinanceData.monthly[0].month;
    }

    const monthObj = currentFinanceData.monthly.find(m => m.month === targetMonthName);
    if (monthObj) {
        const spent = Math.abs(monthObj.expense);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dayOfMonth = now.getDate();

        // Check if selected month is actually current calendar month
        const isCurrentMonth = targetMonthName === `${year}-${String(month + 1).padStart(2, '0')}`;

        if (isCurrentMonth) {
            projection = (spent / dayOfMonth) * daysInMonth;
        } else {
            // If historical, projection is just the total expense of that month
            projection = spent;
        }
    }

    if (healthProjectionEl) {
        healthProjectionEl.textContent = formatCurrency(projection);
    }
};

export const updateMonthlySnapshot = (financeData, filterMonth, getTrans) => {
    const snapshotEl = document.getElementById('monthly-snapshot');
    if (!snapshotEl) return;

    if (!financeData || filterMonth === 'all') {
        snapshotEl.style.display = 'none';
        return;
    }

    const monthObj = financeData.monthly.find(m => m.month === filterMonth);
    if (!monthObj) {
        snapshotEl.style.display = 'none';
        return;
    }

    snapshotEl.style.display = 'block';

    // Update Title
    const titleEl = document.getElementById('snapshot-title');
    if (titleEl) titleEl.textContent = `${getTrans('snapshot_analysis') || 'Análisis de'} ${filterMonth}`;

    // Update Values
    const incomeEl = document.getElementById('month-income');
    const expenseEl = document.getElementById('month-expense');
    const balanceEl = document.getElementById('month-balance');

    // Trending Calculations
    const currentIdx = financeData.monthly.findIndex(m => m.month === filterMonth);
    const prevMonth = financeData.monthly[currentIdx + 1]; // Data is sorted by date desc

    const updateTrend = (id, current, previous, inverse = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '';
        if (!previous) return;

        const diff = current - previous;
        const percent = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
        if (Math.abs(percent) < 0.1) return;

        const isPositive = percent > 0;
        const isBetter = inverse ? !isPositive : isPositive;

        const badge = document.createElement('span');
        badge.className = `trend-badge-inline ${isBetter ? 'positive' : 'negative'}`;
        badge.innerHTML = `${isPositive ? '↑' : '↓'} ${Math.abs(percent).toFixed(1)}%`;
        el.appendChild(badge);
    };

    updateTrend('trend-income', monthObj.income, prevMonth?.income);
    updateTrend('trend-expense', monthObj.expense, prevMonth?.expense, true);
    updateTrend('trend-balance', monthObj.balance, prevMonth?.balance);

    if (incomeEl) incomeEl.textContent = formatCurrency(monthObj.income);
    if (expenseEl) expenseEl.textContent = formatCurrency(monthObj.expense);
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(monthObj.balance);
        balanceEl.className = 'snapshot-amount ' + (monthObj.balance >= 0 ? 'positive' : 'negative');
    }

    // Render Top Expenses
    const topListEl = document.getElementById('top-expenses-list');
    if (topListEl) {
        topListEl.innerHTML = '';
        if (monthObj.topExpenses && monthObj.topExpenses.length > 0) {
            monthObj.topExpenses.forEach((t, idx) => {
                const item = document.createElement('div');
                item.className = 'snapshot-list-item';
                item.style.animationDelay = `${idx * 0.05}s`;

                const left = document.createElement('div');
                left.className = 'snapshot-item-left';
                const catLabel = getTrans(`cat_${t.category}`) || t.category;
                left.innerHTML = `
                    <span class="snapshot-item-title">${t.description}</span>
                    <span class="snapshot-item-subtitle">${catLabel}</span>
                `;

                const right = document.createElement('span');
                right.className = 'snapshot-item-amount';
                right.textContent = formatCurrency(t.amount);

                item.appendChild(left);
                item.appendChild(right);
                topListEl.appendChild(item);
            });
        } else {
            topListEl.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.85rem; text-align: center; padding: 1rem;">No hay gastos registrados</div>`;
        }
    }
};

export const renderRecurringExpenses = (recurring, getTrans) => {
    const list = document.getElementById('recurring-list');
    if (!list) return;

    list.innerHTML = '';
    if (!recurring || recurring.length === 0) {
        list.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-secondary); text-align: center; padding: 2rem;">No se detectaron patrones aún.</div>`;
        return;
    }

    recurring.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recurring-card';
        card.style.animationDelay = `${recurring.indexOf(item) * 0.1}s`;
        card.innerHTML = `
            <div class="recurring-card-header">
                <h4>${item.description}</h4>
                <span class="recurring-category">${getTrans(`cat_${item.category}`) || item.category}</span>
            </div>
            <div class="recurring-card-amount">${formatCurrency(item.avgAmount)}</div>
            <div class="recurring-card-meta">
                <span><b data-i18n="recurring_day">Día estimado:</b> ~${item.avgDay}</span>
                <span><b data-i18n="recurring_freq">Frecuencia:</b> ${item.frequency} meses</span>
            </div>
        `;
        list.appendChild(card);
    });
};

export const renderTopExpensesInModal = (topExpenses, getTrans) => {
    const list = document.getElementById('insights-top-expenses-list');
    if (!list) return;

    list.innerHTML = '';
    if (!topExpenses || topExpenses.length === 0) {
        list.innerHTML = `<div style="color: var(--text-secondary); text-align: center; padding: 1rem;">No hay gastos relevantes.</div>`;
        return;
    }

    topExpenses.forEach((t, idx) => {
        const item = document.createElement('div');
        item.className = 'analytics-item';
        item.style.animationDelay = `${idx * 0.05}s`;
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="color: var(--accent-color); font-weight: 800; font-size: 0.8rem; width: 1.5rem;">#${idx + 1}</span>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600;">${t.description}</span>
                    <span style="font-size: 0.7rem; color: var(--text-secondary);">${t.date} | ${getTrans(`cat_${t.category}`) || t.category}</span>
                </div>
            </div>
            <span class="negative" style="font-weight: 800;">${formatCurrency(t.amount)}</span>
        `;
        list.appendChild(item);
    });
};

export const renderBudgets = (params) => {
    const { financeData, budgets, filterMonth, getTrans, editCallback } = params;
    const container = document.getElementById('budget-status-container');
    if (!container) return;

    if (!financeData || filterMonth === 'all') {
        container.style.display = 'none';
        return;
    }

    const monthObj = financeData.monthly.find(m => m.month === filterMonth);
    if (!monthObj) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0;">${getTrans('budget_title')} (${filterMonth})</h3>
            <button id="edit-budgets-shortcut" class="mini-btn" title="${getTrans('btn_edit')}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">
                ⚙️ ${getTrans('btn_edit')}
            </button>
        </div>
    `;

    const shortcutBtn = container.querySelector('#edit-budgets-shortcut');
    if (shortcutBtn && editCallback) {
        shortcutBtn.addEventListener('click', editCallback);
    }

    const grid = document.createElement('div');
    grid.className = 'budget-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
    grid.style.gap = '1.5rem';

    Object.entries(budgets).forEach(([cat, limit]) => {
        const spent = monthObj.categories.find(c => c.name === cat)?.amount || 0;
        const percent = Math.min(100, (spent / limit) * 100);
        const isOver = spent > limit;
        const colorClass = isOver ? 'danger' : (percent > 80 ? 'warning' : 'success');

        const item = document.createElement('div');
        item.className = 'budget-item';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                <span style="font-weight: 600;">${getTrans(`cat_${cat}`) || cat}</span>
                <span style="color: var(--text-secondary);">${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
            </div>
            <div class="budget-bar-bg" style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden;">
                <div class="budget-bar-fill ${colorClass}" style="width: ${percent}%; height: 100%; transition: width 0.5s ease; ${isOver ? 'background: var(--danger-color);' : (percent > 80 ? 'background: #facc15;' : 'background: var(--success-color);')}"></div>
            </div>
            <div style="text-align: right; font-size: 0.75rem; margin-top: 0.3rem; color: ${isOver ? 'var(--danger-color)' : 'var(--text-secondary)'}">
                ${isOver ? getTrans('budget_exceeded') || '¡Excedido!' : `${percent.toFixed(0)}% ${getTrans('budget_used')}`}
            </div>
        `;
        grid.appendChild(item);
    });

    container.appendChild(grid);
};

export const renderTransactions = (params) => {
    const {
        filtered,
        currentPage,
        itemsPerPage,
        getTrans,
        deleteCallback,
        editCallback,
        pageInfoEl,
        prevPageBtn,
        nextPageBtn,
        currentLang
    } = params;

    const transactionsBody = document.getElementById('transactions-body');
    if (!transactionsBody) return;

    transactionsBody.innerHTML = '';

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // Pagination logic
    let page = currentPage;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const displayList = sorted.slice(startIdx, endIdx);

    // Update Pagination UI
    if (pageInfoEl) {
        pageInfoEl.textContent = currentLang === 'es'
            ? `Página ${page} de ${totalPages}`
            : `Page ${page} of ${totalPages}`;
    }
    if (prevPageBtn) prevPageBtn.disabled = page === 1;
    if (nextPageBtn) nextPageBtn.disabled = page === totalPages;

    if (displayList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-secondary);">${getTrans('no_results')}</td>`;
        transactionsBody.appendChild(row);
        return;
    }

    displayList.forEach(t => {
        const row = document.createElement('tr');
        const amountClass = t.amount > 0 ? 'positive' : 'negative';
        const typeKey = t.amount > 0 ? 'type_income' : 'type_expense';

        row.innerHTML = `
            <td data-label="${getTrans('col_date')}">${t.date}</td>
            <td data-label="${getTrans('col_desc')}">${t.description}</td>
            <td data-label="${getTrans('col_amount')}" class="amount ${amountClass}">${formatCurrency(t.amount)}</td>
            <td data-label="${getTrans('col_type')}"><span class="badge ${amountClass}">${getTrans(`cat_${t.category}`) || t.category}</span></td>
            <td data-label="${getTrans('col_action')}" class="col-action">
                <div class="action-wrapper">
                    <button class="action-btn edit" title="${getTrans('btn_edit')}">✏️</button>
                    <button class="action-btn delete" title="${getTrans('btn_delete')}">🗑️</button>
                </div>
            </td>
        `;

        row.querySelector('.edit').addEventListener('click', () => editCallback(t));
        row.querySelector('.delete').addEventListener('click', () => deleteCallback(t.id));
        transactionsBody.appendChild(row);
    });
};

export const updateSortIcons = (sortConfig) => {
    document.querySelectorAll('th.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (!icon) return;

        if (th.dataset.sort === sortConfig.key) {
            icon.textContent = sortConfig.direction === 'asc' ? '↑' : '↓';
            th.classList.add('active-sort');
        } else {
            icon.textContent = '';
            th.classList.remove('active-sort');
        }
    });
};

export const triggerContentAnimation = () => {
    const main = document.getElementById('main-content-area');
    if (!main) return;
    main.classList.remove('content-fade');
    void main.offsetWidth; // Force reflow
    main.classList.add('content-fade');
};
