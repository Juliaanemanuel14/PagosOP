"""
Módulo de normalización de productos para integración con Streamlit.
Usa tabla auxiliar con fuzzy matching para normalizar nombres de productos.
"""

import pandas as pd
import os
from typing import Optional, Tuple
from pathlib import Path
from rapidfuzz import fuzz, process
import streamlit as st


# Path a la tabla auxiliar (relativo al proyecto)
BASE_DIR = Path(__file__).parent
TABLA_AUXILIAR_PATH = os.path.join(BASE_DIR, "tabla_normalizacion.xlsx")


@st.cache_data(ttl=3600)  # Cache por 1 hora
def cargar_tabla_normalizacion(archivo_path: str = TABLA_AUXILIAR_PATH) -> Optional[pd.DataFrame]:
    """
    Carga la tabla de normalización desde Excel.
    Usa cache de Streamlit para no recargar en cada request.

    Args:
        archivo_path: Path al archivo Excel con tabla de normalización

    Returns:
        DataFrame con columnas 'Nombre Gestion' y 'Base', o None si hay error
    """
    try:
        if not Path(archivo_path).exists():
            st.warning(f"⚠️ No se encuentra la tabla de normalización en: {archivo_path}")
            return None

        df_aux = pd.read_excel(archivo_path)

        # Validar columnas
        if 'Nombre Gestion' not in df_aux.columns or 'Base' not in df_aux.columns:
            st.error(f"❌ La tabla debe tener columnas 'Nombre Gestion' y 'Base'")
            return None

        # Limpiar datos
        df_aux['Nombre Gestion'] = df_aux['Nombre Gestion'].astype(str).str.strip()
        df_aux['Base'] = df_aux['Base'].astype(str).str.strip()

        # Eliminar filas vacías
        df_aux = df_aux[
            (df_aux['Nombre Gestion'].notna()) &
            (df_aux['Nombre Gestion'] != '') &
            (df_aux['Base'].notna()) &
            (df_aux['Base'] != '')
        ].copy()

        return df_aux

    except Exception as e:
        st.error(f"❌ Error al cargar tabla de normalización: {e}")
        return None


def normalizar_descripcion(
    descripcion: str,
    tabla_aux: pd.DataFrame,
    umbral_similitud: int = 75
) -> Tuple[str, float, str]:
    """
    Normaliza una descripción individual usando fuzzy matching.

    Args:
        descripcion: Texto a normalizar
        tabla_aux: DataFrame con tabla de normalización
        umbral_similitud: Umbral mínimo de similitud (0-100)

    Returns:
        Tupla (descripcion_normalizada, similitud, metodo)
    """
    if pd.isna(descripcion) or str(descripcion).strip() == '':
        return '', 0, 'Sin descripción'

    desc_limpia = str(descripcion).strip()

    # Crear diccionario de mapeo
    mapa = dict(zip(tabla_aux['Nombre Gestion'], tabla_aux['Base']))
    variantes = list(mapa.keys())

    # 1. Buscar coincidencia exacta (case-insensitive)
    for variante in variantes:
        if desc_limpia.upper() == variante.upper():
            return mapa[variante], 100.0, 'Exacta'

    # 2. Fuzzy matching con token_sort_ratio
    resultado = process.extractOne(
        desc_limpia,
        variantes,
        scorer=fuzz.token_sort_ratio
    )

    if resultado and resultado[1] >= umbral_similitud:
        mejor_match, similitud, _ = resultado
        return mapa[mejor_match], float(similitud), 'Fuzzy'

    # 3. Sin match suficiente - mantener original
    return desc_limpia, float(resultado[1]) if resultado else 0.0, 'Sin match'


def normalizar_dataframe(
    df: pd.DataFrame,
    columna_descripcion: str = 'Descripcion',
    umbral_similitud: int = 75,
    agregar_columnas_debug: bool = False
) -> pd.DataFrame:
    """
    Normaliza un DataFrame completo agregando columna de productos normalizados.

    Args:
        df: DataFrame con los datos a normalizar
        columna_descripcion: Nombre de la columna con descripciones
        umbral_similitud: Umbral mínimo de similitud (0-100)
        agregar_columnas_debug: Si True, agrega columnas Similitud_Match y Metodo_Match

    Returns:
        DataFrame con columna 'Producto_Normalizado' agregada
    """
    # Cargar tabla de normalización
    tabla_aux = cargar_tabla_normalizacion()

    if tabla_aux is None or len(tabla_aux) == 0:
        # Si no hay tabla, devolver el DataFrame original sin normalizar
        df['Producto_Normalizado'] = df.get(columna_descripcion, '')
        return df

    # Verificar que existe la columna de descripción
    if columna_descripcion not in df.columns:
        st.warning(f"⚠️ Columna '{columna_descripcion}' no encontrada. No se normalizará.")
        df['Producto_Normalizado'] = ''
        return df

    # Normalizar cada descripción
    resultados = df[columna_descripcion].apply(
        lambda x: normalizar_descripcion(x, tabla_aux, umbral_similitud)
    )

    # Desempaquetar resultados
    df['Producto_Normalizado'] = resultados.apply(lambda x: x[0])

    if agregar_columnas_debug:
        df['Similitud_Match'] = resultados.apply(lambda x: x[1])
        df['Metodo_Match'] = resultados.apply(lambda x: x[2])

    return df


def mostrar_estadisticas_normalizacion(df: pd.DataFrame):
    """
    Muestra estadísticas de la normalización en Streamlit.

    Args:
        df: DataFrame con normalización aplicada
    """
    if 'Metodo_Match' not in df.columns:
        return

    st.markdown("### 📊 Estadísticas de Normalización")

    col1, col2, col3 = st.columns(3)

    with col1:
        exactas = (df['Metodo_Match'] == 'Exacta').sum()
        porcentaje = (exactas / len(df)) * 100 if len(df) > 0 else 0
        st.metric(
            "✅ Coincidencias Exactas",
            f"{exactas}",
            f"{porcentaje:.1f}%"
        )

    with col2:
        fuzzy = (df['Metodo_Match'] == 'Fuzzy').sum()
        porcentaje = (fuzzy / len(df)) * 100 if len(df) > 0 else 0
        st.metric(
            "🔍 Fuzzy Match",
            f"{fuzzy}",
            f"{porcentaje:.1f}%"
        )

    with col3:
        sin_match = (df['Metodo_Match'] == 'Sin match').sum()
        porcentaje = (sin_match / len(df)) * 100 if len(df) > 0 else 0
        st.metric(
            "⚠️ Sin Match",
            f"{sin_match}",
            f"{porcentaje:.1f}%"
        )

    if 'Similitud_Match' in df.columns:
        similitud_promedio = df['Similitud_Match'].mean()
        st.info(f"**Similitud Promedio:** {similitud_promedio:.1f}%")
