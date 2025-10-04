import sys
import numpy as np
import rasterio
from rasterio.enums import Resampling
from scipy.ndimage import minimum_filter, gaussian_filter, grey_opening


# Usage: python scripts/dtm_from_dsm.py <DSM_utm.tif> <DTM_utm.tif> [--win_px 5] [--sigma 1.0] [--method min|open]
# Öneri: UTM'ye çevrilmiş DSM kullan; win_px ~ (hedef bastırılacak obje çapı / piksel_metre)


src_path, dst_path = sys.argv[1], sys.argv[2]
win_px = int(next((sys.argv[i+1] for i,a in enumerate(sys.argv) if a=='--win_px'), 5))
sigma = float(next((sys.argv[i+1] for i,a in enumerate(sys.argv) if a=='--sigma'), 1.0))
method = str(next((sys.argv[i+1] for i,a in enumerate(sys.argv) if a=='--method'), 'open')).lower()


with rasterio.open(src_path) as src:
	dsm = src.read(1).astype(np.float32)
	meta = src.meta.copy(); meta.update(dtype='float32')


# Morfolojik taban (zemini yakalayıp çıkıntıları yok eder)
if method == 'min':
	dtm = minimum_filter(dsm, size=win_px)
elif method == 'open':
	# grey_opening: erozyon + genişletme, yapısal eleman ~ win_px
	dtm = grey_opening(dsm, size=(win_px, win_px))
else:
	raise SystemExit("method must be 'min' or 'open'")


# Gürültü yumuşatma
if sigma > 0:
	dtm = gaussian_filter(dtm, sigma=sigma)


with rasterio.open(dst_path, 'w', **meta) as dst:
	dst.write(dtm.astype(np.float32), 1)


print(f"DTM written: {dst_path}")