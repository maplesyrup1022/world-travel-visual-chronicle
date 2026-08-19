from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from PIL import Image


class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: Optional[str] = None


class LocationCreate(BaseModel):
    name: Optional[str] = None
    city: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Optional[str] = None
    city: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SummaryMediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: str
    captured_at: Optional[date] = None
    experience_id: Optional[int] = None
    location_id: Optional[int] = None


class SummaryExperienceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    experience_type: Optional[str] = None
    start_date: date
    end_date: date
    location_id: Optional[int] = None
    life_period_id: int
    media_assets: List[SummaryMediaAssetResponse] = Field(default_factory=list)


class SummaryLifePeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    tag: Optional[str] = None
    location_id: int
    experiences: List[SummaryExperienceResponse] = Field(default_factory=list)


class LocationSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    location: LocationResponse
    life_periods: List[SummaryLifePeriodResponse]


class LifePeriodCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    tag: Optional[str] = None
    location_id: int

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError(
                "end_date must be greater than or equal to start_date")
        return self


class LifePeriodUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    tag: Optional[str] = None
    location_id: Optional[int] = None


class LifePeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    tag: Optional[str] = None
    location_id: int


class ExperienceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    experience_type: Optional[str] = None
    start_date: date
    end_date: date
    location_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError(
                "end_date must be greater than or equal to start_date")
        return self


class ExperienceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    experience_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location_id: Optional[int] = None
    life_period_id: Optional[int] = None


class ExperienceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    experience_type: Optional[str] = None
    start_date: date
    end_date: date
    location_id: Optional[int] = None
    life_period_id: int


class MediaAssetCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: str
    captured_at: Optional[date] = None
    experience_id: Optional[int] = None
    location_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_file_url(self):
        try:
            image = Image.open(self.file_url)
            image.verify()
        except (FileNotFoundError, OSError) as exception:
            raise ValueError(
                "input file url must be a valid image") from exception
        return self


class MediaAssetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    captured_at: Optional[date] = None
    experience_id: Optional[int] = None
    location_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_file_url(self):
        if self.file_url:
            try:
                image = Image.open(self.file_url)
                image.verify()
            except (FileNotFoundError, OSError) as exception:
                raise ValueError(
                    "input file url must be a valid image") from exception
        return self


class MediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: str
    captured_at: Optional[date] = None
    experience_id: Optional[int] = None
    location_id: Optional[int] = None
