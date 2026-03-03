// main.js - Entry point for CuentasClaras
// Author: Ignacio Porrini
import * as i18n from './i18n.js';
import * as storage from './storage.js';
import * as data from './data.js';
import * as charts from './charts.js';
import * as ui from './ui.js';

// State
let categoriesConfig = storage.loadCategoriesConfig(data.DEFAULT_CATEGORIES);
let currentFinanceData = storage.loadFromLocalStorage();

// Check for global financeData (demo data fallback)
if (!currentFinanceData && typeof window.financeData !== 'undefined') {
    currentFinanceData = window.financeData;
}

let transactions = (currentFinanceData && currentFinanceData.monthly)
    ? currentFinanceData.monthly.flatMap(m => m.transactions)
    : [];
let currentSmartFilter = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 25;
let ANT_THRESHOLD = storage.loadAntThreshold();
let editingTxId = null;
let searchTimeout = null;
let sortConfig = { key: 'date', direction: 'desc' };

const openBudgetModal = (e) => {
    if (e) e.preventDefault();
    const list = document.getElementById('budget-config-list');
    const monthSelect = document.getElementById('budget-month-select');
    if (!list || !monthSelect) return;

    // Populate month select
    monthSelect.innerHTML = '';
    const availableMonths = (currentFinanceData && currentFinanceData.monthly)
        ? currentFinanceData.monthly.map(m => m.month)
        : [];

    availableMonths.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        monthSelect.appendChild(opt);
    });

    // Sync with dashboard filter
    const dashboardMonth = document.getElementById('month-filter')?.value;
    if (dashboardMonth && dashboardMonth !== 'all' && availableMonths.includes(dashboardMonth)) {
        monthSelect.value = dashboardMonth;
    }

    const refreshBudgetList = () => {
        list.innerHTML = '';
        const budgets = storage.loadBudgets();
        const selectedMonthKey = monthSelect.value;
        const monthObj = currentFinanceData?.monthly?.find(m => m.month === selectedMonthKey);

        Object.keys(categoriesConfig).sort().forEach(cat => {
            if (cat === 'Ingresos') return;
            const spent = monthObj ? (monthObj.categories.find(c => c.name === cat)?.amount || 0) : 0;
            const budget = budgets[cat] || 0;
            const div = document.createElement('div');
            div.className = 'budget-config-item';
            div.innerHTML = `
                <div class="budget-config-header">
                    <div style="display: flex; flex-direction: column;">
                        <label style="font-weight: 600;">${i18n.getTrans(`cat_${cat}`) || cat}</label>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">${i18n.getTrans('budget_record')}: ${ui.formatCurrency(spent)}</span>
                    </div>
                    <input type="number" value="${budget || ''}" data-cat="${cat}" placeholder="0" style="width: 100px;">
                </div>
            `;
            list.appendChild(div);
        });
    };

    monthSelect.onchange = () => {
        const dashboardMonthFilter = document.getElementById('month-filter');
        if (dashboardMonthFilter) {
            dashboardMonthFilter.value = monthSelect.value;
            filterData();
        }
        refreshBudgetList();
    };

    refreshBudgetList();

    // Populate Ant Threshold in modal
    const modalAntInput = document.getElementById('budget-ant-threshold');
    if (modalAntInput) modalAntInput.value = ANT_THRESHOLD;

    const modal = document.getElementById('budget-modal');
    if (modal) modal.classList.add('active');
};

// DOM References
const getElements = () => ({
    monthFilter: document.getElementById('month-filter'),
    categoryFilter: document.getElementById('category-filter'),
    searchInput: document.getElementById('search-input'),
    minAmountFilter: document.getElementById('min-amount-filter'),
    maxAmountFilter: document.getElementById('max-amount-filter'),
    pageInfoEl: document.getElementById('page-info'),
    prevPageBtn: document.getElementById('prev-page'),
    nextPageBtn: document.getElementById('next-page'),
    typeFilter: document.getElementById('type-filter')
});

let elements = {};

