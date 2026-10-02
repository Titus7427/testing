from app.app_factory import create_app
from app.models import ProviderProfile


def test_provider_controls_public_location_sharing():
    app = create_app("testing")
    client = app.test_client()
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "provider@mobiserve.ug",
            "password": "MobiServeProvider2026!",
        },
    )
    token = login.get_json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    with app.app_context():
        provider = ProviderProfile.query.filter_by(business_name="Nsubuga TechWorks").first()
        provider_id = provider.id

    updated = client.patch(
        "/api/v1/provider/profile",
        headers=headers,
        json={
            "location": "Kampala Central",
            "latitude": 0.3501,
            "longitude": 32.5812,
            "show_location": True,
        },
    )
    assert updated.status_code == 200

    public_provider = client.get(f"/api/v1/providers/{provider_id}").get_json()["data"]
    assert public_provider["latitude"] == 0.3501
    assert public_provider["longitude"] == 32.5812

    hidden = client.patch(
        "/api/v1/provider/profile",
        headers=headers,
        json={"show_location": False},
    )
    assert hidden.status_code == 200
    public_provider = client.get(f"/api/v1/providers/{provider_id}").get_json()["data"]
    assert public_provider["latitude"] is None
    assert public_provider["longitude"] is None

    private_profile = client.get("/api/v1/provider/profile", headers=headers).get_json()["data"]
    assert private_profile["latitude"] == 0.3501
    assert private_profile["longitude"] == 32.5812


def test_provider_cannot_share_location_without_setting_a_pin():
    app = create_app("testing")
    client = app.test_client()
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Joy",
            "last_name": "Achieng",
            "email": "joy@example.com",
            "password": "StrongPass123!",
            "account_type": "provider",
            "business_name": "Joy Electrical Care",
            "service_area": "Kisaasi, Kampala",
        },
    )
    token = registration.get_json()["data"]["token"]

    response = client.patch(
        "/api/v1/provider/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"show_location": True},
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "LOCATION_REQUIRED"
