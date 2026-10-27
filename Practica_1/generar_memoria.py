#!/usr/bin/env python3
"""Genera una memoria PDF de Practica_1 a partir del repositorio.

pip install reportlab pillow
python generar_memoria.py --repo . --autor 'Nombre Apellidos' --include-images
"""
from __future__ import annotations

import argparse
import csv
import html
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image, KeepTogether, PageBreak, Paragraph, Preformatted,
    SimpleDocTemplate, Spacer, Table, TableStyle,
)

TECHNIQUES = {
    'V0Base': 'Línea base de referencia',
    'V1Roles': 'Gestión y comprobación de roles',
    'V2Errores': 'Errores personalizados (custom errors)',
    'V3Storage': 'Optimización de accesos a storage',
    'V4Unchecked': 'Operaciones unchecked cuando es seguro',
    'V5Combinada': 'Combinación de optimizaciones anteriores',
    'V6SinId': 'Eliminar el ID redundante de la estructura',
    'V7LotePacked': 'Empaquetado de campos del lote',
    'V8HistorialPacked': 'Empaquetado del historial',
    'V9TransferenciaCompacta': 'Transferencia compacta y origen derivado',
    'V10PackingCombinado': 'Combinación de optimizaciones de packing',
    'V11SoloEventos': 'Historial mediante eventos; cambia la API de consulta',
    'V12EventosCompacta': 'Eventos y empaquetado combinados',
}

TESTS = {
    'ComparacionPermisos.test.js': 'Roles manuales frente a AccessControl',
    'FourVariantsParity.test.js': 'Equivalencia entre cuatro implementaciones',
    'FuncionalidadCompartida.test.js': 'Operaciones comunes y restricciones',
    'GasComparison.test.js': 'Comparación de consumo de gas',
    'GasExperiments.test.js': 'Microoptimizaciones y coste de despliegue',
    'GasLabExtended.test.js': 'Escenarios de GasLab V0–V12',
    'GasLabInvariants.test.js': 'Invariantes funcionales y de seguridad',
    'HistorialCustodia.test.js': 'Historial de custodia',
    'LoteSinId.test.js': 'Variantes sin ID redundante',
    'OptimizedParity.test.js': 'Paridad entre variantes optimizadas',
    'PharmaGasLab.test.js': 'Pruebas experimentales de gas',
    'VariantCatalog.test.cjs': 'Catálogo de variantes',
}

REFERENCES = [
    ('TRD_Blockchain — repositorio del trabajo',
     'https://github.com/ajlorenzo1315/TRD_Blockchain',
     'Código, pruebas, documentación y resultados del proyecto.'),
    ('CryptoZombies — curso interactivo', 'https://cryptozombies.io/',
     'Material de aprendizaje para el ejercicio E1.'),
    ('Solidity — documentación oficial', 'https://docs.soliditylang.org/',
     'Lenguaje, estructuras, herencia, eventos y seguridad.'),
    ('Solidity — optimizador',
     'https://docs.soliditylang.org/en/latest/internals/optimizer.html',
     'Optimizaciones del compilador y generación de bytecode.'),
    ('Hardhat — documentación', 'https://hardhat.org/docs',
     'Compilación, pruebas y redes de desarrollo.'),
    ('Ethereum.org — recursos para desarrolladores',
     'https://ethereum.org/developers/',
     'Fundamentos de Ethereum y de los contratos inteligentes.'),
    ('Ethereum.org — gas',
     'https://ethereum.org/en/developers/docs/gas/',
     'Modelo de gas y costes de ejecución.'),
    ('Remix IDE', 'https://remix.ethereum.org/',
     'Edición, compilación y pruebas de Solidity.'),
    ('OpenZeppelin Contracts',
     'https://docs.openzeppelin.com/contracts/',
     'Bibliotecas ERC20, ERC721 y contratos reutilizables.'),
    ('OpenZeppelin — control de acceso',
     'https://docs.openzeppelin.com/contracts/5.x/access-control',
     'Control de acceso basado en roles.'),
    ('RareSkills', 'https://www.rareskills.io/',
     'Lecturas complementarias de EVM y optimización.'),
    ('Loom Network — GitHub', 'https://github.com/loomnetwork',
     'Repositorio del ecosistema asociado a CryptoZombies.'),
]