const filterData = () => {
    elements = getElements();
    const { monthFilter, categoryFilter, searchInput, minAmountFilter, maxAmountFilter, pageInfoEl, prevPageBtn, nextPageBtn } = elements;

    if (!monthFilter || !categoryFilter) return;

    const filterMonth = monthFilter.value;
    const filterCat = categoryFilter.value;
    const filterType = document.getElementById('type-filter')?.value || 'all';
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const minAmount = minAmountFilter ? parseFloat(minAmountFilter.value) : NaN;
    const maxAmount = maxAmountFilter ? parseFloat(maxAmountFilter.value) : NaN;

    let filtered = transactions || [];

    if (filterMonth !== 'all') {
        filtered = filtered.filter(t => t.date.startsWith(filterMonth));
    }
    if (filterCat !== 'all') {
        filtered = filtered.filter(t => t.category === filterCat);
    }
    if (filterType === 'debit') {
        filtered = filtered.filter(t => t.amount < 0);
    } else if (filterType === 'credit') {
        filtered = filtered.filter(t => t.amount > 0);
    }
    if (query) {
        filtered = filtered.filter(t => t.description.toLowerCase().includes(query));
    }

    // Absolute Value Filters
    if (!isNaN(minAmount)) {
        filtered = filtered.filter(t => Math.abs(t.amount) >= minAmount);
    }
    if (!isNaN(maxAmount)) {
        filtered = filtered.filter(t => Math.abs(t.amount) <= maxAmount);
    }

    if (currentSmartFilter === 'ant-expenses') {
        filtered = filtered.filter(t => t.amount < 0 && Math.abs(t.amount) <= ANT_THRESHOLD);
    }

    // Sort
    filtered.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'date') {
            valA = new Date(a.date).getTime() || 0;
            valB = new Date(b.date).getTime() || 0;
        } else {
            valA = parseFloat(a.amount) || 0;
            valB = parseFloat(b.amount) || 0;
        }

        const diff = valA - valB;
        return sortConfig.direction === 'asc' ? diff : -diff;
    });

    ui.renderTransactions({
        filtered,
        currentPage,
        itemsPerPage: ITEMS_PER_PAGE,
        getTrans: i18n.getTrans,
        deleteCallback: deleteTransaction,
        editCallback: openEditModal,
        pageInfoEl,
        prevPageBtn,
        nextPageBtn,
        currentLang: i18n.currentLang
    });

    ui.updateHealthPanel(currentFinanceData, ANT_THRESHOLD, i18n.getTrans, filterMonth);
    ui.updateMonthlySnapshot(currentFinanceData, filterMonth, i18n.getTrans);

    const budgets = storage.loadBudgets();
    ui.renderBudgets({
        financeData: currentFinanceData,
        budgets,
        filterMonth,
        getTrans: i18n.getTrans,
        editCallback: openBudgetModal
    });

    if (currentFinanceData && currentFinanceData.monthly) {
        charts.renderCategoryChart(
            document.getElementById('categoryChart').getContext('2d'),
            currentFinanceData.monthly,
            filterMonth,
            i18n.getTrans,
            (cat) => {
                if (categoryFilter) categoryFilter.value = cat;
                filterData();
            }
        );
    }
    ui.triggerContentAnimation();

    // Reset badge visibility logic
    const resetBadge = document.getElementById('btn-reset-filters');
    const badgeLabel = document.getElementById('filter-status-label');
    if (resetBadge && badgeLabel) {
        const anyFilter = filterMonth !== 'all' ||
            filterCat !== 'all' ||
            filterType !== 'all' ||
            query !== '' ||
            !isNaN(minAmount) ||
            !isNaN(maxAmount) ||
            currentSmartFilter !== null;

        resetBadge.style.display = anyFilter ? 'flex' : 'none';
        badgeLabel.textContent = i18n.getTrans('filter_clear_all');
    }
};

