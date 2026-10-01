from app.extensions import db, utc_now_naive


class ProviderProfile(db.Model):
    __tablename__ = "provider_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    business_name = db.Column(db.String(180), nullable=False)
    service_area = db.Column(db.String(200), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    description = db.Column(db.Text, nullable=True)
    verification_status = db.Column(db.String(30), nullable=False, default="pending")
    rating = db.Column(db.Float, default=0.0, nullable=False)
    completed_jobs = db.Column(db.Integer, default=0, nullable=False)
    response_rate = db.Column(db.Float, default=0.0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now_naive, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=utc_now_naive,
        onupdate=utc_now_naive,
        nullable=False,
    )

    user = db.relationship("User", back_populates="provider_profile")
    services = db.relationship("ProviderService", back_populates="provider")
    bookings = db.relationship("Booking", back_populates="provider")
    reviews = db.relationship("Review", back_populates="provider")

    def to_dict(self):
        return {
            "id": self.id,
            "business_name": self.business_name,
            "service_area": self.service_area,
            "location": self.location,
            "verification_status": self.verification_status,
            "rating": float(self.rating),
            "completed_jobs": self.completed_jobs,
            "response_rate": float(self.response_rate),
            "is_active": self.is_active,
            "user": self.user.to_public_dict() if self.user else None,
        }


class ProviderService(db.Model):
    __tablename__ = "provider_services"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("provider_profiles.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    experience_years = db.Column(db.Integer, default=0, nullable=False)
    hourly_rate = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now_naive, nullable=False)

    provider = db.relationship("ProviderProfile", back_populates="services")
    service = db.relationship("Service", back_populates="provider_services")
