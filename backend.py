from datetime import date
from io import BytesIO
import json
import os
from typing import List, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session as SASession
from PIL import Image, ImageOps, UnidentifiedImageError
from openai import OpenAI
from dotenv import load_dotenv

from api_schema import (
    ExperienceCreate,
    ExperienceResponse,
    ExperienceUpdate,
    LifePeriodCreate,
    LifePeriodResponse,
    LifePeriodUpdate,
    LocationCreate,
    LocationNameResponse,
    LocationResponse,
    LocationSummaryResponse,
    LocationUpdate,
    MediaAssetCreate,
    MediaAssetResponse,
    MediaAssetInfoResponse,
    MediaAssetUpdate,
    SummaryExperienceResponse,
    SummaryLifePeriodResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
    StatsResponse
)
from db_init import (
    Experience,
    LifePeriod,
    Location,
    MediaAsset,
    User
)
from service import (
    THUMBNAIL_SIZE,
    UPLOAD_DIR,
    check_unique_experience_title,
    check_unique_life_period_title,
    create_location_if_not_exists,
    check_unique_media_asset_title,
    check_unique_user_username,
    extract_image_metadata,
    get_current_user,
    get_db,
    get_all_experiences_under_life_period_query,
    get_all_experiences_query,
    get_all_life_periods_query,
    get_all_media_assets_under_experience_query,
    get_all_media_assets_query,
    get_experience,
    get_life_period,
    get_location,
    get_media_asset,
    validate_start_end_date,
    get_unique_location_ids_visited,
    get_nearest_locations,
    read_uploaded_image,
    get_chronicle,
    get_chronicle_stats as get_chronicle_stats_service,
)

load_dotenv()

api = FastAPI(title="World Travel Visual Chronicle API")
api.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

origins = [
    "http://localhost:3000",  # Next.js dev server
    "http://127.0.0.1:3000",
]

api.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # allowed frontend origins
    allow_credentials=True,
    allow_methods=["*"],              # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],              # Authorization, Content-Type, etc.
)
# Backend notes:
# - api_schema.py contains Pydantic request and response models.
# - service.py contains database sessions, reusable validation, queries, and metadata extraction.
# - This file contains FastAPI route handlers and HTTP-specific response wiring.
# - Authentication is not implemented yet; service.py currently uses CURRENT_USER_ID.
# - The main data hierarchy is User -> LifePeriod -> Experience -> MediaAsset.
# - Location is shared by life periods, experiences, and media assets.
# - The location summary returns Location -> LifePeriod -> Experience -> MediaAsset.
#
# Pydantic notes:
# - Request models validate incoming data before route functions run.
# - Response models validate the objects returned by route functions.
# - model_dump(exclude_unset=True) makes partial updates possible.

# year query use overlap semantics, start_date, end_date use strict after/before

@api.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: SASession = Depends(get_db)):
    # Check whether the username already exists before inserting.
    check_unique_user_username(user.username, db)
    new_user = User(**user.model_dump())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@api.get("/user/current", response_model=UserResponse)
def get_user(db: SASession = Depends(get_db)):
    # Get the current user. Authentication will replace this later.
    return get_current_user(db)


@api.get("/users", response_model=List[UserResponse])
def get_all_users(db: SASession = Depends(get_db)):
    # Admin-only behavior should be added when authentication exists.
    return db.query(User).all()


