from flask import jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ProviderProfile, Role, User, UserRole


def register_auth_routes(app):
    @app.post("/api/v1/auth/register")
    def register_user():
        payload = request.get_json(silent=True) or {}
        first_name = (payload.get("first_name") or "").strip()
        last_name = (payload.get("last_name") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        phone = (payload.get("phone") or "").strip()
        password = payload.get("password") or ""
        account_type = (payload.get("account_type") or "customer").strip().lower()
        business_name = (payload.get("business_name") or "").strip()
        service_area = (payload.get("service_area") or "").strip()

        if not first_name or not last_name or not email or not password:
            return jsonify({
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Name, email, and password are required."},
            }), 400

        if len(password) < 8:
            return jsonify({
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Password must be at least 8 characters long."},
            }), 400

        if account_type not in {"customer", "provider"}:
            return jsonify({
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Account type must be customer or provider."},
            }), 400
        if account_type == "provider" and (not business_name or not service_area):
            return jsonify({
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Business name and service area are required for provider registration."},
            }), 400

        if User.query.filter_by(email=email).first() is not None:
            return jsonify({
                "success": False,
                "error": {"code": "USER_EXISTS", "message": "A user with this email already exists."},
            }), 409

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone or None,
        )
        user.set_password(password)

        db.session.add(user)
        db.session.flush()

        role_name = "PROVIDER" if account_type == "provider" else "CUSTOMER"
        role = Role.query.filter_by(name=role_name).first()
        if role is None:
            role = Role(name=role_name, description=f"Default {account_type} role")
            db.session.add(role)
            db.session.flush()

        db.session.add(UserRole(user_id=user.id, role_id=role.id))
        if account_type == "provider":
            db.session.add(ProviderProfile(
                user_id=user.id,
                business_name=business_name,
                service_area=service_area,
                location=service_area,
                verification_status="pending",
            ))
        db.session.commit()

        token = create_access_token(identity=str(user.id), additional_claims={"role": role.name})

        return jsonify({
            "success": True,
            "data": {
                "user": user.to_public_dict(),
                "token": token,
            },
        }), 201

    @app.post("/api/v1/auth/login")
    def login_user():
        payload = request.get_json(silent=True) or {}
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if user is None or not user.check_password(password):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password."},
            }), 401

        token = create_access_token(identity=str(user.id), additional_claims={"role": user.primary_role})

        return jsonify({
            "success": True,
            "data": {
                "user": user.to_public_dict(),
                "token": token,
            },
        })

    @app.get("/api/v1/auth/me")
    @jwt_required()
    def get_current_user():
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if user is None:
            return jsonify({
                "success": False,
                "error": {"code": "USER_NOT_FOUND", "message": "User not found."},
            }), 404

        role_name = user.primary_role
        return jsonify({
            "success": True,
            "data": {
                "user": user.to_public_dict(),
                "role": role_name,
            },
        })