const renderDashboard = (financeData) => {
    currentFinanceData = financeData;
    elements = getElements();
    const { monthFilter, categoryFilter, searchInput } = elements;
    if (!financeData || !financeData.summary) {
        const resetVal = ui.formatCurrency(0);
        document.getElementById('total-income').textContent = resetVal;
        document.getElementById('total-expense').textContent = resetVal;
        document.getElementById('net-balance').textContent = resetVal;
        document.getElementById('net-balance').className = 'amount';
        return;
    }

    ui.animateNumber('total-income', financeData.summary.total_income);
    ui.animateNumber('total-expense', financeData.summary.total_expense);
    ui.animateNumber('net-balance', financeData.summary.net_balance);
    document.getElementById('net-balance').className = 'amount ' + (financeData.summary.net_balance >= 0 ? 'positive' : 'negative');

    if (financeData.monthly) {
        charts.renderMonthlyChart(
            document.getElementById('monthlyChart').getContext('2d'),
            financeData.monthly,
            i18n.getTrans,
            (month) => {
                if (monthFilter) monthFilter.value = month;
                filterData();
            }
        );

        charts.renderNetWorthChart(
            document.getElementById('netWorthChart').getContext('2d'),
            financeData.monthly,
            i18n.getTrans
        );
    }

    ui.updateHealthPanel(financeData, ANT_THRESHOLD, i18n.getTrans, monthFilter ? monthFilter.value : 'all');

    const budgets = storage.loadBudgets();
    ui.renderBudgets({
        financeData: financeData,
        budgets,
        filterMonth: monthFilter ? monthFilter.value : 'all',
        getTrans: i18n.getTrans,
        editCallback: openBudgetModal
    });

    // Category active highlighting in filters handled by filterData
    if (categoryFilter) {
        // We ensure the filter value remains consistent
    }

    // Update category filter and form dropdown
    const currentCatValue = categoryFilter ? categoryFilter.value : 'all';
    const catOptions = `<option value="all">${i18n.getTrans('filter_all_cats')}</option>` +
        Object.keys(categoriesConfig).sort().map(cat =>
            `<option value="${cat}">${i18n.getTrans(`cat_${cat}`) || cat}</option>`
        ).join('');

    if (categoryFilter) {
        categoryFilter.innerHTML = catOptions;
        categoryFilter.value = currentCatValue;
    }

    // Calculate Average Monthly Expense
    let avgMonthlyExpense = 0;
    if (financeData.monthly && financeData.monthly.length > 0) {
        const totalExp = financeData.monthly.reduce((sum, m) => sum + m.expense, 0);
        avgMonthlyExpense = totalExp / financeData.monthly.length;
    }
    const avgDisplay = document.getElementById('avg-expense-display');
    if (avgDisplay) {
        ui.animateNumber('avg-expense-display', avgMonthlyExpense);
    }

    const txCat = document.getElementById('tx-cat');
    if (txCat) {
        txCat.innerHTML = Object.keys(categoriesConfig).sort().map(cat =>
            `<option value="${cat}">${i18n.getTrans(`cat_${cat}`) || cat}</option>`
        ).join('');
    }

    // Update Reset Filter Badge
    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
        const isFiltered = (monthFilter && monthFilter.value !== 'all') ||
            (categoryFilter && categoryFilter.value !== 'all') ||
            (searchInput && searchInput.value) ||
            currentSmartFilter;
        resetBtn.style.display = isFiltered ? 'flex' : 'none';
        document.getElementById('filter-status-label').textContent = currentSmartFilter === 'ant-expenses'
            ? i18n.getTrans('filter_ants_active')
            : i18n.getTrans('filter_clear_all');
    }

    filterData();
};

const populateFilters = () => {
    const { monthFilter } = getElements();
    if (!monthFilter) return;

    const currentVal = monthFilter.value;
    // Keep only the "All" option
    monthFilter.innerHTML = `<option value="all">${i18n.getTrans('filter_all')}</option>`;

    if (transactions && transactions.length > 0) {
        const availableMonths = [...new Set(transactions.map(t => (t.date && t.date.length >= 7) ? t.date.substring(0, 7) : null).filter(Boolean))].sort().reverse();
        availableMonths.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            monthFilter.appendChild(opt);
        });
    }

    // Restore value if it still exists
    if ([...monthFilter.options].some(o => o.value === currentVal)) {
        monthFilter.value = currentVal;
    }
};

const refreshData = () => {
    data.setTransactionCache(transactions);
    currentFinanceData = data.reprocessData(transactions, categoriesConfig);
    storage.saveToLocalStorage(currentFinanceData);
    populateFilters();
    renderDashboard(currentFinanceData);
};

