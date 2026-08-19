from datetime import date
from typing import List, Optional

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session as SASession

from api_schema import (
    ExperienceCreate,
    ExperienceResponse,
    ExperienceUpdate,
    LifePeriodCreate,
    LifePeriodResponse,
    LifePeriodUpdate,
    LocationCreate,
    LocationResponse,
    LocationSummaryResponse,
    LocationUpdate,
    MediaAssetCreate,
    MediaAssetResponse,
    MediaAssetUpdate,
    SummaryExperienceResponse,
    SummaryLifePeriodResponse,
    SummaryMediaAssetResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from db_init import Experience, LifePeriod, Location, MediaAsset, User
from service import (
    check_unique_experience_title,
    check_unique_life_period_title,
    check_unique_location_city_country_pair,
    check_unique_media_asset_title,
    check_unique_user_username,
    extract_image_metadata,
    get_current_user,
    get_db,
    get_experience,
    get_life_period,
    get_location,
    get_media_asset,
    validate_start_end_date,
)


api = FastAPI(title="World Travel Visual Chronicle API")


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


@api.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: SASession = Depends(get_db)):
    # Check whether the username already exists before inserting.
    check_unique_user_username(user.username, db)
    new_user = User(**user.model_dump())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@api.get("/users", response_model=UserResponse)
def get_user(db: SASession = Depends(get_db)):
    # Get the current user. Authentication will replace this later.
    return get_current_user(db)


@api.get("/users/all", response_model=List[UserResponse])
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


@api.post("/locations", response_model=LocationResponse)
def create_location(location: LocationCreate, db: SASession = Depends(get_db)):
    check_unique_location_city_country_pair(
        location.city, location.country, db)
    new_location = Location(**location.model_dump())
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location


@api.get("/locations", response_model=List[LocationResponse])
def get_all_locations(db: SASession = Depends(get_db)):
    return db.query(Location).all()


# This static route must be declared before /locations/{location_id}.
@api.get("/locations/visited", response_model=List[LocationResponse])
def get_all_visited_locations(db: SASession = Depends(get_db)):
    user = get_current_user(db)
    location_ids = set()
    for model in (LifePeriod, Experience, MediaAsset):
        rows = db.query(model.location_id).filter(
            model.user_id == user.id,
            model.location_id.is_not(None),
        ).all()
        location_ids.update(row[0] for row in rows)
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
    life_period_query = db.query(LifePeriod).filter(
        LifePeriod.user_id == user.id,
        LifePeriod.location_id == location_id,
    )
    if year is not None:
        life_period_query = life_period_query.filter(
            LifePeriod.start_date <= date(year, 12, 31),
            LifePeriod.end_date >= date(year, 1, 1),
        )
    if start_date is not None:
        life_period_query = life_period_query.filter(
            LifePeriod.end_date >= start_date)
    if end_date is not None:
        life_period_query = life_period_query.filter(
            LifePeriod.start_date <= end_date)

    summary_life_periods = []
    for life_period in life_period_query.order_by(LifePeriod.start_date).all():
        experience_query = db.query(Experience).filter(
            Experience.user_id == user.id,
            Experience.life_period_id == life_period.id,
        ).order_by(Experience.start_date)
        if year is not None:
            experience_query = experience_query.filter(
                Experience.start_date <= date(year, 12, 31),
                Experience.end_date >= date(year, 1, 1),
            )
        if start_date is not None:
            experience_query = experience_query.filter(
                Experience.end_date >= start_date)
        if end_date is not None:
            experience_query = experience_query.filter(
                Experience.start_date <= end_date)
        if experience_limit is not None:
            experience_query = experience_query.limit(experience_limit)

        summary_experiences = []
        for experience in experience_query.all():
            media_query = db.query(MediaAsset).filter(
                MediaAsset.user_id == user.id,
                MediaAsset.experience_id == experience.id,
            ).order_by(MediaAsset.captured_at)
            if year is not None:
                media_query = media_query.filter(
                    MediaAsset.captured_at >= date(year, 1, 1),
                    MediaAsset.captured_at <= date(year, 12, 31),
                )
            if start_date is not None:
                media_query = media_query.filter(
                    MediaAsset.captured_at >= start_date)
            if end_date is not None:
                media_query = media_query.filter(
                    MediaAsset.captured_at <= end_date)
            if media_asset_limit is not None:
                media_query = media_query.limit(media_asset_limit)

            summary_experiences.append(SummaryExperienceResponse(
                id=experience.id,
                title=experience.title,
                description=experience.description,
                experience_type=experience.experience_type,
                start_date=experience.start_date,
                end_date=experience.end_date,
                location_id=experience.location_id,
                life_period_id=experience.life_period_id,
                media_assets=[
                    SummaryMediaAssetResponse.model_validate(media)
                    for media in media_query.all()
                ],
            ))

        summary_life_periods.append(SummaryLifePeriodResponse(
            id=life_period.id,
            title=life_period.title,
            description=life_period.description,
            start_date=life_period.start_date,
            end_date=life_period.end_date,
            tag=life_period.tag,
            location_id=life_period.location_id,
            experiences=summary_experiences,
        ))

    return LocationSummaryResponse(
        location=LocationResponse.model_validate(location),
        life_periods=summary_life_periods,
    )


