# api/aircraft.py
from typing import Optional, Dict

PRESETS: Dict[str, dict] = {
    "EC135": { "rotor_diameter_m": 10.20, "safety_margin_m": 6.0, "k": 1.5, "slope_max_deg": 8.0 },
    "UH-1H": { "rotor_diameter_m": 14.63, "safety_margin_m": 8.0, "k": 1.6, "slope_max_deg": 7.0 },
    "S70":   { "rotor_diameter_m": 16.36, "safety_margin_m": 10.0, "k": 1.7, "slope_max_deg": 6.0 },
}

def resolve_aircraft_params(
    aircraft_code: Optional[str],
    rotor_diameter_m: Optional[float],
    safety_margin_m: Optional[float],
    k: Optional[float],
    slope_max_deg: Optional[float],
    user_min_diameter_m: float,
):
    base = PRESETS.get(aircraft_code or "", {}).copy()

    # override chain: query params > preset
    if rotor_diameter_m is not None: base["rotor_diameter_m"] = rotor_diameter_m
    if safety_margin_m is not None:  base["safety_margin_m"]  = safety_margin_m
    if k is not None:                base["k"]                = k
    if slope_max_deg is not None:    base["slope_max_deg"]    = slope_max_deg

    # defaultler (preset yoksa)
    base.setdefault("rotor_diameter_m", 0.0)
    base.setdefault("safety_margin_m",  0.0)
    base.setdefault("k",                1.0)
    base.setdefault("slope_max_deg",    slope_max_deg if slope_max_deg is not None else 12.0)

    # min_clear hesapla: kullanıcı min’inden büyükse onu kullan
    auto_min_clear = (base["rotor_diameter_m"] + base["safety_margin_m"]) * base["k"]
    min_clear_diameter_m = max(float(user_min_diameter_m), float(auto_min_clear))

    return {
        "code": aircraft_code,
        "rotor_diameter_m": float(base["rotor_diameter_m"]),
        "safety_margin_m":  float(base["safety_margin_m"]),
        "k":                float(base["k"]),
        "slope_max_deg":    float(base["slope_max_deg"]),
        "min_clear_diameter_m": float(min_clear_diameter_m),
    }
