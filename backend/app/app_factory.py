from flask import Flask, jsonify

from .config import config
from .extensions import db, jwt, limiter, migrate
from .models import *  # noqa: F401,F403
from .routes.auth_routes import register_auth_routes
from .routes.admin_routes import register_admin_routes
from .routes.catalog_routes import register_catalog_routes
from .routes.notification_routes import register_notification_routes
from .routes.provider_routes import register_provider_routes
from .routes.service_request_routes import register_service_request_routes
from .services.seed_service import seed_demo_data


def create_app(config_name: str | None = None):
    app = Flask(__name__)
    app_config_name = config_name or "development"
    app.config.from_object(config[app_config_name])
    if app_config_name == "production" and any(
        not value or len(value) < 32
        for value in (app.config["SECRET_KEY"], app.config["JWT_SECRET_KEY"])
    ):
        raise RuntimeError(
            "Production requires SECRET_KEY and JWT_SECRET_KEY values of at least 32 characters."
        )
    if app_config_name == "production" and not app.config["SQLALCHEMY_DATABASE_URI"]:
        raise RuntimeError("Production requires a DATABASE_URL value.")

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)

    with app.app_context():
        if app_config_name == "testing":
            db.create_all()
            seed_demo_data()

    @app.cli.command("seed-demo")
    def seed_demo_command():
        if app_config_name == "production":
            raise RuntimeError("Demo accounts must not be seeded in production.")
        seed_demo_data()

    register_auth_routes(app)
    register_admin_routes(app)
    register_catalog_routes(app)
    register_notification_routes(app)
    register_provider_routes(app)
    register_service_request_routes(app)

    @app.get("/api/v1/health")
    def health_check():
        return jsonify({
            "success": True,
            "data": {
                "status": "ok",
                "environment": app_config_name,
                "service": "mobiserve-backend",
            },
        })

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Resource not found",
            },
        }), 404

    @app.errorhandler(500)
    def internal_error(_error):
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Something went wrong",
            },
        }), 500

    return app
