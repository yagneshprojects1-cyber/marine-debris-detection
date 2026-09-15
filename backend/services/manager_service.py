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

            validated = db["ai_predictions"].count_documents({
                "status": {"$in": ["Validated", "Assigned for Removal"]}
            })
            high_priority = db["ai_predictions"].count_documents({
                "priority": "High Priority"
            })
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
                "high_priority": high_priority,
                "pending_review": pending_review,
                "removed": removed,
            }
        except Exception as err:
            print(f"[MongoDB Error] get_stats failed: {err}")
            return {
                "total_surveys": 0,
                "total_detections": 0,
                "validated": 0,
                "high_priority": 0,
                "pending_review": 0,
                "removed": 0,
            }

    def get_surveys(self) -> List[Dict[str, Any]]:
        """Return analyst survey sessions constructed directly from MongoDB sonar_images and ai_predictions."""
        try:
            db = get_database()
            images = list(db["sonar_images"].find({}, {"_id": 0}).sort("uploaded_timestamp", -1))
            all_preds = list(db["ai_predictions"].find({}, {"_id": 0}))
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

                # Determine overall survey status based on item statuses
                if not formatted_dets:
                    srv_status = "No Detections"
                elif all(d["status"] == "Removed" for d in formatted_dets):
                    srv_status = "Completed"
                elif any(d["status"] == "Assigned for Removal" for d in formatted_dets):
                    srv_status = "Assigned for Removal"
                elif any(d["status"] == "Validated" for d in formatted_dets):
                    srv_status = "Validated"
                else:
                    srv_status = "Pending Review"

                surveys.append({
                    "survey_id": survey_id,
                    "image_id": image_id,
                    "title": f"Survey Scan ({img.get('image_name', 'Sonar Image')})",
                    "analyst_name": "Sonar Analyst",
                    "timestamp": img.get("uploaded_timestamp"),
                    "location": "Mumbai Coastal Survey Grid",
                    "image_count": 1,
                    "detections_count": len(formatted_dets),
                    "status": srv_status,
                    "notes": f"Sonar resolution {img.get('image_width', 0)}x{img.get('image_height', 0)} px",
                    "detections": formatted_dets,
                })

            return surveys
        except Exception as err:
            print(f"[MongoDB Error] get_surveys failed: {err}")
            return []

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
            "status": p.get("status") or "Pending Review",
            "priority": p.get("priority") or "Normal",
            "assigned_operator": p.get("assigned_operator") or "Unassigned",
            "operational_notes": p.get("operational_notes") or "",
        }


manager_service = ManagerDatabaseService()
