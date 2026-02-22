// DOM Elements
const currentDateEl = document.getElementById('current-date');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');
const monthFilter = document.getElementById('month-filter');
const budgetMonthFilter = document.getElementById('budget-month-filter');
const categoryFilter = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const sidebarCategories = document.getElementById('sidebar-categories');
const langToggle = document.getElementById('lang-toggle');
const csvUpload = document.getElementById('csv-upload');
const brouExcelUpload = document.getElementById('brou-excel-upload');
const jsonRestore = document.getElementById('json-restore');
const clearDataBtn = document.getElementById('clear-data-btn');
const backupBtn = document.getElementById('backup-btn');
const csvExportBtn = document.getElementById('csv-export-btn');
const resumenLink = document.querySelector('a[data-i18n="header_overview"]');
const transactionModal = document.getElementById('transaction-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const openBudgetLink = document.getElementById('open-budget-link');
const closeModalBtn = document.getElementById('close-modal-btn');
const transactionForm = document.getElementById('transaction-form');
const txCatSelect = document.getElementById('tx-cat');
const transactionsBody = document.getElementById('transactions-body');
const monthlyChartCtx = document.getElementById('monthlyChart').getContext('2d');
const categoryChartCtx = document.getElementById('categoryChart').getContext('2d');
const netWorthChartCtx = document.getElementById('netWorthChart').getContext('2d');
const budgetModal = document.getElementById('budget-modal');
const openBudgetModalBtn = document.getElementById('open-budget-modal-btn');
const closeBudgetModalBtn = document.getElementById('close-budget-modal-btn');
const budgetConfigList = document.getElementById('budget-config-list');
const saveAllBudgetsBtn = document.getElementById('save-all-budgets-btn');

const categoryModal = document.getElementById('category-modal');
const manageCategoriesBtn = document.getElementById('manage-categories-btn');
const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');
const categoryManagerList = document.getElementById('category-manager-list');
const addCategoryBtn = document.getElementById('add-category-btn');
const newCategoryInput = document.getElementById('new-category-name');

// Health Metrics Elements
const healthSavingsRateEl = document.getElementById('health-savings-rate');
const healthRunwayEl = document.getElementById('health-runway');
const healthAntExpensesEl = document.getElementById('health-ant-expenses');
const btnResetFilters = document.getElementById('btn-reset-filters');
const filterStatusLabel = document.getElementById('filter-status-label');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfoEl = document.getElementById('page-info');


// State
// financeData is loaded from finance_data.js
let monthlyChart = null;
let categoryChart = null;
let netWorthChart = null;
let currentFinanceData = null;
let transactionCache = []; // Store raw transactions for re-processing
let currentSmartFilter = null; // 'ant-expenses' or null
let currentPage = 1;
const ITEMS_PER_PAGE = 25;
const ANT_THRESHOLD = 150;
const STORAGE_KEY = 'finance_data_v1';
const BUDGET_KEY = 'finance_budgets_v1';
const CAT_CONFIG_KEY = 'finance_categories_v1';
let editingTxId = null; // Track if we are editing

// Default categories and keywords
const DEFAULT_CATEGORIES = {
    'Supermercado': ['DEVOTO', 'GEANT', 'DISCO', 'TATA', 'SUPERMERCADO', 'KINKO', 'FROG', 'SUPER', 'ALMACEN', 'PROVITODO', 'MARKET'],
    'Restaurantes': ['PIZZERIA', 'BAR', 'REST', 'MC DEB', 'BURGER', 'COMIDA', 'PRONTO POLLO', 'LAS DELICIAS', 'RINCON'],
    'Servicios': ['ANTEL', 'MOVISTAR', 'UTE', 'OSE', 'PAGO SERVICIOS', 'PAGO FACTURAS'],
    'Salud': ['FARMACIA', 'FARMASHOP', 'NATURA'],
    'Transporte': ['AXION', 'ANCAP', 'CABIFY', 'UBER', 'ESTACION'],
    'Transferencias': ['TRANSFERENCIA', 'TRF', 'SPI', 'TRASPASO'],
    'Ingresos': ['PAGO PASIVIDADES', 'SUELDO', 'INGRESO']
};

let categoriesConfig = JSON.parse(localStorage.getItem(CAT_CONFIG_KEY)) || { ...DEFAULT_CATEGORIES };

// Persistence Helpers
const saveToLocalStorage = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving to localStorage", e);
    }
};

const loadFromLocalStorage = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Error loading from localStorage", e);
        return null;
    }
};

const saveBudgets = (budgets) => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
};

const loadBudgets = () => {
    const data = localStorage.getItem(BUDGET_KEY);
    return data ? JSON.parse(data) : {};
};

