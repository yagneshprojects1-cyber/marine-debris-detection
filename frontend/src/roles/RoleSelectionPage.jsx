import "./RoleSelectionPage.css";

const roles = [
  {
    name: "Supervisor / Manager",
    description: "Review operations, activity, and team progress.",
  },
  {
    name: "System Administrator",
    description: "Manage system access, configuration, and services.",
  },
  {
    name: "Sonar Analyst",
    description: "Detect, review, and map marine debris findings.",
  },
  {
    name: "Marine Debris Removal Operator",
    description: "Coordinate removal work and follow assigned routes.",
  },
];

export default function RoleSelectionPage({ onRoleSelect }) {
  return (
    <main className="role-selection-page">
      <section className="role-selection-panel" aria-labelledby="role-selection-title">
        <p className="role-selection-eyebrow">Marine Debris Detection</p>
        <h1 id="role-selection-title">Choose your role</h1>
        <p className="role-selection-intro">
          Select a workspace to continue.
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