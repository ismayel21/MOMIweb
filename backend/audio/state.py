"""
Estado en memoria del volumen del módulo estómago (MAX98357 I2S).
"""

_state = {
    "volume": 200.0,   # gain actual (0–800)
    "min": 0.0,
    "max": 800.0,
}


def update_volume_state(volume: float, min_v: float = 0.0, max_v: float = 800.0):
    _state["volume"] = volume
    _state["min"] = min_v
    _state["max"] = max_v


def get_volume_state() -> dict:
    return dict(_state)