const deleteTransaction = (id) => {
    if (confirm(i18n.getTrans('confirm_delete'))) {
        transactions = transactions.filter(t => t.id !== id);
        refreshData();
        ui.showToast(i18n.getTrans('msg_data_cleared'), 'success');
    }
};

const openEditModal = (tx) => {
    editingTxId = tx.id;
    document.getElementById('tx-date').value = tx.date;
    document.getElementById('tx-desc').value = tx.description;
    document.getElementById('tx-amount').value = Math.abs(tx.amount);
    document.getElementById('tx-cat').value = tx.category;
    document.getElementById('modal-title').textContent = i18n.getTrans('modal_edit_title');
    document.getElementById('transaction-modal').classList.add('active');
};

const handleManualSubmit = (e) => {
    e.preventDefault();
    const date = document.getElementById('tx-date').value;
    const description = document.getElementById('tx-desc').value;
    let amount = parseFloat(document.getElementById('tx-amount').value);
    const category = document.getElementById('tx-cat').value;

    if (!date || !description || isNaN(amount)) return;

    if (category !== 'Ingresos' && amount > 0) amount = -amount;
    else if (category === 'Ingresos' && amount < 0) amount = Math.abs(amount);

    if (editingTxId) {
        const idx = transactions.findIndex(t => t.id === editingTxId);
        if (idx !== -1) {
            transactions[idx] = { ...transactions[idx], date, description, amount, category };
        }
        editingTxId = null;
    } else {
        transactions.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            date, description, amount, category,
            type: amount < 0 ? 'expense' : 'income'
        });
    }

    refreshData();
    document.getElementById('transaction-modal').classList.remove('active');
    document.getElementById('transaction-form').reset();
    ui.showToast(i18n.getTrans('msg_added'), 'success');
};

const renderCategoryManager = () => {
    const list = document.getElementById('category-manager-list');
    list.innerHTML = '';
    Object.entries(categoriesConfig).sort().forEach(([name, keywords]) => {
        const item = document.createElement('div');
        item.className = 'category-manager-item';
        item.innerHTML = `
            <div class="category-item-header">
                <strong>${name}</strong>
                ${(name !== 'Otros' && name !== 'Ingresos') ? `<button class="btn-icon-delete" data-cat="${name}" title="${i18n.getTrans('btn_delete')}">🗑️</button>` : ''}
            </div>
            <div class="category-item-keywords">
                <label>${i18n.getTrans('keywords_label')}</label>
                <textarea data-cat="${name}" placeholder="Palabra1, Palabra2...">${keywords.join(', ')}</textarea>
            </div>
        `;
        list.appendChild(item);
    });

    list.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat;
            if (confirm(i18n.getTrans('confirm_delete_cat'))) {
                delete categoriesConfig[cat];
                storage.saveCategoriesConfig(categoriesConfig);
                renderCategoryManager();
                refreshData();
            }
        });
    });

    list.querySelectorAll('textarea').forEach(tx => {
        tx.addEventListener('change', (e) => {
            const cat = tx.dataset.cat;
            categoriesConfig[cat] = e.target.value.split(',').map(s => s.trim()).filter(s => s);
            storage.saveCategoriesConfig(categoriesConfig);
            refreshData();
        });
    });
};

