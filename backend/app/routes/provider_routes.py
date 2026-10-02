from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ProviderProfile, ProviderService, Service, User


def register_provider_routes(app):
    @app.get("/api/v1/provider/profile")
    @jwt_required()
    def get_provider_profile():
        user = db.session.get(User, int(get_jwt_identity()))
        provider = ProviderProfile.query.filter_by(user_id=user.id).first() if user else None
        if provider is None:
            return jsonify({
                "success": False,
                "error": {"code": "PROVIDER_PROFILE_NOT_FOUND", "message": "Provider profile not found."},
            }), 404

        profile = provider.to_dict()
        profile["show_location"] = provider.show_location
        profile["latitude"] = provider.latitude
        profile["longitude"] = provider.longitude
        profile["service_ids"] = [item.service_id for item in provider.services]
        return jsonify({"success": True, "data": profile})

    @app.patch("/api/v1/provider/profile")
    @jwt_required()
    def update_provider_profile():
        user = db.session.get(User, int(get_jwt_identity()))
        if user is None or not user.is_active:
            return jsonify({
                "success": False,
                "error": {"code": "USER_NOT_FOUND", "message": "Active user account not found."},
            }), 401

        provider = ProviderProfile.query.filter_by(user_id=user.id).first()
        if provider is None:
            return jsonify({
                "success": False,
                "error": {"code": "PROVIDER_PROFILE_NOT_FOUND", "message": "Create a provider account to manage this profile."},
            }), 403

        payload = request.get_json(silent=True) or {}
        if "location" in payload:
            location = payload["location"]
            if not isinstance(location, str) or len(location.strip()) > 200:
                return jsonify({
                    "success": False,
                    "error": {"code": "VALIDATION_ERROR", "message": "Location must be at most 200 characters."},
                }), 400
            provider.location = location.strip() or None

        if "show_location" in payload:
            if not isinstance(payload["show_location"], bool):
                return jsonify({
                    "success": False,
                    "error": {"code": "VALIDATION_ERROR", "message": "show_location must be true or false."},
                }), 400
            provider.show_location = payload["show_location"]

        coordinate_fields = {"latitude", "longitude"} & payload.keys()
        if coordinate_fields and coordinate_fields != {"latitude", "longitude"}:
            return jsonify({
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Latitude and longitude must be provided together."},
            }), 400
        if coordinate_fields:
            try:
                latitude = float(payload["latitude"])
                longitude = float(payload["longitude"])
            except (TypeError, ValueError):
                return jsonify({
                    "success": False,
                    "error": {"code": "VALIDATION_ERROR", "message": "Coordinates must be valid numbers."},
                }), 400
            if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                return jsonify({
                    "success": False,
                    "error": {"code": "VALIDATION_ERROR", "message": "Coordinates are outside valid latitude/longitude bounds."},
                }), 400
            provider.latitude = latitude
            provider.longitude = longitude

        if provider.show_location and (provider.latitude is None or provider.longitude is None):
            return jsonify({
                "success": False,
                "error": {"code": "LOCATION_REQUIRED", "message": "Add a map pin before sharing your location."},
            }), 400

        db.session.commit()
        return jsonify({"success": True, "data": provider.to_dict()})

    @app.put("/api/v1/provider/services")
    @jwt_required()
    def update_provider_services():
        user = db.session.get(User, int(get_jwt_identity()))
        provider = ProviderProfile.query.filter_by(user_id=user.id).first() if user else None
        if provider is None:
            return jsonify({
                "success": False,
                "error": {"code": "PROVIDER_PROFILE_NOT_FOUND", "message": "Provider profile not found."},
            }), 404

        payload = request.get_json(silent=True) or {}
        service_ids = payload.get("service_ids")
        if not isinstance(service_ids, list) or any(not isinstance(item, int) for item in service_ids):
            return jsonify({
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "service_ids must be a list of service IDs."},
            }), 400

        service_ids = set(service_ids)
        services = Service.query.filter(Service.id.in_(service_ids), Service.is_active.is_(True)).all() if service_ids else []
        if len(services) != len(service_ids):
            return jsonify({
                "success": False,
                "error": {"code": "SERVICE_NOT_FOUND", "message": "One or more selected services are unavailable."},
            }), 400

        current_entries = ProviderService.query.filter_by(provider_id=provider.id).all()
        current_ids = {entry.service_id for entry in current_entries}
        for entry in current_entries:
            if entry.service_id not in service_ids:
                db.session.delete(entry)
        for service in services:
            if service.id not in current_ids:
                db.session.add(ProviderService(
                    provider_id=provider.id,
                    service_id=service.id,
                    hourly_rate=service.base_price,
                    is_available=True,
                ))

        db.session.commit()
        return jsonify({"success": True, "data": sorted(service_ids)})
