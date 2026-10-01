from app.app_factory import create_app


def test_register_user_creates_account_and_token():
    app = create_app("testing")
    client = app.test_client()

    response = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Amina",
            "last_name": "Mugisha",
            "email": "amina@example.com",
            "phone": "+256700010101",
            "password": "StrongPass123!",
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["user"]["email"] == "amina@example.com"
    assert "token" in payload["data"]


def test_login_returns_access_token_for_existing_user():
    app = create_app("testing")
    client = app.test_client()

    client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Brian",
            "last_name": "Kato",
            "email": "brian@example.com",
            "phone": "+256700010102",
            "password": "StrongPass456!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "brian@example.com",
            "password": "StrongPass456!",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["user"]["email"] == "brian@example.com"
    assert "token" in payload["data"]
