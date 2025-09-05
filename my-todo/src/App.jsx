import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

const STATUSES = ["Pending", "In Progress", "Completed"];

export default function App() {
  // User availability 
  const [isAvailable, setIsAvailable] = useState(() => {
    const saved = localStorage.getItem("isAvailable");
    return saved ? JSON.parse(saved) : true;
  });
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [text, setText] = useState("");
  const [due, setDue] = useState("");

  // Persist to the localStorage
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Persist availability
  useEffect(() => {
    localStorage.setItem("isAvailable", JSON.stringify(isAvailable));
  }, [isAvailable]);

  
  const overdueCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== "Completed" &&
          t.due &&
          new Date(t.due).getTime() < Date.now()
      ).length,
    [tasks]
  );

  function addTask() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newTask = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text: trimmed,
      status: "Pending",
      due: due || "",
      createdAt: new Date().toISOString(),
      highlighted: false,
      editing: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    setText("");
    setDue("");
  }

  function setStatus(id, status) {
    if (status === "Completed") {
      if (!window.confirm("Mark this task as completed?")) return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function toggleHighlight(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, highlighted: !t.highlighted } : t))
    );
  }

  function startEdit(id) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, editing: true, _draft: t.text } : t
      )
    );
  }

  function changeDraft(id, value) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, _draft: value } : t))
    );
  }

  function saveEdit(id) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, text: (t._draft || "").trim() || t.text, editing: false, _draft: undefined }
          : t
      )
    );
  }

  function cancelEdit(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, editing: false, _draft: undefined } : t))
    );
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function exportToExcel() {
    const rows = tasks.map((t) => ({
      Task: t.text,
      Status: t.status,
      "Due Date": t.due ? new Date(t.due).toLocaleDateString() : "",
      "Created At": new Date(t.createdAt).toLocaleString(),
      Highlighted: t.highlighted ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "tasks.xlsx");
  }

  const sections = useMemo(
    () => ({
      Pending: tasks.filter((t) => t.status === "Pending"),
      "In Progress": tasks.filter((t) => t.status === "In Progress"),
      Completed: tasks.filter((t) => t.status === "Completed"),
    }),
    [tasks]
  );

  return (
    <div className="wrapper">
      <header className="header">
        <h1 className="appTitle">Task Manager</h1>
        <div className="headerActions">
          <button className="btn secondary" onClick={() => setTasks([])}>
            Clear All
          </button>
          <button className="btn" onClick={exportToExcel}>
            Export to Excel
          </button>
        </div>
      </header>

      {/* User Availability Section */}
      <div className="availabilityBar">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={() => setIsAvailable((v) => !v)}
            style={{ marginRight: 8 }}
          />
          {isAvailable ? "You are available" : "You are not available"}
        </label>
      </div>

      {overdueCount > 0 && (
        <div className="banner warning">
          You have <strong>{overdueCount}</strong> overdue{" "}
          {overdueCount === 1 ? "task" : "tasks"}. Don’t forget to complete them.
        </div>
      )}

      <div className="addBar">
        <input
          className="input"
          placeholder="What do you need to do?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <input
          className="input date"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <button className="btn primary" onClick={addTask}>
          Add Task
        </button>
      </div>

      <div className="sections">
        {STATUSES.map((status) => (
          <section key={status} className="section">
            <div className="sectionHeader">
              <h2>{status}</h2>
              <span className="count">{sections[status].length}</span>
            </div>

            <ul className="list">
              {sections[status].map((t) => {
                const isOverdue =
                  t.status !== "Completed" &&
                  t.due &&
                  new Date(t.due).getTime() < Date.now();

                return (
                  <li
                    key={t.id}
                    className={[
                      "card",
                      t.highlighted ? "highlight" : "",
                      isOverdue ? "overdue" : "",
                    ].join(" ")}
                  >
                    <div className="cardMain">
                      {t.editing ? (
                        <input
                          className="editInput"
                          value={t._draft ?? ""}
                          onChange={(e) => changeDraft(t.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(t.id);
                            if (e.key === "Escape") cancelEdit(t.id);
                          }}
                          autoFocus
                        />
                      ) : (
                        <div className="text">{t.text}</div>
                      )}

                      <div className="meta">
                        {t.due && (
                          <span className="chip">
                            Due: {new Date(t.due).toLocaleDateString()}
                          </span>
                        )}
                        {isOverdue && <span className="chip danger">Overdue</span>}
                        {t.highlighted && <span className="chip info">Highlighted</span>}
                      </div>
                    </div>

                    <div className="actions">
                      {!t.editing ? (
                        <>
                          {status !== "Pending" && (
                            <button
                              className="btn tiny secondary"
                              onClick={() => setStatus(t.id, "Pending")}
                            >
                              Move to Pending
                            </button>
                          )}
                          {status !== "In Progress" && status !== "Completed" && (
                            <button
                              className="btn tiny"
                              onClick={() => setStatus(t.id, "In Progress")}
                            >
                              Start
                            </button>
                          )}
                          {status !== "Completed" && (
                            <button
                              className="btn tiny success"
                              onClick={() => setStatus(t.id, "Completed")}
                            >
                              Complete
                            </button>
                          )}
                          <button className="btn tiny secondary" onClick={() => startEdit(t.id)}>
                            Edit
                          </button>
                          <button className="btn tiny subtle" onClick={() => toggleHighlight(t.id)}>
                            {t.highlighted ? "Unhighlight" : "Highlight"}
                          </button>
                          <button className="btn tiny danger" onClick={() => deleteTask(t.id)}>
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn tiny success" onClick={() => saveEdit(t.id)}>
                            Save
                          </button>
                          <button className="btn tiny secondary" onClick={() => cancelEdit(t.id)}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