const init = () => {
    try {
        elements = getElements();
        const { monthFilter, categoryFilter, searchInput, minAmountFilter, maxAmountFilter, prevPageBtn, nextPageBtn } = elements;

        ui.applyTranslations(i18n.getTrans);

        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString(i18n.currentLang === 'es' ? 'es-UY' : 'en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // Initial UI state
        const antInput = document.getElementById('ant-threshold-input');
        if (antInput) antInput.value = ANT_THRESHOLD;

        // Populate Filters
        populateFilters();
        data.setTransactionCache(transactions);

        if (currentFinanceData && currentFinanceData.summary) {
            renderDashboard(currentFinanceData);
        } else {
            // Initial render even without data to set up empty state
            filterData();
        }

        // Event Listeners - Safely attached
        if (monthFilter) monthFilter.addEventListener('change', () => { currentPage = 1; filterData(); });
        if (categoryFilter) categoryFilter.addEventListener('change', () => { currentPage = 1; filterData(); });
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentPage = 1;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    filterData();
                }, 250);
            });
        }
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; filterData(); } });
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => { currentPage++; filterData(); });

        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) typeFilter.addEventListener('change', () => { currentPage = 1; filterData(); });

        if (minAmountFilter) minAmountFilter.addEventListener('input', () => { currentPage = 1; filterData(); });
        if (maxAmountFilter) maxAmountFilter.addEventListener('input', () => { currentPage = 1; filterData(); });

        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const sortKey = th.dataset.sort;
                if (sortConfig.key === sortKey) {
                    sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    sortConfig.key = sortKey;
                    sortConfig.direction = 'desc';
                }
                ui.updateSortIcons(sortConfig);
                filterData();
            });
        });

        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.checked = i18n.currentLang === 'en';
            langToggle.addEventListener('change', (e) => {
                i18n.setLanguage(e.target.checked ? 'en' : 'es');
                window.location.reload();
            });
        }

        if (antInput) {
            antInput.addEventListener('change', (e) => {
                ANT_THRESHOLD = parseFloat(e.target.value) || 150;
                storage.saveAntThreshold(ANT_THRESHOLD);
                ui.updateHealthPanel(currentFinanceData, ANT_THRESHOLD, i18n.getTrans);
                filterData();
            });
        }

        // Import listeners
        const brouUpload = document.getElementById('brou-excel-upload');
        if (brouUpload) {
            brouUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const buffer = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(buffer, { type: 'array' });
                        const newTxs = data.processBROUExcelData(workbook, categoriesConfig);

                        if (newTxs && newTxs.length > 0) {
                            transactions = [...transactions, ...newTxs];
                            refreshData();
                            ui.showToast(i18n.getTrans('msg_brou_imported'), 'success');
                            // Auto-close modal
                            const modal = document.getElementById('data-modal');
                            if (modal) modal.classList.remove('active');
                        } else {
                            ui.showToast(i18n.getTrans('error_no_transactions'), 'error');
                        }
                    } catch (err) {
                        console.error('Error processing BROU Excel:', err);
                        ui.showToast('Error parsing Excel', 'error');
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        }

        const csvUpload = document.getElementById('csv-upload');
        if (csvUpload) {
            csvUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target.result;
                    const newTxs = data.processCSVData(text, categoriesConfig);

                    if (newTxs && newTxs.length > 0) {
                        transactions = [...transactions, ...newTxs];
                        refreshData();
                        ui.showToast(`${newTxs.length} ${i18n.getTrans('msg_added')}`, 'success');
                        // Auto-close modal
                        const modal = document.getElementById('data-modal');
                        if (modal) modal.classList.remove('active');
                    } else {
                        ui.showToast(i18n.getTrans('error_no_transactions'), 'error');
                    }
                };
                reader.readAsText(file, 'ISO-8859-1'); // Forces correct encoding for BROU/Latin files
            });
        }

        const clearBtn = document.getElementById('clear-data-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm(i18n.getTrans('confirm_clear'))) {
                    localStorage.clear();
                    window.location.reload();
                }
            });
        }

        const backupBtn = document.getElementById('backup-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                if (!currentFinanceData) return;

                // Create a full package backup
                const fullBackup = {
                    version: '1.1',
                    timestamp: new Date().toISOString(),
                    data: currentFinanceData,
                    categories: categoriesConfig,
                    budgets: storage.loadBudgets(),
                    antThreshold: ANT_THRESHOLD
                };

                const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CuentasClaras_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                ui.showToast(i18n.getTrans('msg_backup_done'), 'success');
            });
        }

        const jsonRestore = document.getElementById('json-restore');
        if (jsonRestore) {
            jsonRestore.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const imported = JSON.parse(event.target.result);

                        // Validate and Restore
                        if (imported.categories) {
                            categoriesConfig = imported.categories;
                            storage.saveCategoriesConfig(categoriesConfig);
                        }
                        if (imported.budgets) {
                            storage.saveBudgets(imported.budgets);
                        }
                        if (imported.antThreshold) {
                            ANT_THRESHOLD = imported.antThreshold;
                            storage.saveAntThreshold(ANT_THRESHOLD);
                        }

                        // Restore Transactions
                        let newTxs = [];
                        if (imported.data && imported.data.monthly) {
                            newTxs = imported.data.monthly.flatMap(m => m.transactions);
                        } else if (Array.isArray(imported)) {
                            // Support legacy format if just an array of transactions
                            newTxs = imported;
                        } else if (imported.transactions) {
                            newTxs = imported.transactions;
                        }

                        if (newTxs.length > 0) {
                            transactions = newTxs;
                            refreshData();
                            ui.showToast(i18n.getTrans('msg_added'), 'success');
                            // Close modal
                            const modal = document.getElementById('data-modal');
                            if (modal) modal.classList.remove('active');
                        } else {
                            ui.showToast(i18n.getTrans('error_no_transactions'), 'error');
                        }
                    } catch (err) {
                        console.error('Backup Restore Failed:', err);
                        ui.showToast('Error al importar backup', 'error');
                    }
                };
                reader.readAsText(file);
            });
        }

        const loadDemoBtn = document.getElementById('load-demo-btn');
        if (loadDemoBtn) {
            loadDemoBtn.addEventListener('click', () => {
                // Use a standard prompt fallback if confirm is weird, or just proceed for testing
                // For now, let's keep confirm but add log
                if (window.confirm(i18n.getTrans('confirm_demo'))) {
                    const demoTxs = data.generateDemoData();

                    // Use push to maintain reference if needed, although reassignment should work
                    transactions.push(...demoTxs);

                    refreshData();
                    ui.showToast(i18n.getTrans('msg_demo_loaded'), 'success');

                    const modal = document.getElementById('data-modal');
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        const openModalBtn = document.getElementById('open-modal-btn');
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                editingTxId = null;
                const form = document.getElementById('transaction-form');
                if (form) form.reset();
                const title = document.getElementById('modal-title');
                if (title) title.textContent = i18n.getTrans('modal_add_title');
                const modal = document.getElementById('transaction-modal');
                if (modal) modal.classList.add('active');
            });
        }

        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('transaction-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        const txForm = document.getElementById('transaction-form');
        if (txForm) txForm.addEventListener('submit', handleManualSubmit);

        const closeCatModalBtn = document.getElementById('close-category-modal-btn');
        if (closeCatModalBtn) {
            closeCatModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('category-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        const antCard = document.getElementById('card-ants');
        if (antCard) {
            antCard.style.cursor = 'pointer';
            antCard.addEventListener('click', () => {
                currentSmartFilter = (currentSmartFilter === 'ant-expenses') ? null : 'ant-expenses';
                currentPage = 1;
                filterData();
            });

            const editAntsBtn = document.getElementById('edit-ants-threshold');
            if (editAntsBtn) {
                editAntsBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Avoid triggering the card filter
                    openBudgetModal(e);
                });
            }
        }

        const resetFiltersBtn = document.getElementById('btn-reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                if (monthFilter) monthFilter.value = 'all';
                if (categoryFilter) categoryFilter.value = 'all';
                if (searchInput) searchInput.value = '';
                if (minAmountFilter) minAmountFilter.value = '';
                if (maxAmountFilter) maxAmountFilter.value = '';
                currentSmartFilter = null;
                currentPage = 1;
                renderDashboard(currentFinanceData);
            });
        }

        const addCatBtn = document.getElementById('add-category-btn');
        if (addCatBtn) {
            addCatBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('new-category-name');
                const name = nameInput ? nameInput.value.trim() : '';
                if (name && !categoriesConfig[name]) {
                    categoriesConfig[name] = [];
                    storage.saveCategoriesConfig(categoriesConfig);
                    if (nameInput) nameInput.value = '';
                    renderCategoryManager();
                    refreshData();
                }
            });
        }

        const manageCatsBtn = document.getElementById('manage-categories-btn');
        if (manageCatsBtn) {
            manageCatsBtn.addEventListener('click', () => {
                renderCategoryManager();
                const modal = document.getElementById('category-modal');
                if (modal) modal.classList.add('active');
            });
        }

        const budgetLink = document.getElementById('open-budget-link');
        if (budgetLink) {
            budgetLink.addEventListener('click', openBudgetModal);
        }

        const saveBudgetsBtn = document.getElementById('save-all-budgets-btn');
        if (saveBudgetsBtn) {
            saveBudgetsBtn.addEventListener('click', () => {
                const newBudgets = {};
                document.querySelectorAll('#budget-config-list input').forEach(input => {
                    const val = parseFloat(input.value) || 0;
                    if (val > 0) newBudgets[input.dataset.cat] = val;
                });
                storage.saveBudgets(newBudgets);

                // Save Ant Threshold from modal too
                const modalAntInput = document.getElementById('budget-ant-threshold');
                if (modalAntInput && !isNaN(parseFloat(modalAntInput.value))) {
                    ANT_THRESHOLD = parseFloat(modalAntInput.value);
                    storage.saveAntThreshold(ANT_THRESHOLD);
                }

                refreshData();
                const modal = document.getElementById('budget-modal');
                if (modal) modal.classList.remove('active');
                ui.showToast(i18n.getTrans('msg_budget_saved'), 'success');
            });
        }

        const closeBudgetModalBtn = document.getElementById('close-budget-modal-btn');
        if (closeBudgetModalBtn) {
            closeBudgetModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('budget-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        // Data Management Modal Logic
        const openDataModalBtn = document.getElementById('open-data-modal-btn');
        if (openDataModalBtn) {
            openDataModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('data-modal');
                if (modal) modal.classList.add('active');
            });
        }

        const closeDataModalBtn = document.getElementById('close-data-modal-btn');
        if (closeDataModalBtn) {
            closeDataModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('data-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        const manageCatsSidebarBtn = document.getElementById('manage-categories-sidebar-btn');
        if (manageCatsSidebarBtn) {
            manageCatsSidebarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                renderCategoryManager();
                const modal = document.getElementById('category-modal');
                if (modal) modal.classList.add('active');
            });
        }

        // Insights Modal Logic
        const insightsLink = document.getElementById('open-insights-link');
        if (insightsLink) {
            insightsLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (!currentFinanceData) return;

                // Render current patterns
                ui.renderRecurringExpenses(currentFinanceData.recurring, i18n.getTrans);

                // Render top expenses for selected month
                const monthFilter = document.getElementById('month-filter');
                const selectedMonth = monthFilter ? monthFilter.value : 'all';
                let topTxs = [];

                if (selectedMonth === 'all') {
                    // Overall top expenses
                    topTxs = transactions
                        .filter(t => t.amount < 0)
                        .sort((a, b) => a.amount - b.amount)
                        .slice(0, 5);
                } else {
                    const monthObj = currentFinanceData.monthly.find(m => m.month === selectedMonth);
                    topTxs = monthObj ? monthObj.topExpenses : [];
                }

                ui.renderTopExpensesInModal(topTxs, i18n.getTrans);

                const modal = document.getElementById('insights-modal');
                if (modal) modal.classList.add('active');
            });
        }

        const closeInsightsBtn = document.getElementById('close-insights-modal-btn');
        if (closeInsightsBtn) {
            closeInsightsBtn.addEventListener('click', () => {
                const modal = document.getElementById('insights-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        // Global Modal Logic: Close on Outside Click & ESC Key
        const closeActiveModal = () => {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        };

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeActiveModal();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeActiveModal();
            }
        });

        // "X" Icons closing logic
        document.querySelectorAll('.modal-close-icon').forEach(btn => {
            btn.addEventListener('click', closeActiveModal);
        });

        // Mobile Menu Toggle Logic
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        const toggleMenu = () => {
            if (sidebar) sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        };

        const closeMenu = () => {
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        };

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMenu);
        }

        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // Auto-close menu when clicking links
        document.querySelectorAll('.sidebar-nav .category-link, .main-action-btn').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeMenu();
                }
            });
        });

    } catch (err) {
        console.error('Initialization failed:', err);
    }
};

document.addEventListener('DOMContentLoaded', init);
