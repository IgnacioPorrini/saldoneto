// data.js - Data processing and aggregation logic

export const DEFAULT_CATEGORIES = {
    'Supermercado': ['DEVOTO', 'GEANT', 'DISCO', 'TATA', 'SUPERMERCADO', 'KINKO', 'FROG', 'SUPER', 'ALMACEN', 'PROVITODO', 'MARKET', 'MACRO'],
    'Restaurantes': ['PIZZERIA', 'BAR', 'REST', 'MC DEB', 'BURGER', 'COMIDA', 'PRONTO POLLO', 'LAS DELICIAS', 'RINCON', 'PEDIDOSYA'],
    'Servicios': ['ANTEL', 'MOVISTAR', 'UTE', 'OSE', 'PAGO SERVICIOS', 'PAGO FACTURAS', 'ABITAB', 'RED PAGOS'],
    'Salud': ['FARMACIA', 'FARMASHOP', 'NATURA', 'MEDICA', 'MUTUALISTA'],
    'Transporte': ['AXION', 'ANCAP', 'CABIFY', 'UBER', 'ESTACION', 'PEAJE', 'PISO'],
    'Transferencias': ['TRANSFERENCIA', 'TRF', 'SPI', 'TRASPASO'],
    'Ingresos': ['PAGO PASIVIDADES', 'SUELDO', 'INGRESO', 'DEPOSITO']
};

export let transactionCache = [];
export let currentFinanceData = null;

export const setTransactionCache = (data) => {
    transactionCache = data;
};

export const setCurrentFinanceData = (data) => {
    currentFinanceData = data;
};

export const generateTxHash = (tx) => {
    if (!tx) return '';
    const cleanDesc = (tx.description || '').trim().toUpperCase();
    const cleanAmount = parseFloat(tx.amount || 0).toFixed(2);
    const date = tx.date || '';
    return `${date}|${cleanDesc}|${cleanAmount}`;
};

export const getCategory = (description, categoriesConfig) => {
    if (!description) return 'Otros';
    const desc = description.toUpperCase();
    for (const [cat, keywords] of Object.entries(categoriesConfig)) {
        if (keywords.some(k => desc.includes(k.toUpperCase()))) return cat;
    }
    return 'Otros';
};

export const detectRecurringExpenses = (transactions) => {
    const expenses = transactions.filter(t => t.amount < 0);
    const groups = {};

    // Group by normalized description
    expenses.forEach(t => {
        const normDesc = t.description.toUpperCase()
            .replace(/\d+/g, '') // Remove numbers (like invoice IDs)
            .replace(/\s+/g, ' ')
            .trim();

        if (normDesc.length < 3) return;

        if (!groups[normDesc]) groups[normDesc] = [];
        groups[normDesc].push(t);
    });

    const recurring = [];
    Object.entries(groups).forEach(([desc, txs]) => {
        if (txs.length < 2) return;

        // Check months distribution
        const months = [...new Set(txs.map(t => t.date.substring(0, 7)))];
        if (months.length < 2) return;

        // Calculate average amount
        const avgAmount = txs.reduce((sum, t) => sum + t.amount, 0) / txs.length;

        // Calculate average day of month
        const days = txs.map(t => parseInt(t.date.substring(8, 10)));
        const avgDay = Math.round(days.reduce((sum, d) => sum + d, 0) / days.length);

        // Consistency check: are amounts similar? (80% similarity)
        const amountVariation = txs.every(t => Math.abs(t.amount - avgAmount) < Math.abs(avgAmount * 0.3));

        if (amountVariation) {
            recurring.push({
                description: desc,
                avgAmount: Math.abs(avgAmount),
                avgDay,
                frequency: months.length,
                lastDate: txs.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date,
                category: txs[0].category
            });
        }
    });

    return recurring.sort((a, b) => b.avgAmount - a.avgAmount);
};

export const reprocessData = (cache, categoriesConfig) => {
    const byMonth = {};
    let totalIncome = 0;
    let totalExpense = 0;

    if (!cache || cache.length === 0) {
        return {
            summary: { total_income: 0, total_expense: 0, net_balance: 0 },
            monthly: [],
            recurring: []
        };
    }

    cache.forEach(t => {
        const monthKey = (t.date && t.date.length >= 7) ? t.date.substring(0, 7) : 'Unknown';
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
            const catName = t.category || 'Otros';
            byMonth[monthKey].categories[catName] = (byMonth[monthKey].categories[catName] || 0) + exp;
        }
        byMonth[monthKey].transactions.push(t);
    });

    const monthlyData = Object.keys(byMonth).sort().reverse().map(m => {
        const d = byMonth[m];
        const catList = Object.entries(d.categories)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        return {
            month: m,
            income: d.income,
            expense: d.expense,
            balance: d.income - d.expense,
            transactions: d.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
            topExpenses: d.transactions
                .filter(t => t.amount < 0)
                .sort((a, b) => a.amount - b.amount) // More negative first
                .slice(0, 5),
            categories: catList
        };
    });

    const recurring = detectRecurringExpenses(cache);

    return {
        summary: {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_balance: totalIncome - totalExpense
        },
        monthly: monthlyData,
        recurring
    };
};

