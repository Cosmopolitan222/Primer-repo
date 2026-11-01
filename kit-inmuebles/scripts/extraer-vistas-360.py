"""Extrae fotos «normales» (proyección rectilínea) de panorámicas 360° equirectangulares.

Uso:  python3 extraer-vistas-360.py <panorama.jpg> <salida.jpg> <yaw_grados> [pitch] [fov_h] [ancho] [alto]

Sirve para crear fotos de ejemplo a partir de la vivienda de demostración del
simulador de visitas (son renders propios, sin derechos de terceros).
"""
import sys
import numpy as np
from PIL import Image


def vista(pano, yaw, pitch=0.0, fov_h=80.0, w=1600, h=1200):
    src = np.asarray(pano.convert("RGB"), dtype=np.float32)
    ph, pw, _ = src.shape
    f = (w / 2) / np.tan(np.radians(fov_h) / 2)
    xs = np.arange(w) - w / 2 + 0.5
    ys = np.arange(h) - h / 2 + 0.5
    xv, yv = np.meshgrid(xs, ys)
    # Rayos en coordenadas de cámara (x derecha, y abajo, z adelante)
    d = np.stack([xv, yv, np.full_like(xv, f)], axis=-1)
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    p, yw = np.radians(pitch), np.radians(yaw)
    rx = np.array([[1, 0, 0], [0, np.cos(p), np.sin(p)], [0, -np.sin(p), np.cos(p)]])
    ry = np.array([[np.cos(yw), 0, np.sin(yw)], [0, 1, 0], [-np.sin(yw), 0, np.cos(yw)]])
    d = d @ rx.T @ ry.T
    lon = np.arctan2(d[..., 0], d[..., 2])
    lat = np.arcsin(np.clip(-d[..., 1], -1, 1))
    u = (lon / (2 * np.pi) + 0.5) * pw - 0.5
    v = (0.5 - lat / np.pi) * ph - 0.5
    # Interpolación bilineal
    u0 = np.floor(u).astype(int); v0 = np.floor(v).astype(int)
    du = (u - u0)[..., None]; dv = (v - v0)[..., None]
    u1 = (u0 + 1) % pw; u0 %= pw
    v0 = np.clip(v0, 0, ph - 1); v1 = np.clip(v0 + 1, 0, ph - 1)
    out = (src[v0, u0] * (1 - du) * (1 - dv) + src[v0, u1] * du * (1 - dv)
           + src[v1, u0] * (1 - du) * dv + src[v1, u1] * du * dv)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


if __name__ == "__main__":
    a = sys.argv[1:]
    pano = Image.open(a[0])
    yaw = float(a[2]); pitch = float(a[3]) if len(a) > 3 else 0.0
    fov = float(a[4]) if len(a) > 4 else 80.0
    w = int(a[5]) if len(a) > 5 else 1600; h = int(a[6]) if len(a) > 6 else 1200
    vista(pano, yaw, pitch, fov, w, h).save(a[1], quality=90)
