from __future__ import annotations

from datetime import date
from typing import Optional
import os
from dotenv import load_dotenv

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text, create_engine, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    '''ORM mappings must be declared on the class, not created inside __init__.
    SQLAlchemy reads class-level attributes at class-definition time to build
    table/column metadata and relationships. __init__ runs later (when an instance is created),
    so attributes set there are just normal Python attributes and are not registered as mapped columns.
    '''

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    life_periods: Mapped[list["LifePeriod"]] = relationship(
        back_populates="user", cascade="all, delete-orphan")
    experiences: Mapped[list["Experience"]] = relationship(
        back_populates="user", cascade="all, delete-orphan")
    media_assets: Mapped[list["MediaAsset"]] = relationship(
        back_populates="user", cascade="all, delete-orphan")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("city", "country", name="uq_location_city_country"),
    )

    life_periods: Mapped[list["LifePeriod"]] = relationship(
        back_populates="location")
    experiences: Mapped[list["Experience"]] = relationship(
        back_populates="location")
    media_assets: Mapped[list["MediaAsset"]] = relationship(
        back_populates="location")


class LifePeriod(Base):
    __tablename__ = "life_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    tag: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False)

    location: Mapped[Location] = relationship(back_populates="life_periods")
    user: Mapped[User] = relationship(back_populates="life_periods")
    experiences: Mapped[list["Experience"]] = relationship(
        back_populates="life_period", cascade="all, delete-orphan")


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    experience_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    location_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("locations.id"), nullable=True)
    life_period_id: Mapped[int] = mapped_column(
        ForeignKey("life_periods.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False)

    location: Mapped[Optional[Location]] = relationship(
        back_populates="experiences")
    life_period: Mapped[Optional[LifePeriod]] = relationship(
        back_populates="experiences")
    user: Mapped[User] = relationship(back_populates="experiences")
    media_assets: Mapped[list["MediaAsset"]] = relationship(
        back_populates="experience", cascade="all, delete-orphan")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # we only deal with pictures now, implement video type later
    # media_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    captured_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    experience_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("experiences.id"), nullable=True)
    location_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("locations.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False)

    experience: Mapped[Optional[Experience]] = relationship(
        back_populates="media_assets")
    location: Mapped[Optional[Location]] = relationship(
        back_populates="media_assets")
    user: Mapped[User] = relationship(back_populates="media_assets")


load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)
Session = sessionmaker(bind=engine)


def init_db() -> None:
    # Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = Session()
    session.close()


if __name__ == "__main__":
    init_db()
