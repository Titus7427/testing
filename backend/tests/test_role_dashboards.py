from app.app_factory import create_app
from app.extensions import db
from app.models import Notification, User


def test_admin_role_is_deterministic_and_can_load_dashboard():
    app = create_app("testing")
    client = app.test_client()

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@mobiserve.ug", "password": "MobiServeAdmin2026!"},
    )
    assert login.status_code == 200
    token = login.get_json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    identity = client.get("/api/v1/auth/me", headers=headers)
    assert identity.get_json()["data"]["role"] == "ADMIN"
    dashboard = client.get("/api/v1/admin/overview", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.get_json()["data"]["users"] >= 3


def test_customer_cannot_access_admin_dashboard():
    app = create_app("testing")
    client = app.test_client()
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Amina",
            "last_name": "Mugisha",
            "email": "amina@example.com",
            "password": "StrongPass123!",
        },
    )
    token = registration.get_json()["data"]["token"]

    response = client.get(
        "/api/v1/admin/overview",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_user_can_list_and_mark_own_notifications_read():
    app = create_app("testing")
    client = app.test_client()
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Amina",
            "last_name": "Mugisha",
            "email": "amina@example.com",
            "password": "StrongPass123!",
        },
    )
    token = registration.get_json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    with app.app_context():
        user = User.query.filter_by(email="amina@example.com").first()
        db.session.add(Notification(user_id=user.id, title="Test notification", message="A test alert."))
        db.session.commit()

    response = client.get("/api/v1/notifications", headers=headers)
    assert response.status_code == 200
    notification = response.get_json()["data"][0]
    marked = client.patch(f"/api/v1/notifications/{notification['id']}/read", headers=headers)
    assert marked.status_code == 200
    assert marked.get_json()["data"]["is_read"] is True


def test_provider_onboarding_requires_admin_verification():
    app = create_app("testing")
    client = app.test_client()
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Joy",
            "last_name": "Achieng",
            "email": "joy@mobiserve.ug",
            "password": "StrongPass123!",
            "account_type": "provider",
            "business_name": "Joy Electrical Care",
            "service_area": "Kisaasi, Kampala",
        },
    )
    assert registration.status_code == 201
    provider_token = registration.get_json()["data"]["token"]
    provider_headers = {"Authorization": f"Bearer {provider_token}"}
    identity = client.get("/api/v1/auth/me", headers=provider_headers)
    assert identity.get_json()["data"]["role"] == "PROVIDER"

    pending_access = client.get("/api/v1/providers/service-requests", headers=provider_headers)
    assert pending_access.status_code == 403

    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@mobiserve.ug", "password": "MobiServeAdmin2026!"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.get_json()['data']['token']}"}
    providers = client.get("/api/v1/admin/providers?status=pending", headers=admin_headers)
    pending_provider = next(
        profile for profile in providers.get_json()["data"]
        if profile["user"]["email"] == "joy@mobiserve.ug"
    )
    verified = client.patch(
        f"/api/v1/admin/providers/{pending_provider['id']}/verification",
        headers=admin_headers,
        json={"verification_status": "verified"},
    )
    assert verified.status_code == 200
    assert verified.get_json()["data"]["verification_status"] == "verified"

    notifications = client.get("/api/v1/notifications", headers=provider_headers)
    assert notifications.get_json()["data"][0]["title"] == "Provider verification updated"
