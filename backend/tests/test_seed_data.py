from app import create_app


def test_demo_seed_data_is_available():
    app = create_app("testing")
    client = app.test_client()

    categories = client.get("/api/v1/categories")
    providers = client.get("/api/v1/providers")
    services = client.get("/api/v1/services")

    assert categories.status_code == 200
    assert providers.status_code == 200
    assert services.status_code == 200

    categories_payload = categories.get_json()
    providers_payload = providers.get_json()
    services_payload = services.get_json()

    assert categories_payload["success"] is True
    assert providers_payload["success"] is True
    assert services_payload["success"] is True
    assert len(categories_payload["data"]) >= 1
    assert len(providers_payload["data"]) >= 1
    assert len(services_payload["data"]) >= 1
    electrical_provider = next(
        provider
        for provider in providers_payload["data"]
        if provider["business_name"] == "Otema Electrical Services"
    )
    assert electrical_provider["latitude"] == 0.3591
    assert electrical_provider["longitude"] == 32.6153

    demo_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "customer@mobiserve.ug",
            "password": "MobiServeDemo2026!",
        },
    )
    assert demo_login.status_code == 200
    assert demo_login.get_json()["data"]["user"]["email"] == "customer@mobiserve.ug"