@api.put("/users", response_model=UserResponse)
def update_user(user_update: UserUpdate, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    if user_update.username is not None:
        check_unique_user_username(user_update.username, db, user.id)
    for key, value in user_update.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@api.delete("/users")
def delete_user(db: SASession = Depends(get_db)):
    user = get_current_user(db)
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


# Location routes. A city-country pair is unique in the database.


"""@api.post("/locations", response_model=LocationResponse)
def create_location(location: LocationCreate, db: SASession = Depends(get_db)):
    new_location = Location(**location.model_dump())
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location"""


@api.get("/locations", response_model=List[LocationResponse])
def get_all_locations(db: SASession = Depends(get_db)):
    return db.query(Location).all()


# This static route must be declared before /locations/{location_id}.
@api.get("/locations/visited", response_model=List[LocationResponse])
def get_all_visited_locations(db: SASession = Depends(get_db), year: Optional[int] = None,
                              start_date: Optional[date] = None,
                              end_date: Optional[date] = None):
    user = get_current_user(db)
    location_ids = get_unique_location_ids_visited(
        user.id, db, year, start_date, end_date)
    return db.query(Location).filter(Location.id.in_(location_ids)).all()


@api.get("/locations/{location_id}", response_model=LocationResponse)
def get_location_route(location_id: int, db: SASession = Depends(get_db)):
    return get_location(location_id, db)


# Returns a layered summary:
# location -> life_periods -> experiences -> media_assets.
# Date filters use overlap semantics, so an item is included if it intersects the filter period.


@api.get("/locations/{location_id}/summary", response_model=LocationSummaryResponse)
def get_location_summary(
    location_id: int,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    experience_limit: Optional[int] = None,
    media_asset_limit: Optional[int] = 5,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    location = get_location(location_id, db)
    life_periods = get_all_life_periods_query(
        user.id, db, year, start_date, end_date, location_id).all()
    summary_life_periods = []
    for life_period in life_periods:
        experiences = get_all_experiences_under_life_period_query(
            user.id, life_period.id, db, None, None, None,
            experience_limit, None).all()
        summary_experiences = []
        for experience in experiences:
            media_assets = get_all_media_assets_under_experience_query(
                user.id, experience.id, db, None, None, None,
                media_asset_limit).all()
            summary_experience = SummaryExperienceResponse.model_validate(
                experience)
            summary_experience.location = (
                LocationNameResponse.model_validate(
                    get_location(experience.location_id, db)
                )
                if experience.location_id is not None
                else None
            )
            summary_experience.media_assets = [
                MediaAssetResponse.model_validate(media)
                for media in media_assets
            ]
            summary_experiences.append(summary_experience)

        summary_life_period = SummaryLifePeriodResponse.model_validate(
            life_period)
        summary_life_period.location = LocationNameResponse.model_validate(
            get_location(life_period.location_id, db)
        )
        summary_life_period.experiences = summary_experiences
        summary_life_periods.append(summary_life_period)

    return LocationSummaryResponse(
        location=LocationResponse.model_validate(location),
        life_periods=summary_life_periods,
    )


'''
@api.put("/locations/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: int,
    location_update: LocationUpdate,
    db: SASession = Depends(get_db),
):
    location = get_location(location_id, db)
    for key, value in location_update.model_dump(exclude_unset=True).items():
        setattr(location, key, value)
    db.commit()
    db.refresh(location)
    return location
'''


@api.delete("/locations/{location_id}")
def delete_location(location_id: int, db: SASession = Depends(get_db)):
    location = get_location(location_id, db)
    db.delete(location)
    db.commit()
    return {"message": "Location deleted successfully"}


# LifePeriod routes. A LifePeriod is a broad period of a user's life.


@api.post("/life-periods", response_model=LifePeriodResponse)
def create_life_period(data: LifePeriodCreate, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    check_unique_life_period_title(user.id, data.title, db)
    location = create_location_if_not_exists(data.location, db)
    life_period_data = data.model_dump(exclude={"location"})
    life_period = LifePeriod(
        **life_period_data,
        user_id=user.id,
        location_id=location.id,
    )
    db.add(life_period)
    db.commit()
    db.refresh(life_period)
    return life_period


@api.get("/life-periods", response_model=List[LifePeriodResponse])
def get_all_life_periods(
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    return get_all_life_periods_query(
        user.id, db, year, start_date, end_date, location_id, search, limit
    ).all()


@api.get("/life-periods/{life_period_id}", response_model=LifePeriodResponse)
def get_life_period_route(life_period_id: int, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    return get_life_period(user.id, life_period_id, db)


@api.put("/life-periods/{life_period_id}", response_model=LifePeriodResponse)
def update_life_period(
    life_period_id: int,
    data: LifePeriodUpdate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    life_period = get_life_period(user.id, life_period_id, db)
    if data.title is not None:
        check_unique_life_period_title(user.id, data.title, db, life_period.id)
    if data.location_id is not None:
        get_location(data.location_id, db)
    values = data.model_dump(exclude_unset=True)
    validate_start_end_date(
        values.get("start_date", life_period.start_date),
        values.get("end_date", life_period.end_date),
    )
    for key, value in values.items():
        setattr(life_period, key, value)
    db.commit()
    db.refresh(life_period)
    return life_period


@api.delete("/life-periods/{life_period_id}")
def delete_life_period(life_period_id: int, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    life_period = get_life_period(user.id, life_period_id, db)
    db.delete(life_period)
    db.commit()
    return {"message": "Life period deleted successfully"}


# Experience routes. An Experience is a concrete activity inside a LifePeriod.


@api.post("/experiences", response_model=ExperienceResponse)
def create_experience(
    data: ExperienceCreate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    check_unique_experience_title(user.id, data.title, db)
    if data.life_period_id is not None:
        get_life_period(user.id, data.life_period_id, db)
    location = create_location_if_not_exists(data.location, db) if data.location is not None else None
    try:
        experience_data = data.model_dump(
            exclude={"location"}
        )
        experience = Experience(
            **experience_data,
            location_id=location.id if location else None,
            user_id=user.id,
        )
        db.add(experience)
        db.commit()
        db.refresh(experience)
        return experience
    except Exception:
        db.rollback()
        raise


@api.get("/life-periods/{life_period_id}/experiences", response_model=List[ExperienceResponse])
def get_all_experiences_under_life_period(
    life_period_id: int,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    experience_limit: Optional[int] = None,
    location_id: Optional[int] = None,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    get_life_period(user.id, life_period_id, db)
    return get_all_experiences_under_life_period_query(
        user.id, life_period_id, db, year, start_date, end_date,
        experience_limit, location_id).all()


@api.get("/experiences", response_model=List[ExperienceResponse])
def get_all_experiences(
    db: SASession = Depends(get_db),
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    location_id: Optional[int] = None,
    exclude: Optional[bool] = False,
    search: Optional[str] = None,
    experience_limit: Optional[int] = None
):
    user = get_current_user(db)
    return get_all_experiences_query(
        user_id=user.id,
        db=db,
        year=year,
        start_date=start_date,
        end_date=end_date,
        location_id=location_id,
        exclude=exclude,
        search=search,
        experience_limit=experience_limit,
    ).all()


@api.get("/experiences/{experience_id}", response_model=ExperienceResponse)
def get_experience_route(experience_id: int, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    return get_experience(user.id, experience_id, db)


@api.put("/experiences/{experience_id}", response_model=ExperienceResponse)
def update_experience(
    experience_id: int,
    data: ExperienceUpdate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    experience = get_experience(user.id, experience_id, db)
    if data.title is not None:
        check_unique_experience_title(user.id, data.title, db, experience.id)
    if data.location_id is not None:
        get_location(data.location_id, db)
    if data.life_period_id is not None:
        get_life_period(user.id, data.life_period_id, db)
    values = data.model_dump(exclude_unset=True)
    validate_start_end_date(
        values.get("start_date", experience.start_date),
        values.get("end_date", experience.end_date),
    )
    for key, value in values.items():
        setattr(experience, key, value)
    db.commit()
    db.refresh(experience)
    return experience


@api.delete("/experiences/{experience_id}")
def delete_experience(experience_id: int, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    experience = get_experience(user.id, experience_id, db)
    db.delete(experience)
    db.commit()
    return {"message": "Experience deleted successfully"}


# MediaAsset routes. A media asset may be uploaded before it is linked to an Experience.


@api.post("/media-assets/info", response_model=MediaAssetInfoResponse)
async def read_upload_media_info(
    request: Request,
    db: SASession = Depends(get_db),
):
    _, metadata = await read_uploaded_image(request)
    user = get_current_user(db)
    captured_at = metadata["captured_at"]
    if captured_at is not None:
        experiences = get_all_experiences_query(
            user_id=user.id,
            db=db,
            start_date=captured_at,
            end_date=captured_at,
            experience_limit=5).all()
    else:
        experiences = []

    location = None
    if metadata["latitude"] is not None and metadata["longitude"] is not None:
        location = await get_nearest_locations(
            metadata["longitude"],
            metadata["latitude"],
            1
        )

    return {
        "captured_at": captured_at,
        "locations": location,
        "experiences": [
            {
                "id": experience.id,
                "title": experience.title,
            }
            for experience in experiences
        ],
    }


@api.post("/media-assets", response_model=MediaAssetResponse)
async def upload_media_asset(
    request: Request,
    title: Optional[str] = None,
    description: Optional[str] = None,
    captured_at: Optional[date] = None,
    experience_id: Optional[int] = None,
    location_id: Optional[int] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    longitude: Optional[float] = None,
    latitude: Optional[float] = None,
    db: SASession = Depends(get_db),
):
    image_data, metadata = await read_uploaded_image(request)
    try:
        with Image.open(BytesIO(image_data)) as image:
            try:
                thumbnail = ImageOps.exif_transpose(image)
            except (OSError, SyntaxError, ValueError):
                thumbnail = image.copy()
            thumbnail.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            if (
                thumbnail.mode in ("RGBA", "LA")
                or "transparency" in thumbnail.info
            ):
                rgba = thumbnail.convert("RGBA")
                background = Image.new("RGB", rgba.size, "white")
                background.paste(rgba, mask=rgba.getchannel("A"))
                thumbnail = background
            else:
                thumbnail = thumbnail.convert("RGB")
            output = BytesIO()
            thumbnail.save(output, format="JPEG", quality=85, optimize=True)
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        UnidentifiedImageError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=400,
            detail=f"The uploaded file could not be processed as an image: {error}",
        ) from error

    user = get_current_user(db)
    if title is not None:
        check_unique_media_asset_title(user.id, title, db)
    if location_id is None and city and country:
        location = create_location_if_not_exists(
            LocationCreate(
                city=city,
                country=country,
                longitude=longitude,
                latitude=latitude,
            ),
            db,
        )
        location_id = location.id
    if location_id is not None:
        get_location(location_id, db)
    if experience_id is not None:
        get_experience(user.id, experience_id, db)

    filename = f"{uuid4().hex}.jpg"
    thumbnail_path = UPLOAD_DIR / filename
    try:
        thumbnail_path.write_bytes(output.getvalue())
        media_asset = MediaAsset(
            title=title,
            description=description,
            file_url=f"/uploads/{filename}",
            captured_at=captured_at or metadata["captured_at"],
            experience_id=experience_id,
            location_id=location_id,
            user_id=user.id,
        )
        db.add(media_asset)
        db.commit()
        db.refresh(media_asset)
    except Exception:
        db.rollback()
        thumbnail_path.unlink(missing_ok=True)
        raise
    return media_asset


@api.get("/media-assets", response_model=List[MediaAssetResponse])
def get_all_media_assets(
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    media_asset_limit: Optional[int] = None,
    location_id: Optional[int] = None,
    exclude: Optional[bool] = False,
    search: Optional[str] = None,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    return get_all_media_assets_query(
        user.id, db, year, start_date, end_date, location_id, exclude, search, media_asset_limit
    ).all()

@api.get("/media-assets/{media_asset_id}", response_model=MediaAssetResponse)
def get_media_asset_route(media_asset_id: int, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    return get_media_asset(user.id, media_asset_id, db)


@api.get("/experiences/{experience_id}/media-assets", response_model=List[MediaAssetResponse])
def get_all_media_assets_under_experience(
    experience_id: int,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    media_asset_limit: Optional[int] = None,
    location_id: Optional[int] = None,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    get_experience(user.id, experience_id, db)
    return get_all_media_assets_under_experience_query(
        user.id, experience_id, db, year, start_date, end_date,
        media_asset_limit, location_id).all()


@api.put("/media-assets/{media_asset_id}", response_model=MediaAssetResponse)
def update_media_asset(
    media_asset_id: int,
    data: MediaAssetUpdate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    media_asset = get_media_asset(user.id, media_asset_id, db)
    if data.title is not None:
        check_unique_media_asset_title(user.id, data.title, db, media_asset.id)
    if data.experience_id is not None:
        get_experience(user.id, data.experience_id, db)
    if data.location_id is not None:
        get_location(data.location_id, db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(media_asset, key, value)
    db.commit()
    db.refresh(media_asset)
    return media_asset


@api.delete("/media-assets/{media_asset_id}")
def delete_media_asset(media_asset_id: int, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    media_asset = get_media_asset(user.id, media_asset_id, db)
    db.delete(media_asset)
    db.commit()
    return {"message": "Media asset deleted successfully"}


@api.get("/chronicle", response_model=List[SummaryLifePeriodResponse])
def get_chronicle_route(db: SASession = Depends(get_db), year: Optional[int] = None,
                 start_date: Optional[date] = None, end_date: Optional[date] = None,
                 experience_limit: Optional[int] = None,
                 media_asset_limit: Optional[int] = 10):
    user = get_current_user(db)
    return get_chronicle(
        user_id=user.id, db=db, cap=False, year=year, start_date=start_date, end_date=end_date, experience_limit=experience_limit, media_asset_limit=media_asset_limit
    )

@api.get("/chronicle/stats", response_model=StatsResponse)
def get_chronicle_stats(db: SASession = Depends(get_db), year: Optional[int] = None,
                       start_date: Optional[date] = None, end_date: Optional[date] = None):
    user = get_current_user(db)
    return get_chronicle_stats_service(
        user.id,
        db,
        year=year,
        start_date=start_date,
        end_date=end_date,
    )

@api.get("/chronicle/summary")
def get_chronicle_summary(db: SASession = Depends(get_db), year: Optional[int] = None,
                 start_date: Optional[date] = None, end_date: Optional[date] = None,
                 experience_limit: Optional[int] = None,
                 media_asset_limit: Optional[int] = 0):
    user = get_current_user(db)
    chronicle = get_chronicle(
        user_id=user.id, db=db, cap=True, year=year, start_date=start_date, end_date=end_date, experience_limit=experience_limit, media_asset_limit=media_asset_limit
    )
    stats = get_chronicle_stats_service(
        user.id, db, year=year, start_date=start_date, end_date=end_date
    )
    client = OpenAI(
        api_key=os.getenv("CHATANYWHERE_API_KEY") or os.getenv("OPENAI_API_KEY"),
        base_url="https://api.chatanywhere.tech/v1",
    )

    chronicle_data = [
        SummaryLifePeriodResponse.model_validate(life_period).model_dump(
            mode="json"
        )
        for life_period in chronicle
    ]
    stats_data = stats.model_dump(mode="json")
    response = client.chat.completions.create(
        model=os.getenv("CHATANYWHERE_MODEL", "gpt-5.6-luna"),
        messages=[
            {
                "role": "user",
                "content": (
                    "只用下面给出的内容，用其中出现最多的语言，生成一份围绕4个关键词的简短总结。从个人成长的角度概括并分析数据和内容，用第二人称。每点前用序号，用markdown强调数字和主题词。\n"
                    + json.dumps(
                        {"chronicle": chronicle_data, "stats": stats_data},
                        ensure_ascii=False,
                    )
                ),
            }
        ],
    )

    return (
        response.choices[0].message.content,
        chronicle_data,
        stats_data,
    )


'''
def suggest_matching_experiences(self, session) -> list[Experience]:
        if self.captured_at is None:
            return []

        if self.location_id is not None:
            return (
                session.query(Experience)
                .filter(
                    Experience.user_id == self.user_id,
                    Experience.location_id == self.location_id,
                    Experience.start_date <= self.captured_at,
                    Experience.end_date >= self.captured_at,
                )
                .all()
            )

        return (
            session.query(Experience)
            .filter(
                Experience.user_id == self.user_id,
                Experience.start_date <= self.captured_at,
                Experience.end_date >= self.captured_at,
            )
            .all()
        )
'''