const parseDateStr = (str) => {
    if (!str) return null;
    const clean = str.trim();
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.substring(0, 10);

    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = clean.split(/[/-]/);
    if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) { // YYYY/MM/DD
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
        } else { // DD/MM/YYYY
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
            if (year.length === 2) year = '20' + year;
        }
        const iso = `${year}-${month}-${day}`;
        if (!isNaN(new Date(iso).getTime())) return iso;
    }

    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

const cleanAmountStr = (val, delimiter) => {
    if (typeof val === 'number') return val;
    let s = String(val).trim();
    if (!s || s === '-' || s === '0') return 0;

    // Remove currency symbols, thousands separators and spaces
    // First, remove anything that isn't a digit, comma, dot, or minus sign
    s = s.replace(/[^0-9,.-]/g, '');

    // Now decide how to handle dots and commas
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');

    if (lastComma > lastDot) {
        // Comma is likely the decimal separator (e.g. 1.234,56 or 1234,56)
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // Dot is likely the decimal separator (e.g. 1,234.56 or 1234.56)
        s = s.replace(/,/g, '');
    } else if (lastComma !== -1 && lastDot === -1) {
        // Only a comma exists. Could be decimal (123,45) or thousands (123,456)
        // If there are exactly 2 digits after it, assume decimal
        const parts = s.split(',');
        if (parts[parts.length - 1].length === 2) {
            s = s.replace(',', '.');
        } else {
            s = s.replace(',', '');
        }
    }

    return parseFloat(s) || 0;
};

