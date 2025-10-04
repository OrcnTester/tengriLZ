import os
import tempfile
import numpy as np
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import LineString
from core.raster import compute_obstacles
from core.clearance import clearance_along_route
from scipy.ndimage import grey_opening




def _write_tif(path, arr, x0=0, y0=1000, pix=30.0):
	transform = from_origin(x0, y0, pix, pix)
	with rasterio.open(
		path, 'w', driver='GTiff',
		height=arr.shape[0], width=arr.shape[1], count=1,
		dtype=arr.dtype, crs='EPSG:32636', transform=transform
	) as dst:
		dst.write(arr, 1)




def test_obstacles_basic():
	with tempfile.TemporaryDirectory() as td:
		dtm = np.full((50, 50), 100.0, dtype=np.float32)
		dsm = dtm.copy(); dsm[20:30, 20:30] += 5.0
		dtm_path = os.path.join(td, 'DTM_utm.tif'); dsm_path = os.path.join(td, 'DSM.tif')
		_write_tif(dtm_path, dtm); _write_tif(dsm_path, dsm)
		feats = compute_obstacles(dsm_path, dtm_path, min_h=2.0)
		assert isinstance(feats, list) and len(feats) > 0
		h = feats[0]['properties']['height_m']
		assert 4.0 <= h <= 6.0




def test_clearance_pass_and_fail():
	with tempfile.TemporaryDirectory() as td:
		dtm = np.full((60, 60), 100.0, dtype=np.float32)
		dsm = dtm.copy(); dsm[25:35, 25:35] += 8.0
		dtm_path = os.path.join(td, 'DTM_utm.tif'); dsm_path = os.path.join(td, 'DSM.tif')
		_write_tif(dtm_path, dtm); _write_tif(dsm_path, dsm)
		obstacles = compute_obstacles(dsm_path, dtm_path, min_h=2.0)
		route = LineString([(5, 995), (55, 945)])

		segs, hotspots, summary = clearance_along_route(
			route=route, obstacles_fc={"type":"FeatureCollection","features":obstacles},
			altitude_mode="AGL", altitude_value_m=5.0,
			corridor_width_m=30.0, min_clearance_m=6.0, step_m=5.0,
			dtm_path=dtm_path, dsm_path=dsm_path,
		)
		assert summary["fails"] >= 1

		segs, hotspots, summary = clearance_along_route(
			route=route, obstacles_fc={"type":"FeatureCollection","features":obstacles},
			altitude_mode="AGL", altitude_value_m=15.0,
			corridor_width_m=30.0, min_clearance_m=6.0, step_m=5.0,
			dtm_path=dtm_path, dsm_path=dsm_path,
		)
		assert summary["fails"] == 0




# DSM: düz zemin + ortada kubbe (8 m). Morfolojik opening ile kubbe bastırılmalı → DTM ~ düz zemin
def test_dtm_from_dsm_morphology():
	# DSM: düz zemin + ortada kubbe (8 m). Morfolojik opening ile kubbe bastırılmalı → DTM ~ düz zemin
	with tempfile.TemporaryDirectory() as td:
		base = np.full((80, 80), 200.0, dtype=np.float32)
		dsm = base.copy()
		cy, cx = 40, 40
		for y in range(cy-10, cy+10):
			for x in range(cx-10, cx+10):
				dy, dx = (y-cy)/10.0, (x-cx)/10.0
				r2 = dx*dx + dy*dy
				if r2 <= 1.0:
					dsm[y, x] += 8.0 * (1.0 - r2)
		dsm_path = os.path.join(td, 'DSM.tif')
		_write_tif(dsm_path, dsm)

		# Opening ile DTM
		dtm = grey_opening(dsm, size=(5,5))
		# Engelin merkezindeki fark bastırılmış olmalı (≤ ~2 m tolerans)
		center_h = float(dsm[cy, cx] - dtm[cy, cx])
		assert center_h <= 2.0