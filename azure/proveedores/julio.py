# proveedores/julio.py
# -*- coding: utf-8 -*-
"""
Extractor de facturas para Julio - Procesamiento de facturas con formato específico
"""

import fitz  # PyMuPDF
import re
from typing import Dict

PATTERNS = [
    r"(?i)\bJULIO\b",
    r"FACTURA",
    r"ORIGINAL"
]


def _clean(s: str) -> str:
    """Limpia espacios en blanco de un string."""
    return (s or "").strip()


def _num(s: str) -> str:
    """
    Normaliza números en formato AR:
    - quita $, espacios, separadores de miles y textos extra
    - convierte coma decimal a punto
    Devuelve string numérico (p.ej. '1234567.89')
    """
    if s is None:
        return "0.00"
    s = str(s)
    s = re.sub(r"[^\d,.\-]", "", s)  # dejo solo dígitos, coma, punto y signo
    s = s.replace(".", "")           # saco puntos de miles
    s = s.replace(",", ".")          # paso coma decimal a punto
    m = re.findall(r"-?\d+(?:\.\d+)?", s)
    return m[0] if m else "0.00"


def _search_first(pattern: str, text: str, flags=re.IGNORECASE | re.MULTILINE | re.DOTALL, default: str = "") -> str:
    """Busca el primer match de un patrón en el texto."""
    m = re.search(pattern, text, flags)
    return _clean(m.group(1)) if m else default


def get_pdf_text(pdf_bytes: bytes) -> str:
    """
    Extrae solo el texto de la primera página (ORIGINAL) del PDF
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        # Solo leer la primera página (página 0)
        if len(doc) > 0:
            texto = doc[0].get_text("text")
            # Verificar que sea la página ORIGINAL
            if "ORIGINAL" in texto:
                return texto
            else:
                # Si la primera página no dice ORIGINAL, buscar en todas
                for page in doc:
                    texto = page.get_text("text")
                    if "ORIGINAL" in texto:
                        return texto
                # Si no encuentra ORIGINAL, retornar la primera página de todos modos
                return doc[0].get_text("text")
        return ""
    finally:
        doc.close()


def parse_factura(pdf_bytes: bytes, filename: str) -> Dict[str, str]:
    """
    Extrae los datos principales de la factura en una sola línea (sin desglosar items)

    Args:
        pdf_bytes: Contenido del PDF en bytes
        filename: Nombre del archivo

    Returns:
        Dict con los datos extraídos de la factura
    """
    texto = get_pdf_text(pdf_bytes)

    datos: Dict[str, str] = {}
    datos["Archivo_PDF"] = filename

    # Razón Social (Emisor) - Línea 3 del texto (después de "ORIGINAL")
    lines = texto.split('\n')
    datos["Razon_Social"] = _clean(lines[2]) if len(lines) > 2 else ""

    # Punto de Venta y Comp. Nro - están en líneas consecutivas, seguidas de los dos números
    # Formato:
    # Punto de Venta:
    # Comp. Nro:
    # 00002
    # 00000402
    match_pto_comp = re.search(r"Punto\s+de\s+Venta:\s*\n\s*Comp\.\s+Nro:\s*\n\s*(\d+)\s*\n\s*(\d+)", texto, re.IGNORECASE)
    if match_pto_comp:
        datos["Punto_de_Venta"] = _clean(match_pto_comp.group(1))
        datos["Comp_Nro"] = _clean(match_pto_comp.group(2))
    else:
        datos["Punto_de_Venta"] = ""
        datos["Comp_Nro"] = ""

    # Apellido y Nombre / Razón Social (Cliente/Receptor)
    match_cliente_pos = re.search(r"Apellido\s+y\s+Nombre\s+/\s+Raz[oó]n\s+Social:", texto, re.IGNORECASE)
    if match_cliente_pos:
        start = match_cliente_pos.end()
        rest_text = texto[start:start+500]
        # Buscar un nombre (letras mayúsculas seguidas de más texto)
        match_nombre = re.search(r"\n([A-Z][A-Z\s\.]+(?:S\.A\.|S\.R\.L\.|S\.A\.S\.))\s*\n", rest_text)
        if match_nombre:
            datos["Cliente_Razon_Social"] = _clean(match_nombre.group(1))
        else:
            datos["Cliente_Razon_Social"] = ""
    else:
        datos["Cliente_Razon_Social"] = ""

    # --- Totales ---
    # Los valores están en la línea siguiente a la etiqueta
    datos["Importe_Neto_Gravado"] = _num(_search_first(r"Importe\s+Neto\s+Gravado:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["IVA_27"] = _num(_search_first(r"IVA\s+27%:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["IVA_21"] = _num(_search_first(r"IVA\s+21%:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["IVA_10_5"] = _num(_search_first(r"IVA\s+10\.5%:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["IVA_5"] = _num(_search_first(r"IVA\s+5%:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["IVA_2_5"] = _num(_search_first(r"IVA\s+2\.5%:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["IVA_0"] = _num(_search_first(r"IVA\s+0%:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["Importe_Otros_Tributos"] = _num(_search_first(r"Importe\s+Otros\s+Tributos:\s*\$?\s*\n\s*([\d\.,]+)", texto))
    datos["Importe_Total"] = _num(_search_first(r"Importe\s+Total:\s*\$?\s*\n\s*([\d\.,]+)", texto))

    return datos
