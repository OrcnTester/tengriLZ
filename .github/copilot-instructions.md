TengriLZ — AI developer instructions

Purpose
- Help an automated coding agent quickly understand the project's architecture, conventions, and developer workflows so changes are safe, minimal and tested.

Key areas to read first
- `readme.md` — high-level project purpose and usage (DEM → slope → LZ candidates).
- `api/` — FastAPI endpoints; see `api/main.py` (router inclusion, `/candidates`) and `api/m2.py` (M2 obstacles & clearance features).
- `core/` — core logic:
  - `core/raster.py` — raster I/O, obstacle extraction (`compute_obstacles`).
  - `core/clearance.py` — route sampling and clearance logic (`clearance_along_route`).
- `scripts/lz_candidates.py` — CLI-style pipeline used by the `/candidates` endpoint.
- `tests/test_m2.py` — unit tests that demonstrate minimal expected inputs/outputs and usage patterns.

Big-picture architecture
- Single Python project (no separate services). FastAPI provides HTTP endpoints under `api/` and reuses `core/` functions for heavy computation.
- Data flow: API handlers create small AOI GeoTIFF subsets (see `api/m2._subset_raster`) → call `core` functions (`compute_obstacles`, `clearance_along_route`) → return GeoJSON FeatureCollections.
- Spatial CRS: the code expects UTM/metric CRS for raster operations. WGS84→UTM helpers are in `api/m2.py` (`_wgs84_to_raster_xy`). Keep transformations consistent when adding features.

Important conventions and patterns
- Temporary files: endpoints slice rasters into a `tempfile.TemporaryDirectory()` and pass paths to `core` functions. Prefer this pattern for memory-friendly work.
- CRS/units: raster pixel sizes and distances are in meters (UTM). When accepting WGS84 inputs, convert to UTM before computing bounds or buffers.
- Minimal, opinionated error handling: endpoints raise `HTTPException` for client errors and wrap raster `RasterioIOError` into 400 responses.
- Geometry I/O: GeoJSON FeatureCollections are used across the API; `compute_obstacles` returns a list of Feature dicts and `clearance_along_route` returns FeatureCollections for segments and hotspots.

Testing and developer workflows
- Run unit tests: `python -m pytest` (project contains `tests/test_m2.py`). Tests create small temporary rasters to validate `compute_obstacles` and `clearance_along_route`.
- Start API locally: `uvicorn api.main:app --reload` (used by README). The FastAPI docs are available at `/docs`.
- Serve frontend: `python -m http.server -d frontend 8081` and open `http://localhost:8081`.

Code-change guidance (when editing)
- Make the smallest change that satisfies the request. Preserve public function signatures in `core/` where tests rely on them.
- If you modify raster reading/writing, run or add tests in `tests/` that create small synthetic GeoTIFFs similar to existing tests.
- For endpoints that create temporary rasters (e.g. `api/m2.*`), ensure you keep the `TemporaryDirectory()` pattern so files are cleaned up.
- When changing numeric defaults (window sizes, step_m, corridor widths), update or add tests that assert behavior at those defaults.

Files to inspect for examples
- `api/m2.py` — how endpoints assemble AOI, subset rasters, call `compute_obstacles` and `clearance_along_route`.
- `core/raster.py` — obstacle extraction pipeline, morphology and vectorization examples.
- `core/clearance.py` — route sampling, elevation sampling from DSM/DTM, and feature construction for segments/hotspots.
- `tests/test_m2.py` — canonical test fixtures (temporary rasters) and expected assertions.

Integration points and external deps
- Relies on rasterio, numpy, shapely, pyproj, scikit-image, and FastAPI/uvicorn. See `requirements.txt` for full list.
- Rasters under `data/` (e.g., `dem.tif`, `DSM_utm.tif`, `DTM_utm.tif`) are large and not in the repo; use small synthetic rasters in tests.

When uncertain, ask the user
- Which CRS(s) should be treated as authoritative for new endpoints? (current code assumes UTM for rasters.)
- Should new features accept WGS84 input and reproject internally (preferred) or require UTM input?

Keep this file short — open for edits if you want more examples or stricter rules.
