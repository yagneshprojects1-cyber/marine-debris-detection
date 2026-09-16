from auth_router import DEFAULT_AUTH_USERS, seed_default_users
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
    created = []

    class FakeCollection:
        def __init__(self):
            self.data = {}

        def find_one(self, query):
            return self.data.get(query.get("username"))

        def insert_one(self, document):
            self.data[document["username"]] = document
            created.append(document)

    class FakeDatabase:
        def __getitem__(self, key):
            return FakeCollection()

    monkeypatch.setattr("auth_router.get_database", lambda: FakeDatabase())

    seed_default_users()

    assert {user["username"] for user in created} == {"manager@gmail.com", "admin@gmail.com"}
    assert DEFAULT_AUTH_USERS["manager@gmail.com"]["role"] == "Supervisor / Manager"
    assert DEFAULT_AUTH_USERS["admin@gmail.com"]["role"] == "System Administrator"
