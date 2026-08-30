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
      setErrorMessage("Failed to download database list data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Drop this record sequence permanently?")) {
      try {
        const response = await axios.delete(`${API_URL}/${projectId}`);
        if (response.data.success) {
          setProjects((prev) => prev.filter((p) => p._id !== projectId));
        }
      } catch (error) {
        alert("Failed to drop execution pipeline targets.");
      }
    }
  };

  const handleEditProject = async (project) => {
    const newTopic = window.prompt("Enter new topic modifier parameters:", project.topic);
    if (newTopic && newTopic.trim() !== "" && newTopic !== project.topic) {
      try {
        const response = await axios.put(`${API_URL}/${project._id}`, {
          ...project,
          topic: newTopic.trim()
        });
        if (response.data.success) {
          setProjects((prev) => prev.map((p) => (p._id === project._id ? response.data.project : p)));
        }
      } catch (error) {
        alert("Update execution pipeline parameters rejected.");
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div style={{
      backgroundColor: "#f8fafc",
      minHeight: "100vh",
      padding: "30px 20px",
      fontFamily: "'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Dynamic Context Headers */}
        <div style={{ marginBottom: "26px", textAlign: "left" }}>
          <h1 style={{ fontSize: "24px", color: "#0f172a", fontWeight: "800", margin: "0 0 4px 0" }}>
            Production Pipelines
          </h1>
          <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>
            Monitor scripts status parameters and compile final video MP4 rendering sequences.
          </p>
        </div>

        {loading && <p style={{ textAlign: "left", color: "#64748b" }}>Syncing project workspace...</p>}
        {errorMessage && <p style={{ color: "#ef4444", textAlign: "left" }}>{errorMessage}</p>}

        {/* Fixed CSS Grid wrapper configuration blocks cards layout stretching errors completely out */}
        {!loading && projects.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: "20px",
            justifyContent: "start"
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
