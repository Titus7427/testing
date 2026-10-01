from app.extensions import db, utc_now_naive


class ServiceRequest(db.Model):
    __tablename__ = "service_requests"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    urgency = db.Column(db.String(30), default="normal", nullable=False)
    location = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(30), default="submitted", nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now_naive, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=utc_now_naive,
        onupdate=utc_now_naive,
        nullable=False,
    )

    customer = db.relationship("User", back_populates="service_requests", foreign_keys=[customer_id])
    service = db.relationship("Service", back_populates="service_requests")
    bookings = db.relationship("Booking", back_populates="service_request")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "urgency": self.urgency,
            "location": self.location,
            "status": self.status,
            "service": self.service.to_dict() if self.service else None,
            "customer_id": self.customer_id,
        }
