import sys
import math
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling


# Usage: python scripts/auto_reproject_to_utm.py <src_dem.tif> <dst_utm_dem.tif>
src_path, dst_path = sys.argv[1], sys.argv[2]
with rasterio.open(src_path) as src:
	# Merkezden UTM zon hesapla (WGS84 varsayımı)
	cx = (src.bounds.left + src.bounds.right) / 2.0
	cy = (src.bounds.top + src.bounds.bottom) / 2.0
	zone = int(math.floor((cx + 180) / 6) + 1)
	north = cy >= 0
	epsg = 32600 + zone if north else 32700 + zone # 326xx: UTM N, 327xx: UTM S
	dst_crs = f"EPSG:{epsg}"

	transform, width, height = calculate_default_transform(src.crs, dst_crs, src.width, src.height, *src.bounds)
	kwargs = src.meta.copy()
	kwargs.update({"crs": dst_crs, "transform": transform, "width": width, "height": height})
	with rasterio.open(dst_path, 'w', **kwargs) as dst:
		for i in range(1, src.count + 1):
			reproject(
				source=rasterio.band(src, i), destination=rasterio.band(dst, i),
				src_transform=src.transform, src_crs=src.crs, dst_transform=transform, dst_crs=dst_crs,
				resampling=Resampling.bilinear,
			)
		print(dst_crs)