from datetime import date
from typing import Optional

import piexif
from fastapi import HTTPException
from sqlalchemy.orm import Session as SASession
from PIL import Image

from db_init import Experience, LifePeriod, Location, MediaAsset, User, Session

CURRENT_USER_ID = 1


def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


def get_current_user(db: SASession) -> User:
    user = db.query(User).filter(User.id == CURRENT_USER_ID).first()
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


def check_unique_location_city_country_pair(
    new_city: str,
    new_country: str,
    db: SASession,
    exclude_location_id: Optional[int] = None,
) -> None:
    query = db.query(Location).filter(
        Location.city == new_city,
        Location.country == new_country,
    )
    if exclude_location_id is not None:
        query = query.filter(Location.id != exclude_location_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Location already exists")


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


def get_life_period(life_period_id: int, db: SASession) -> LifePeriod:
    user = get_current_user(db)
    life_period = db.query(LifePeriod).filter(
        LifePeriod.user_id == user.id,
        LifePeriod.id == life_period_id,
    ).first()
    if not life_period:
        raise HTTPException(status_code=404, detail="Life period not found")
    return life_period


def get_experience(experience_id: int, db: SASession) -> Experience:
    user = get_current_user(db)
    experience = db.query(Experience).filter(
        Experience.id == experience_id,
        Experience.user_id == user.id,
    ).first()
    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")
    return experience


def get_media_asset(media_asset_id: int, db: SASession) -> MediaAsset:
    user = get_current_user(db)
    media_asset = db.query(MediaAsset).filter(
        MediaAsset.id == media_asset_id,
        MediaAsset.user_id == user.id,
    ).first()
    if not media_asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
    return media_asset


def validate_start_end_date(new_start_date: date, new_end_date: date) -> None:
    if new_start_date > new_end_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be greater than or equal to start_date",
        )


def extract_image_metadata(file_path: str):
    image = Image.open(file_path)
    if "exif" not in image.info:
        return {"captured_at": None, "latitude": None, "longitude": None}

    exif_dict = piexif.load(image.info["exif"])
    date_taken = exif_dict["Exif"].get(piexif.ExifIFD.DateTimeOriginal)
    date_taken = date_taken.decode() if date_taken else None

    gps = exif_dict.get("GPS", {})
    latitude_value = gps.get(piexif.GPSIFD.GPSLatitude)
    longitude_value = gps.get(piexif.GPSIFD.GPSLongitude)
    latitude_ref = gps.get(piexif.GPSIFD.GPSLatitudeRef)
    longitude_ref = gps.get(piexif.GPSIFD.GPSLongitudeRef)

    def convert_to_degrees(value):
        degrees = value[0][0] / value[0][1]
        minutes = value[1][0] / value[1][1]
        seconds = value[2][0] / value[2][1]
        return degrees + minutes / 60.0 + seconds / 3600.0

    if latitude_value and longitude_value:
        latitude = convert_to_degrees(latitude_value)
        longitude = convert_to_degrees(longitude_value)
        if latitude_ref == b"S":
            latitude = -latitude
        if longitude_ref == b"W":
            longitude = -longitude
    else:
        latitude = None
        longitude = None

    return {
        "captured_at": date_taken,
        "latitude": latitude,
        "longitude": longitude,
    }
