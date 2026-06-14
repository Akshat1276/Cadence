"""
Cadence DJ System — Metadata Extractor

Extracts audio metadata (title, artist, album, genre, duration)
from audio files using the mutagen library. Falls back to filename
parsing if tags are missing.
"""

import os
from mutagen import File as MutagenFile
from mutagen.id3 import ID3
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from library.models import Track


def extract_metadata(file_path: str) -> Track:
    """
    Extract metadata from an audio file and return a Track model.

    Supports MP3 (ID3), FLAC, OGG Vorbis, and other formats via mutagen.
    Falls back to filename parsing for missing fields.
    """
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

    # Default values from filename
    title = os.path.splitext(file_name)[0]
    artist = ""
    album = ""
    genre = ""
    duration = 0.0

    try:
        audio = MutagenFile(file_path)

        if audio is None:
            return Track(
                title=title,
                file_path=file_path,
                file_name=file_name,
                file_size=file_size,
            )

        # Get duration
        if audio.info:
            duration = audio.info.length or 0.0

        # Extract tags based on format
        if isinstance(audio, MP3):
            tags = audio.tags
            if tags:
                title = _get_id3_text(tags, "TIT2") or title
                artist = _get_id3_text(tags, "TPE1") or artist
                album = _get_id3_text(tags, "TALB") or album
                genre = _get_id3_text(tags, "TCON") or genre

        elif isinstance(audio, (FLAC, OggVorbis)):
            tags = audio.tags or {}
            title = _get_vorbis_tag(tags, "title") or title
            artist = _get_vorbis_tag(tags, "artist") or artist
            album = _get_vorbis_tag(tags, "album") or album
            genre = _get_vorbis_tag(tags, "genre") or genre

        else:
            # Generic mutagen fallback
            tags = audio.tags
            if tags:
                title = _get_generic_tag(tags, "title", "TIT2") or title
                artist = _get_generic_tag(tags, "artist", "TPE1") or artist
                album = _get_generic_tag(tags, "album", "TALB") or album
                genre = _get_generic_tag(tags, "genre", "TCON") or genre

    except Exception as e:
        print(f"[Metadata] Warning: Could not read tags from {file_name}: {e}")

    # Try to parse artist - title from filename if both are missing
    if not artist and " - " in title:
        parts = title.split(" - ", 1)
        artist = parts[0].strip()
        title = parts[1].strip()

    return Track(
        title=title,
        artist=artist,
        album=album,
        genre=genre,
        duration=round(duration, 2),
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
    )


def _get_id3_text(tags: ID3, key: str) -> str:
    """Extract text from an ID3 tag frame."""
    frame = tags.get(key)
    if frame and hasattr(frame, "text") and frame.text:
        return str(frame.text[0])
    return ""


def _get_vorbis_tag(tags: dict, key: str) -> str:
    """Extract text from a Vorbis comment tag."""
    values = tags.get(key, [])
    if values:
        return str(values[0])
    return ""


def _get_generic_tag(tags, *keys: str) -> str:
    """Try multiple tag keys and return the first match."""
    for key in keys:
        if hasattr(tags, "get"):
            val = tags.get(key)
            if val:
                if isinstance(val, list):
                    return str(val[0])
                return str(val)
        elif hasattr(tags, key):
            return str(getattr(tags, key))
    return ""
