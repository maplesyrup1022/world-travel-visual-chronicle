from datetime import date
import asyncio
from io import BytesIO
import json
import os
import re
from typing import Optional
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

import piexif
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Query, Session as SASession
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

from api_schema import (
    ExperienceTypeAggResponse,
    LocationCreate,
    LocationNameResponse,
    MediaAssetResponse,
    StatsResponse,
    SummaryExperienceResponse,
    SummaryLifePeriodResponse,
)
from db_init import Experience, LifePeriod, Location, MediaAsset, User, Session

# test use only replaced with user auth later
user_id = int(os.getenv("CURRENT_USER_ID"))

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
# api.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
register_heif_opener()
THUMBNAIL_SIZE = (512, 512)

def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


def get_current_user(db: SASession) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def check_unique_user_username(
    new_name: str, db: SASession, exclude_user_id: Optional[int] = None
) -> None:
    query = db.query(User).filter(User.username == new_name)
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Username already exists")


def create_location_if_not_exists(
    location: LocationCreate,
    db: SASession,
    exclude_location_id: Optional[int] = None,
) -> Location:
    query = db.query(Location).filter(
        Location.city == location.city,
        Location.country == location.country,
    )
    if exclude_location_id is not None:
        query = query.filter(Location.id != exclude_location_id)
    existing_location = query.first()
    if existing_location:
        return existing_location

    new_location = Location(
        city=location.city,
        country=location.country,
        longitude=location.longitude,
        latitude=location.latitude,
    )
    db.add(new_location)
    db.flush()
    return new_location


def check_unique_life_period_title(
    user_id: int,
    new_title: str,
    db: SASession,
    exclude_life_period_id: Optional[int] = None,
) -> None:
    query = db.query(LifePeriod).filter(
        LifePeriod.user_id == user_id,
        LifePeriod.title == new_title,
    )
    if exclude_life_period_id is not None:
        query = query.filter(LifePeriod.id != exclude_life_period_id)
    if query.first():
        raise HTTPException(
            status_code=400, detail="Life period with the same title already exists")


def check_unique_experience_title(
    user_id: int,
    new_title: str,
    db: SASession,
    exclude_experience_id: Optional[int] = None,
) -> None:
    query = db.query(Experience).filter(
        Experience.user_id == user_id,
        Experience.title == new_title,
    )
    if exclude_experience_id is not None:
        query = query.filter(Experience.id != exclude_experience_id)
    if query.first():
        raise HTTPException(
            status_code=400, detail="Experience with the same title already exists")


def check_unique_media_asset_title(
    user_id: int,
    new_title: str,
    db: SASession,
    exclude_media_asset_id: Optional[int] = None,
) -> None:
    query = db.query(MediaAsset).filter(
        MediaAsset.user_id == user_id,
        MediaAsset.title == new_title,
    )
    if exclude_media_asset_id is not None:
        query = query.filter(MediaAsset.id != exclude_media_asset_id)
    if query.first():
        raise HTTPException(
            status_code=400, detail="Media asset with the same title already exists")


def get_location(location_id: int, db: SASession) -> Location:
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


def get_life_period(user_id, life_period_id: int, db: SASession) -> LifePeriod:
    life_period = db.query(LifePeriod).filter(
        LifePeriod.user_id == user_id,
        LifePeriod.id == life_period_id,
    ).first()
    if not life_period:
        raise HTTPException(status_code=404, detail="Life period not found")
    return life_period


def get_experience(user_id, experience_id: int, db: SASession) -> Experience:
    experience = db.query(Experience).filter(
        Experience.id == experience_id,
        Experience.user_id == user_id,
    ).first()
    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")
    return experience


def get_media_asset(user_id, media_asset_id: int, db: SASession) -> MediaAsset:
    media_asset = db.query(MediaAsset).filter(
        MediaAsset.id == media_asset_id,
        MediaAsset.user_id == user_id,
    ).first()
    if not media_asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
    return media_asset


def get_unique_location_ids_visited(user_id: int, db: SASession,
                                    year: Optional[int] = None,
                                    start_date: Optional[date] = None,
                                    end_date: Optional[date] = None) -> set[int]:
    location_ids = set()
    life_period_rows = get_all_life_periods_query(
        user_id, db, year, start_date, end_date
    ).with_entities(LifePeriod.location_id).all()
    experience_rows = get_all_experiences_query(
        user_id, db, year, start_date, end_date
    ).with_entities(Experience.location_id).all()
    location_ids.update(
        location_id
        for (location_id,) in life_period_rows + experience_rows
        if location_id is not None
    )

    query = db.query(MediaAsset).filter(
        MediaAsset.user_id == user_id,
        MediaAsset.location_id.is_not(None)
    )
    if year is not None:
        query = query.filter(
            MediaAsset.captured_at >= date(year, 1, 1),
            MediaAsset.captured_at <= date(year, 12, 31),
        )
    if start_date is not None:
        query = query.filter(MediaAsset.captured_at >= start_date)
    if end_date is not None:
        query = query.filter(MediaAsset.captured_at <= end_date)
    rows = query.with_entities(MediaAsset.location_id).all()
    location_ids.update(row[0] for row in rows)
    return location_ids