// Translations
const translations = {
    es: {
        header_overview: "Resumen",
        card_income: "Ingresos Totales",
        card_expense: "Gastos Totales",
        card_balance: "Balance Neto",
        chart_title: "Evolución Mensual",
        chart_categories: "Gastos por Categoría",
        table_title: "Transacciones Recientes",
        filter_all: "Todos los Meses",
        col_date: "Fecha",
        col_desc: "Descripción",
        col_amount: "Monto",
        col_type: "Tipo",
        col_action: "Acción",

        // Dynamic
        chart_income: "Ingresos",
        chart_expense: "Gastos",
        type_income: "Ingreso",
        type_expense: "Gasto",
        error_undefined: "Datos no definidos. Verifica finance_data.js",
        error_load: "Error al cargar datos. Ejecuta process_data.py",

        // Categories
        cat_Supermercado: "Supermercado",
        cat_Restaurantes: "Restaurantes",
        cat_Servicios: "Servicios",
        cat_Salud: "Salud",
        cat_Transporte: "Transporte",
        cat_Transferencias: "Transferencias",
        cat_Ingresos: "Ingresos",
        cat_Otros: "Otros",

        btn_import: "Importar CSV",
        btn_import_brou: "Importar Excel BROU",
        btn_clear: "Borrar Todo",
        confirm_clear: "¿Estás seguro de que deseas borrar todos los datos?",
        confirm_delete: "¿Borrar esta transacción?",
        msg_data_cleared: "Datos borrados correctamente",
        error_no_transactions: "No se encontraron transacciones válidas",
        msg_brou_imported: "Excel del BROU importado con éxito",
        filter_all_cats: "Todas las Categorías",
        search_placeholder: "Buscar por descripción...",
        no_results: "No se encontraron transacciones.",
        sidebar_actions: "Acciones",
        sidebar_categories: "Categorías",
        sidebar_menu: "Menú",
        btn_backup: "Exportar Backup (JSON)",
        btn_restore: "Importar Backup",
        btn_csv_export: "Exportar a Excel (CSV)",
        msg_backup_done: "Copia de seguridad descargada",
        msg_restore_done: "Datos restaurados correctamente",
        msg_csv_done: "Archivo CSV generado",
        sidebar_add: "Nueva Transacción",
        form_date: "Fecha",
        form_desc: "Descripción",
        form_amount: "Monto",
        form_type: "Tipo (Ingreso/Gasto)",
        form_cat: "Categoría",
        btn_save: "Guardar",
        btn_cancel: "Cancelar",
        btn_edit: "Editar",
        msg_added: "Transacción guardada con éxito",
        msg_updated: "Transacción actualizada",
        modal_edit_title: "Editar Transacción",
        modal_add_title: "Nueva Transacción",
        budget_title: "Presupuestos por Categoría",
        budget_set: "Definir",
        budget_record: "Meta",
        budget_used: "usado",
        msg_budget_saved: "Presupuestos actualizados",
        budget_period: "Periodo:",
        budget_modal_help: "Define tus límites de gasto mensual por categoría.",
        budget_settings_title: "Ajustar presupuestos",
        chart_net_worth: "Patrimonio Neto (Saldo Acumulado)",
        manage_categories_title: "Gestionar Categorías",
        category_modal_help: "Añade o edita categorías y sus palabras clave para auto-categorización.",
        placeholder_new_cat: "Nombre de la categoría...",
        btn_close: "Cerrar",
        keywords_label: "Palabras clave (separadas por comas):",
        msg_categories_saved: "Categorías actualizadas",
        msg_category_added: "Categoría añadida",
        msg_category_deleted: "Categoría eliminada",
        confirm_delete_cat: "¿Estás seguro de eliminar esta categoría? Las transacciones asociadas pasarás a 'Otros'.",
        vs_last_month: "vs mes anterior",
        btn_delete: "Eliminar",
        metric_savings_rate: "Tasa de Ahorro",
        metric_runway: "Reserva (Días)",
        metric_ant_expenses: "Gastos Hormiga",
        metric_runway_desc: "Días de vida con saldo actual",
        filter_ants_active: "Solo Gastos Hormiga",
        filter_clear_all: "Ver Resumen / Quitar Filtros",
        btn_prev: "Anterior",
        btn_next_pg: "Siguiente"
    },
    en: {
        header_overview: "Overview",
        card_income: "Total Income",
        card_expense: "Total Expenses",
        card_balance: "Net Balance",
        chart_title: "Monthly Overview",
        chart_categories: "Expenses by Category",
        table_title: "Recent Transactions",
        filter_all: "All Months",
        col_date: "Date",
        col_desc: "Description",
        col_amount: "Amount",
        col_type: "Type",
        col_action: "Action",

        // Dynamic
        chart_income: "Income",
        chart_expense: "Expense",
        type_income: "Income",
        type_expense: "Expense",
        error_undefined: "financeData is undefined. Check if finance_data.js is loaded correctly.",
        error_load: "Failed to load finance data. Make sure to run 'process_data.py'.",

        // Categories
        cat_Supermercado: "Supermarket",
        cat_Restaurantes: "Restaurants",
        cat_Servicios: "Utilities",
        cat_Salud: "Health",
        cat_Transporte: "Transport",
        cat_Transferencias: "Transfers",
        cat_Ingresos: "Income",
        cat_Otros: "Other",

        btn_import: "Import CSV",
        btn_import_brou: "Import BROU Excel",
        btn_clear: "Clear All",
        confirm_clear: "Are you sure you want to delete all data?",
        confirm_delete: "Delete this transaction?",
        msg_data_cleared: "Data cleared successfully",
        error_no_transactions: "No valid transactions found",
        filter_all_cats: "All Categories",
        search_placeholder: "Search description...",
        no_results: "No transactions found.",
        sidebar_actions: "Actions",
        sidebar_categories: "Categories",
        sidebar_menu: "Menu",
        btn_backup: "Export Backup (JSON)",
        btn_restore: "Import Backup",
        btn_csv_export: "Export to Excel (CSV)",
        msg_backup_done: "Backup downloaded successfully",
        msg_restore_done: "Data restored successfully",
        msg_csv_done: "CSV file generated",
        sidebar_add: "New Transaction",
        form_date: "Date",
        form_desc: "Description",
        form_amount: "Amount",
        form_type: "Type (Income/Expense)",
        form_cat: "Category",
        btn_save: "Save",
        btn_cancel: "Cancel",
        btn_edit: "Edit",
        msg_added: "Transaction saved successfully",
        msg_updated: "Transaction updated",
        modal_edit_title: "Edit Transaction",
        modal_add_title: "New Transaction",
        budget_title: "Category Budgets",
        budget_set: "Set",
        budget_used: "used",
        msg_budget_saved: "Budgets updated",
        budget_period: "Period:",
        budget_modal_help: "Define your monthly spending limits per category.",
        budget_settings_title: "Adjust budgets",
        chart_net_worth: "Net Worth (Accumulated Balance)",
        manage_categories_title: "Manage Categories",
        category_modal_help: "Add or edit categories and their keywords for auto-categorization.",
        placeholder_new_cat: "Category name...",
        btn_close: "Close",
        keywords_label: "Keywords (comma separated):",
        msg_categories_saved: "Categories updated",
        msg_category_added: "Category added",
        msg_category_deleted: "Category deleted",
        confirm_delete_cat: "Are you sure you want to delete this category? Associated transactions will move to 'Other'.",
        vs_last_month: "vs last month",
        btn_delete: "Delete",
        metric_savings_rate: "Savings Rate",
        metric_runway: "Runway (Days)",
        metric_ant_expenses: "Ant Expenses",
        metric_runway_desc: "Days covered by current balance",
        filter_ants_active: "Only Ant Expenses",
        filter_clear_all: "View Summary / Clear Filters",
        btn_prev: "Previous",
        btn_next_pg: "Next"
    }
};

// Current Language (Default to ES)
let currentLang = localStorage.getItem('finance_lang') || 'es';

