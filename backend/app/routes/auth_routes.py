from flask import jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Role, User, UserRole


def register_auth_routes(app):
    @app.post("/api/v1/auth/register")
    def register_user():
        payload = request.get_json(silent=True) or {}
        first_name = (payload.get("first_name") or "").strip()
        last_name = (payload.get("last_name") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        phone = (payload.get("phone") or "").strip()
        password = payload.get("password") or ""

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

        customer_role = Role.query.filter_by(name="CUSTOMER").first()
        if customer_role is None:
            customer_role = Role(name="CUSTOMER", description="Default customer role")
            db.session.add(customer_role)
            db.session.flush()

        db.session.add(UserRole(user_id=user.id, role_id=customer_role.id))
        db.session.commit()

        token = create_access_token(identity=str(user.id), additional_claims={"role": customer_role.name})

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

        role_name = user.roles[0].name if user.roles else "CUSTOMER"
        token = create_access_token(identity=str(user.id), additional_claims={"role": role_name})

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

        role_name = user.roles[0].name if user.roles else "CUSTOMER"
        return jsonify({
            "success": True,
            "data": {
                "user": user.to_public_dict(),
                "role": role_name,
            },
        })
