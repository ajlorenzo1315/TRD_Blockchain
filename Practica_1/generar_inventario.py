
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "Practica_1" / "INVENTARIO_CODIGO.md"

IGNORAR = {
    ".git", "node_modules", ".venv", "venv",
    "artifacts", "cache", "build", "dist",
    "coverage", "__pycache__"
}

EXTENSIONES = {".sol", ".js", ".ts", ".jsx", ".tsx", ".py"}

def archivos():
    for ruta in sorted(ROOT.rglob("*")):
        if not ruta.is_file():
            continue
        if any(parte in IGNORAR for parte in ruta.relative_to(ROOT).parts):
            continue
        if ruta.suffix in EXTENSIONES:
            yield ruta

def analizar_solidity(contenido):
    patrones = {
        "Contratos": r"\b(?:abstract\s+)?contract\s+(\w+)",
        "Interfaces": r"\binterface\s+(\w+)",
        "Funciones": r"\bfunction\s+(\w+)",
        "Eventos": r"\bevent\s+(\w+)",
        "Modificadores": r"\bmodifier\s+(\w+)",
        "Estructuras": r"\bstruct\s+(\w+)",
    }
    return {
        nombre: sorted(set(re.findall(patron, contenido)))
        for nombre, patron in patrones.items()
    }

lineas = [
    "# Inventario automático del código",
    "",
    "Documento generado a partir de los archivos existentes.",
    "",
]

for ruta in archivos():
    relativa = ruta.relative_to(ROOT)
    contenido = ruta.read_text(encoding="utf-8", errors="replace")

    lineas += [f"## `{relativa.as_posix()}`", ""]

    if ruta.suffix == ".sol":
        for categoria, elementos in analizar_solidity(contenido).items():
            if elementos:
                lineas.append(
                    f"**{categoria}:** " + ", ".join(
                        f"`{elemento}`" for elemento in elementos
                    )
                )
                lineas.append("")

    elif "test" in ruta.name.lower() or "spec" in ruta.name.lower():
        lineas += ["Archivo de pruebas identificado.", ""]

    else:
        lineas += [f"Archivo fuente: `{ruta.suffix}`", ""]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text("\n".join(lineas), encoding="utf-8")

print(f"Inventario generado: {OUTPUT.relative_to(ROOT)}")
