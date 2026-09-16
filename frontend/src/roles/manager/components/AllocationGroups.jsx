import React, { useState } from "react";

export default function AllocationGroups({ groups, operators = [], onAllocate, allowAllocation = true, title, historyGroups = [], onEditOperators }) {
  const [selectedOperators, setSelectedOperators] = useState({});
  const [savingGroup, setSavingGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const toggleOperator = (groupId, operatorName) => {
    setSelectedOperators((current) => {
      const currentGroup = current[groupId] || [];
      const nextGroup = currentGroup.includes(operatorName)
        ? currentGroup.filter((name) => name !== operatorName)
        : [...currentGroup, operatorName];
      return { ...current, [groupId]: nextGroup };
    });
  };

  const handleAllocate = async (group) => {
    const selected = selectedOperators[group.group_id] || [];
    if (!selected.length) return;
    setSavingGroup(group.group_id);
    try {
      await onAllocate(
        { groupId: group.group_id, ids: group.detections.map((detection) => detection.id) },
        selected,
      );
    } finally {
      setSavingGroup(null);
    }
  };

  const handleEdit = async (group) => {
    const selected = selectedOperators[group.group_id] || group.operators || [];
    setSavingGroup(group.group_id);
    try {
      await onEditOperators(group.group_id, selected);
      setEditingGroup(null);
    } finally {
      setSavingGroup(null);
    }
  };

  const openEditor = (group) => {
    setSelectedOperators((current) => ({
      ...current,
      [group.group_id]: group.operators || [],
    }));
    setEditingGroup(group.group_id);
  };

  const renderOperatorPicker = (group, editMode) => (
    <fieldset className="operator-picker">
      <legend>{editMode ? "Edit assigned operators" : "Assign debris removal operator"}</legend>
      {operators.length === 0 && <p>No user with the Marine Debris Removal Operator role exists in the users database.</p>}
      {operators.map((operator) => {
        const selected = selectedOperators[group.group_id] || group.operators || [];
        return (
          <label key={operator.id}>
            <input
              type="checkbox"
              checked={selected.includes(operator.name)}
              onChange={() => toggleOperator(group.group_id, operator.name)}
            />
            <span>{operator.name}</span>
          </label>
        );
      })}
    </fieldset>
  );

  return (
    <div className="removal-pipeline-container">
      <div className="pipeline-header">
        <div>
          <h2>{title || (allowAllocation ? "Allocate to removal" : "Approved Debris Groups")}</h2>
          <p className="pipeline-subtitle">Approved debris grouped by nearest latitude and longitude, with a maximum of 10 per group.</p>
        </div>
      </div>
      {groups.length === 0 ? (
        <div className="empty-surveys-box"><p>No approved debris is waiting for allocation.</p></div>
      ) : (
        <div className="allocation-groups-grid">
          {groups.map((group) => {
            const selected = selectedOperators[group.group_id] || [];
            return (
              <article className="allocation-group-card" key={group.group_id}>
                <div className="allocation-group-header">
                  <div>
                    <h3>{group.group_id}</h3>
                    <span>{group.count} debris target{group.count === 1 ? "" : "s"}</span>
                  </div>
                  <strong>{Number(group.latitude).toFixed(4)}, {Number(group.longitude).toFixed(4)}</strong>
                </div>
                <div className="allocation-target-list">
                  {group.detections.map((detection) => (
                    <div className="allocation-target" key={detection.id}>
                      <strong>{detection.name}</strong>
                      <span>{detection.survey_id} · {Number(detection.latitude).toFixed(4)}, {Number(detection.longitude).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
                {allowAllocation && (
                  <>
                    {renderOperatorPicker(group, false)}
                    <button
                      type="button"
                      className="btn-save-decision"
                      disabled={!selected.length || savingGroup === group.group_id}
                      onClick={() => handleAllocate(group)}
                    >
                      {savingGroup === group.group_id ? "Allocating..." : "Allocate"}
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
      {allowAllocation && historyGroups.length > 0 && (
        <>
          <div className="pipeline-header allocation-history-header">
            <div>
              <h2>Created Group History</h2>
              <p className="pipeline-subtitle">Persisted groups and their allocated removal operators.</p>
            </div>
          </div>
          <div className="allocation-groups-grid">
            {historyGroups.map((group) => (
              <article className="allocation-group-card" key={`history-${group.group_id}`}>
                <div className="allocation-group-header">
                  <div><h3>{group.group_id}</h3><span>{group.count} debris targets</span></div>
                  <strong>{group.group_status}</strong>
                </div>
                <div className="allocation-target-list">
                  {group.detections.map((detection) => (
                    <div className="allocation-target" key={detection.id}>
                      <strong>{detection.name}</strong>
                      <span>{detection.survey_id}</span>
                    </div>
                  ))}
                </div>
                <p className="allocated-operator-names">
                  Operators: {group.operators?.length ? group.operators.join(", ") : "Not allocated"}
                </p>
                {editingGroup === group.group_id && renderOperatorPicker(group, true)}
                <button
                  type="button"
                  className="btn-save-decision"
                  onClick={() => (editingGroup === group.group_id ? handleEdit(group) : openEditor(group))}
                  disabled={savingGroup === group.group_id}
                >
                  {savingGroup === group.group_id ? "Saving..." : editingGroup === group.group_id ? "Save Operators" : "Edit Operators"}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}