def get_all_life_periods_query(
    user_id: int,
    db: SASession,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None
) -> Query:
    query = db.query(LifePeriod).filter(LifePeriod.user_id == user_id)
    if year is not None:
        query = query.filter(
            LifePeriod.start_date <= date(year, 12, 31),
            LifePeriod.end_date >= date(year, 1, 1),
        )
    if start_date is not None:
        query = query.filter(LifePeriod.end_date >= start_date)
    if end_date is not None:
        query = query.filter(LifePeriod.start_date <= end_date)
    if location_id is not None:
        query = query.filter(LifePeriod.location_id == location_id)
    if search is not None and search.strip():
        escaped_search = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        query = query.filter(
            LifePeriod.title.ilike(f"%{escaped_search}%", escape="\\")
        )
    query = query.order_by(LifePeriod.start_date)
    if limit is not None:
        query = query.limit(limit)
    return query


def get_all_experiences_under_life_period_query(
    user_id: int,
    life_period_id: int,
    db: SASession,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    experience_limit: Optional[int] = None,
    location_id: Optional[int] = None,
) -> Query:
    query = db.query(Experience).filter(
        Experience.user_id == user_id,
        Experience.life_period_id == life_period_id,
    )
    if year is not None:
        query = query.filter(
            Experience.start_date <= date(year, 12, 31),
            Experience.end_date >= date(year, 1, 1),
        )
    if start_date is not None:
        query = query.filter(Experience.end_date >= start_date)
    if end_date is not None:
        query = query.filter(Experience.start_date <= end_date)
    if location_id is not None:
        query = query.filter(Experience.location_id == location_id)
    query = query.order_by(Experience.start_date)
    if experience_limit is not None:
        query = query.limit(experience_limit)
    return query

def get_all_experiences_query(
    user_id: int,
    db: SASession,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    location_id: Optional[int] = None,
    exclude: Optional[bool] = False,
    search: Optional[str] = None,
    experience_limit: Optional[int] = None,
) -> Query:
    query = db.query(Experience).filter(
        Experience.user_id == user_id
    )
    if year is not None:
        query = query.filter(
            Experience.start_date <= date(year, 12, 31),
            Experience.end_date >= date(year, 1, 1),
        )
    if start_date is not None:
        query = query.filter(Experience.end_date >= start_date)
    if end_date is not None:
        query = query.filter(Experience.start_date <= end_date)
    if location_id is not None:
        query = query.filter(Experience.location_id == location_id)
    if exclude:
        query = query.filter(Experience.life_period_id.is_(None))
    if search is not None and search.strip():
        escaped_search = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        query = query.filter(
            Experience.title.ilike(f"%{escaped_search}%", escape="\\")
        )
    query = query.order_by(Experience.start_date)
    if experience_limit is not None:
        query = query.limit(experience_limit)
    return query

def get_all_media_assets_under_experience_query(
    user_id: int,
    experience_id: int,
    db: SASession,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    media_asset_limit: Optional[int] = None,
    location_id: Optional[int] = None,
) -> Query:
    query = db.query(MediaAsset).filter(
        MediaAsset.user_id == user_id,
        MediaAsset.experience_id == experience_id,
    )
    if year is not None:
        query = query.filter(
            MediaAsset.captured_at >= date(year, 1, 1),
            MediaAsset.captured_at <= date(year, 12, 31),
        )
    if start_date is not None:
        query = query.filter(MediaAsset.captured_at >= start_date)
    if end_date is not None:
        query = query.filter(MediaAsset.captured_at <= end_date)
    if location_id is not None:
        query = query.filter(MediaAsset.location_id == location_id)
    query = query.order_by(MediaAsset.captured_at)
    if media_asset_limit is not None:
        query = query.limit(media_asset_limit)
    return query

