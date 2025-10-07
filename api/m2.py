from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Tuple
from pathlib import Path
import tempfile, os
import rasterio
from rasterio.windows import from_bounds
from rasterio.errors import RasterioIOError
from shapely.geometry import LineString
from pyproj import Transformer
from core.raster import compute_obstacles
from core.clearance import clearance_along_route
import shapely 
from shapely.geometry import shape
from shapely.geometry import mapping
from shapely import ops as shp_ops





# --- rasterio round_window fallback (bazı sürümlerde yok) ---
try:
    from rasterio.windows import round_window as _rio_round_window
    def round_window(win, pixel_precision=3):  # uyumlu imza
        return _rio_round_window(win, pixel_precision=pixel_precision)
except Exception:
    from rasterio.windows import Window
    def round_window(win, pixel_precision=3):
        """
        Basit fallback: window ofset/genişliklerini en yakın tam sayıya yuvarlar.
        width/height en az 1 piksel olacak şekilde sınırlar.
        """
        def r(v):  # yakın tam sayı
            return int(round(v))
        w = r(win.width)
        h = r(win.height)
        return Window(
            col_off=r(win.col_off),
            row_off=r(win.row_off),
            width=max(1, w),
            height=max(1, h),
        )

router = APIRouter(tags=["M2 Obstacles & Clearance"])


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class LineStringGeoJSON(BaseModel):
    type: Literal["LineString"]
    coordinates: List[Tuple[float, float]]

class ClearanceRequest(BaseModel):
    """Klasik endpoint: rota UTM koordinatları body içinde verilir."""
    route: LineStringGeoJSON
    altitude: dict  # { mode: "AGL"|"MSL", value_m: number }
    corridor_width_m: float = Field(150, ge=1)
    min_clearance_m: float = Field(30, ge=0)
    step_m: float = Field(25, ge=1)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "route": {
                        "type": "LineString",
                        "coordinates": [
                            [498059.9596, 4255084.0623],
                            [914179.0742, 4484238.5170]
                        ]
                    },
                    "altitude": {"mode": "AGL", "value_m": 60},
                    "corridor_width_m": 150,
                    "min_clearance_m": 30,
                    "step_m": 25
                }
            ]
        }
    }

class ClearanceParams(BaseModel):
    """AOI endpoint: rota WGS84 query ile gelir; body’de rota gerekmez."""
    altitude: dict  # { mode: "AGL"|"MSL", value_m: number }
    corridor_width_m: float = Field(150, ge=1)
    min_clearance_m: float = Field(30, ge=0)
    step_m: float = Field(25, ge=1)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _transform_fc(fc: dict, src_epsg: int, out_crs: Optional[str]):
    """
    FeatureCollection'ı src_epsg -> out_crs (örn. 'EPSG:4326') dönüştürür.
    out_crs None ise dokunmaz.
    """
    if not out_crs:
        return fc
    oc = str(out_crs).upper()
    if oc in ("", f"EPSG:{src_epsg}"):
        return fc

    t = Transformer.from_crs(f"EPSG:{src_epsg}", oc, always_xy=True)

    def _xy(x, y, z=None):
        X, Y = t.transform(x, y)
        return (X, Y) if z is None else (X, Y, z)

    out_feats = []
    for f in fc.get("features", []):
        geom = shape(f["geometry"])
        geom_t = shp_ops.transform(lambda x, y, z=None: _xy(x, y, z), geom)
        nf = dict(f)
        nf["geometry"] = mapping(geom_t)
        out_feats.append(nf)
    return {"type": "FeatureCollection", "features": out_feats}