// Initialize
const init = async () => {
    // Setup Switch state
    langToggle.checked = currentLang === 'en';

    // Add Event Listener
    langToggle.addEventListener('change', (e) => {
        currentLang = e.target.checked ? 'en' : 'es';
        localStorage.setItem('finance_lang', currentLang);
        applyLanguage(currentLang);

        // Re-render components that depend on lang
        if (currentFinanceData) {
            renderDashboard(currentFinanceData);
        }
    });

    // Upload Listener
    if (csvUpload) {
        csvUpload.addEventListener('change', handleFileUpload);
    }

    if (brouExcelUpload) {
        brouExcelUpload.addEventListener('change', handleBROUUpload);
    }

    // Clear Data Listener
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearData);
    }

    // Backup Listener
    if (backupBtn) {
        backupBtn.addEventListener('click', exportBackup);
    }

    // CSV Export Listener
    if (csvExportBtn) {
        csvExportBtn.addEventListener('click', exportCSV);
    }

    // Restore Listener
    if (jsonRestore) {
        jsonRestore.addEventListener('change', importBackup);
    }

    // Resumen Link Listener
    if (btnResetFilters) {
        btnResetFilters.onclick = () => {
            currentSmartFilter = null;
            monthFilter.value = 'all';
            categoryFilter.value = 'all';
            searchInput.value = '';
            filterData();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    if (resumenLink) {
        resumenLink.addEventListener('click', (e) => {
            e.preventDefault();
            currentSmartFilter = null;
            monthFilter.value = 'all';
            categoryFilter.value = 'all';
            searchInput.value = '';
            filterData();
        });
    }

    if (openBudgetLink) {
        openBudgetLink.addEventListener('click', (e) => {
            e.preventDefault();
            openBudgetModal();
        });
    }

    // Modal Listeners
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            editingTxId = null;
            document.getElementById('modal-title').textContent = getTrans('modal_add_title');
            transactionForm.reset();
            transactionModal.classList.add('active');
            // Set default date to today
            document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            transactionModal.classList.remove('active');
        });
    }

    if (transactionForm) {
        transactionForm.addEventListener('submit', handleManualSubmit);
    }

    // Budget Modal Listeners
    if (openBudgetModalBtn) {
        openBudgetModalBtn.addEventListener('click', openBudgetModal);
    }
    if (closeBudgetModalBtn) {
        closeBudgetModalBtn.addEventListener('click', () => budgetModal.classList.remove('active'));
    }
    if (saveAllBudgetsBtn) {
        saveAllBudgetsBtn.addEventListener('click', saveAllBudgets);
    }

    // Category Modal Listeners
    if (manageCategoriesBtn) {
        manageCategoriesBtn.addEventListener('click', openCategoryModal);
    }
    if (closeCategoryModalBtn) {
        closeCategoryModalBtn.addEventListener('click', () => categoryModal.classList.remove('active'));
    }
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', addCategory);
    }

    // Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuBtn && sidebarOverlay && sidebar) {
        const toggleSidebar = () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        };

        mobileMenuBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);

        // Close sidebar when clicking a link (on mobile)
        const sidebarLinks = sidebar.querySelectorAll('.category-link, .upload-btn, .delete-all-btn');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleSidebar();
                }
            });
        });
    }

    // Filter Listeners
    if (monthFilter) {
        monthFilter.addEventListener('change', () => {
            if (budgetMonthFilter) budgetMonthFilter.value = monthFilter.value;
            currentPage = 1; // Reset page on month change
            filterData();
        });
    }
    if (budgetMonthFilter) {
        budgetMonthFilter.addEventListener('change', () => {
            monthFilter.value = budgetMonthFilter.value;
            filterData();
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentPage = 1;
            filterData();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1; // Reset to page 1 on search
            filterData();
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                filterData();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            currentPage++;
            filterData();
        });
    }

    // Apply initial language
    applyLanguage(currentLang);

    // Set Date
    currentDateEl.textContent = new Date().toLocaleDateString(currentLang === 'es' ? 'es-AR' : 'en-US');

    // Load Data Strategy
    const storedData = loadFromLocalStorage();

    if (storedData) {
        console.log("Loaded from LocalStorage");
        currentFinanceData = storedData;
        renderDashboard(storedData);
    } else if (typeof financeData !== 'undefined') {
        // Data loaded from JS file
        console.log("Loaded from Static JS");
        currentFinanceData = financeData;
        renderDashboard(financeData);
    } else {
        // Fallback or error
        console.log("Waiting for data...");
    }
};

// Helper to get translation
const getTrans = (key) => {
    return translations[currentLang][key] || key;
};

// Apply Language to DOM
const applyLanguage = (lang) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translations[lang][key];
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = translations[lang][key];
    });

    // Update date format if already set...
    currentDateEl.textContent = new Date().toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US');

    // Update placeholders
    if (searchInput) {
        searchInput.placeholder = getTrans('search_placeholder');
    }
};

const renderFinancialHealth = (summary, monthlyData, selectedMonth = 'all') => {
    if (!summary || !monthlyData || monthlyData.length === 0) return;

    // 1. Savings Rate (%)
    let targetIncome = summary.total_income;
    let targetExpense = summary.total_expense;

    if (selectedMonth !== 'all') {
        const monthObj = monthlyData.find(m => m.month === selectedMonth);
        if (monthObj) {
            targetIncome = monthObj.income;
            targetExpense = monthObj.expense;
        }
    }

    const savingsRate = targetIncome > 0
        ? ((targetIncome - targetExpense) / targetIncome) * 100
        : 0;

    healthSavingsRateEl.textContent = `${savingsRate.toFixed(1)}%`;
    healthSavingsRateEl.className = savingsRate >= 20 ? 'success' : (savingsRate >= 10 ? 'warning' : 'danger');

    // 2. Financial Runway (Days) - Always Global
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expense, 0);
    const totalMonths = monthlyData.length;
    const avgMonthlyExpense = totalExpenses / (totalMonths || 1);
    const avgDailyExpense = avgMonthlyExpense / 30;

    let runwayDays = 0;
    if (avgDailyExpense > 0) {
        runwayDays = Math.floor(summary.net_balance / avgDailyExpense);
    }

    healthRunwayEl.textContent = runwayDays > 0 ? runwayDays : '0';
    healthRunwayEl.title = getTrans('metric_runway_desc');

    // Status color for runway
    if (runwayDays >= 180) healthRunwayEl.className = 'success'; // 6 months
    else if (runwayDays >= 90) healthRunwayEl.className = 'warning'; // 3 months
    else healthRunwayEl.className = 'danger';

    // 3. Ant Expenses (Gasto Hormiga)
    const targetTxs = selectedMonth === 'all'
        ? transactionCache
        : transactionCache.filter(t => t.date.startsWith(selectedMonth));

    const antTransactions = targetTxs.filter(t => t.amount < 0 && Math.abs(t.amount) < ANT_THRESHOLD);
    const totalAnts = antTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const antCard = healthAntExpensesEl.closest('.health-card');
    if (antCard) {
        antCard.style.cursor = 'pointer';
        antCard.onclick = () => {
            currentSmartFilter = 'ant-expenses';
            filterData();
            // Scroll to table for feedback - FIXED selector
            const targetSection = document.querySelector('.transactions-section');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        };
    }

    healthAntExpensesEl.textContent = formatCurrency(totalAnts);
    const expenseLimit = targetExpense > 0 ? targetExpense : summary.total_expense;
    healthAntExpensesEl.className = totalAnts > (expenseLimit * 0.15) ? 'danger' : (totalAnts > (expenseLimit * 0.05) ? 'warning' : 'success');
};