def get_all_media_assets_query(
    user_id: int,
    db: SASession,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    location_id: Optional[int] = None,
    exclude: Optional[bool] = False,
    search: Optional[str] = None,
    media_asset_limit: Optional[int] = None,
) -> Query:
    query = db.query(MediaAsset).filter(
        MediaAsset.user_id == user_id
    )
    if year is not None:
        query = query.filter(
            MediaAsset.captured_at >= date(year, 1, 1),
            MediaAsset.captured_at <= date(year, 12, 31),
        )
    if start_date is not None:
        query = query.filter(MediaAsset.captured_at >= start_date)
    if end_date is not None:
        query = query.filter(MediaAsset.captured_at <= end_date)
    if location_id is not None:
        query = query.filter(MediaAsset.location_id == location_id)
    if exclude:
        query = query.filter(MediaAsset.experience_id.is_(None))
    if search is not None and search.strip():
        escaped_search = (
            search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        query = query.filter(
            MediaAsset.title.ilike(f"%{escaped_search}%", escape="\\")
        )
    query = query.order_by(MediaAsset.captured_at)
    if media_asset_limit is not None:
        query = query.limit(media_asset_limit)
    return query


def validate_start_end_date(new_start_date: date, new_end_date: date) -> None:
    if new_start_date > new_end_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be greater than or equal to start_date",
        )

async def read_uploaded_image(request):
    image_data = bytearray()
    async for chunk in request.stream():
        if len(image_data) + len(chunk) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Image file must be 15 MB or smaller.",
            )
        image_data.extend(chunk)
    if not image_data:
        raise HTTPException(status_code=400, detail="Choose an image to upload.")

    try:
        with Image.open(BytesIO(image_data)) as image:
            if image.format not in {
                "JPEG",
                "PNG",
                "WEBP",
                "GIF",
                "BMP",
                "HEIF",
                "HEIC",
            }:
                raise HTTPException(
                    status_code=415,
                    detail=(
                        "Upload a JPEG, PNG, WebP, GIF, BMP, HEIC, or HEIF image."
                    ),
                )
            if image.width * image.height > 40_000_000:
                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions are too large to process.",
                )
            image.load()
    except HTTPException:
        raise
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        SyntaxError,
        UnidentifiedImageError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=400,
            detail=f"The uploaded file could not be decoded as an image: {error}",
        ) from error

    try:
        metadata = extract_image_metadata(bytes(image_data))
    except (OSError, SyntaxError, ValueError, TypeError):
        metadata = {"captured_at": None, "latitude": None, "longitude": None}

    return bytes(image_data), metadata


def extract_image_metadata(image_source):
    if isinstance(image_source, bytes):
        image_source = BytesIO(image_source)

    with Image.open(image_source) as image:
        exif_data = image.info.get("exif")
        if not exif_data:
            return {"captured_at": None, "latitude": None, "longitude": None}

    try:
        exif_dict = piexif.load(exif_data)
    except (piexif.InvalidImageDataError, TypeError, ValueError):
        return {"captured_at": None, "latitude": None, "longitude": None}

    raw_date = (
        exif_dict.get("Exif", {}).get(piexif.ExifIFD.DateTimeOriginal)
        or exif_dict.get("Exif", {}).get(piexif.ExifIFD.DateTimeDigitized)
        or exif_dict.get("0th", {}).get(piexif.ImageIFD.DateTime)
    )
    if isinstance(raw_date, bytes):
        raw_date = raw_date.decode("ascii", errors="ignore")
    try:
        captured_at = date.fromisoformat(raw_date[:10].replace(":", "-", 2))
    except (TypeError, ValueError):
        captured_at = None

    gps = exif_dict.get("GPS", {})
    latitude_value = gps.get(piexif.GPSIFD.GPSLatitude)
    longitude_value = gps.get(piexif.GPSIFD.GPSLongitude)

    def convert_to_degrees(value):
        return sum(
            (numerator / denominator) / (60**index)
            for index, (numerator, denominator) in enumerate(value)
        )

    try:
        latitude = convert_to_degrees(latitude_value) if latitude_value else None
        longitude = (
            convert_to_degrees(longitude_value) if longitude_value else None
        )
    except (TypeError, ValueError, ZeroDivisionError):
        latitude = None
        longitude = None

    if latitude is not None and gps.get(piexif.GPSIFD.GPSLatitudeRef) in (
        b"S",
        "S",
    ):
        latitude = -latitude
    if longitude is not None and gps.get(piexif.GPSIFD.GPSLongitudeRef) in (
        b"W",
        "W",
    ):
        longitude = -longitude

    if latitude is not None and not -90 <= latitude <= 90:
        latitude = None
    if longitude is not None and not -180 <= longitude <= 180:
        longitude = None

    return {
        "captured_at": captured_at,
        "latitude": latitude,
        "longitude": longitude,
    }


