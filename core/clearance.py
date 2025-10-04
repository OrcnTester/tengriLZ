# core/clearance.py
from typing import Dict, Optional
from shapely.geometry import LineString, shape, Point
import rasterio
import numpy as np
import math  # ← eklendi


def _sample_route_points(route: LineString, step_m: float):
    L = route.length
    s = 0.0
    pts = []
    while s <= L:
        pts.append(route.interpolate(s))
        s += step_m
    if pts and pts[-1].distance(Point(route.coords[-1])) > 1e-6:
        pts.append(Point(route.coords[-1]))
    return pts

def _elev_at(point: Point, dataset) -> float:
    if dataset is None:
        return float("nan")
    row, col = dataset.index(point.x, point.y)

    # clamp: pencere dışına taşan indeksleri sınırla
    row = max(0, min(int(row), dataset.height - 1))
    col = max(0, min(int(col), dataset.width - 1))

    val = dataset.read(1)[row, col]
    nd = dataset.nodata
    if nd is not None and val == nd:
        return float("nan")
    try:
        return float(val)
    except Exception:
        return float("nan")

def _safe_num(x):
    """NaN/Inf → None (JSON uyumlu)."""
    try:
        return float(x) if math.isfinite(float(x)) else None
    except Exception:
        return None


def clearance_along_route(
    route: LineString,
    obstacles_fc: Dict,
    altitude_mode: str,
    altitude_value_m: float,
    corridor_width_m: float,
    min_clearance_m: float,
    step_m: float,
    dtm_path: Optional[str],
    dsm_path: str,
):
    dtm_ds = rasterio.open(dtm_path) if dtm_path else None
    dsm_ds = rasterio.open(dsm_path)

    pts = _sample_route_points(route, step_m)

    obs = []
    for f in obstacles_fc.get("features", []):
        geom = shape(f.get("geometry"))
        h = float(f.get("properties", {}).get("height_m", 0.0))
        obs.append((geom, h))

    seg_features, hotspot_features = [], []

    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        seg = LineString([a, b])
        corridor = seg.buffer(corridor_width_m / 2.0)

        z_top_max = -1e9
        nearest_d = float("nan")
        nearest_idx = -1

        for j, (g, h) in enumerate(obs):
            if not g.intersects(corridor):
                continue
            centroid = g.centroid
            if dtm_ds is not None:
                z_ground = _elev_at(centroid, dtm_ds)
                z_top = z_ground + h
            else:
                z_top = _elev_at(centroid, dsm_ds)
            if np.isnan(z_top):
                continue
            if z_top > z_top_max:
                z_top_max = z_top
                nearest_idx = j
                nearest_d = g.distance(seg)

        # Hiç engel yoksa: z_top_max'ı segment ortasındaki zeminle dolduralım (nötr referans)
        if z_top_max < -1e8:
            center = seg.interpolate(0.5, normalized=True)
            z_ground_mid = _elev_at(center, dtm_ds) if dtm_ds is not None else _elev_at(center, dsm_ds)
            z_top_max = z_ground_mid

        center = seg.interpolate(0.5, normalized=True)
        if str(altitude_mode).upper() == "AGL":
            z_ground = _elev_at(center, dtm_ds) if dtm_ds is not None else _elev_at(center, dsm_ds)
            z_route = z_ground + float(altitude_value_m)
        else:
            z_route = float(altitude_value_m)

        # Clearance hesabı
        clearance_raw = z_route - z_top_max
        clearance_val = _safe_num(clearance_raw)

        # Durum
        if clearance_val is None:
            status = "unknown"
        else:
            status = "pass" if clearance_val >= float(min_clearance_m) else "fail"

        # Segment feature
        seg_prop = {"i": i, "clearance_m": clearance_val, "status": status}
        seg_features.append({
            "type": "Feature",
            "geometry": seg.__geo_interface__,
            "properties": seg_prop,
        })

        # Hotspot (yalnızca hesaplanabilirse ve fail ise)
        if (status == "fail") and (clearance_val is not None):
            hotspot_features.append({
                "type": "Feature",
                "geometry": center.__geo_interface__,
                "properties": {
                    "i": i,
                    "clearance_m": clearance_val,
                    "needed_extra_m": round(float(min_clearance_m) - clearance_val, 2),
                    "nearest_obstacle_idx": nearest_idx,
                    "distance_to_obstacle_m": _safe_num(nearest_d),
                },
            })

    # Özete sadece sonlu clearance'lar girsin
    finite_vals = [f["properties"]["clearance_m"] for f in seg_features if isinstance(f["properties"]["clearance_m"], (int, float))]
    summary = {
        "segments": len(seg_features),
        "fails": sum(1 for f in seg_features if f["properties"]["status"] == "fail"),
        "unknowns": sum(1 for f in seg_features if f["properties"]["status"] == "unknown"),
        "min_clearance_m": (min(finite_vals) if finite_vals else None),
    }

    segs_fc = {"type": "FeatureCollection", "features": seg_features}
    hotspots_fc = {"type": "FeatureCollection", "features": hotspot_features}
    return segs_fc, hotspots_fc, summary
