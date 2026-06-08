"""
Cadence DJ System — Global Configuration
"""

# Audio engine settings
SAMPLE_RATE = 44100          # Hz — CD-quality sample rate
CHANNELS = 2                 # Stereo output
BLOCK_SIZE = 1024            # Frames per audio callback buffer
DTYPE = "float32"            # Audio data type

# File handling
UPLOAD_DIR = "uploads"       # Directory for uploaded track files
DATA_DIR = "data"            # Directory for persistent JSON data
EXPORT_DIR = "exports"       # Directory for recorded mix exports

# WebSocket
WS_UPDATE_INTERVAL = 0.05   # 50ms = 20 updates/sec for real-time state

# Waveform
WAVEFORM_PEAKS = 1800        # Number of peaks for waveform overview