def _reverse_geocode_locations(longitude, latitude, limit, access_token):
    if not access_token:
        raise HTTPException(
            status_code=503,
            detail="Mapbox reverse geocoding is not configured on the backend.",
        )

    params = urlencode(
        {
            "longitude": longitude,
            "latitude": latitude,
            "types": "place",
            "limit": limit,
            "access_token": access_token,
        }
    )
    request_url = (
        "https://api.mapbox.com/search/geocode/v6/reverse?" + params
    )
    try:
        with urlopen(request_url, timeout=10) as response:
            result = json.loads(response.read())
    except HTTPError as error:
        try:
            response_body = json.loads(error.read())
            provider_message = response_body.get("message")
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            provider_message = None
        detail = f"Mapbox reverse geocoding failed (HTTP {error.code})"
        if provider_message:
            detail = f"{detail}: {provider_message}"
        raise HTTPException(status_code=502, detail=detail) from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not retrieve nearby cities from Mapbox: {error}",
        ) from error

    for feature in result.get("features", []):
        properties = feature.get("properties") or {}
        city = properties.get("name")
        country = (properties.get("context") or {}).get("country", {}).get(
            "name"
        )
        coordinates = (feature.get("geometry") or {}).get("coordinates")
        if (
            not city
            or not country
            or not isinstance(coordinates, list)
            or len(coordinates) < 2
        ):
            continue
        return LocationCreate(
                city=city,
                country=country,
                longitude=coordinates[0],
                latitude=coordinates[1],
            )


async def get_nearest_locations(longitude, latitude, limit):
    access_token = os.getenv("MAPBOX_ACCESS_TOKEN")
    return await asyncio.to_thread(
        _reverse_geocode_locations, longitude, latitude, limit, access_token
    )

def _cap_description_paragraphs(description: str) -> str:
    parts = re.split(r"(\r\n|\r|\n)", description)
    return "".join(
        part if index % 2 else part[:50]
        for index, part in enumerate(parts)
    )


def get_chronicle(user_id: int,
    db: SASession, cap: bool = False, year: Optional[int] = None,
                 start_date: Optional[date] = None, end_date: Optional[date] = None,
                 experience_limit: Optional[int] = None,
                 media_asset_limit: Optional[int] = None):
    life_periods = get_all_life_periods_query(
        user_id, db, year, start_date, end_date).all()
    summary_life_periods = []
    for life_period in life_periods:
        experiences = get_all_experiences_under_life_period_query(
            user_id, life_period.id, db, None, None, None,
            experience_limit).all()
        summary_experiences = []
        for experience in experiences:
            media_assets = get_all_media_assets_under_experience_query(
                user_id, experience.id, db, None, None, None,
                media_asset_limit).all()
            summary_experience = SummaryExperienceResponse.model_validate(
                experience
            )
            summary_experience.location = (
                LocationNameResponse.model_validate(
                    get_location(experience.location_id, db)
                )
                if experience.location_id is not None
                else None
            )
            if summary_experience.description is not None and cap:
                summary_experience.description = _cap_description_paragraphs(
                    summary_experience.description
                )
            summary_experience.media_assets = [
                MediaAssetResponse.model_validate(media)
                for media in media_assets
            ]
            summary_experiences.append(summary_experience)

        summary_life_period = SummaryLifePeriodResponse.model_validate(
            life_period
        )
        summary_life_period.location = LocationNameResponse.model_validate(
            get_location(life_period.location_id, db)
        )
        if summary_life_period.description is not None and cap:
            summary_life_period.description = _cap_description_paragraphs(
                summary_life_period.description
            )
        summary_life_period.experiences = summary_experiences
        summary_life_periods.append(summary_life_period)
    return summary_life_periods


def get_chronicle_stats(
    user_id: int,
    db: SASession,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> StatsResponse:
    life_periods = get_all_life_periods_query(
        user_id, db, year, start_date, end_date
    ).all()
    experience_count = 0
    media_asset_count = 0
    experience_type_counts = {}
    location_ids = {life_period.location_id for life_period in life_periods}

    for life_period in life_periods:
        experiences = get_all_experiences_under_life_period_query(
            user_id, life_period.id, db
        ).all()
        experience_count += len(experiences)
        for experience in experiences:
            if experience.location_id is not None:
                location_ids.add(experience.location_id)
            media_assets = get_all_media_assets_under_experience_query(
                user_id, experience.id, db
            ).all()
            media_asset_count += len(media_assets)
            location_ids.update(
                media.location_id
                for media in media_assets
                if media.location_id is not None
            )
            experience_type_counts[experience.experience_type] = (
                experience_type_counts.get(experience.experience_type, 0) + 1
            )

    locations = db.query(Location).filter(Location.id.in_(location_ids))
    return StatsResponse(
        life_periods=len(life_periods),
        experiences=experience_count,
        media_assets=media_asset_count,
        cities_visited=locations.with_entities(
            func.count(func.distinct(Location.city))
        ).scalar(),
        countries_visited=locations.with_entities(
            func.count(func.distinct(Location.country))
        ).scalar(),
        experience_type_agg=[
            ExperienceTypeAggResponse(
                experience_type=experience_type,
                count=count,
            )
            for experience_type, count in experience_type_counts.items()
        ],
    )