import React, { useEffect, useState } from "react";
import axios from "axios";
import ProjectCard from "../components/ProjectCard";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const API_URL = "http://localhost:5000/api/videos";

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get(API_URL);
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Fetch projects error:", error);
      setErrorMessage(error.response?.data?.message || "Failed to sync dashboard view with production server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Are you sure you want to drop this recording file from production history?")) {
      try {
        const response = await axios.delete(`${API_URL}/${projectId}`);
        if (response.data.success) {
          setProjects((prevProjects) => prevProjects.filter((p) => p._id !== projectId));
        }
      } catch (error) {
        alert(error.response?.data?.message || "Drop request sequence failed.");
      }
    }
  };

  const handleEditProject = async (project) => {
    const newTopic = window.prompt("Modify project recording topic line context:", project.topic);
    if (newTopic && newTopic.trim() !== "" && newTopic !== project.topic) {
      try {
        const response = await axios.put(`${API_URL}/${project._id}`, {
          ...project,
          topic: newTopic.trim()
        });
        if (response.data.success) {
          setProjects((prevProjects) =>
            prevProjects.map((p) => (p._id === project._id ? response.data.project : p))
          );
        }
      } catch (error) {
        alert(error.response?.data?.message || "Modification pipeline request rejected.");
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div style={{
      backgroundColor: "#f4f6f9",
      minHeight: "100vh",
      padding: "40px 20px",
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Dashboard Title Header Section */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", color: "#0f172a", fontWeight: "800", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
            Production Dashboard
          </h1>
          <p style={{ margin: "0", color: "#64748b", fontSize: "15px" }}>
            Monitor and execute generative video composition assets.
          </p>
        </div>

        {/* Global Loading / Exception Banners */}
        {loading && <p style={{ color: "#64748b", fontSize: "15px", fontWeight: "500" }}>Syncing environment states...</p>}
        {errorMessage && (
          <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "16px", borderRadius: "12px", marginBottom: "24px", fontSize: "14px", fontWeight: "500" }}>
            {errorMessage}
          </div>
        )}

        {/* Empty Fallback Block */}
        {!loading && !errorMessage && projects.length === 0 && (
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", textAlign: "center", border: "1px dashed #cbd5e1" }}>
            <p style={{ color: "#64748b", margin: "0", fontSize: "15px", fontWeight: "500" }}>No workspace entries registered yet.</p>
          </div>
        )}

        {/* Clean Responsive Modern Dashboard Cards Grid */}
        {!loading && projects.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "24px"
          }}>
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onDelete={handleDeleteProject}
                onEdit={handleEditProject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Projects;