const renderDashboard = (data) => {
    console.log("Data Loaded:", data);

    // Ensure Transcations have IDs for editing
    data.monthly.forEach(m => {
        m.transactions.forEach((t, i) => {
            if (!t.id) t.id = `legacy-${m.month}-${i}`;
        });
    });
    // Populate cache for editing
    transactionCache = data.monthly.flatMap(m => m.transactions);

    renderSummary(data.summary, data.monthly);
    renderChart(data.monthly);
    renderNetWorthChart(data.monthly);
    renderCategoryChart(data.monthly); // Default 'all'
    renderFinancialHealth(data.summary, data.monthly);
    populateMonthFilter(data.monthly);
    populateCategoryFilter(data.monthly);
    renderSidebarCategories(data.monthly);
    renderMonthlySnapshot(data.monthly, monthFilter.value);
    renderTransactions(data.monthly);
    // Update global reference for filter interaction if needed
    currentFinanceData = data;
};

// Global Filter Helper
const filterData = () => {
    if (!currentFinanceData) return;

    const selectedMonth = monthFilter.value;
    const selectedCat = categoryFilter.value;
    const query = searchInput.value;

    renderTransactions(currentFinanceData.monthly, selectedMonth, selectedCat, query);
    // Note: Category chart only filters by month for now as it shows the split
    renderCategoryChart(currentFinanceData.monthly, selectedMonth);
    renderMonthlySnapshot(currentFinanceData.monthly, selectedMonth);
    renderFinancialHealth(currentFinanceData.summary, currentFinanceData.monthly, selectedMonth);

    // Update Reset Badge visibility
    if (btnResetFilters) {
        if (currentSmartFilter === 'ant-expenses') {
            btnResetFilters.style.display = 'flex';
            filterStatusLabel.textContent = getTrans('filter_ants_active');
        } else if (selectedMonth !== 'all' || selectedCat !== 'all' || query !== '') {
            // Optional: show general clear button? User asked for "Ver resumen" specifically for Ants primarily
            // but let's make it work for general too if it's there.
            btnResetFilters.style.display = 'flex';
            filterStatusLabel.textContent = getTrans('filter_clear_all');
        } else {
            btnResetFilters.style.display = 'none';
        }
    }

    // Sync Sidebar Active State
    document.querySelectorAll('.category-link').forEach(link => {
        link.classList.toggle('active', link.dataset.category === selectedCat);
    });
};

// Format Currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currentLang === 'es' ? 'es-AR' : 'en-US', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(amount);
};

// Value Animation Helper
const animateValue = (element, start, end, duration) => {
    if (start === end) {
        element.textContent = formatCurrency(end);
        return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = progress * (end - start) + start;
        element.textContent = formatCurrency(currentVal);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
};

// Render Summary Cards
const renderSummary = (summary, monthlyData) => {
    // We use data-value to store previous state for animation
    const prevIncome = parseFloat(totalIncomeEl.dataset.value) || 0;
    const prevExpense = parseFloat(totalExpenseEl.dataset.value) || 0;
    const prevBalance = parseFloat(netBalanceEl.dataset.value) || 0;

    animateValue(totalIncomeEl, prevIncome, summary.total_income, 800);
    animateValue(totalExpenseEl, prevExpense, summary.total_expense, 800);
    animateValue(netBalanceEl, prevBalance, summary.net_balance, 800);

    // Save for next update
    totalIncomeEl.dataset.value = summary.total_income;
    totalExpenseEl.dataset.value = summary.total_expense;
    netBalanceEl.dataset.value = summary.net_balance;

    if (summary.net_balance < 0) {
        netBalanceEl.classList.add('negative');
        netBalanceEl.classList.remove('positive');
    } else {
        netBalanceEl.classList.add('positive');
        netBalanceEl.classList.remove('negative');
    }
};

// Render Detailed Monthly Snapshot
const renderMonthlySnapshot = (monthlyData, filterMonth = 'all') => {
    const snapshotEl = document.getElementById('monthly-snapshot');
    if (!snapshotEl) return;

    if (filterMonth === 'all') {
        snapshotEl.style.display = 'none';
        return;
    }

    snapshotEl.style.display = 'block';
    const monthObj = monthlyData.find(m => m.month === filterMonth);
    const monthIndex = monthlyData.findIndex(m => m.month === filterMonth);
    const previous = monthlyData[monthIndex + 1]; // monthlyData is descending

    if (!monthObj) return;

    document.getElementById('snapshot-title').textContent = `${getTrans('header_overview')} - ${filterMonth}`;

    // Values
    document.getElementById('month-income').textContent = formatCurrency(monthObj.income);
    document.getElementById('month-expense').textContent = formatCurrency(monthObj.expense);
    document.getElementById('month-balance').textContent = formatCurrency(monthObj.balance);

    // Color Balance
    const balanceEl = document.getElementById('month-balance');
    balanceEl.classList.toggle('negative', monthObj.balance < 0);
    balanceEl.classList.toggle('positive', monthObj.balance >= 0);

    // Trends
    if (previous) {
        updateTrendBadge(document.getElementById('trend-income'), monthObj.income, previous.income);
        updateTrendBadge(document.getElementById('trend-expense'), monthObj.expense, previous.expense, true);
        updateTrendBadge(document.getElementById('trend-balance'), monthObj.balance, previous.balance);
    } else {
        document.getElementById('trend-income').innerHTML = '';
        document.getElementById('trend-expense').innerHTML = '';
        document.getElementById('trend-balance').innerHTML = '';
    }
};

// Trend Badge Helper
const updateTrendBadge = (container, current, previous, invert = false) => {
    let badge = container.querySelector('.trend-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'trend-badge';
        container.appendChild(badge);
    }

    if (!previous || previous === 0) {
        badge.style.display = 'none';
        return;
    }

    const delta = ((current - previous) / previous) * 100;
    const isUp = delta > 0;
    const absDelta = Math.abs(delta).toFixed(1);

    let isGood = isUp;
    if (invert) isGood = !isUp;

    badge.style.display = 'inline-flex';
    badge.className = `trend-badge ${isGood ? 'good' : 'bad'}`;
    badge.innerHTML = `
        <span class="trend-icon">${isUp ? '↑' : '↓'}</span>
        <span class="trend-text">${absDelta}% ${getTrans('vs_last_month')}</span>
    `;
};

// Render Monthly Chart
const renderChart = (monthlyData) => {
    // Data is sorted descending (newest first). Reverse for chart to show time progression left-to-right.
    const sortedForChart = [...monthlyData].reverse();

    const labels = sortedForChart.map(m => m.month);
    const incomeData = sortedForChart.map(m => m.income);
    const expenseData = sortedForChart.map(m => m.expense);

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(monthlyChartCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: getTrans('chart_income'),
                    data: incomeData,
                    backgroundColor: '#4ade80',
                    borderRadius: 4,
                },
                {
                    label: getTrans('chart_expense'),
                    data: expenseData,
                    backgroundColor: '#f87171',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const month = labels[index];
                    if (monthFilter) {
                        monthFilter.value = month;
                        filterData();
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                y: {
                    grid: { color: '#334155' },
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 45,
                        padding: 10
                    }
                }
            }
        }
    });
};

