from app.extensions import db, utc_now_naive


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.Integer, primary_key=True)
    service_request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey("provider_profiles.id"), nullable=False)
    agreed_price = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(30), default="accepted", nullable=False)
    scheduled_for = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now_naive, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=utc_now_naive,
        onupdate=utc_now_naive,
        nullable=False,
    )

    service_request = db.relationship("ServiceRequest", back_populates="bookings")
    customer = db.relationship("User", foreign_keys=[customer_id])
    provider = db.relationship("ProviderProfile", back_populates="bookings")
    notifications = db.relationship("Notification", back_populates="booking")
    reviews = db.relationship("Review", back_populates="booking")
