from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Booking, Notification, ProviderProfile, ProviderService, Role, Service, ServiceCategory, ServiceRequest, User


def admin_error(message="Administrator access is required."):
    return jsonify({
        "success": False,
        "error": {"code": "FORBIDDEN", "message": message},
    }), 403


def register_admin_routes(app):
    @app.get("/api/v1/admin/overview")
    @jwt_required()
    def admin_overview():
        user = db.session.get(User, int(get_jwt_identity()))
        if user is None or not user.is_active or not user.has_role("ADMIN"):
            return admin_error()

        provider_statuses = dict(
            db.session.query(
                ProviderProfile.verification_status,
                db.func.count(ProviderProfile.id),
            ).group_by(ProviderProfile.verification_status).all()
        )
        request_statuses = dict(
            db.session.query(
                ServiceRequest.status,
                db.func.count(ServiceRequest.id),
            ).group_by(ServiceRequest.status).all()
        )
        return jsonify({
            "success": True,
            "data": {
                "users": User.query.count(),
                "customers": db.session.query(User.id).join(User.roles).filter(Role.name == "CUSTOMER").count(),
                "providers": ProviderProfile.query.count(),
                "provider_statuses": provider_statuses,
                "requests": ServiceRequest.query.count(),
                "request_statuses": request_statuses,
                "bookings": Booking.query.count(),
                "services": Service.query.count(),
                "categories": ServiceCategory.query.count(),
            },
        })

    @app.get("/api/v1/admin/providers")
    @jwt_required()
    def admin_list_providers():
        user = db.session.get(User, int(get_jwt_identity()))
        if user is None or not user.is_active or not user.has_role("ADMIN"):
            return admin_error()

        status = request.args.get("status")
        providers_query = ProviderProfile.query.order_by(ProviderProfile.created_at.desc())
        if status in {"pending", "verified", "rejected"}:
            providers_query = providers_query.filter_by(verification_status=status)

        return jsonify({
            "success": True,
            "data": [
                {
                    **provider.to_dict(),
                    "user": provider.user.to_public_dict() if provider.user else None,
                    "services": [entry.service.to_dict() for entry in provider.services],
                }
                for provider in providers_query.all()
            ],
        })

    @app.patch("/api/v1/admin/providers/<int:provider_id>/verification")
    @jwt_required()
    def update_provider_verification(provider_id):
        user = db.session.get(User, int(get_jwt_identity()))
        if user is None or not user.is_active or not user.has_role("ADMIN"):
            return admin_error()

        payload = request.get_json(silent=True) or {}
        status = (payload.get("verification_status") or "").strip().lower()
        if status not in {"pending", "verified", "rejected"}:
            return jsonify({
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Verification status must be pending, verified, or rejected."},
            }), 400

        provider = db.session.get(ProviderProfile, provider_id)
        if provider is None:
            return jsonify({
                "success": False,
                "error": {"code": "PROVIDER_NOT_FOUND", "message": "Provider profile not found."},
            }), 404

        provider.verification_status = status
        db.session.add(Notification(
            user_id=provider.user_id,
            title="Provider verification updated",
            message=f"Your MobiServe provider profile is now {status}.",
        ))
        db.session.commit()
        return jsonify({"success": True, "data": provider.to_dict()})
