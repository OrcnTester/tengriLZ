# api/main.py
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
import pathlib
import sys

app = FastAPI(title="TengriLZ API")

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
    lat: float = Query(...),
    lon: float = Query(...),
    window_m: float = 800.0,
    slope_max_deg: float = 12.0,       # NEW
    min_diameter_m: float = 30.0,      # NEW
    morph: str = "closing",            # NEW: closing | opening
):
    try:
        project_root = pathlib.Path(__file__).resolve().parent.parent
        scripts_dir = project_root / "scripts"
        dem_path = project_root / "data" / "dem.tif"

        # scripts klasörünü import yoluna ekle
        sys.path.insert(0, str(scripts_dir))

        # DOĞRUDAN import + çağrı
        from lz_candidates import main as lz_main

        result = lz_main(
            str(dem_path),
            center_lat=lat,
            center_lon=lon,
            window_m=window_m,
            slope_max_deg=slope_max_deg,      # pass-through
            min_diameter_m=min_diameter_m,    # pass-through
            morph=morph,                      # pass-through
        )

        # result bir dict/list olmalı:
        if result is None:
            raise RuntimeError("lz_candidates.main() None döndürdü.")
        return result

    except Exception as e:
        from fastapi import HTTPException
        # Detayı 500 olarak döndür (lokalde debug kolay olsun)
        raise HTTPException(status_code=500, detail=str(e))