def _subset_raster(src_path: str, bounds, dst_path: str):
    if not Path(src_path).exists():
        raise HTTPException(404, f"Raster not found: {src_path}")

    req_minx, req_miny, req_maxx, req_maxy = bounds
    with rasterio.open(src_path) as src:
        ds_minx, ds_miny, ds_maxx, ds_maxy = src.bounds
        minx = max(req_minx, ds_minx)
        miny = max(req_miny, ds_miny)
        maxx = min(req_maxx, ds_maxx)
        maxy = min(req_maxy, ds_maxy)
        if not (minx < maxx and miny < maxy):
            raise HTTPException(400, f"AOI outside raster bounds: req={bounds}, ds={tuple(src.bounds)}")

        win = from_bounds(minx, miny, maxx, maxy, transform=src.transform)
        win = round_window(win, pixel_precision=3)

        if win.width <= 0 or win.height <= 0:
            raise HTTPException(400, f"AOI window collapsed after rounding: win={win}")

        data = src.read(1, window=win)
        if data.size == 0:
            raise HTTPException(400, f"AOI window empty for {src_path} (win={win})")

        transform = rasterio.windows.transform(win, src.transform)
        meta = src.meta.copy()
        meta.update(height=int(data.shape[0]), width=int(data.shape[1]), transform=transform)
        with rasterio.open(dst_path, "w", **meta) as dst:
            dst.write(data, 1)



def _wgs84_to_raster_xy(lon: float, lat: float, raster_path: str):
    """WGS84 (lon,lat) -> raster'ın CRS'inde (x,y). Zon otomatiğini değil dosya CRS'ini kullanır."""
    if not Path(raster_path).exists():
        raise HTTPException(404, f"Raster not found: {raster_path}")
    with rasterio.open(raster_path) as src:
        dst_crs = src.crs
        if dst_crs is None:
            raise HTTPException(400, f"Raster has no CRS: {raster_path}")
        t = Transformer.from_crs("EPSG:4326", dst_crs, always_xy=True)
        x, y = t.transform(lon, lat)
        return x, y, dst_crs.to_string()

# ─────────────────────────────────────────────────────────────────────────────
# Health / Tools
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/m2/ping")
def ping():
    return {"ok": True}

@router.get("/m2/aoi/debug")
def aoi_debug(lat: float, lon: float, window_m: float = 3000, raster_path: str = "data/DSM_utm.tif"):
    x, y, crs_str = _wgs84_to_raster_xy(lon, lat, raster_path)
    half = window_m / 2.0
    req_bounds = (x - half, y - half, x + half, y + half)

    # 2) Raster bilgisi + window hesapları
    with rasterio.open(raster_path) as src:
        ds_bounds = tuple(src.bounds)
        # clip
        minx = max(req_bounds[0], ds_bounds[0])
        miny = max(req_bounds[1], ds_bounds[1])
        maxx = min(req_bounds[2], ds_bounds[2])
        maxy = min(req_bounds[3], ds_bounds[3])
        clipped = (minx, miny, maxx, maxy)

        win = from_bounds(minx, miny, maxx, maxy, transform=src.transform)
        from rasterio.windows import round_window
        win_r = round_window(win, pixel_precision=3)

    return {
      "crs": crs_str,
        "utm_xy": {"x": round(x,3), "y": round(y,3)},
        "requested_bounds": [round(v,3) for v in req_bounds],
        "dataset_bounds":   [round(v,3) for v in ds_bounds],
        "clipped_bounds":   [round(v,3) for v in clipped],
        "window_rounded":   {"col_off": win_r.col_off, "row_off": win_r.row_off, "width": win_r.width, "height": win_r.height},
     }


