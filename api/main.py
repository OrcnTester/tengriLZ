# api/main.py
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pathlib
import sys

# --- M1: aircraft-aware helper ---
# (api/aircraft.py dosyasında resolve_aircraft_params fonksiyonunu tutuyoruz)
try:
    from .aircraft import resolve_aircraft_params  # package import (installed/as module)
except Exception:
    # local fallback: allow running when launched as script (no package context)
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    from aircraft import resolve_aircraft_params  # type: ignore

app = FastAPI(title="TengriLZ API")

# CORS (dev kolaylığı)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/candidates")
def candidates(
    # --- M0 parametreleri (mevcut) ---
    lat: float = Query(..., description="Merkez enlem (DD)"),
    lon: float = Query(..., description="Merkez boylam (DD)"),
    window_m: float = 800.0,
    slope_max_deg: float = 12.0,
    min_diameter_m: float = 30.0,
    morph: str = Query("closing", regex="^(closing|opening)$"),

    # --- M1: aircraft-aware parametreleri (opsiyonel) ---
    aircraft_code: Optional[str] = Query(None, description="EC135 | UH-1H | S70 | Custom(boş)"),
    rotor_diameter_m: Optional[float] = Query(None, description="Rotor çapı (m)"),
    safety_margin_m: Optional[float] = Query(None, description="Emniyet payı (m)"),
    k: Optional[float] = Query(None, description="Operasyon katsayısı"),
    slope_override_deg: Optional[float] = Query(None, description="Uçağa göre eğim limiti override"),
):
    """
    M0: DEM -> slope -> morph -> candidate patches (lz_candidates.main ile)
    M1: Aircraft-aware: sadece eşik değerlerini belirler (slope + min_clear_diameter)
    """
    try:
        # --- Yol kurulumları ---
        project_root = pathlib.Path(__file__).resolve().parent.parent
        scripts_dir  = project_root / "scripts"
        dem_path     = project_root / "data" / "dem.tif"
        sys.path.insert(0, str(scripts_dir))

        # --- M1: aircraft parametrelerini çözelim (yalnızca eşikleri belirlemek için) ---
        ac = resolve_aircraft_params(
            aircraft_code=aircraft_code,
            rotor_diameter_m=rotor_diameter_m,
            safety_margin_m=safety_margin_m,
            k=k,
            slope_max_deg=(slope_override_deg if slope_override_deg is not None else slope_max_deg),
            user_min_diameter_m=min_diameter_m,
        )
        # Aircraft override'ları M0 eşiğine uygula
        slope_limit = ac["slope_max_deg"]
        min_clear_diameter_m = ac["min_clear_diameter_m"]

        # --- M0 pipeline: mevcut fonksiyona pasla (yalnızca eşikleri güncellenmiş değerlerle) ---
        from lz_candidates import main as lz_main  # scripts/lz_candidates.py

        result = lz_main(
            str(dem_path),
            center_lat=lat,
            center_lon=lon,
            window_m=window_m,
            slope_max_deg=float(slope_limit),         # M1 etkisi
            min_diameter_m=float(min_clear_diameter_m),  # M1 etkisi
            morph=morph,
        )

        if result is None:
            raise RuntimeError("lz_candidates.main() None döndürdü.")

        # --- Non-breaking meta enrich: mümkünse aircraft bilgisini meta'ya ekle ---
        try:
            if isinstance(result, dict):
                meta = result.setdefault("meta", {})
                # Orijinal kullanıcı girdilerini de kaydet (izlenebilirlik)
                meta.setdefault("center_wgs84", {"lat": lat, "lon": lon})
                meta["window_m"] = window_m
                meta["morph"] = morph
                meta["slope_max_deg"] = slope_limit
                meta["min_clear_diameter_m"] = min_clear_diameter_m
                meta["aircraft"] = ac  # M1 özeti
        except Exception:
            # meta enrich başarısız olsa bile sonucu aynen döndür
            pass

        return result

    except HTTPException:
        raise
    except Exception as e:
        # Lokal debug kolaylığı için hatayı açık döndürüyoruz
        raise HTTPException(status_code=500, detail=str(e))
