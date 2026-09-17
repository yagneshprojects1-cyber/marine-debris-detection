import React, { useEffect, useState } from "react";
import "./ManagerDashboard.css";
import ManagerStatCards from "./components/ManagerStatCards";
import SurveyDetailModal from "./components/SurveyDetailModal";
import AllocationGroups from "./components/AllocationGroups";
import VerifiedDebrisList from "./components/VerifiedDebrisList";
import HistoryPage from "../../pages/HistoryPage";
import { API_BASE_URL } from "../../config/api";

export default function ManagerDashboard({ activeTab = "dashboard" }) {
  const [stats, setStats] = useState({
    total_detections: 0,
    validated: 0,
    approved: 0,
    removed: 0,
  });
  const [allocationGroups, setAllocationGroups] = useState([]);
  const [verifiedDebris, setVerifiedDebris] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [operators, setOperators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [activeFilterCard, setActiveFilterCard] = useState(null);

  const fetchManagerData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, surveysRes, groupsRes, operatorsRes, verifiedDebrisRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/manager/stats`),
        fetch(`${API_BASE_URL}/api/manager/surveys`),
        fetch(`${API_BASE_URL}/api/manager/approval-groups`),
        fetch(`${API_BASE_URL}/api/manager/operators`),
        fetch(`${API_BASE_URL}/api/manager/verified-debris`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (surveysRes.ok) setSurveys(await surveysRes.json());
      if (groupsRes.ok) setAllocationGroups(await groupsRes.json());
      if (operatorsRes.ok) setOperators(await operatorsRes.json());
      if (verifiedDebrisRes.ok) setVerifiedDebris(await verifiedDebrisRes.json());
    } catch (err) {
      console.error("Error fetching manager data from database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, []);

  const handleUpdateDetection = async (payload) => {
    try {
      const endpoint = payload.status === "Approved" ? "approve" : "update-detection";
      const res = await fetch(`${API_BASE_URL}/api/manager/${endpoint}`, {
        method: payload.status === "Approved" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update detection status");

      const data = await res.json();
      if (data.status === "success") {
        await fetchManagerData();
      }
      return data;
    } catch (err) {
      console.error("Update error:", err);
      throw err;
    }
  };

  const handleAllocate = async (group, selectedOperators) => {
    const res = await fetch(`${API_BASE_URL}/api/manager/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: group.groupId, detection_ids: group.ids, operators: selectedOperators }),
    });
    if (!res.ok) throw new Error("Unable to allocate debris for removal.");
    await fetchManagerData();
  };

  return (
    <div className="manager-dashboard-page">
      <div className="manager-dashboard-inner">
        {/* Workspace Header */}
        <header className="manager-header">
          <div>
            <span className="role-eyebrow">Supervisor / Manager Workspace</span>
            <h1 className="manager-page-title">Operations Command & Control</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-refresh-data"
              onClick={fetchManagerData}
              disabled={isLoading}
            >
              {isLoading ? "Syncing Database..." : "🔄 Sync Database"}
            </button>
          </div>
        </header>

        {/* 6 Stat Cards Section - ONLY ON DASHBOARD OVERVIEW */}
        {(activeTab === "dashboard" || activeTab === "waiting-approval") && (
          <section className="manager-section">
            <ManagerStatCards
              stats={stats}
              activeFilter={activeFilterCard}
              onFilterChange={(key) => setActiveFilterCard(activeFilterCard === key ? null : key)}
            />
          </section>
        )}

        {(activeTab === "dashboard" || activeTab === "waiting-approval") && (
          <section className="manager-section">
            <VerifiedDebrisList
              debris={verifiedDebris}
              isLoading={isLoading}
              onSelectDebris={(debris) => {
                const survey = surveys.find((item) => item.image_id === debris.image_id);
                if (survey) setSelectedSurvey(survey);
              }}
            />
          </section>
        )}

        {/* Operational Removal Pipeline */}
        {activeTab === "allocate-removal" && (
          <section className="manager-section">
            <AllocationGroups
              groups={allocationGroups}
              operators={operators}
              onAllocate={handleAllocate}
            />
          </section>
        )}

        {activeTab === "manager-history" && (
          <HistoryPage apiBaseUrl={API_BASE_URL} includeAllocationDetails />
        )}

        {selectedSurvey && (
          <SurveyDetailModal
            survey={selectedSurvey}
            onClose={() => setSelectedSurvey(null)}
            onUpdateDetection={handleUpdateDetection}
          />
        )}

      </div>
    </div>
  );
}
