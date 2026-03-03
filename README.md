# 🏦 Saldo Neto - Finanzas Personales con Privacidad Total

**Saldo Neto** es una herramienta de gestión financiera diseñada para usuarios que valoran su privacidad por encima de todo. A diferencia de otras aplicaciones, **Saldo Neto** no tiene nube ni servidores: todo el procesamiento, almacenamiento y análisis ocurre exclusivamente en tu navegador. Tus datos bancarios nunca salen de tu dispositivo.

## ✨ Filosofía y Diferenciadores

- **Privacidad por Diseño**: Sin registros, sin trackers, sin servidores externos. La base de datos es tu propio navegador (`localStorage`).
- **Enfoque Uruguayo**: Soporte nativo para la importación directa de archivos Excel del **BROU** (e-BROU), manejando automáticamente encabezados y leyendas legales.
- **Bimonetarismo (Próximamente)**: Diseñado pensando en la realidad económica del Río de la Plata.
- **Transparencia Total**: Código abierto y funcional incluso sin conexión a internet.

## 🚀 Características

- 💡 **Inteligencia de Patrones**: Detección automática de gastos recurrentes (suscripciones, servicios) y ranking de mayores consumos mensuales.
- 📊 **Dashboard Dinámico**: Visualización de ingresos, gastos y balance neto con gráficos interactivos.
- 🐜 **Análisis de Gastos Hormiga**: Identificación inteligente de pequeños gastos que drenan tu presupuesto.

## 🛠️ Desarrollo

La aplicación está construida con **JavaScript Vanilla** (ES Modules) para garantizar velocidad y cero dependencias pesadas:

- `main.js`: Punto de entrada e inicialización de la aplicación.
- `data.js`: Motor de procesamiento de datos e importadores (BROU/Excel/CSV).
- `ui.js`: Controladores de la interfaz y renderizado de componentes.
- `charts.js`: Lógica de visualización de gráficos (Chart.js wrapper).
- `storage.js`: Capa de persistencia local.
- `i18n.js`: Sistema de internacionalización (ES/EN).
- `style.css`: Diseño premium, responsivo y con estética glassmorphism.

---
*Hecho con ❤️ por Ignacio Porrini*
