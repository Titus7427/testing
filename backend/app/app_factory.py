from flask import Flask, jsonify

from .config import config
from .extensions import db, jwt, limiter


def create_app(config_name: str | None = None):
    app = Flask(__name__)
    app_config_name = config_name or "development"
    app.config.from_object(config[app_config_name])

    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

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
