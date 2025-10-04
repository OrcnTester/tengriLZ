# quick_check.py
import rasterio, sys
p = sys.argv[1]
with rasterio.open(p) as ds:
    print("CRS:", ds.crs)
    print("Bounds:", ds.bounds)
