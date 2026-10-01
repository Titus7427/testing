from app.extensions import db, utc_now_naive


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey("provider_profiles.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now_naive, nullable=False)

    booking = db.relationship("Booking", back_populates="reviews")
    customer = db.relationship("User", foreign_keys=[customer_id])
    provider = db.relationship("ProviderProfile", back_populates="reviews")
