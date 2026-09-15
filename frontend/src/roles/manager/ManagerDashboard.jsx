import React, { useEffect, useState } from "react";
import "./ManagerDashboard.css";
import ManagerStatCards from "./components/ManagerStatCards";
import AnalystSurveysList from "./components/AnalystSurveysList";
import SurveyDetailModal from "./components/SurveyDetailModal";
import RemovalPipeline from "./components/RemovalPipeline";
import RouteOptimizationPage from "../../pages/RouteOptimizationPage";
import { API_BASE_URL } from "../../config/api";

export default function ManagerDashboard({ activeTab = "dashboard" }) {
  const [stats, setStats] = useState({
    total_surveys: 0,
    total_detections: 0,
    validated: 0,
    high_priority: 0,
    pending_review: 0,
    removed: 0,
  });
  const [surveys, setSurveys] = useState([]);
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [activeFilterCard, setActiveFilterCard] = useState(null);

  const fetchManagerData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, surveysRes, detectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/manager/stats`),
        fetch(`${API_BASE_URL}/api/manager/surveys`),
        fetch(`${API_BASE_URL}/api/manager/detections`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (surveysRes.ok) {
        const surveysData = await surveysRes.json();
        setSurveys(surveysData);
      }
      if (detectionsRes.ok) {
        const detectionsData = await detectionsRes.json();
        setDetections(detectionsData);
      }
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
      const res = await fetch(`${API_BASE_URL}/api/manager/update-detection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update detection status");

      const data = await res.json();
      if (data.status === "success") {
        fetchManagerData();
      }
    } catch (err) {
      console.error("Update error:", err);
    }
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
        {activeTab === "dashboard" && (
          <section className="manager-section">
            <ManagerStatCards
              stats={stats}
              activeFilter={activeFilterCard}
              onFilterChange={(key) => setActiveFilterCard(activeFilterCard === key ? null : key)}
            />
          </section>
        )}

        {/* Dashboard Overview: Analyst Surveys List */}
        {activeTab === "dashboard" && (
          <section className="manager-section">
            <AnalystSurveysList
              surveys={surveys}
              onSelectSurvey={(srv) => setSelectedSurvey(srv)}
              selectedSurveyId={selectedSurvey?.survey_id}
            />
          </section>
        )}

        {/* Operational Removal Pipeline */}
        {activeTab === "removal" && (
          <section className="manager-section">
            <RemovalPipeline
              detections={detections}
              onUpdateDetection={handleUpdateDetection}
            />
          </section>
        )}

        {/* Route Optimization */}
        {activeTab === "route-optimization" && (
          <section className="manager-section">
            <RouteOptimizationPage apiBaseUrl={API_BASE_URL} />
          </section>
        )}

        {/* Survey Detailed Inspection Pop-up Modal with 2D MAP & 3D Map buttons */}
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
