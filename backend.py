from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

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
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    life_periods: Mapped[list["LifePeriod"]] = relationship(
        back_populates="location")
    experiences: Mapped[list["Experience"]] = relationship(
        back_populates="location")
    media_assets: Mapped[list["MediaAsset"]] = relationship(
        back_populates="location")


class LifePeriod(Base):
    __tablename__ = "life_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
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

    def contains(self, day: date) -> bool:
        return self.start_date <= day <= self.end_date


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    experience_type: Mapped[str] = mapped_column(String(50), nullable=False)
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

    def overlaps_date(self, day: date) -> bool:
        return self.start_date <= day <= self.end_date


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    captured_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    media_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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


engine = create_engine(
    "postgresql+psycopg2://postgres:2029kyisreal@localhost:5432/world-travel-visual-chronicle",
    echo=True)
Session = sessionmaker(bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    session = Session()
    session.close()


if __name__ == "__main__":
    init_db()
