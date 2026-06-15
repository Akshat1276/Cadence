"""
Cadence DJ System — Audio Device Management

Enumerates available audio output devices and provides device selection
for master and cue output routing.
"""

import sounddevice as sd


def list_output_devices() -> list[dict]:
    """
    List all available audio output devices.

    Returns a list of dicts with device info:
        - id: device index
        - name: device name
        - channels: max output channels
        - sample_rate: default sample rate
        - is_default: whether it's the system default
    """
    devices = sd.query_devices()
    default_output = sd.default.device[1]  # Default output device index

    output_devices = []
    for i, dev in enumerate(devices):
        if dev["max_output_channels"] > 0:
            output_devices.append({
                "id": i,
                "name": dev["name"],
                "channels": dev["max_output_channels"],
                "sample_rate": dev["default_samplerate"],
                "is_default": (i == default_output),
            })

    return output_devices


def get_device_info(device_id: int) -> dict | None:
    """Get info for a specific device by ID."""
    try:
        dev = sd.query_devices(device_id)
        return {
            "id": device_id,
            "name": dev["name"],
            "channels": dev["max_output_channels"],
            "sample_rate": dev["default_samplerate"],
        }
    except Exception:
        return None
