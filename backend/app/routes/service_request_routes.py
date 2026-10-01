from decimal import Decimal, InvalidOperation

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import (
    Booking,
    Notification,
    ProviderProfile,
    ProviderService,
    Service,
    ServiceRequest,
    User,
)


def error_response(code, message, status):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message},
    }), status


def register_service_request_routes(app):
    @app.post("/api/v1/service-requests")
    @jwt_required()
    def create_service_request():
        user = db.session.get(User, int(get_jwt_identity()))
        if user is None or not user.is_active:
            return error_response("USER_NOT_FOUND", "Active user account not found.", 401)

        payload = request.get_json(silent=True) or {}
        service_id = payload.get("service_id")
        title = (payload.get("title") or "").strip()
        description = (payload.get("description") or "").strip()
        urgency = (payload.get("urgency") or "normal").strip().lower()
        location = (payload.get("location") or "").strip()

        if not service_id or not title or not description or not location:
            return error_response(
                "VALIDATION_ERROR",
                "Service, title, description, and location are required.",
                400,
            )
        if len(title) > 180 or len(location) > 200:
            return error_response("VALIDATION_ERROR", "Title or location is too long.", 400)
        if urgency not in {"low", "normal", "high", "emergency"}:
            return error_response("VALIDATION_ERROR", "Urgency is not supported.", 400)

        try:
            service_id = int(service_id)
        except (TypeError, ValueError):
            return error_response("VALIDATION_ERROR", "Service ID must be an integer.", 400)

        service = db.session.get(Service, service_id)
        if service is None or not service.is_active:
            return error_response("SERVICE_NOT_FOUND", "Active service not found.", 404)

        service_request = ServiceRequest(
            customer_id=user.id,
            service_id=service.id,
            title=title,
            description=description,
            urgency=urgency,
            location=location,
            status="submitted",
        )
        db.session.add(service_request)
        db.session.commit()

        return jsonify({"success": True, "data": service_request.to_dict()}), 201

    @app.get("/api/v1/service-requests")
    @jwt_required()
    def list_service_requests():
        user_id = int(get_jwt_identity())
        service_requests = (
            ServiceRequest.query
            .filter_by(customer_id=user_id)
            .order_by(ServiceRequest.created_at.desc(), ServiceRequest.id.desc())
            .all()
        )
        return jsonify({
            "success": True,
            "data": [service_request.to_dict() for service_request in service_requests],
        })

    @app.get("/api/v1/providers/service-requests")
    @jwt_required()
    def list_provider_service_requests():
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        provider = ProviderProfile.query.filter_by(user_id=user_id).first()
        if user is None or not user.is_active:
            return error_response("USER_NOT_FOUND", "Active user account not found.", 401)
        if provider is None or not provider.is_active or provider.verification_status != "verified":
            return error_response(
                "PROVIDER_NOT_VERIFIED",
                "An active, verified provider profile is required.",
                403,
            )

        service_ids = db.session.query(ProviderService.service_id).filter_by(
            provider_id=provider.id,
            is_available=True,
        )
        service_requests = (
            ServiceRequest.query
            .filter(
                ServiceRequest.service_id.in_(service_ids),
                ServiceRequest.status == "submitted",
                ServiceRequest.customer_id != user_id,
            )
            .order_by(ServiceRequest.created_at.desc(), ServiceRequest.id.desc())
            .all()
        )
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": service_request.id,
                    "title": service_request.title,
                    "description": service_request.description,
                    "urgency": service_request.urgency,
                    "location": service_request.location,
                    "status": service_request.status,
                    "service": service_request.service.to_dict(),
                }
                for service_request in service_requests
            ],
        })

    @app.post("/api/v1/service-requests/<int:request_id>/bookings")
    @jwt_required()
    def accept_service_request(request_id):
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if user is None or not user.is_active:
            return error_response("USER_NOT_FOUND", "Active user account not found.", 401)

        provider = ProviderProfile.query.filter_by(user_id=user.id).first()
        if provider is None or not provider.is_active or provider.verification_status != "verified":
            return error_response(
                "PROVIDER_NOT_VERIFIED",
                "An active, verified provider profile is required.",
                403,
            )

        payload = request.get_json(silent=True) or {}
        try:
            agreed_price = Decimal(str(payload.get("agreed_price", "")))
        except (InvalidOperation, ValueError):
            return error_response("VALIDATION_ERROR", "A valid agreed price is required.", 400)
        if not agreed_price.is_finite() or agreed_price <= 0 or agreed_price > Decimal("99999999.99"):
            return error_response("VALIDATION_ERROR", "Agreed price must be a positive amount.", 400)
        if max(-agreed_price.as_tuple().exponent, 0) > 2:
            return error_response("VALIDATION_ERROR", "Agreed price supports at most two decimals.", 400)

        service_request = (
            ServiceRequest.query
            .filter_by(id=request_id)
            .with_for_update()
            .first()
        )
        if service_request is None:
            return error_response("REQUEST_NOT_FOUND", "Service request not found.", 404)
        if service_request.customer_id == user.id:
            return error_response("FORBIDDEN", "You cannot accept your own request.", 403)
        if service_request.status != "submitted":
            return error_response("REQUEST_UNAVAILABLE", "This request is no longer available.", 409)

        provider_service = ProviderService.query.filter_by(
            provider_id=provider.id,
            service_id=service_request.service_id,
            is_available=True,
        ).first()
        if provider_service is None:
            return error_response(
                "SERVICE_NOT_OFFERED",
                "Your provider profile does not offer this service.",
                403,
            )

        booking = Booking(
            service_request_id=service_request.id,
            customer_id=service_request.customer_id,
            provider_id=provider.id,
            agreed_price=agreed_price,
            status="accepted",
        )
        service_request.status = "accepted"
        db.session.add(booking)
        db.session.flush()
        db.session.add(Notification(
            user_id=service_request.customer_id,
            booking_id=booking.id,
            title="Provider accepted your request",
            message=f"{provider.business_name} accepted your request for {service_request.service.name}.",
        ))
        db.session.commit()

        return jsonify({
            "success": True,
            "data": {
                "id": booking.id,
                "service_request_id": booking.service_request_id,
                "provider_id": booking.provider_id,
                "agreed_price": float(booking.agreed_price),
                "status": booking.status,
            },
        }), 201
