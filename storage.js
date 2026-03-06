// storage.js - LocalStorage helpers and keys

export const STORAGE_KEY = 'finance_data_v1';
export const BUDGET_KEY = 'finance_budgets_v1';
export const CAT_CONFIG_KEY = 'finance_categories_v1';
export const ANT_KEY = 'finance_ant_threshold_v1';

export const saveToLocalStorage = (data) => {
    try {
        if (!data || !data.monthly) {
            console.warn("Attempted to save invalid or empty dashboard data.");
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving to localStorage", e);
    }
};

export const loadFromLocalStorage = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Error loading from localStorage", e);
        return null;
    }
};

export const saveBudgets = (budgets) => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
};

export const loadBudgets = () => {
    try {
        const data = localStorage.getItem(BUDGET_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error loading budgets', e);
        return {};
    }
};

export const saveCategoriesConfig = (config) => {
    localStorage.setItem(CAT_CONFIG_KEY, JSON.stringify(config));
};

export const loadCategoriesConfig = (defaults) => {
    try {
        const data = localStorage.getItem(CAT_CONFIG_KEY);
        return data ? JSON.parse(data) : { ...defaults };
    } catch (e) {
        console.error('Error loading categories config', e);
        return { ...defaults };
    }
};

export const saveAntThreshold = (val) => {
    localStorage.setItem(ANT_KEY, val);
};

export const loadAntThreshold = () => {
    return parseFloat(localStorage.getItem(ANT_KEY)) || 150;
};