const renderNetWorthChart = (monthlyData) => {
    const sortedForChart = [...monthlyData].reverse();
    const labels = sortedForChart.map(m => m.month);

    let runningTotal = 0;
    const netWorthData = sortedForChart.map(m => {
        runningTotal += m.balance;
        return runningTotal;
    });

    if (netWorthChart) netWorthChart.destroy();

    netWorthChart = new Chart(netWorthChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: getTrans('chart_net_worth'),
                data: netWorthData,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#38bdf8'
            }]
        },
        options: {
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const month = labels[index];
                    if (monthFilter) {
                        monthFilter.value = month;
                        filterData();
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: '#334155' },
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 45,
                        padding: 10
                    }
                }
            }
        }
    });
};

// Populate Filter
const populateMonthFilter = (monthlyData) => {
    // Clear existing except first
    const content = `<option value="all" data-i18n="filter_all">${getTrans('filter_all')}</option>`;
    monthFilter.innerHTML = content;
    if (budgetMonthFilter) budgetMonthFilter.innerHTML = content;

    monthlyData.forEach(m => {
        const option = document.createElement('option');
        option.value = m.month;
        option.textContent = m.month;
        monthFilter.appendChild(option);

        if (budgetMonthFilter) {
            const opt2 = option.cloneNode(true);
            budgetMonthFilter.appendChild(opt2);
        }
    });
};

// Populate Category Filter
const populateCategoryFilter = () => {
    if (!categoryFilter) return;

    const categories = Object.keys(categoriesConfig).sort();

    categoryFilter.innerHTML = `<option value="all" data-i18n="filter_all_cats">${getTrans('filter_all_cats')}</option>`;

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = getTrans(`cat_${cat}`) || cat;
        categoryFilter.appendChild(option);
    });

    // Also update Modal Category Dropdown
    if (txCatSelect) {
        txCatSelect.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = getTrans(`cat_${cat}`) || cat;
            txCatSelect.appendChild(option);
        });
        // Add "Otros" if not exists
        if (!categoriesConfig['Otros']) {
            const option = document.createElement('option');
            option.value = 'Otros';
            option.textContent = getTrans('cat_Otros') || 'Otros';
            txCatSelect.appendChild(option);
        }
    }
};

// Render Sidebar Categories
const renderSidebarCategories = () => {
    if (!sidebarCategories) return;

    const categories = Object.keys(categoriesConfig).sort();

    sidebarCategories.innerHTML = '';

    // "All" option
    const allLink = document.createElement('div');
    allLink.className = 'category-link active';
    allLink.dataset.category = 'all';
    allLink.textContent = getTrans('filter_all_cats');
    allLink.onclick = () => {
        currentSmartFilter = null; // Reset smart filter
        categoryFilter.value = 'all';
        filterData();
    };
    sidebarCategories.appendChild(allLink);

    categories.forEach(cat => {
        const link = document.createElement('div');
        link.className = 'category-link';
        link.dataset.category = cat;
        link.textContent = getTrans(`cat_${cat}`) || cat;
        link.onclick = () => {
            currentSmartFilter = null; // Reset smart filter
            categoryFilter.value = cat;
            filterData();
        };
        sidebarCategories.appendChild(link);
    });

    // Add "Otros" if not in config
    if (!categoriesConfig['Otros']) {
        const link = document.createElement('div');
        link.className = 'category-link';
        link.dataset.category = 'Otros';
        link.textContent = getTrans('cat_Otros') || 'Otros';
        link.onclick = () => {
            currentSmartFilter = null; // Reset smart filter
            categoryFilter.value = 'Otros';
            filterData();
        };
        sidebarCategories.appendChild(link);
    }
};

// Consolidated Budget View (Removed from dashboard, only in popup)
const openBudgetModal = () => {
    const budgets = loadBudgets();
    const categories = Object.keys(categoriesConfig).sort();

    // Calculate current spending for progress in modal
    const filterMonth = monthFilter.value;
    const spending = {};
    const filteredTxs = filterMonth === 'all'
        ? transactionCache
        : transactionCache.filter(t => t.date.startsWith(filterMonth));

    filteredTxs.forEach(t => {
        if (t.amount < 0) {
            const exp = Math.abs(t.amount);
            spending[t.category] = (spending[t.category] || 0) + exp;
        }
    });

    budgetConfigList.innerHTML = '';

    Array.from(categories).sort().forEach(cat => {
        if (cat === 'Ingresos') return;

        const spent = spending[cat] || 0;
        const budget = budgets[cat] || 0;
        const percent = budget > 0 ? (spent / budget) * 100 : 0;

        let barClass = '';
        if (percent >= 100) barClass = 'danger';
        else if (percent >= 80) barClass = 'warning';

        const div = document.createElement('div');
        div.className = 'budget-config-item';
        div.innerHTML = `
            <div class="budget-config-header">
                <label>${getTrans(`cat_${cat}`) || cat}</label>
                <div class="budget-config-values" style="font-size: 0.85rem;">
                    <strong>${formatCurrency(spent)}</strong> / 
                    <input type="number" placeholder="0" value="${budget || ''}" data-cat="${cat}">
                </div>
            </div>
            <div class="budget-bar-bg">
                <div class="budget-bar-fill ${barClass}" style="width: ${Math.min(percent, 100)}%"></div>
            </div>
        `;
        budgetConfigList.appendChild(div);
    });

    budgetModal.classList.add('active');
};