@router.get("/m2/files")
def files(
    dsm_path: str = Query("data/DSM_utm.tif"),
    dtm_path: Optional[str] = Query("data/DTM_utm.tif"),
):
    return {
        "cwd": str(Path.cwd()),
        "dsm_path": dsm_path, "dsm_exists": Path(dsm_path).exists(),
        "dtm_path": dtm_path, "dtm_exists": (Path(dtm_path).exists() if dtm_path else None),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Obstacles (FULL RASTER — bilinçli açılmadıkça kapalı)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/m2/obstacles", summary="Get Obstacles (DISABLED by default; use /m2/obstacles/aoi)")
def get_obstacles(
    dsm_path: str = Query("data/DSM_utm.tif"),
    dtm_path: Optional[str] = Query("data/DTM_utm.tif"),
    min_h: float = Query(2.0),
    smooth_sigma: float = Query(1.0),
    allow_full: int = Query(0, description="Set 1 to allow full raster scan (NOT RECOMMENDED)"),
):
    if allow_full != 1:
        raise HTTPException(
            400,
            "Full-raster scan disabled. Use /m2/obstacles/aoi?lat=...&lon=...&window_m=... (fast). "
            "If you REALLY want full scan, set allow_full=1 (not recommended)."
        )

    if not Path(dsm_path).exists():
        raise HTTPException(404, f"DSM not found: {dsm_path}")
    if dtm_path and not Path(dtm_path).exists():
        raise HTTPException(404, f"DTM not found: {dtm_path}")

    try:
        features = compute_obstacles(dsm_path=dsm_path, dtm_path=dtm_path, min_h=min_h, smooth_sigma=smooth_sigma)
        return JSONResponse({"type": "FeatureCollection", "features": features})
    except RasterioIOError as e:
        raise HTTPException(400, f"Raster read error: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Obstacles (AOI: WGS84 merkez + pencere — HIZLI)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/m2/obstacles/aoi")
def get_obstacles_aoi(
    lat: float,
    lon: float,
    window_m: float = 3000,
    pad_m: float = 250,
    dsm_path: str = Query("data/DSM_utm.tif"),
    dtm_path: Optional[str] = Query("data/DTM_utm.tif"),
    min_h: float = 2.0,
    smooth_sigma: float = 1.0,
    out_crs: Optional[str] = Query(None),   # +++ EKLENDİ +++
):
    try:
        cx, cy, _ = _wgs84_to_raster_xy(lon, lat, dsm_path)
        half = window_m / 2.0 + pad_m
        bounds = (cx - half, cy - half, cx + half, cy + half)

        with tempfile.TemporaryDirectory() as td:
            dsm_sub = os.path.join(td, "DSM_sub.tif")
            _subset_raster(dsm_path, bounds, dsm_sub)

            dtm_sub = None
            if dtm_path:
                dtm_sub = os.path.join(td, "DTM_sub.tif")
                _subset_raster(dtm_path, bounds, dtm_sub)

            feats = compute_obstacles(dsm_sub, dtm_sub, min_h=min_h, smooth_sigma=smooth_sigma)
            fc = {"type": "FeatureCollection", "features": feats}

            if out_crs:
                with rasterio.open(dsm_sub) as ds:
                    src_epsg = ds.crs.to_epsg()
                fc = _transform_fc(fc, src_epsg, out_crs)

            return JSONResponse(fc)
    except HTTPException:
        raise
    except RasterioIOError as e:
        raise HTTPException(400, f"Raster read error: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Clearance (FULL RASTER yerine ROUTE AOI — hızlı)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/m2/clearance/check", summary="Post Clearance (ROUTE AOI ONLY)")
def post_clearance(
    req: ClearanceRequest,
    dsm_path: str = Query("data/DSM_utm.tif"),
    dtm_path: Optional[str] = Query("data/DTM_utm.tif"),
    min_h: float = Query(2.0),
    pad_m: float = Query(250.0, description="Corridor etrafına ek güvenlik payı"),
):
    if not Path(dsm_path).exists():
        raise HTTPException(404, f"DSM not found: {dsm_path}")
    if dtm_path and not Path(dtm_path).exists():
        raise HTTPException(404, f"DTM not found: {dtm_path}")

    # Rota → AOI bounds
    route_ls = LineString(req.route.coordinates)
    corridor_half = req.corridor_width_m / 2.0
    aoi = route_ls.buffer(corridor_half + float(pad_m))
    minx, miny, maxx, maxy = aoi.bounds

    try:
        with tempfile.TemporaryDirectory() as td:
            dsm_sub = os.path.join(td, "DSM_sub.tif")
            dtm_sub = os.path.join(td, "DTM_sub.tif") if dtm_path else None
            _subset_raster(dsm_path, (minx, miny, maxx, maxy), dsm_sub)
            if dtm_path:
                _subset_raster(dtm_path, (minx, miny, maxx, maxy), dtm_sub)

            obstacles = compute_obstacles(dsm_sub, dtm_sub, min_h=min_h)

            segs_fc, hotspots_fc, summary = clearance_along_route(
                route=route_ls,
                obstacles_fc={"type": "FeatureCollection", "features": obstacles},
                altitude_mode=str(req.altitude.get("mode", "AGL")),
                altitude_value_m=float(req.altitude.get("value_m", 60)),
                corridor_width_m=req.corridor_width_m,
                min_clearance_m=req.min_clearance_m,
                step_m=req.step_m,
                dtm_path=dtm_sub if dtm_sub else None,
                dsm_path=dsm_sub,
            )
          
            return JSONResponse({"segments": segs_fc, "hotspots": hotspots_fc, "summary": summary})
    except RasterioIOError as e:
        raise HTTPException(400, f"Raster read error: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Clearance (AOI: 2× WGS84 nokta + pencere, body’de rota yok)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/m2/clearance/aoi", summary="Post Clearance (WGS84+AOI)")
def clearance_aoi(
    params: ClearanceParams,
    lat0: float,
    lon0: float,
    lat1: float,
    lon1: float,
    window_m: float = 3000,
    pad_m: float = 250,
    dsm_path: str = Query("data/DSM_utm.tif"),
    dtm_path: Optional[str] = Query("data/DTM_utm.tif"),
    min_h: float = 2.0,
    out_crs: Optional[str] = Query(None), 
):
    try:
        x0, y0, _ = _wgs84_to_raster_xy(lon0, lat0, dsm_path)
        x1, y1, _ = _wgs84_to_raster_xy(lon1, lat1, dsm_path)
        route_ls = LineString([(x0, y0), (x1, y1)])

        # AOI: rota orta nokta + pencere
        half = window_m / 2.0 + pad_m
        cx = 0.5 * (x0 + x1)
        cy = 0.5 * (y0 + y1)
        bounds = (cx - half, cy - half, cx + half, cy + half)

        with tempfile.TemporaryDirectory() as td:
            dsm_sub = os.path.join(td, "DSM_sub.tif")
            _subset_raster(dsm_path, bounds, dsm_sub)

            dtm_sub = None
            if dtm_path:
                dtm_sub = os.path.join(td, "DTM_sub.tif")
                _subset_raster(dtm_path, bounds, dtm_sub)

            obstacles = compute_obstacles(dsm_sub, dtm_sub, min_h=min_h)

            segs_fc, hotspots_fc, summary = clearance_along_route(
                route=route_ls,
                obstacles_fc={"type": "FeatureCollection", "features": obstacles},
                altitude_mode=str(params.altitude.get("mode", "AGL")),
                altitude_value_m=float(params.altitude.get("value_m", 60)),
                corridor_width_m=params.corridor_width_m,
                min_clearance_m=params.min_clearance_m,
                step_m=params.step_m,
                dtm_path=dtm_sub if dtm_sub else None,
                dsm_path=dsm_sub,
            )  
          
            
            if out_crs:
                with rasterio.open(dsm_sub) as ds:
                    src_epsg = ds.crs.to_epsg()
                segs_fc = _transform_fc(segs_fc, src_epsg, out_crs)
                hotspots_fc = _transform_fc(hotspots_fc, src_epsg, out_crs)
            
            return JSONResponse({"segments": segs_fc, "hotspots": hotspots_fc, "summary": summary})
    except HTTPException:
        raise
    except RasterioIOError as e:
        raise HTTPException(400, f"Raster read error: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))
