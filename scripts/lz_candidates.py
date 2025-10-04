# scripts/lz_candidates.py
import math
from typing import Dict, Any, List, Tuple, Optional

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.features import shapes, rasterize
from rasterio.warp import transform as rio_transform
from shapely.geometry import shape, Polygon, mapping, Point
from scipy.ndimage import binary_dilation, binary_erosion, distance_transform_edt

# ---- Varsayılan parametreler (M0 için makul)
SLOPE_MAX_DEG = 12.0            # Eğim eşiği (derece)
MIN_DIAMETER_M = 30.0           # Minimum iniş çapı (metre)
DILATE_CELLS = 1                # Morfoloji adım sayısı (1 iyi başlangıç)

def slope_from_dem(dem: np.ndarray, xres_m: float, yres_m: float) -> np.ndarray:
    dzdx, dzdy = np.gradient(dem, xres_m, yres_m)
    return np.degrees(np.arctan(np.sqrt(dzdx**2 + dzdy**2)))

def _compute_pixel_meters(crs, xres: float, yres: float, lat_ref: float) -> Tuple[float, float]:
    """EPSG:4326 ise piksel boyunu derece->metre çevir, yoksa (projeksiyon/metrik) değerleri direkt metre kabul et."""
    if crs and str(crs).lower().startswith("epsg:4326"):
        meters_per_deg_lat = 111_320.0
        meters_per_deg_lon = 111_320.0 * math.cos(math.radians(lat_ref))
        px_m_x = xres * meters_per_deg_lon
        px_m_y = yres * meters_per_deg_lat
    else:
        px_m_x, px_m_y = xres, yres
    return max(px_m_x, 1e-6), max(px_m_y, 1e-6)

def _bbox_min_diameter_meters(poly: Polygon, crs, lat_ref: float) -> float:
    """Polygon bbox genişlik/yüksekliğinin metre cinsinden maksimumunu döndürür."""
    minx, miny, maxx, maxy = poly.bounds
    dx = maxx - minx
    dy = maxy - miny
    if crs and str(crs).lower().startswith("epsg:4326"):
        meters_per_deg_lat = 111_320.0
        meters_per_deg_lon = 111_320.0 * math.cos(math.radians(lat_ref))
        width_m  = dx * meters_per_deg_lon
        height_m = dy * meters_per_deg_lat
    else:
        width_m, height_m = dx, dy
    return max(width_m, height_m)