@api.put("/locations/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: int,
    location_update: LocationUpdate,
    db: SASession = Depends(get_db),
):
    location = get_location(location_id, db)
    check_unique_location_city_country_pair(
        location_update.city if location_update.city is not None else location.city,
        location_update.country if location_update.country is not None else location.country,
        db,
        location.id,
    )
    for key, value in location_update.model_dump(exclude_unset=True).items():
        setattr(location, key, value)
    db.commit()
    db.refresh(location)
    return location


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
    get_location(data.location_id, db)
    check_unique_life_period_title(user.id, data.title, db)
    life_period = LifePeriod(**data.model_dump(), user_id=user.id)
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
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    query = db.query(LifePeriod).filter(LifePeriod.user_id == user.id)
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
    return query.order_by(LifePeriod.start_date).all()


@api.get("/life-periods/{life_period_id}", response_model=LifePeriodResponse)
def get_life_period_route(life_period_id: int, db: SASession = Depends(get_db)):
    return get_life_period(life_period_id, db)


@api.put("/life-periods/{life_period_id}", response_model=LifePeriodResponse)
def update_life_period(
    life_period_id: int,
    data: LifePeriodUpdate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    life_period = get_life_period(life_period_id, db)
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
    life_period = get_life_period(life_period_id, db)
    db.delete(life_period)
    db.commit()
    return {"message": "Life period deleted successfully"}


# Experience routes. An Experience is a concrete activity inside a LifePeriod.


@api.post("/life-periods/{life_period_id}/experiences", response_model=ExperienceResponse)
def create_experience(
    life_period_id: int,
    data: ExperienceCreate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    get_life_period(life_period_id, db)
    if data.location_id is not None:
        get_location(data.location_id, db)
    check_unique_experience_title(user.id, data.title, db)
    experience = Experience(
        **data.model_dump(),
        life_period_id=life_period_id,
        user_id=user.id,
    )
    db.add(experience)
    db.commit()
    db.refresh(experience)
    return experience


@api.get("/life-periods/{life_period_id}/experiences", response_model=List[ExperienceResponse])
def get_all_experiences(
    life_period_id: int,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    experience_limit: Optional[int] = None,
    location_id: Optional[int] = None,
    db: SASession = Depends(get_db),
):
    get_life_period(life_period_id, db)
    query = db.query(Experience).filter(
        Experience.life_period_id == life_period_id)
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
    return query.all()


@api.get("/experiences/{experience_id}", response_model=ExperienceResponse)
def get_experience_route(experience_id: int, db: SASession = Depends(get_db)):
    return get_experience(experience_id, db)


@api.put("/experiences/{experience_id}", response_model=ExperienceResponse)
def update_experience(
    experience_id: int,
    data: ExperienceUpdate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    experience = get_experience(experience_id, db)
    if data.title is not None:
        check_unique_experience_title(user.id, data.title, db, experience.id)
    if data.location_id is not None:
        get_location(data.location_id, db)
    if data.life_period_id is not None:
        get_life_period(data.life_period_id, db)
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
    experience = get_experience(experience_id, db)
    db.delete(experience)
    db.commit()
    return {"message": "Experience deleted successfully"}


# MediaAsset routes. A media asset may be uploaded before it is linked to an Experience.


@api.post("/media-assets", response_model=MediaAssetResponse)
def create_media_asset(data: MediaAssetCreate, db: SASession = Depends(get_db)):
    user = get_current_user(db)
    if data.title is not None:
        check_unique_media_asset_title(user.id, data.title, db)
    if data.location_id is not None:
        get_location(data.location_id, db)
    if data.experience_id is not None:
        get_experience(data.experience_id, db)
    media_asset = MediaAsset(**data.model_dump(), user_id=user.id)
    if media_asset.captured_at is None:
        media_asset.captured_at = extract_image_metadata(data.file_url)[
            "captured_at"]
    db.add(media_asset)
    db.commit()
    db.refresh(media_asset)
    return media_asset


@api.get("/media-assets/{media_asset_id}", response_model=MediaAssetResponse)
def get_media_asset_route(media_asset_id: int, db: SASession = Depends(get_db)):
    return get_media_asset(media_asset_id, db)


@api.get("/experiences/{experience_id}/media-assets", response_model=List[MediaAssetResponse])
def get_all_media_assets(
    experience_id: int,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    media_asset_limit: Optional[int] = None,
    location_id: Optional[int] = None,
    db: SASession = Depends(get_db),
):
    get_experience(experience_id, db)
    query = db.query(MediaAsset).filter(
        MediaAsset.experience_id == experience_id)
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
    return query.all()


@api.put("/media-assets/{media_asset_id}", response_model=MediaAssetResponse)
def update_media_asset(
    media_asset_id: int,
    data: MediaAssetUpdate,
    db: SASession = Depends(get_db),
):
    user = get_current_user(db)
    media_asset = get_media_asset(media_asset_id, db)
    if data.title is not None:
        check_unique_media_asset_title(user.id, data.title, db, media_asset.id)
    if data.experience_id is not None:
        get_experience(data.experience_id, db)
    if data.location_id is not None:
        get_location(data.location_id, db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(media_asset, key, value)
    db.commit()
    db.refresh(media_asset)
    return media_asset


@api.delete("/media-assets/{media_asset_id}")
def delete_media_asset(media_asset_id: int, db: SASession = Depends(get_db)):
    media_asset = get_media_asset(media_asset_id, db)
    db.delete(media_asset)
    db.commit()
    return {"message": "Media asset deleted successfully"}
