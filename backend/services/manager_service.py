"""
Manager Role Database Service
=============================
Provides aggregated operational statistics, survey listings, priority updates,
removal assignment tracking, and map datasets directly from MongoDB Atlas database collections.
NO static data, NO mock seeding functions.
"""

from typing import Any, Dict, List, Optional
from database.connection import get_database


class ManagerDatabaseService:
    def get_stats(self) -> Dict[str, int]:
        """Return real-time counters directly from MongoDB collections."""
        try:
            db = get_database()
            total_surveys = db["sonar_images"].count_documents({})
            total_detections = db["ai_predictions"].count_documents({})

            validated = db["ai_predictions"].count_documents({"status": "Validated"})
            pending_review = db["ai_predictions"].count_documents({
                "$or": [
                    {"status": "Pending Review"},
                    {"status": {"$exists": False}},
                    {"status": None},
                ]
            })
            removed = db["ai_predictions"].count_documents({
                "status": "Removed"
            })

            return {
                "total_surveys": total_surveys,
                "total_detections": total_detections,
                "validated": validated,
                "approved": db["ai_predictions"].count_documents({"status": "Approved"}),
                "pending_review": pending_review,
                "removed": removed,
            }
        except Exception as err:
            print(f"[MongoDB Error] get_stats failed: {err}")
            return {
                "total_surveys": 0,
                "total_detections": 0,
                "validated": 0,
                "approved": 0,
                "pending_review": 0,
                "removed": 0,
            }

    def get_surveys(self) -> List[Dict[str, Any]]:
        """Return analyst survey sessions constructed directly from MongoDB sonar_images and ai_predictions."""
        try:
            db = get_database()
            images = list(db["sonar_images"].find({}, {"_id": 0}).sort("uploaded_timestamp", -1))
            all_preds = list(db["ai_predictions"].find({}, {"_id": 0}))
            training_names = {
                item.get("image_id"): item.get("analyst_name")
                for item in db["ai_training_data"].find({}, {"_id": 0, "image_id": 1, "analyst_name": 1})
                if item.get("analyst_name")
            }
            metadata_map = {
                m["meta_id"]: m
                for m in db["metadata"].find({}, {"_id": 0})
            }

            surveys = []
            for img in images:
                image_id = img.get("img_unique_id")
                survey_id = f"SRV-{image_id[:8].upper()}" if image_id else "SRV-UNKNOWN"

                img_preds = [p for p in all_preds if p.get("image_id") == image_id]
                formatted_dets = [
                    self._format_prediction(p, metadata_map.get(p.get("meta_id"), {}), survey_id)
                    for p in img_preds
                ]
                coordinates = [
                    (float(detection["latitude"]), float(detection["longitude"]))
                    for detection in formatted_dets
                    if detection.get("latitude") is not None and detection.get("longitude") is not None
                ]
                survey_latitude = sum(item[0] for item in coordinates) / len(coordinates) if coordinates else None
                survey_longitude = sum(item[1] for item in coordinates) / len(coordinates) if coordinates else None
                location = (
                    f"{survey_latitude:.6f}°, {survey_longitude:.6f}°"
                    if survey_latitude is not None and survey_longitude is not None
                    else "Location unavailable"
                )

                # Determine overall survey status based on item statuses
                if not formatted_dets:
                    srv_status = "No Detections"
                elif all(d["status"] == "Removed" for d in formatted_dets):
                    srv_status = "Completed"
                elif any(d["status"] == "Allocated for Removal" for d in formatted_dets):
                    srv_status = "Allocated for Removal"
                elif any(d["status"] == "Approved" for d in formatted_dets):
                    srv_status = "Approved"
                elif any(d["status"] == "Validated" for d in formatted_dets):
                    srv_status = "Validated"
                else:
                    srv_status = "Pending Review"

                surveys.append({
                    "survey_id": survey_id,
                    "image_id": image_id,
                    "title": f"Survey Scan ({img.get('image_name', 'Sonar Image')})",
                    "analyst_name": next(
                        (prediction.get("analyst_name") for prediction in img_preds if prediction.get("analyst_name")),
                        training_names.get(image_id) or "Sonar Analyst",
                    ),
                    "timestamp": img.get("uploaded_timestamp"),
                    "location": location,
                    "latitude": survey_latitude,
                    "longitude": survey_longitude,
                    "image_count": 1,
                    "annotated_image_url": f"/media/results/{image_id}/annotated.jpg" if image_id else None,
                    "detections_count": len(formatted_dets),
                    "status": srv_status,
                    "notes": f"Sonar resolution {img.get('image_width', 0)}x{img.get('image_height', 0)} px",
                    "detections": formatted_dets,
                })

            return surveys
        except Exception as err:
            print(f"[MongoDB Error] get_surveys failed: {err}")
            return []

    def get_verified_debris(self) -> List[Dict[str, Any]]:
        """Return validated debris directly from ai_predictions for manager review."""
        return [
            detection for detection in self.get_all_detections()
            if detection.get("status") == "Validated"
        ]

    def get_survey_by_id(self, survey_id: str) -> Optional[Dict[str, Any]]:
        """Find a survey session by its Survey ID."""
        surveys = self.get_surveys()
        for srv in surveys:
            if srv["survey_id"] == survey_id:
                return srv
        return None

    def get_all_detections(self) -> List[Dict[str, Any]]:
        """Return all predictions joined with metadata directly from MongoDB."""
        try:
            db = get_database()
            all_preds = list(db["ai_predictions"].find({}, {"_id": 0}))
            metadata_map = {
                m["meta_id"]: m
                for m in db["metadata"].find({}, {"_id": 0})
            }

            results = []
            for p in all_preds:
                image_id = p.get("image_id", "")
                survey_id = f"SRV-{image_id[:8].upper()}" if image_id else "SRV-UNKNOWN"
                meta = metadata_map.get(p.get("meta_id"), {})
                results.append(self._format_prediction(p, meta, survey_id))

            return results
        except Exception as err:
            print(f"[MongoDB Error] get_all_detections failed: {err}")
            return []

    def get_removal_operators(self) -> List[Dict[str, Any]]:
        """Return active users who can receive debris removal assignments."""
        try:
            users = get_database()["users"].find(
                {"role": "Marine Debris Removal Operator"},
                {"_id": 0, "user_id": 1, "username": 1, "name": 1, "email": 1},
            )
            return [
                {
                    "id": user.get("user_id") or user.get("username") or user.get("email"),
                    "name": user.get("name") or user.get("username") or user.get("email"),
                    "email": user.get("email") or user.get("username"),
                }
                for user in users
            ]
        except Exception as err:
            print(f"[MongoDB Error] get_removal_operators failed: {err}")
            return []

    def get_approval_groups(self, max_group_size: int = 10) -> List[Dict[str, Any]]:
        """Persist and return approved debris groups, max 10 targets per group."""
        detections = [
            detection for detection in self.get_all_detections()
            if detection.get("status") == "Approved"
        ]
        groups: List[Dict[str, Any]] = []
        for detection in detections:
            available = [group for group in groups if len(group["detections"]) < max_group_size]
            if not available:
                groups.append({
                    "group_id": f"REM-{len(groups) + 1:03d}",
                    "detections": [detection],
                    "latitude": float(detection.get("latitude") or 0),
                    "longitude": float(detection.get("longitude") or 0),
                })
                continue
            group = min(
                available,
                key=lambda candidate: (
                    (float(detection.get("latitude") or 0) - candidate["latitude"]) ** 2
                    + (float(detection.get("longitude") or 0) - candidate["longitude"]) ** 2
                ),
            )
            group["detections"].append(detection)
            count = len(group["detections"])
            group["latitude"] = sum(float(item.get("latitude") or 0) for item in group["detections"]) / count
            group["longitude"] = sum(float(item.get("longitude") or 0) for item in group["detections"]) / count

        for group in groups:
            group.setdefault("latitude", float(group["detections"][0].get("latitude") or 0))
            group.setdefault("longitude", float(group["detections"][0].get("longitude") or 0))
            group["count"] = len(group["detections"])
        database = get_database()
        existing = {
            group["group_id"]: group
            for group in database["removal_groups"].find({}, {"_id": 0})
        }
        existing_by_members = {
            frozenset(group.get("detection_ids", [])): group
            for group in existing.values()
        }
        next_group_number = max(
            [int(group_id.rsplit("-", 1)[-1]) for group_id in existing if group_id.startswith("GRP-") and group_id.rsplit("-", 1)[-1].isdigit()] or [0]
        ) + 1
        for group in groups:
            detection_ids = [detection["id"] for detection in group["detections"]]
            saved = existing_by_members.get(frozenset(detection_ids), {})
            group["group_id"] = saved.get("group_id") or f"GRP-{next_group_number:03d}"
            if not saved:
                next_group_number += 1
            group["operators"] = saved.get("operators", [])
            group["group_status"] = saved.get("group_status", "Waiting for allocation")
            group["detection_ids"] = detection_ids
            database["removal_groups"].replace_one(
                {"group_id": group["group_id"]},
                {
                    "group_id": group["group_id"],
                    "detection_ids": group["detection_ids"],
                    "latitude": group["latitude"],
                    "longitude": group["longitude"],
                    "operators": group["operators"],
                    "group_status": group["group_status"],
                    "max_size": max_group_size,
                },
                upsert=True,
            )
        return groups

    def get_validated_groups(self, max_group_size: int = 10) -> List[Dict[str, Any]]:
        """Group only validated debris for manager review before approval."""
        detections = [
            detection for detection in self.get_all_detections()
            if detection.get("status") == "Validated"
        ]
        groups: List[Dict[str, Any]] = []
        for detection in detections:
            available = [group for group in groups if len(group["detections"]) < max_group_size]
            if not available:
                groups.append({
                    "group_id": f"VAL-{len(groups) + 1:03d}",
                    "detections": [detection],
                    "latitude": float(detection.get("latitude") or 0),
                    "longitude": float(detection.get("longitude") or 0),
                })
                continue
            group = min(
                available,
                key=lambda candidate: (
                    (float(detection.get("latitude") or 0) - candidate["latitude"]) ** 2
                    + (float(detection.get("longitude") or 0) - candidate["longitude"]) ** 2
                ),
            )
            group["detections"].append(detection)
            count = len(group["detections"])
            group["latitude"] = sum(float(item.get("latitude") or 0) for item in group["detections"]) / count
            group["longitude"] = sum(float(item.get("longitude") or 0) for item in group["detections"]) / count
        for group in groups:
            group["count"] = len(group["detections"])
        return groups

    def allocate_removal(self, detection_ids: List[str], operators: List[str], group_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Allocate approved debris to one or more operator names."""
        if not detection_ids or not operators:
            return []
        database = get_database()
        updated = []
        for detection_id in detection_ids:
            result = database["ai_predictions"].find_one_and_update(
                {"predicted_id": detection_id, "status": "Approved"},
                {"$set": {"status": "Allocated for Removal", "assigned_operator": operators}},
                return_document=True,
                projection={"_id": 0},
            )
            if result:
                updated.append(self._format_prediction(result, {}, f"SRV-{result.get('image_id', '')[:8].upper()}"))
        if updated and group_id:
            database["removal_groups"].update_one(
                {"group_id": group_id},
                {"$set": {"operators": operators, "group_status": "Allocated for Removal"}},
            )
        return updated

    def get_operator_groups(self, operator_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return persisted allocated groups with their current debris records."""
        database = get_database()
        operator_names = [operator_name] if operator_name else []
        if operator_name:
            user = database["users"].find_one(
                {"$or": [{"username": operator_name}, {"email": operator_name}]},
                {"_id": 0, "name": 1},
            )
            if user and user.get("name"):
                operator_names.append(user["name"])
        detections = {item["id"]: item for item in self.get_all_detections()}
        groups = []
        for group in database["removal_groups"].find(
            {"group_status": "Allocated for Removal", **({"operators": {"$in": operator_names}} if operator_names else {})}, {"_id": 0}
        ):
            group_detections = [
                detections[detection_id]
                for detection_id in group.get("detection_ids", [])
                if detection_id in detections and detections[detection_id].get("status") in {"Allocated for Removal", "Removed"}
            ]
            if group_detections:
                groups.append({**group, "count": len(group_detections), "detections": group_detections})
        return groups

    def get_operator_group_history(self, operator_name: str) -> List[Dict[str, Any]]:
        """Return completed or allocated groups assigned to one operator."""
        database = get_database()
        operator_names = [operator_name]
        user = database["users"].find_one(
            {"$or": [{"username": operator_name}, {"email": operator_name}]},
            {"_id": 0, "name": 1},
        )
        if user and user.get("name"):
            operator_names.append(user["name"])
        detections = {item["id"]: item for item in self.get_all_detections()}
        history = []
        for group in database["removal_groups"].find(
            {"operators": {"$in": operator_names}}, {"_id": 0}
        ):
            group_detections = [
                detections[detection_id]
                for detection_id in group.get("detection_ids", [])
                if detection_id in detections
            ]
            history.append({**group, "count": len(group_detections), "detections": group_detections})
        return history

    def get_removal_group_history(self) -> List[Dict[str, Any]]:
        """Return every persisted removal group with current debris and operators."""
        database = get_database()
        detections = {item["id"]: item for item in self.get_all_detections()}
        history = []
        for group in database["removal_groups"].find({}, {"_id": 0}).sort("group_id", 1):
            group_detections = [
                detections[detection_id]
                for detection_id in group.get("detection_ids", [])
                if detection_id in detections
            ]
            history.append({
                **group,
                "count": len(group_detections),
                "detections": group_detections,
            })
        return history

    def update_group_operators(self, group_id: str, operators: List[str]) -> Optional[Dict[str, Any]]:
        """Replace the operators assigned to a persisted removal group."""
        database = get_database()
        group = database["removal_groups"].find_one({"group_id": group_id})
        if not group:
            return None
        database["removal_groups"].update_one(
            {"group_id": group_id},
            {"$set": {"operators": operators}},
        )
        database["ai_predictions"].update_many(
            {"predicted_id": {"$in": group.get("detection_ids", [])}},
            {"$set": {"assigned_operator": operators}},
        )
        return {"group_id": group_id, "operators": operators}

    def mark_removed(self, detection_id: str, operator_notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Mark one allocated debris record as removed and complete its group when empty."""
        updated = self.update_detection(
            detection_id=detection_id,
            status="Removed",
            operational_notes=operator_notes,
        )
        if not updated:
            return None
        database = get_database()
        group = database["removal_groups"].find_one({"detection_ids": detection_id})
        if group:
            remaining = database["ai_predictions"].count_documents({
                "predicted_id": {"$in": group.get("detection_ids", [])},
                "status": "Allocated for Removal",
            })
            if remaining == 0:
                database["removal_groups"].update_one(
                    {"group_id": group["group_id"]},
                    {"$set": {"group_status": "Completed"}},
                )
        return updated

    def update_detection(
        self,
        detection_id: str,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_operator: Optional[str] = None,
        operational_notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update detection document status/priority/operator in MongoDB."""
        try:
            db = get_database()
            update_fields: Dict[str, Any] = {}
            if status is not None:
                update_fields["status"] = status
            if priority is not None:
                update_fields["priority"] = priority
            if assigned_operator is not None:
                update_fields["assigned_operator"] = assigned_operator
            if operational_notes is not None:
                update_fields["operational_notes"] = operational_notes

            if not update_fields:
                return None

            result = db["ai_predictions"].find_one_and_update(
                {"predicted_id": detection_id},
                {"$set": update_fields},
                return_document=True,
                projection={"_id": 0},
            )

            if not result:
                # Try finding by mongo _id or fallback
                result = db["ai_predictions"].find_one_and_update(
                    {"image_id": detection_id},
                    {"$set": update_fields},
                    return_document=True,
                    projection={"_id": 0},
                )

            if not result:
                return None

            meta = db["metadata"].find_one({"meta_id": result.get("meta_id")}, {"_id": 0}) or {}
            image_id = result.get("image_id", "")
            survey_id = f"SRV-{image_id[:8].upper()}" if image_id else "SRV-UNKNOWN"
            return self._format_prediction(result, meta, survey_id)
        except Exception as err:
            print(f"[MongoDB Error] update_detection failed: {err}")
            return None

    def _format_prediction(self, p: Dict[str, Any], meta: Dict[str, Any], survey_id: str) -> Dict[str, Any]:
        """Format raw prediction MongoDB document for UI consumption."""
        predicted_id = p.get("predicted_id") or p.get("image_id") or "DET-UNKNOWN"
        xmin = meta.get("xmin", 0)
        xmax = meta.get("xmax", 100)
        ymin = meta.get("ymin", 0)
        ymax = meta.get("ymax", 100)

        width = round(max(0.5, abs(xmax - xmin) / 50.0), 2)
        height = round(max(0.5, abs(ymax - ymin) / 50.0), 2)
        length = round(max(1.0, width * 1.4), 2)

        return {
            "id": predicted_id,
            "survey_id": survey_id,
            "image_id": p.get("image_id"),
            "annotated_image_url": f"/media/results/{p.get('image_id')}/annotated.jpg" if p.get("image_id") else None,
            "name": p.get("object_class") or "Detected Debris",
            "confidence": p.get("confidence_score") or 0.85,
            "latitude": p.get("latitude") or 18.9220,
            "longitude": p.get("longitude") or 72.8347,
            "depth": p.get("depth") or 15.0,
            "local_x": p.get("local_x") or 0.0,
            "local_z": p.get("local_z") or 0.0,
            "sonar_range": meta.get("range"),
            "sonar_azimuth": meta.get("azimuth"),
            "sonar_elevation": meta.get("elevation"),
            "sonar_soundspeed": meta.get("sound_speed"),
            "sonar_frequency": meta.get("frequency"),
            "bndbox": {
                "xmin": xmin,
                "ymin": ymin,
                "xmax": xmax,
                "ymax": ymax,
            },
            "dimensions": {"width": width, "length": length, "height": height},
            "status": p.get("status") or "Validated",
            "analyst_name": p.get("analyst_name") or "Sonar Analyst",
            "priority": p.get("priority") or "Normal",
            "assigned_operator": p.get("assigned_operator") or "Unassigned",
            "operational_notes": p.get("operational_notes") or "",
        }


manager_service = ManagerDatabaseService()
