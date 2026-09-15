import "./RoleSelectionPage.css";

const roles = [
  {
    name: "Supervisor / Manager",
    description: "Review survey operations, target priorities, and debris removal progress.",
  },
  {
    name: "System Administrator",
    description: "Manage system access, configuration, and database services.",
  },
  {
    name: "Sonar Analyst",
    description: "Analyze sonar images, run YOLO AI debris detection, and map findings.",
  },
  {
    name: "Marine Debris Removal Operator",
    description: "View assigned debris targets, inspect coordinates, and confirm removal.",
  },
];

export default function RoleSelectionPage({ onRoleSelect }) {
  return (
    <main className="role-selection-page">
      <section className="role-selection-panel" aria-labelledby="role-selection-title">
        <p className="role-selection-eyebrow">Marine Debris Detection System</p>
        <h1 id="role-selection-title">Select Role Workspace</h1>
        <p className="role-selection-intro">
          Choose your authorized role to access workspace tools and telemetry.
        </p>
        <div className="role-grid">
          {roles.map((role) => (
            <button
              key={role.name}
              type="button"
              className="role-card"
              onClick={() => onRoleSelect(role.name)}
            >
              <span className="role-card-title">{role.name}</span>
              <span className="role-card-description">{role.description}</span>
              <span className="role-card-arrow" aria-hidden="true">-&gt;</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}