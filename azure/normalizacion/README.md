# Sistema de Normalización de Productos

Sistema de clustering jerárquico para normalización y estandarización de descripciones de productos en facturas.

## Características

- **Procesamiento ETL**: Parsing inteligente de facturas con rescate automático de datos numéricos
- **Análisis de Frecuencia**: Categorización Pareto de productos por volumen
- **Clustering Jerárquico**: 4 niveles de agrupación con algoritmos de similitud avanzados
- **Alto Rendimiento**: Usa `rapidfuzz` para cálculo eficiente de similitud textual
- **Tolerancia a Orden**: `token_sort_ratio` agrupa descripciones independientemente del orden de palabras

## Instalación

```bash
pip install -r requirements.txt
```

## Uso Básico

### 1. Desde Python

```python
from normalizacion.main import normalizar_productos

# Ejecutar normalización
df_resultado = normalizar_productos(
    archivo_entrada="facturas_input.xlsx",
    archivo_salida="facturas_normalizadas.xlsx",
    hoja_entrada='Datos',
    columna_descripcion='Descripcion',
    columna_cantidad='Cantidad',
    umbrales_clustering=[85, 75, 65, 55]
)
```

### 2. Desde línea de comandos

```bash
cd normalizacion
python main.py
```

**Nota:** Edita las constantes `ARCHIVO_ENTRADA` y `ARCHIVO_SALIDA` en el bloque `if __name__ == "__main__"`.

## Formato del Archivo de Entrada

El archivo Excel debe tener las siguientes columnas:

- **Columna A (Info)**: String concatenado con formato: `"Tipo - Num - Fecha - Proveedor - OC"`
  - Ejemplo: `"FC - 0001-12345678 - 2024-01-15 - COCA COLA SA - OC001"`

- **Descripcion**: Texto del producto (ej: "COCA COLA LIGHT 500ML PACK X6")
- **Cantidad**: Unidades (ej: 100)
- **Precio_Unitario**: Precio por unidad (ej: 150.50)
- **Subtotal**: Total de la línea (ej: 15050.00)

## Algoritmo de Rescate Numérico

Si **falta 1** de los 3 valores numéricos, se calcula automáticamente:

- **Falta Cantidad** → `Cantidad = Subtotal / Precio_Unitario`
- **Falta Precio** → `Precio_Unitario = Subtotal / Cantidad`
- **Falta Subtotal** → `Subtotal = Cantidad * Precio_Unitario`

Si **faltan 2 o más** valores → el registro se marca como **"Insalvable"**.

## Clustering Jerárquico (4 Niveles)

El algoritmo agrupa descripciones en 4 niveles de abstracción:

| Nivel | Umbral | Descripción |
|-------|--------|-------------|
| **Nivel 1** | > 85% | Agrupación más granular (variantes mínimas) |
| **Nivel 2** | > 75% | Subfamilias de productos |
| **Nivel 3** | > 65% | Familias amplias |
| **Nivel 4** | > 55% | Categorías generales |

### Ejemplo de Agrupación

```
Descripción Original              → Familia_N1              → Familia_N2         → ...
----------------------------------------------------------------------------------
COCA COLA 500ML PACK X6           → COCA COLA 500ML PACK X6 → COCA COLA 500ML    → ...
COCA-COLA 500ML PACK 6 UNID       → COCA COLA 500ML PACK X6 → COCA COLA 500ML    → ...
COCA COLA LIGHT 500 ML PACK 6     → COCA COLA LIGHT 500ML   → COCA COLA 500ML    → ...
```

## Salida del Proceso

El archivo Excel generado contiene 3 hojas:

### 1. **Procesados**
Todas las columnas originales + columnas agregadas:

- `tipo`, `numero`, `fecha`, `proveedor`, `orden_compra` (parseadas)
- `Frecuencia`, `Categoria_Pareto` (análisis de frecuencia)
- `Familia_N1`, `Familia_N2`, `Familia_N3`, `Familia_N4` (clustering)

### 2. **Insalvables**
Registros que no pudieron ser rescatados (faltan 2+ valores numéricos).

### 3. **Resumen**
Métricas del proceso:

- Total de registros
- Registros procesados vs insalvables
- Descripciones únicas
- Cantidad de familias por nivel

## Parámetros Avanzados

```python
normalizar_productos(
    archivo_entrada="facturas.xlsx",          # Path del Excel de entrada
    archivo_salida="resultado.xlsx",          # Path del Excel de salida
    hoja_entrada='Datos',                     # Nombre de la hoja
    columna_descripcion='Descripcion',        # Columna con descripciones
    columna_cantidad='Cantidad',              # Columna con cantidades
    umbrales_clustering=[85, 75, 65, 55],    # Umbrales por nivel
    generar_insalvables=True                  # Crear hoja de insalvables
)
```

## Rendimiento

El algoritmo está optimizado para grandes volúmenes:

- Usa `rapidfuzz` (C++) en lugar de `difflib` (Python puro) → **10-50x más rápido**
- `token_sort_ratio` tolera palabras desordenadas sin perder rendimiento
- Barras de progreso con `tqdm` para monitoreo en tiempo real

### Tiempos Estimados (CPU i5 moderna)

| Descripciones Únicas | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 | Total |
|----------------------|---------|---------|---------|---------|-------|
| 1,000                | 10s     | 5s      | 3s      | 2s      | 20s   |
| 5,000                | 3min    | 1min    | 45s     | 30s     | 5min  |
| 10,000               | 10min   | 4min    | 2min    | 1min    | 17min |

## Estructura del Código

```
normalizacion/
├── __init__.py               # Inicialización del módulo
├── main.py                   # Script principal (este archivo)
└── README.md                 # Documentación
```

### Módulos Internos

1. **ETL** (`procesar_facturas_con_auditoria`)
   - Carga de Excel
   - Parsing de columna concatenada
   - Rescate numérico

2. **Análisis Pareto** (`analisis_pareto`)
   - Cálculo de frecuencias
   - Categorización por volumen

3. **Clustering** (`clustering_jerarquico`)
   - Algoritmo de agrupación en cascada
   - 4 niveles de abstracción

4. **Pipeline** (`normalizar_productos`)
   - Orquestación de módulos
   - Generación de salidas

## Troubleshooting

### Error: "No se encuentra el archivo"
- Verifica que la ruta sea correcta
- Usa rutas absolutas si es necesario

### Error: "Columna 'Descripcion' no encontrada"
- Ajusta el parámetro `columna_descripcion` al nombre real de tu columna

### El proceso es muy lento
- Reduce el conjunto de datos para pruebas
- Los umbrales más bajos (Nivel 4) tardan más por tener que comparar más elementos

### Los clusters no agrupan como esperaba
- Ajusta los umbrales de similitud
- Para agrupaciones más estrictas → aumenta los umbrales (ej: [90, 80, 70, 60])
- Para agrupaciones más flexibles → disminuye los umbrales (ej: [80, 70, 60, 50])

## Mejoras Futuras

- [ ] Paralelización con `multiprocessing`
- [ ] Integración con Streamlit para UI web
- [ ] Exportación a múltiples formatos (CSV, Parquet)
- [ ] Cache de similitudes para re-ejecuciones
- [ ] Clustering incremental (para nuevos datos)

## Licencia

Uso interno - Sistema de Normalización de Productos

---

**Autor**: Sistema de Normalización
**Fecha**: 2025-01-26
**Versión**: 1.0.0