const saveAllBudgets = () => {
    const newBudgets = {};
    budgetConfigList.querySelectorAll('input').forEach(input => {
        const cat = input.dataset.cat;
        const val = parseFloat(input.value) || 0;
        if (val > 0) newBudgets[cat] = val;
    });

    saveBudgets(newBudgets);
    showToast(getTrans('msg_budget_saved'), 'success');
    budgetModal.classList.remove('active');
    // Refresh modal if kept open or just close is fine.
};

// Category Management Functions
const openCategoryModal = () => {
    renderCategoryManager();
    categoryModal.classList.add('active');
};

const renderCategoryManager = () => {
    categoryManagerList.innerHTML = '';

    Object.entries(categoriesConfig).sort().forEach(([name, keywords]) => {
        const item = document.createElement('div');
        item.className = 'category-manager-item';

        item.innerHTML = `
            <div class="category-item-header">
                <strong>${name}</strong>
                ${(name !== 'Otros' && name !== 'Ingresos') ? `<button class="btn-icon-delete" onclick="deleteCategory('${name}')" title="${getTrans('btn_delete')}">🗑️</button>` : ''}
            </div>
            <div class="category-item-keywords">
                <label>${getTrans('keywords_label')}</label>
                <textarea onchange="updateCategoryKeywords('${name}', this.value)" placeholder="Palabra1, Palabra2...">${keywords.join(', ')}</textarea>
            </div>
        `;
        categoryManagerList.appendChild(item);
    });
};

const addCategory = () => {
    const name = newCategoryInput.value.trim();
    if (!name) return;

    if (categoriesConfig[name]) {
        showToast(currentLang === 'es' ? 'La categoría ya existe' : 'Category already exists', 'error');
        return;
    }

    categoriesConfig[name] = [];
    newCategoryInput.value = '';
    saveCategories();
    renderCategoryManager();
    // Update other UI
    populateCategoryFilter();
    renderSidebarCategories();
    showToast(getTrans('msg_category_added'), 'success');
};

const deleteCategory = (name) => {
    if (name === 'Otros' || name === 'Ingresos') {
        showToast(currentLang === 'es' ? 'No se puede eliminar esta categoría' : 'Cannot delete this category', 'error');
        return;
    }

    if (!confirm(getTrans('confirm_delete_cat'))) return;

    // Re-map transactions
    transactionCache.forEach(t => {
        if (t.category === name) t.category = 'Otros';
    });

    delete categoriesConfig[name];
    saveCategories();
    reprocessData(); // This will save data and update UI
    renderCategoryManager();
    showToast(getTrans('msg_category_deleted'), 'success');
};

const updateCategoryKeywords = (name, value) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k !== '');
    categoriesConfig[name] = keywords;
    saveCategories();
    showToast(getTrans('msg_categories_saved'), 'success');
};

const saveCategories = () => {
    localStorage.setItem(CAT_CONFIG_KEY, JSON.stringify(categoriesConfig));
};

// Render Category Chart (Doughnut)
const renderCategoryChart = (monthlyData, filterMonth = 'all') => {
    let categories = {}; // { Name: Amount }

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

    // Convert to sorted arrays
    // Sort by amount desc
    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1]);

    const labels = sortedCategories.map(c => getTrans(`cat_${c[0]}`) || c[0]);
    const data = sortedCategories.map(c => c[1].toFixed(2));

    // Colors for categories
    const backgroundColors = [
        '#38bdf8', // Light Blue
        '#4ade80', // Green
        '#facc15', // Yellow
        '#f87171', // Red
        '#a78bfa', // Purple
        '#fb923c', // Orange
        '#cbd5e1', // Slate
        '#94a3b8'  // Gray
    ];

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(categoryChartCtx, {
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
                    if (categoryFilter) {
                        categoryFilter.value = originalCat;
                        filterData();
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 }
                }
            }
        }
    });
};

