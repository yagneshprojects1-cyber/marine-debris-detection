from services.manager_service import ManagerDatabaseService


def test_selects_nearest_available_group_before_creating_new_one():
    service = ManagerDatabaseService()

    groups = [
        {
            "group_id": "GRP-001",
            "latitude": 0.0,
            "longitude": 0.0,
            "detections": [
                {"latitude": 0.00001, "longitude": 0.00001},
                {"latitude": 0.00002, "longitude": 0.00002},
                {"latitude": 0.00003, "longitude": 0.00003},
                {"latitude": 0.00004, "longitude": 0.00004},
            ],
        },
        {
            "group_id": "GRP-002",
            "latitude": 0.00009,
            "longitude": 0.00009,
            "detections": [
                {"latitude": 0.00008, "longitude": 0.00008},
                {"latitude": 0.00007, "longitude": 0.00007},
            ],
        },
    ]

    detection = {"latitude": 0.00008, "longitude": 0.00008}

    selected = service._select_group_for_detection(
        groups,
        detection,
        max_group_size=5,
        cluster_radius_m=100.0,
    )

    assert selected is not None
    assert selected["group_id"] == "GRP-002"