def content(path: Path) -> str:
    if not path.is_file():
        return ''
    return path.read_text(encoding='utf-8', errors='replace')


def csv_rows(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    try:
        with path.open(encoding='utf-8-sig', newline='') as fh:
            return list(csv.DictReader(fh))
    except (OSError, csv.Error):
        return []


def resolve_root(path: Path) -> Path:
    path = path.expanduser().resolve()
    candidates = [path, path / 'Practica_1', path.parent.parent]
    for candidate in candidates:
        if (candidate / 'E1').is_dir() and (candidate / 'E5').is_dir():
            return candidate
    raise SystemExit('No se encontró Practica_1 con las carpetas E1 y E5.')


def find_font():
    candidates = [
        ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'),
        ('C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/arialbd.ttf',
         'C:/Windows/Fonts/consola.ttf'),
    ]
    for regular, bold, mono in candidates:
        if all(Path(p).is_file() for p in (regular, bold, mono)):
            pdfmetrics.registerFont(TTFont('Memo', regular))
            pdfmetrics.registerFont(TTFont('MemoBold', bold))
            pdfmetrics.registerFont(TTFont('MemoMono', mono))
            pdfmetrics.registerFontFamily('Memo', normal='Memo', bold='MemoBold')
            return 'Memo', 'MemoBold', 'MemoMono'
    return 'Helvetica', 'Helvetica-Bold', 'Courier'


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build(args):
    root = resolve_root(args.repo)
    project = root / 'E5' / 'PharmaChain-Ethereum'
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)

    normal, bold, mono = find_font()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CoverMemo', fontName=bold, fontSize=22,
        leading=30, alignment=TA_CENTER, spaceAfter=20,
        textColor=colors.HexColor('#17334c')))
    styles.add(ParagraphStyle(name='HeadingMemo', fontName=bold, fontSize=14,
        leading=19, spaceBefore=16, spaceAfter=8, keepWithNext=True,
        textColor=colors.HexColor('#17334c')))
    styles.add(ParagraphStyle(name='SubMemo', fontName=bold, fontSize=10.2,
        leading=14, spaceBefore=11, spaceAfter=5, keepWithNext=True,
        textColor=colors.HexColor('#246481')))
    styles.add(ParagraphStyle(name='BodyMemo', fontName=normal, fontSize=8.6,
        leading=12.6, spaceAfter=6, alignment=TA_JUSTIFY))
    styles.add(ParagraphStyle(name='CellMemo', fontName=normal, fontSize=7.1,
        leading=10, wordWrap='CJK'))
    styles.add(ParagraphStyle(name='CodeMemo', fontName=mono, fontSize=6.4,
        leading=8.7, backColor=colors.HexColor('#f2f5f7'),
        leftIndent=5, rightIndent=5, spaceAfter=7))
    story = []

    def p(text):
        story.append(Paragraph(html.escape(str(text)), styles['BodyMemo']))

    def h(text, level=1):
        story.append(Paragraph(html.escape(str(text)),
            styles['HeadingMemo' if level == 1 else 'SubMemo']))

    def table(headers, records, widths=None):
        if not records:
            p('No hay datos disponibles en el repositorio.')
            return
        def cell(x):
            return Paragraph(html.escape(str(x)), styles['CellMemo'])
        data = [[cell(v) for v in headers]] + [[cell(v) for v in r] for r in records]
        t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#deebf3')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.white, colors.HexColor('#f7f9fb')]),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), .25, colors.HexColor('#cbd4dc')),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    def snippet(path, max_lines=None):
        lines = content(path).splitlines()
        if not lines:
            p(f'No se encontró contenido: {path.relative_to(root)}')
            return
        limit = max_lines or args.max_sol_lines
        regex = re.compile(r'\b(contract|library|interface|function|constructor|modifier|event|error|struct|describe|it|test)\b')
        positions = [i for i, line in enumerate(lines) if regex.search(line)]
        chosen = set()
        for pos in positions[:12]:
            chosen.update(range(max(0, pos - 1), min(len(lines), pos + 5)))
        if not chosen:
            chosen.update(range(min(len(lines), limit)))
        indices = sorted(chosen)[:limit]
        p(f'Extracto del archivo {path.relative_to(root).as_posix()} ({len(lines)} líneas en total).')
        # Dividir el código para evitar bloques demasiado altos en una sola página.
        for offset in range(0, len(indices), 24):
            section = indices[offset:offset + 24]
            block = '\n'.join(f'{i + 1:>4} {lines[i].expandtabs(4)[:94]}' for i in section)
            story.append(Preformatted(block, styles['CodeMemo'], maxLineLength=101,
                splitChars=' ,.;'))

    def readme(path, max_paragraphs=12):
        text = content(path)
        if not text:
            p(f'No se encontró documentación: {path.relative_to(root).as_posix()}')
            return
        h(f'Documentación: {path.relative_to(root).as_posix()}', 2)
        emitted = 0
        in_code = False
        for line in text.splitlines():
            line = line.strip()
            if line.startswith('```'):
                in_code = not in_code
                continue
            if in_code or not line or line.startswith(('<!--', '|', '---')):
                continue
            if line.startswith('#'):
                p(line.lstrip('#').strip())
            else:
                p(re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', line)[:650])
            emitted += 1
            if emitted >= max_paragraphs:
                break

    def page(canvas, doc):
        canvas.saveState()
        canvas.setFont(normal, 8)
        canvas.setFillColor(colors.grey)
        canvas.drawString(2 * cm, 1.1 * cm, 'Práctica 1 · Blockchain / Ethereum')
        canvas.drawRightString(19 * cm, 1.1 * cm, f'Página {doc.page}')
        canvas.restoreState()

    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph(html.escape(args.titulo), styles['CoverMemo']))
    p(f'Autoría: {args.autor or "No indicada"}')
    p(f'Fecha: {datetime.now():%d/%m/%Y}')
    p(f'Repositorio local: {root}')
    p('Documento generado a partir de archivos presentes. No ejecuta contratos ni pruebas.')
    story.append(PageBreak())

    h('1. Introducción y organización')
    p('La práctica aborda Solidity y Ethereum mediante ejercicios progresivos: '
      'CryptoZombies y E1, tokens E2 y E4, documentación E3 y el proyecto '
      'PharmaChain Ethereum (E5). La memoria conserva trazabilidad hacia archivos reales.')
    table(['Bloque', 'Contenido'], [
        ('E1 y CryptoZombies', 'Contratos, herencia, mappings, eventos y NFT'),
        ('E2', 'TokenContract.sol'), ('E3', 'README e imágenes'),
        ('E4', 'Token OpenZeppelin'),
        ('E5', 'Cadena de custodia, roles, tests, GasLab y benchmarks'),
    ], [4 * cm, 13 * cm])
    for path in (root / 'README', root / 'README.md', root / 'Practica_1' / 'INVENTARIO_CODIGO.md'):
        if path.is_file():
            readme(path, 7)

    h('2. E1 — Solidity y CryptoZombies')
    readme(root / 'E1' / 'Readme.md')
    for sol in sorted((root / 'E1').glob('*.sol')):
        h(sol.name, 2)
        snippet(sol)
    cz = root / 'CryptoZombies'
    h('2.1. CryptoZombies integrado en E1', 2)
    p('Las lecciones de CryptoZombies se presentan como parte del ejercicio E1 '
      'y se relacionan con los contratos Solidity desarrollados.')
    for lesson in sorted(cz.glob('Lesson_*')):
        if not lesson.is_dir():
            continue
        h(f'CryptoZombies — {lesson.name}', 2)
        files = sorted(f for f in lesson.rglob('*') if f.is_file() and
                       f.suffix.lower() in ('.sol', '.md', '.txt'))
        p(f'Archivos de código y documentación encontrados: {len(files)}.')
        for file in files[:args.max_files_per_lesson]:
            if file.suffix.lower() == '.sol':
                snippet(file, min(args.max_sol_lines, 25))
            else:
                readme(file, 5)

    for chapter, exercise in ((3, 'E2'), (4, 'E3'), (5, 'E4')):
        h(f'{chapter}. {exercise} — desarrollo y evidencias')
        folder = root / exercise
        for readme_name in ('README.md', 'Readme.md', 'Readme'):
            if (folder / readme_name).is_file():
                readme(folder / readme_name)
        for sol in sorted(folder.glob('*.sol')):
            h(sol.name, 2)
            snippet(sol)
        if exercise == 'E3' and args.include_images:
            images = sorted(f for f in (folder / 'images').rglob('*') if
                            f.is_file() and f.suffix.lower() in ('.png', '.jpg', '.jpeg'))
            for file in images[:args.max_images]:
                try:
                    from PIL import Image as PILImage
                    with PILImage.open(file) as image:
                        w, ht = image.size
                    ratio = min(16 * cm / w, 10 * cm / ht)
                    h(file.name, 2)
                    story.append(Image(str(file), width=w * ratio, height=ht * ratio))
                except Exception as exc:
                    p(f'No se pudo incorporar {file.name}: {exc}')

    h('6. E5 — PharmaChain Ethereum')
    p('Proyecto de trazabilidad de lotes farmacéuticos mediante contratos '
      'inteligentes, control de roles y cadena de custodia.')
    for rel in ('README.md', 'docs/GUIA_USO.md', 'docs/BENCHMARK.md',
                'README-BENCHMARK.md', 'BENCHMARK_GUIA.md', 'BENCHMARK_METODOLOGIA.md'):
        if (project / rel).is_file():
            readme(project / rel, 10)
    for sol in sorted((project / 'contracts').glob('*.sol')):
        h(f'Contrato: {sol.name}', 2)
        snippet(sol)

    h('7. E5 — Laboratorio de optimización GasLab')
    p('La numeración V0–V12 del laboratorio no coincide con las ocho variantes '
      'V0–V7 del selector principal. Las técnicas son hipótesis que deben '
      'contrastarse con el código, los tests y los CSV.')
    table(['Versión', 'Técnica evaluada'], list(TECHNIQUES.items()),
          [4.5 * cm, 12.5 * cm])
    gas_sources = sorted((project / 'contracts' / 'gas-lab').rglob('*.sol'))
    p(f'Archivos Solidity de GasLab encontrados: {len(gas_sources)}.')
    for sol in gas_sources[:args.max_gas_contracts]:
        h(sol.relative_to(project).as_posix(), 2)
        snippet(sol, min(args.max_sol_lines, 24))
    p('Las versiones basadas solo en eventos pueden modificar la capacidad '
      'de consultar el historial directamente desde el contrato.')

    h('8. E5 — Pruebas automatizadas')
    table(['Suite', 'Propósito', 'Existe'], [
        (name, purpose, 'Sí' if (project / 'test' / name).is_file() else 'No')
        for name, purpose in TESTS.items()
    ], [5.6 * cm, 9.7 * cm, 1.7 * cm])
    for file in sorted((project / 'test').glob('*')):
        if file.suffix not in ('.js', '.cjs', '.ts'):
            continue
        h(file.name, 2)
        tests = re.findall(r'\b(?:describe|it|test)\s*\(\s*[\'"`]([^\'"`]+)', content(file))
        if tests:
            for case in tests[:args.max_test_cases]:
                p(f'Caso declarado: {case}')
        else:
            p('No se detectaron casos mediante el patrón de búsqueda estático.')
        snippet(file, 15)
    p('La presencia de un test no demuestra que haya pasado. '
      'Para validar resultados es necesario ejecutarlo y conservar el log.')

    h('9. E5 — Resultados de gas y benchmarks')
    csvfiles = sorted((project / 'gas-reports').glob('*.csv')) + \
               sorted((project / 'reports').glob('*.csv'))
    for file in csvfiles:
        rows = csv_rows(file)
        h(file.relative_to(project).as_posix(), 2)
        p(f'Filas registradas: {len(rows)}.')
        if rows:
            columns = list(rows[0])[:4]
            widths = [17 * cm / len(columns)] * len(columns)
            table(columns, [[row.get(key, '') for key in columns]
                            for row in rows[:args.max_csv_rows]], widths)
    extended = csv_rows(project / 'gas-reports' / 'pharmachain-extended.csv')
    if extended:
        h('9.1. Comparativa por familia y variante', 2)
        lookup = {}
        for row in extended:
            val = number(row.get('gas'))
            if val is not None:
                lookup[(row.get('family'), row.get('version'), row.get('operation'))] = val
        results = []
        for family in ('Manual', 'OZ'):
            base = lookup.get((family, 'V0Base', 'register_first'))
            for version in TECHNIQUES:
                register = lookup.get((family, version, 'register_first'))
                deploy = lookup.get((family, version, 'deploy'))
                saving = (f'{(base - register) / base * 100:+.2f}%'
                          if base and register is not None else '—')
                results.append((family, version,
                    f'{deploy:,.0f}' if deploy is not None else '—',
                    f'{register:,.0f}' if register is not None else '—', saving))
        table(['Familia', 'Versión', 'Deploy gas', 'Registro gas', 'Ahorro vs V0'],
              results, [2 * cm, 5 * cm, 3.2 * cm, 3.2 * cm, 3.6 * cm])
        p('Ahorro positivo indica reducción de gas en register_first '
          'respecto a V0Base de la misma familia. Deploy se muestra aparte.')
    else:
        p('No se encontró pharmachain-extended.csv para calcular la tabla V0–V12.')

    h('10. Conclusiones y limitaciones')
    for conclusion in (
        'El gas de transacciones y el tamaño del bytecode son magnitudes diferentes.',
        'Los resultados dependen del compilador, la configuración y el estado de la EVM.',
        'Las variantes de roles manuales y OpenZeppelin pueden diferir funcionalmente.',
        'La sustitución de historial persistente por eventos modifica las consultas on-chain.',
        'Los datos de CSV son mediciones almacenadas, no ejecuciones realizadas por este generador.',
    ):
        p(conclusion)

    h('11. Bibliografía y referencias de trabajo')
    p('Fuentes técnicas y educativas pertinentes al proyecto. '
      'Su inclusión no equivale a afirmar que cada una fue consultada directamente.')
    for index, (title, url, description) in enumerate(REFERENCES, 1):
        h(f'[{index}] {title}', 2)
        p(description)
        safe_url = html.escape(url, quote=True)
        story.append(Paragraph(
            f'<link href="{safe_url}" color="#1765A0">{html.escape(url)}</link>',
            styles['CellMemo']))

    doc = SimpleDocTemplate(str(output), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2.1 * cm, bottomMargin=2 * cm,
        title=args.titulo, author=args.autor or 'Memoria automática')
    doc.build(story, onFirstPage=page, onLaterPages=page)
    print(f'PDF generado: {output} ({output.stat().st_size:,} bytes)')
    print(f'Contratos GasLab: {len(gas_sources)}; CSV: {len(csvfiles)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path('.'))
    parser.add_argument('--output', type=Path,
        default=Path('memoria/MEMORIA_PRACTICA_1.pdf'))
    parser.add_argument('--autor', default='')
    parser.add_argument('--titulo', default='Memoria técnica — Práctica 1: Ethereum y Solidity')
    parser.add_argument('--include-images', action='store_true')
    parser.add_argument('--max-images', type=int, default=12)
    parser.add_argument('--max-sol-lines', type=int, default=50)
    parser.add_argument('--max-test-cases', type=int, default=20)
    parser.add_argument('--max-csv-rows', type=int, default=20)
    parser.add_argument('--max-gas-contracts', type=int, default=26)
    parser.add_argument('--max-files-per-lesson', type=int, default=8)
    build(parser.parse_args())


if __name__ == '__main__':
    main()
