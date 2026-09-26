from auth_router import DEFAULT_AUTH_USERS, LOCAL_USER_STORE, LoginRequest, login, seed_default_users
from auth_service import create_access_token, hash_password, verify_password


def test_password_hashing_and_token_claims():
    password = "StrongPass123!"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False

    token = create_access_token({
        "username": "analyst01",
        "role": "Sonar Analyst",
        "account_created_at": "2026-09-16T00:00:00Z",
    })

    assert isinstance(token, str)
    assert token.count(".") == 2


def test_seed_default_users_creates_manager_and_admin(monkeypatch):
    class FakeCollection:
        def __init__(self):
            self.data = {}

        def update_one(self, query, update, upsert=False):
            username = query["username"]
            self.data[username] = {
                **self.data.get(username, {}),
                **update["$set"],
                **update.get("$setOnInsert", {}),
            }

    class FakeDatabase:
        def __init__(self):
            self.users = FakeCollection()

        def __getitem__(self, key):
            return self.users

    database = FakeDatabase()
    monkeypatch.setattr("auth_router.get_database", lambda: database)

    seed_default_users()

    assert set(database.users.data) == {"manager@gmail.com", "admin@gmail.com"}
    assert set(LOCAL_USER_STORE) >= {"manager@gmail.com", "admin@gmail.com"}
    assert DEFAULT_AUTH_USERS["manager@gmail.com"]["role"] == "Supervisor / Manager"
    assert DEFAULT_AUTH_USERS["admin@gmail.com"]["role"] == "System Administrator"


def test_login_uses_seeded_account_when_database_has_no_account(monkeypatch):
    class EmptyCollection:
        def find_one(self, query):
            return None

    monkeypatch.setattr("auth_router._user_collection", lambda: EmptyCollection())
    seed_default_users()

    response = login(LoginRequest(username="Admin@Gmail.Com", password="admin123"))

    assert response.username == "admin@gmail.com"
    assert response.role == "System Administrator"


def test_login_accepts_short_seeded_account_name(monkeypatch):
    monkeypatch.setattr("auth_router._find_user", lambda identifier: None)
    seed_default_users()

    response = login(LoginRequest(username="manager", password="manager123"))

    assert response.username == "manager@gmail.com"
