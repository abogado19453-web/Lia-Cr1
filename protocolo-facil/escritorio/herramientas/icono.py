#!/usr/bin/env python3
"""Genera el icono de la aplicación en PNG, ICO e ICNS.

El motivo es una hoja de protocolo: fondo color papel, renglones impresos
y el filo del folio. Sin texto, para que se lea bien a 16 píxeles.

    python3 herramientas/icono.py build
"""
import struct
import sys
import zlib
from pathlib import Path

from PIL import Image, ImageDraw

PAPEL = (247, 243, 234, 255)
TINTA = (122, 92, 46, 255)
RENGLON = (205, 193, 170, 255)
BORDE = (90, 68, 34, 255)


def dibujar(lado: int) -> Image.Image:
    """Dibuja el icono a `lado` píxeles, con supermuestreo de 4x."""
    escala = 4
    s = lado * escala
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    margen = int(s * 0.07)
    radio = int(s * 0.17)
    d.rounded_rectangle([margen, margen, s - margen, s - margen],
                        radius=radio, fill=TINTA)

    # Hoja, ligeramente desplazada hacia la derecha para dejar ver el lomo.
    hm = int(s * 0.17)
    lomo = int(s * 0.115)
    d.rounded_rectangle([lomo + hm // 2, hm, s - hm, s - hm],
                        radius=int(s * 0.045), fill=PAPEL)

    # Renglones impresos.
    x0 = lomo + hm // 2 + int(s * 0.07)
    x1 = s - hm - int(s * 0.07)
    alto = (s - 2 * hm)
    grosor = max(1, int(s * 0.012))
    for i in range(7):
        y = hm + int(alto * (0.17 + i * 0.115))
        ancho = x1 if i < 6 else x0 + int((x1 - x0) * 0.55)
        d.rounded_rectangle([x0, y, ancho, y + grosor],
                            radius=grosor, fill=RENGLON)

    # Filo del lomo.
    d.rounded_rectangle([lomo - int(s * 0.015), hm + int(s * 0.03),
                         lomo + int(s * 0.02), s - hm - int(s * 0.03)],
                        radius=int(s * 0.02), fill=BORDE)

    return img.resize((lado, lado), Image.LANCZOS)


def escribir_icns(destino: Path, tamanos) -> None:
    """ICNS con cargas PNG; los tipos usados los admite macOS 10.7 en adelante."""
    tipos = {16: b"icp4", 32: b"icp5", 64: b"icp6", 128: b"ic07",
             256: b"ic08", 512: b"ic09", 1024: b"ic10"}
    bloques = b""
    for lado in tamanos:
        tipo = tipos.get(lado)
        if not tipo:
            continue
        png = png_bytes(dibujar(lado))
        bloques += tipo + struct.pack(">I", len(png) + 8) + png
    destino.write_bytes(b"icns" + struct.pack(">I", len(bloques) + 8) + bloques)


def png_bytes(img: Image.Image) -> bytes:
    from io import BytesIO
    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main() -> None:
    salida = Path(sys.argv[1] if len(sys.argv) > 1 else "build")
    salida.mkdir(parents=True, exist_ok=True)

    dibujar(1024).save(salida / "icon.png")
    dibujar(512).save(salida / "icono-512.png")

    tamanos_ico = [16, 24, 32, 48, 64, 128, 256]
    dibujar(256).save(salida / "icon.ico", format="ICO",
                      sizes=[(n, n) for n in tamanos_ico])

    escribir_icns(salida / "icon.icns", [16, 32, 64, 128, 256, 512, 1024])

    for nombre in ("icon.png", "icon.ico", "icon.icns"):
        ruta = salida / nombre
        print(f"   {ruta} ({ruta.stat().st_size // 1024} KB)")

    # zlib se importa para que el fallo sea temprano si falta.
    assert zlib is not None


if __name__ == "__main__":
    main()