def main(
    dem_path: str,
    center_lat: float,
    center_lon: float,
    window_m: float = 1200.0,
    slope_max_deg: Optional[float] = None,   # isteğe bağlı override
    min_diameter_m: Optional[float] = None,  # isteğe bağlı override
    morph: str = "closing",                  # "closing" | "opening"
) -> Dict[str, Any]:
    """
    DEM üzerinde center_lat/lon etrafında window_m pencerede eğimi küçük (flat) poligonları bulur.
    GeoJSON FeatureCollection döndürür.
    """
    with rasterio.open(dem_path) as src:
        dem = src.read(1).astype(np.float32)
        transform = src.transform
        crs = src.crs
        nodata = src.nodata

        # 1) WGS84 (lon/lat) -> DEM CRS dönüşümü
        wgs84 = CRS.from_epsg(4326)
        if crs is not None and crs != wgs84:
            xs, ys = rio_transform(wgs84, crs, [center_lon], [center_lat])
            cx, cy = xs[0], ys[0]
        else:
            cx, cy = center_lon, center_lat

        # 2) Grid index
        row, col = src.index(cx, cy)

        # 3) Piksel boyutları (metre)
        xres, yres = src.res
        px_m_x, px_m_y = _compute_pixel_meters(crs, xres, yres, center_lat)

        # 4) Pencereyi piksele çevir (8 px altına düşmesin)
        half_wx = max(8, int(window_m / px_m_x))
        half_wy = max(8, int(window_m / px_m_y))

        r0, r1 = max(0, row - half_wy), min(dem.shape[0], row + half_wy)
        c0, c1 = max(0, col - half_wx), min(dem.shape[1], col + half_wx)
        if (r1 - r0) < 5 or (c1 - c0) < 5:
            return {
                "type": "FeatureCollection",
                "features": [],
                "meta": {
                    "dem_path": dem_path,
                    "dem_crs": str(crs),
                    "center_wgs84": {"lat": center_lat, "lon": center_lon},
                    "center_dem_crs": {"x": cx, "y": cy},
                    "window_m": window_m,
                    "reason": "window too small in pixels",
                },
            }

        # 5) Alt pencere, transform
        dem_win = dem[r0:r1, c0:c1]
        sub_transform = rasterio.transform.Affine(
            transform.a, transform.b, transform.c + c0 * transform.a,
            transform.d, transform.e, transform.f + r0 * transform.e
        )

        # 6) Maskeler + eğim
        valid = (dem_win != nodata) & np.isfinite(dem_win) if nodata is not None else np.isfinite(dem_win)
        slope = slope_from_dem(dem_win, px_m_x, px_m_y)
        slope[~valid] = np.nan

        SLOPE = slope_max_deg if slope_max_deg is not None else SLOPE_MAX_DEG
        flat = (slope < SLOPE) & valid

        valid_px = int(valid.sum())
        flat_px  = int(np.nansum(flat))

        if flat_px == 0 and window_m < 2000.0:
            # bir kez daha büyük pencerede dene
            return main(
                dem_path, center_lat, center_lon,
                window_m=2000.0,
                slope_max_deg=slope_max_deg,
                min_diameter_m=min_diameter_m,
                morph=morph,
            )
        if flat_px == 0:
            return {
                "type": "FeatureCollection",
                "features": [],
                "meta": {
                    "dem_path": dem_path,
                    "dem_crs": str(crs),
                    "center_wgs84": {"lat": center_lat, "lon": center_lon},
                    "center_dem_crs": {"x": cx, "y": cy},
                    "window_m": window_m,
                    "valid_pixels": valid_px,
                    "flat_pixels": flat_px,
                    "reason": "no flat pixels under slope threshold",
                },
            }

        # 7) Morfoloji
        fm = flat.astype(bool)
        if morph == "opening":
            # ince bağlantıları kır, alanları parçalara ayır
            for _ in range(DILATE_CELLS):
                fm = binary_erosion(fm)
            for _ in range(DILATE_CELLS):
                fm = binary_dilation(fm)
        else:
            # varsayılan: closing (pütürleri toparlar, alanları birleştirir)
            for _ in range(DILATE_CELLS):
                fm = binary_dilation(fm)
            for _ in range(DILATE_CELLS):
                fm = binary_erosion(fm)
        flat = fm

        # 8) Poligon çıkarımı
        polys: List[Polygon] = []
        for geom, val in shapes(flat.astype(np.uint8), mask=flat, transform=sub_transform):
            if val == 1:
                polys.append(shape(geom))

        # 9) Metre bazlı diameter filtresi
        MIN_DIA = min_diameter_m if min_diameter_m is not None else MIN_DIAMETER_M
        candidates: List[Polygon] = []
        for p in polys:
            dia_m = _bbox_min_diameter_meters(p, crs, center_lat)
            if dia_m >= MIN_DIA:
                candidates.append(p)

        # 10) En büyük 3 adayı sırala
        candidates = sorted(candidates, key=lambda p: p.area, reverse=True)[:3]

        # 11) EDT ile iç teğet daire merkezleri (her aday için)
        #     Not: edt sampling row->px_m_y, col->px_m_x
        edt = distance_transform_edt(flat, sampling=(px_m_y, px_m_x))

        center_features: List[Dict[str, Any]] = []
        for i, p in enumerate(candidates, 1):
            # Poligonu tüm pencere üzerine rasterize et (1=polygon içi)
            poly_mask = rasterize(
                [(mapping(p), 1)],
                out_shape=dem_win.shape,
                transform=sub_transform,
                fill=0,
                dtype=np.uint8
            )
            edt_masked = np.where(poly_mask == 1, edt, 0.0)
            r, c = np.unravel_index(np.argmax(edt_masked), edt_masked.shape)
            radius_m = float(edt_masked[r, c])  # zaten metre cinsinden
            # pixel merkezini koordinata çevir
            x, y = sub_transform * (c + 0.5, r + 0.5)

            center_props = {
                "id": f"LZ-CENTER-{i}",
                "clear_radius_m": radius_m,
                "clear_diameter_m": 2.0 * radius_m,
                "window_m": window_m,
            }
            center_features.append({
                "type": "Feature",
                "properties": center_props,
                "geometry": mapping(Point(x, y)),
            })

        # 12) Poligon feature'ları
        area_features: List[Dict[str, Any]] = []
        for i, p in enumerate(candidates, 1):
            props = {
                "id": f"LZ-{i}",
                "bbox_diameter_m": float(_bbox_min_diameter_meters(p, crs, center_lat)),
                "min_clear_diameter_m": MIN_DIA,
                "window_m": window_m,
            }
            area_features.append({
                "type": "Feature",
                "properties": props,
                "geometry": mapping(p),
            })

        # 13) Dönüş
        return {
            "type": "FeatureCollection",
            # önce alanlar, sonra merkezler (UI'da sıraya göre çizmek istersen)
            "features": area_features + center_features,
            "meta": {
                "dem_path": dem_path,
                "dem_crs": str(crs),
                "center_wgs84": {"lat": center_lat, "lon": center_lon},
                "center_dem_crs": {"x": cx, "y": cy},
                "window_m": window_m,
                "count": len(area_features),
                "valid_pixels": valid_px,
                "flat_pixels": flat_px,
                "slope_max_deg": SLOPE,
                "morph": morph,
            },
        }