export const processCSVData = (csvText, categoriesConfig) => {
    if (!csvText || !csvText.trim()) return [];

    const cleanText = csvText.replace(/^\uFEFF/, '').trim();
    const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];

    const splitLine = (line, delim) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === delim && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else cur += char;
        }
        result.push(cur.trim());
        return result;
    };

    const sample = lines.slice(0, 10).join('\n');
    const csvDelimiter = (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ';' : ',';

    const norm = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "") : "";

    let headerIndex = -1;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const row = splitLine(lines[i], csvDelimiter);
        if (row && row.length >= 3) {
            const rowStr = row.join(' ').toLowerCase();
            if ((rowStr.includes('fecha') || rowStr.includes('f. mov')) &&
                (rowStr.includes('descripcion') || rowStr.includes('asunto') || rowStr.includes('concepto'))) {
                headerIndex = i;
                break;
            }
        }
    }

    if (headerIndex === -1) headerIndex = 0;

    const rawHeaders = splitLine(lines[headerIndex], csvDelimiter).map(h => h.trim());
    console.log('[CSV-IMPORT] Headers recognized:', rawHeaders);

    const colMap = {
        date: rawHeaders.findIndex(h => norm(h).includes('fecha') || norm(h).includes('fmov')),
        desc: rawHeaders.findIndex(h => norm(h).includes('descripcion') || norm(h).includes('descrip') || norm(h).includes('concepto') || norm(h).includes('asunto')),
        debit: rawHeaders.findIndex(h => norm(h).includes('debito') || h.toLowerCase().includes('d' + String.fromCharCode(233) + 'bito')), // backup for decoding
        credit: rawHeaders.findIndex(h => norm(h).includes('credito') || h.toLowerCase().includes('cr' + String.fromCharCode(233) + 'dito')),
        amount: rawHeaders.findIndex(h => (norm(h).includes('monto') || norm(h).includes('importe')) && !norm(h).includes('saldo'))
    };

    console.log('[CSV-IMPORT] Column Mapping:', colMap);

    const parseAmount = (val) => {
        if (!val) return 0;
        let s = val.toString().trim();
        // Remove everything except numbers, comma, dot and minus
        s = s.replace(/[^0-9,.-]/g, '');
        if (!s || s === '-') return 0;

        const lastDot = s.lastIndexOf('.');
        const lastComma = s.lastIndexOf(',');

        if (lastComma > lastDot) {
            // Comma is decimal separator (1.234,56 -> 1234.56)
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (lastDot > lastComma) {
            // Dot is decimal separator (1,234.56 -> 1234.56)
            s = s.replace(/,/g, '');
        } else if (lastComma !== -1) {
            // Only a comma (123,45 -> 123.45)
            const parts = s.split(',');
            if (parts[parts.length - 1].length <= 2) s = s.replace(',', '.');
            else s = s.replace(',', '');
        }

        const num = parseFloat(s);
        return isNaN(num) ? 0 : num;
    };

    const existingHashes = new Set(transactionCache.map(t => generateTxHash(t)));
    const transactions = [];
    lines.slice(headerIndex + 1).forEach((line, idx) => {
        const parts = splitLine(line, csvDelimiter);
        if (!parts || parts.length < 2) return;

        const date = parseDateStr(parts[colMap.date]);
        if (!date) return;

        const description = (parts[colMap.desc] || '').trim() || 'Movimiento';

        // Detailed income/expense logic
        const debVal = colMap.debit !== -1 ? Math.abs(parseAmount(parts[colMap.debit])) : 0;
        const creVal = colMap.credit !== -1 ? Math.abs(parseAmount(parts[colMap.credit])) : 0;
        let amount = creVal - debVal;

        // Fallback for banks with single 'Importe' column
        if (amount === 0 && colMap.amount !== -1) {
            amount = parseAmount(parts[colMap.amount]);
        }

        if (idx < 5) {
            console.log(`[CSV-CHECK Row ${idx}] Desc: ${description.substring(0, 20)} | Deb: ${debVal} | Cre: ${creVal} | Final: ${amount}`);
        }

        let category = getCategory(description, categoriesConfig);
        if (amount > 0 && category === 'Otros') category = 'Ingresos';

        const tx = {
            id: `csv-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            date,
            description,
            amount,
            type: amount < 0 ? 'expense' : 'income',
            category
        };

        const hash = generateTxHash(tx);
        if (!existingHashes.has(hash)) {
            transactions.push(tx);
            existingHashes.add(hash); // Avoid duplicates within the same file too
        }
    });

    console.log(`[CSV-IMPORT] Processed ${transactions.length} rows successfully.`);
    return transactions;
};

export const processBROUExcelData = (workbook, categoriesConfig) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let headerIndex = -1;
    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (row && row.length > 3) {
            const rowStr = row.join(' ').toLowerCase();
            const hasFecha = rowStr.includes('fecha') || rowStr.includes('f. mov');
            const hasConcepto = rowStr.includes('concepto') || rowStr.includes('asunto') || rowStr.includes('descripcion');
            if (hasFecha && hasConcepto) {
                headerIndex = i;
                break;
            }
        }
    }

    if (headerIndex === -1) return null;

    const rawHeaders = Array.from(rawRows[headerIndex] || []).map(h => h ? h.toString().trim() : '');
    const norm = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    const colMap = {
        date: rawHeaders.findIndex(h => norm(h).includes('fecha') || norm(h).includes('f. mov')),
        desc: rawHeaders.findIndex(h => norm(h).includes('descripcion') || norm(h).includes('concepto') || norm(h).includes('asunto') || norm(h).includes('detalle')),
        debit: rawHeaders.findIndex(h => norm(h).includes('debito')),
        credit: rawHeaders.findIndex(h => norm(h).includes('credito'))
    };

    const dataRows = rawRows.slice(headerIndex + 1);
    const transactions = [];
    const existingHashes = new Set(transactionCache.map(t => generateTxHash(t)));

    dataRows.forEach((row) => {
        if (!row || row.length < 2) return;
        const dateRaw = row[colMap.date];
        if (!dateRaw) return;

        let dateStr = '';
        if (typeof dateRaw === 'string') {
            const parts = dateRaw.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                let year = parts[2];
                if (year.length === 2) year = '20' + year;
                dateStr = `${year}-${month}-${day}`;
            }
        } else if (dateRaw instanceof Date) {
            dateStr = dateRaw.toISOString().split('T')[0];
        } else if (typeof dateRaw === 'number') {
            const date = new Date(Math.round((dateRaw - 25569) * 864e5));
            if (!isNaN(date.getTime())) dateStr = date.toISOString().split('T')[0];
        }

        if (!dateStr || isNaN(new Date(dateStr).getTime())) return;

        const description = (row[colMap.desc] || '').toString().trim();
        if (description.length > 250 || description.toLowerCase().includes('el brou no se responsabiliza')) return;
        if (!description && !row[colMap.debit] && !row[colMap.credit]) return;

        const parseExcelAmount = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const clean = val.replace(/\./g, '').replace(',', '.').trim();
                return parseFloat(clean) || 0;
            }
            return 0;
        };

        const debit = parseExcelAmount(row[colMap.debit]);
        const credit = parseExcelAmount(row[colMap.credit]);
        const amount = credit - debit;

        if (amount === 0 && !description) return;

        let category = getCategory(description, categoriesConfig);
        if (amount > 0 && category === 'Otros') category = 'Ingresos';

        const tx = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            date: dateStr,
            description,
            amount,
            type: amount < 0 ? 'expense' : 'income',
            category
        };

        const hash = generateTxHash(tx);
        if (!existingHashes.has(hash)) {
            transactions.push(tx);
            existingHashes.add(hash);
        }
    });

    return transactions;
};
