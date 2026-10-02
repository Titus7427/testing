from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Notification, User


def register_notification_routes(app):
    @app.get("/api/v1/notifications")
    @jwt_required()
    def list_notifications():
        user_id = int(get_jwt_identity())
        notifications = (
            Notification.query
            .filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(100)
            .all()
        )
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                    "booking_id": notification.booking_id,
                }
                for notification in notifications
            ],
        })

    @app.patch("/api/v1/notifications/<int:notification_id>/read")
    @jwt_required()
    def mark_notification_read(notification_id):
        user_id = int(get_jwt_identity())
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=user_id,
        ).first()
        if notification is None:
            return jsonify({
                "success": False,
                "error": {"code": "NOTIFICATION_NOT_FOUND", "message": "Notification not found."},
            }), 404

        notification.is_read = True
        db.session.commit()
        return jsonify({
            "success": True,
            "data": {"id": notification.id, "is_read": notification.is_read},
        })
