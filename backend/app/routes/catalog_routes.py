from flask import jsonify

from app.extensions import db
from app.models import ProviderProfile, Service, ServiceCategory


def register_catalog_routes(app):
    @app.get("/api/v1/categories")
    def list_categories():
        categories = ServiceCategory.query.order_by(ServiceCategory.name.asc()).all()
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": category.id,
                    "name": category.name,
                    "slug": category.slug,
                    "description": category.description,
                    "icon": category.icon,
                }
                for category in categories
            ],
        })

    @app.get("/api/v1/services")
    def list_services():
        services = Service.query.order_by(Service.name.asc()).all()
        return jsonify({
            "success": True,
            "data": [service.to_dict() for service in services],
        })

    @app.get("/api/v1/providers")
    def list_providers():
        providers = ProviderProfile.query.order_by(ProviderProfile.rating.desc()).all()
        return jsonify({
            "success": True,
            "data": [provider.to_dict() for provider in providers],
        })

    @app.get("/api/v1/providers/<int:provider_id>")
    def get_provider(provider_id):
        provider = db.session.get(ProviderProfile, provider_id)
        if provider is None:
            return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Provider not found"}}), 404
        return jsonify({"success": True, "data": provider.to_dict()})
