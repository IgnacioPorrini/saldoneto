import csv
import json
import os
from collections import defaultdict
from datetime import datetime

# Configuration
INPUT_FILE = r'data/raw/datos_financieros_personales.csv'
OUTPUT_FILE = r'data/processed/finance_data.json'

def parse_amount(amount_str):
    """Parses amounts like '1.234,56' or '785,90' to float."""
    if not amount_str or amount_str.strip() == '':
        return 0.0
    # Provide cleaning for spaces and remove dots (thousands separator)
    clean_str = amount_str.replace('.', '').replace(',', '.')
    try:
        return float(clean_str)
    except ValueError:
        return 0.0

def parse_date(date_str):
    """Parses date from 'DD/MM/YYYY'."""
    try:
        return datetime.strptime(date_str, '%d/%m/%Y')
    except ValueError:
        return None

def get_category(description):
    """Categorize transaction based on keywords."""
    desc = description.upper()
    
    categories = {
        'Supermercado': ['DEVOTO', 'GEANT', 'DISCO', 'TATA', 'SUPERMERCADO', 'KINKO', 'FROG', 'SUPER', 'ALMACEN', 'PROVITODO', 'MARKET'],
        'Restaurantes': ['PIZZERIA', 'BAR', 'REST', 'MC DEB', 'BURGER', 'COMIDA', 'PRONTO POLLO', 'LAS DELICIAS', 'RINCON'],
        'Servicios': ['ANTEL', 'MOVISTAR', 'UTE', 'OSE', 'PAGO SERVICIOS', 'PAGO FACTURAS'],
        'Salud': ['FARMACIA', 'FARMASHOP', 'NATURA'],
        'Transporte': ['AXION', 'ANCAP', 'CABIFY', 'UBER', 'ESTACION'],
        'Transferencias': ['TRANSFERENCIA', 'TRF', 'SPI', 'TRASPASO'],
        'Ingresos': ['PAGO PASIVIDADES', 'SUELDO', 'INGRESO']
    }
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in desc:
                return category
    
    return 'Otros'

def process_data():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file not found at {INPUT_FILE}")
        return

    transactions = []
    
    with open(INPUT_FILE, mode='r', encoding='latin-1') as f:
        reader = csv.reader(f, delimiter=';')
        
        for row in reader:
            if not row or len(row) < 5: continue
            
            date_val = parse_date(row[0])
            if date_val:
                row = [x.strip() for x in row]
                description = row[1]
                
                debit = 0.0
                credit = 0.0
                
                if len(row) > 6:
                    debit = parse_amount(row[6])
                if len(row) > 7:
                    credit = parse_amount(row[7])
                
                amount = credit - debit
                category = get_category(description)
                
                # Force category for income if amount > 0 and generic
                if amount > 0 and category == 'Otros':
                    category = 'Ingresos'

                transactions.append({
                    'date': date_val.strftime('%Y-%m-%d'),
                    'description': description,
                    'amount': amount,
                    'type': 'expense' if amount < 0 else 'income',
                    'category': category
                })

    # Aggregation
    by_month = defaultdict(lambda: {
        'income': 0.0, 
        'expense': 0.0, 
        'transactions': [],
        'categories': defaultdict(float) # Track expenses by category
    })
    
    total_income = 0.0
    total_expense = 0.0
    
    for t in transactions:
        month_key = t['date'][:7] # YYYY-MM
        
        if t['amount'] > 0:
            by_month[month_key]['income'] += t['amount']
            total_income += t['amount']
        else:
            expense_val = abs(t['amount'])
            by_month[month_key]['expense'] += expense_val
            total_expense += expense_val
            # Add to category (only expenses usually interesting for pie chart)
            by_month[month_key]['categories'][t['category']] += expense_val
            
        by_month[month_key]['transactions'].append(t)

    # Sort months
    sorted_months = sorted(by_month.keys(), reverse=True)
    
    monthly_data = []
    for m in sorted_months:
        data = by_month[m]
        
        # Convert category dict to list for JSON
        category_list = [{'name': k, 'amount': round(v, 2)} for k, v in data['categories'].items()]
        # Sort categories by amount desc
        category_list.sort(key=lambda x: x['amount'], reverse=True)

        monthly_data.append({
            'month': m,
            'income': round(data['income'], 2),
            'expense': round(data['expense'], 2),
            'balance': round(data['income'] - data['expense'], 2),
            'transactions': sorted(data['transactions'], key=lambda x: x['date'], reverse=True),
            'categories': category_list
        })

    output = {
        'summary': {
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'net_balance': round(total_income - total_expense, 2)
        },
        'monthly': monthly_data
    }
    
    # Output as JSON (keep for reference)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        
    # Output as JS for local file access (CORS fix)
    js_output_file = OUTPUT_FILE.replace('.json', '.js')
    json_str = json.dumps(output, indent=2, ensure_ascii=False)
    js_content = f"const financeData = {json_str};"
    
    with open(js_output_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"Successfully processed {len(transactions)} transactions.")
    print(f"Output saved to {OUTPUT_FILE} and {js_output_file}")

if __name__ == '__main__':
    process_data()
