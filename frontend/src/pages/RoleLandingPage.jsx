import "./RoleLandingPage.css";

const roleDetails = {
  "Supervisor / Manager": {
    title: "Supervisor workspace",
    message: "Your operations overview will appear here.",
  },
  "System Administrator": {
    title: "System administration workspace",
    message: "System controls and configuration tools will appear here.",
  },
  "Marine Debris Removal Operator": {
    title: "Removal operator workspace",
    message: "Assigned removal tasks and routes will appear here.",
  },
};

export default function RoleLandingPage({ role }) {
  const details = roleDetails[role];

  return (
    <main className="role-landing-page">
      <section className="role-landing-content" aria-labelledby="role-landing-title">
        <p className="role-landing-eyebrow">{role}</p>
        <h1 id="role-landing-title">{details.title}</h1>
        <p>{details.message}</p>
      </section>
    </main>
  );
}