// Render Transactions
const renderTransactions = (monthlyData, filterMonth = 'all', filterCat = 'all', searchQuery = '') => {
    transactionsBody.innerHTML = '';

    // Flatten transactions or filter
    let transactions = [];

    if (filterMonth === 'all') {
        transactions = monthlyData.flatMap(m => m.transactions);
    } else {
        const monthObj = monthlyData.find(m => m.month === filterMonth);
        if (monthObj) {
            transactions = monthObj.transactions;
        }
    }

    // Apply Multi-Criteria Filters
    const query = searchQuery.toLowerCase().trim();

    const filtered = transactions.filter(t => {
        const matchesCat = filterCat === 'all' || t.category === filterCat;
        const matchesSearch = !query ||
            t.description.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query);

        // Smart Filter: Ant Expenses
        const matchesAnt = currentSmartFilter !== 'ant-expenses' ||
            (t.amount < 0 && Math.abs(t.amount) < ANT_THRESHOLD);

        return matchesCat && matchesSearch && matchesAnt;
    });

    // Sort by date desc
    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination Logic
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    // Ensure currentPage is valid if filter changed
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const displayList = sorted.slice(startIdx, endIdx);

    // Update Pagination UI
    if (pageInfoEl) {
        pageInfoEl.textContent = currentLang === 'es'
            ? `Página ${currentPage} de ${totalPages}`
            : `Page ${currentPage} of ${totalPages}`;
    }
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;

    if (displayList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-secondary); opacity: 0.7;">
            ${getTrans('no_results')}
        </td>`;
        transactionsBody.appendChild(row);
        return;
    }

    displayList.forEach(t => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = t.date;
        dateCell.setAttribute('data-label', getTrans('col_date'));

        const descCell = document.createElement('td');
        descCell.textContent = t.description;
        descCell.setAttribute('data-label', getTrans('col_desc'));

        const amountCell = document.createElement('td');
        const amount = parseFloat(t.amount);
        amountCell.textContent = formatCurrency(amount);
        amountCell.style.color = amount >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        amountCell.setAttribute('data-label', getTrans('col_amount'));

        const typeCell = document.createElement('td');
        typeCell.textContent = getTrans(`type_${t.type}`) || t.type; // "Ingreso" or "Gasto"
        typeCell.style.textTransform = 'capitalize';
        typeCell.setAttribute('data-label', getTrans('col_type'));

        row.appendChild(dateCell);
        row.appendChild(descCell);
        row.appendChild(amountCell);
        row.appendChild(typeCell);

        // Actions
        const actionCell = document.createElement('td');
        actionCell.setAttribute('data-label', getTrans('col_action'));
        const actionWrapper = document.createElement('div');
        actionWrapper.className = 'action-wrapper';

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.className = 'action-btn';
        editBtn.dataset.i18nTitle = 'btn_edit';
        editBtn.title = getTrans('btn_edit');
        editBtn.onclick = () => editTransaction(t.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'action-btn delete';
        deleteBtn.dataset.i18nTitle = 'confirm_delete';
        deleteBtn.title = getTrans('confirm_delete');
        deleteBtn.onclick = () => deleteTransaction(t.id);

        actionWrapper.appendChild(editBtn);
        actionWrapper.appendChild(deleteBtn);
        actionCell.appendChild(actionWrapper);
        row.appendChild(actionCell);

        transactionsBody.appendChild(row);
    });
};

const editTransaction = (id) => {
    const tx = transactionCache.find(t => t.id === id);
    if (!tx) return;

    editingTxId = id;
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.textContent = getTrans('modal_edit_title');

    document.getElementById('tx-date').value = tx.date;
    document.getElementById('tx-desc').value = tx.description;
    document.getElementById('tx-amount').value = Math.abs(tx.amount);
    document.getElementById('tx-cat').value = tx.category;

    transactionModal.classList.add('active');
};



// Data Management Functions
const clearData = () => {
    if (confirm(getTrans('confirm_clear'))) {
        currentFinanceData = null;
        localStorage.removeItem(STORAGE_KEY);
        transactionCache = []; // Clear cache

        // Reset UI
        totalIncomeEl.textContent = formatCurrency(0);
        totalExpenseEl.textContent = formatCurrency(0);
        netBalanceEl.textContent = formatCurrency(0);

        if (monthlyChart) monthlyChart.destroy();
        if (categoryChart) categoryChart.destroy();

        document.getElementById('transactions-body').innerHTML = '';
        monthFilter.innerHTML = `<option value="all" data-i18n="filter_all">${getTrans('filter_all')}</option>`;
        if (categoryFilter) categoryFilter.innerHTML = `<option value="all" data-i18n="filter_all_cats">${getTrans('filter_all_cats')}</option>`;
        if (searchInput) searchInput.value = '';
        document.getElementById('current-date').textContent = '--/--/----';

        showToast(getTrans('msg_data_cleared'), 'success');
    }
};

const exportBackup = () => {
    if (!currentFinanceData) return;
    const blob = new Blob([JSON.stringify(currentFinanceData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CuentasClaras_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(getTrans('msg_backup_done'), 'success');
};

const exportCSV = () => {
    if (!transactionCache || transactionCache.length === 0) return;

    // CSV Header
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category'];
    const rows = transactionCache.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.type,
        t.category
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CuentasClaras_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(getTrans('msg_csv_done'), 'success');
};

const importBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.summary && data.monthly) {
                currentFinanceData = data;
                saveToLocalStorage(data);
                renderDashboard(data);
                showToast(getTrans('msg_restore_done'), 'success');
            } else {
                showToast('Formato de archivo inválido', 'error');
            }
        } catch (err) {
            showToast('Error al leer el archivo', 'error');
        }
    };
    reader.readAsText(file);
};

const deleteTransaction = (id) => {
    if (!confirm(getTrans('confirm_delete'))) return;

    // Find transaction in cache
    const index = transactionCache.findIndex(t => t.id === id);
    if (index === -1) return;

    // Remove
    transactionCache.splice(index, 1);

    // Re-aggregate
    reprocessData();
};

const handleManualSubmit = (e) => {
    e.preventDefault();

    const date = document.getElementById('tx-date').value;
    const description = document.getElementById('tx-desc').value;
    let amount = parseFloat(document.getElementById('tx-amount').value);
    const category = document.getElementById('tx-cat').value;

    if (!date || !description || isNaN(amount)) return;

    // Logic: In our system, Ingresos are > 0, anything else <= 0 is expense
    if (category !== 'Ingresos' && amount > 0) {
        amount = -amount;
    } else if (category === 'Ingresos' && amount < 0) {
        amount = Math.abs(amount);
    }

    if (editingTxId) {
        // Update existing
        const index = transactionCache.findIndex(t => t.id === editingTxId);
        if (index !== -1) {
            transactionCache[index] = {
                ...transactionCache[index],
                date,
                description,
                amount,
                type: amount < 0 ? 'expense' : 'income',
                category
            };
            showToast(getTrans('msg_updated'), 'success');
        }
    } else {
        // Add new
        const newTx = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            date: date,
            description: description,
            amount: amount,
            type: amount < 0 ? 'expense' : 'income',
            category: category
        };
        transactionCache.push(newTx);
        showToast(getTrans('msg_added'), 'success');
    }

    reprocessData();

    // Reset and close
    transactionForm.reset();
    editingTxId = null;
    transactionModal.classList.remove('active');
};

const reprocessData = () => {
    // Re-run aggregation on transactionCache
    // This duplicates logic from processCSVData a bit, but is safer than trying to mutate the nested data structure

    const byMonth = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactionCache.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM

        if (!byMonth[monthKey]) {
            byMonth[monthKey] = { income: 0, expense: 0, transactions: [], categories: {} };
        }

        if (t.amount > 0) {
            byMonth[monthKey].income += t.amount;
            totalIncome += t.amount;
        } else {
            const exp = Math.abs(t.amount);
            byMonth[monthKey].expense += exp;
            totalExpense += exp;

            byMonth[monthKey].categories[t.category] = (byMonth[monthKey].categories[t.category] || 0) + exp;
        }

        byMonth[monthKey].transactions.push(t);
    });

    const monthlyData = Object.keys(byMonth).sort().reverse().map(m => {
        const data = byMonth[m];

        const catList = Object.entries(data.categories)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        return {
            month: m,
            income: data.income,
            expense: data.expense,
            balance: data.income - data.expense,
            transactions: data.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
            categories: catList
        };
    });

    const newData = {
        summary: {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_balance: totalIncome - totalExpense
        },
        monthly: monthlyData
    };

    window.financeData = newData; // Backward compatibility
    currentFinanceData = newData;
    saveToLocalStorage(newData);
    renderDashboard(newData);
};

// BROU Excel Parsing Logic
const handleBROUUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        processBROUExcelData(workbook);
    };
    reader.readAsArrayBuffer(file);
};

const processBROUExcelData = (workbook) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to 2D array
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("Processing BROU Excel. Total rows found:", rawRows.length);

    // Find Header Row (where "Fecha" AND "Concepto" exist)
    let headerIndex = -1;
    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (row && row.length > 3) { // Require at least 4 columns for a real table
            const rowStr = row.join(' ').toLowerCase();
            const hasFecha = rowStr.includes('fecha') || rowStr.includes('f. mov');
            const hasConcepto = rowStr.includes('concepto') || rowStr.includes('asunto') || rowStr.includes('descripcion');

            if (hasFecha && hasConcepto) {
                headerIndex = i;
                break;
            }
        }
    }

    if (headerIndex === -1) {
        console.error("Could not find header row in Excel");
        showToast(getTrans('error_no_transactions'), 'error');
        return;
    }

    const rawHeaders = Array.from(rawRows[headerIndex] || []).map(h => h ? h.toString().trim() : '');
    console.log("Detected headers:", rawHeaders);

    const norm = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    // Map columns identifying by keywords (normalized)
    const colMap = {
        date: rawHeaders.findIndex(h => norm(h).includes('fecha') || norm(h).includes('f. mov')),
        desc: rawHeaders.findIndex(h => norm(h).includes('descripcion') || norm(h).includes('concepto') || norm(h).includes('asunto') || norm(h).includes('detalle')),
        debit: rawHeaders.findIndex(h => norm(h).includes('debito')),
        credit: rawHeaders.findIndex(h => norm(h).includes('credito'))
    };

    console.log("Column Mapping:", colMap);

    const dataRows = rawRows.slice(headerIndex + 1);
    const transactions = [];

    dataRows.forEach((row, idx) => {
        if (!row || row.length < 2) return;

        const dateRaw = row[colMap.date];
        if (!dateRaw) return;

        let dateStr = '';
        if (typeof dateRaw === 'string') {
            const parts = dateRaw.split('/');
            if (parts.length === 3) {
                // Handle DD/MM/YYYY or DD/MM/YY
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                let year = parts[2];
                if (year.length === 2) year = '20' + year;
                dateStr = `${year}-${month}-${day}`;
            }
        } else if (dateRaw instanceof Date) {
            dateStr = dateRaw.toISOString().split('T')[0];
        } else if (typeof dateRaw === 'number') {
            // Excel numeric date (offset from 1899-12-30)
            const date = new Date(Math.round((dateRaw - 25569) * 864e5));
            if (!isNaN(date.getTime())) dateStr = date.toISOString().split('T')[0];
        }

        if (!dateStr || isNaN(new Date(dateStr).getTime())) return;

        const description = (row[colMap.desc] || '').toString().trim();

        // Skip footer or invalid lines
        if (description.length > 250 || description.toLowerCase().includes('el brou no se responsabiliza')) return;
        if (!description && !row[colMap.debit] && !row[colMap.credit]) return;

        const parseExcelAmount = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                // Remove thousands separator (dot) and change decimal separator (comma) to dot
                // Standard BROU XLS format: 1.234,56
                const clean = val.replace(/\./g, '').replace(',', '.').trim();
                return parseFloat(clean) || 0;
            }
            return 0;
        };

        const debit = parseExcelAmount(row[colMap.debit]);
        const credit = parseExcelAmount(row[colMap.credit]);
        const amount = credit - debit;

        if (amount === 0 && !description) return;

        let category = getCategory(description);
        if (amount > 0 && category === 'Otros') category = 'Ingresos';

        transactions.push({
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            date: dateStr,
            description: description,
            amount: amount,
            type: amount < 0 ? 'expense' : 'income',
            category: category
        });
    });

    if (transactions.length === 0) {
        console.warn("No transactions were validated in the process");
        showToast(getTrans('error_no_transactions'), 'error');
        return;
    }

    console.log(`Successfully parsed ${transactions.length} transactions`);
    transactionCache = transactions;
    reprocessData();
    showToast(getTrans('msg_brou_imported'), 'success');
};

// CSV Parsing Logic
const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const processedData = processCSVData(text);
        if (processedData) {
            window.financeData = processedData; // Backward compatibility
            currentFinanceData = processedData;
            saveToLocalStorage(processedData);
            renderDashboard(processedData);
            showToast(currentLang === 'es' ? 'Datos importados correctamente' : 'Data imported successfully', 'success');
        }
    };
    reader.readAsText(file, 'ISO-8859-1'); // Latin-1
};

const getCategory = (description) => {
    const desc = description.toUpperCase();

    for (const [cat, keywords] of Object.entries(categoriesConfig)) {
        if (keywords.some(k => desc.includes(k.toUpperCase()))) return cat;
    }
    return 'Otros';
};

const processCSVData = (csvText) => {
    const lines = csvText.split('\n');
    const transactions = [];

    lines.forEach(line => {
        if (!line.trim() || line.split(';').length < 5) return;

        const cols = line.split(';').map(c => c.trim());

        // Parse Date d/m/y
        const dateParts = cols[0].split('/');
        if (dateParts.length !== 3) return;
        // ISO Date YYYY-MM-DD
        const dateStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // Skip invalid dates
        if (isNaN(new Date(dateStr).getTime())) return;

        const description = cols[1];

        // Amount Parsing: 1.000,00 -> 1000.00
        const parseAmount = (str) => {
            if (!str) return 0;
            return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        };

        // Based on known structure: Col 6 Debit, Col 7 Credit
        // Adjust if needed, this mimics the python script logic
        let debit = 0;
        let credit = 0;

        if (cols.length > 6) debit = parseAmount(cols[6]);
        if (cols.length > 7) credit = parseAmount(cols[7]);

        const amount = credit - debit;
        let category = getCategory(description);

        if (amount > 0 && category === 'Otros') category = 'Ingresos';

        transactions.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9), // Unique ID
            date: dateStr,
            description: description,
            amount: amount,
            type: amount < 0 ? 'expense' : 'income',
            category: category
        });
    });

    if (transactions.length === 0) {
        showToast(getTrans('error_no_transactions'), 'error');
        return null;
    }

    // Cache for editing
    transactionCache = transactions;

    // Aggregation Logic (Ported from Python)
    const byMonth = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM

        if (!byMonth[monthKey]) {
            byMonth[monthKey] = { income: 0, expense: 0, transactions: [], categories: {} };
        }

        if (t.amount > 0) {
            byMonth[monthKey].income += t.amount;
            totalIncome += t.amount;
        } else {
            const exp = Math.abs(t.amount);
            byMonth[monthKey].expense += exp;
            totalExpense += exp;

            byMonth[monthKey].categories[t.category] = (byMonth[monthKey].categories[t.category] || 0) + exp;
        }

        byMonth[monthKey].transactions.push(t);
    });

    // Formatting Output
    const monthlyData = Object.keys(byMonth).sort().reverse().map(m => {
        const data = byMonth[m];

        const catList = Object.entries(data.categories)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        return {
            month: m,
            income: data.income,
            expense: data.expense,
            balance: data.income - data.expense,
            transactions: data.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
            categories: catList
        };
    });

    return {
        summary: {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_balance: totalIncome - totalExpense
        },
        monthly: monthlyData
    };
};

// Toast Notification Logic
const showToast = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
};

// Run
init();
