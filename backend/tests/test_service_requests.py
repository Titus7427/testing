from app.app_factory import create_app
from app.extensions import db
from app.models import ProviderProfile, ProviderService, Service, ServiceCategory, User


def register_customer(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Amina",
            "last_name": "Mugisha",
            "email": "amina@example.com",
            "password": "StrongPass123!",
        },
    )
    return response.get_json()["data"]["token"]


def create_service(app):
    with app.app_context():
        existing_service = Service.query.filter_by(slug="electrical-fault-diagnosis").first()
        if existing_service is not None:
            return existing_service.id

        category = ServiceCategory(
            name="Electrical",
            slug="electrical",
            description="Electrical work",
        )
        db.session.add(category)
        db.session.flush()
        service = Service(
            category_id=category.id,
            name="Wiring repair",
            slug="wiring-repair",
            description="Residential wiring repairs",
            base_price=75000,
        )
        db.session.add(service)
        db.session.commit()
        return service.id


def test_customer_can_create_and_list_own_service_requests():
    app = create_app("testing")
    client = app.test_client()
    token = register_customer(client)
    service_id = create_service(app)
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/v1/service-requests",
        headers=headers,
        json={
            "service_id": service_id,
            "title": "Repair a faulty socket",
            "description": "The socket sparks when I plug in an appliance.",
            "urgency": "high",
            "location": "Ntinda, Kampala",
        },
    )

    assert created.status_code == 201
    request_data = created.get_json()["data"]
    assert request_data["status"] == "submitted"
    assert request_data["service"]["id"] == service_id

    listed = client.get("/api/v1/service-requests", headers=headers)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.get_json()["data"]] == [request_data["id"]]


def test_verified_provider_can_accept_matching_request():
    app = create_app("testing")
    client = app.test_client()
    customer_token = register_customer(client)
    service_id = create_service(app)
    request_response = client.post(
        "/api/v1/service-requests",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "service_id": service_id,
            "title": "Repair a faulty socket",
            "description": "The socket sparks when I plug in an appliance.",
            "location": "Ntinda, Kampala",
        },
    )
    request_id = request_response.get_json()["data"]["id"]

    with app.app_context():
        provider_user = User(
            email="provider@example.com",
            first_name="Brian",
            last_name="Kato",
        )
        provider_user.set_password("StrongPass123!")
        db.session.add(provider_user)
        db.session.flush()
        provider_profile = ProviderProfile(
            user_id=provider_user.id,
            business_name="Kato Electricals",
            verification_status="verified",
        )
        db.session.add(provider_profile)
        db.session.flush()
        db.session.add(ProviderService(
            provider_id=provider_profile.id,
            service_id=service_id,
            hourly_rate=50000,
            is_available=True,
        ))
        db.session.commit()

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "provider@example.com", "password": "StrongPass123!"},
    )
    provider_token = login.get_json()["data"]["token"]
    provider_headers = {"Authorization": f"Bearer {provider_token}"}
    inbox = client.get("/api/v1/providers/service-requests", headers=provider_headers)
    assert inbox.status_code == 200
    inbox_item = next(item for item in inbox.get_json()["data"] if item["id"] == request_id)
    assert inbox_item["status"] == "submitted"
    assert "customer_id" not in inbox_item

    response = client.post(
        f"/api/v1/service-requests/{request_id}/bookings",
        headers=provider_headers,
        json={"agreed_price": 95000},
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["status"] == "accepted"

    duplicate = client.post(
        f"/api/v1/service-requests/{request_id}/bookings",
        headers=provider_headers,
        json={"agreed_price": 95000},
    )
    assert duplicate.status_code == 409
    refreshed_inbox = client.get("/api/v1/providers/service-requests", headers=provider_headers)
    assert request_id not in [item["id"] for item in refreshed_inbox.get_json()["data"]]


def test_service_request_creation_requires_authentication():
    app = create_app("testing")
    client = app.test_client()

    response = client.post(
        "/api/v1/service-requests",
        json={
            "service_id": 1,
            "title": "Repair a faulty socket",
            "description": "The socket sparks when I plug in an appliance.",
            "location": "Ntinda, Kampala",
        },
    )

    assert response.status_code == 401
