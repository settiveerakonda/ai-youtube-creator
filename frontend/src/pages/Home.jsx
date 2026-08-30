import React from "react";

const Home = () => {
  const goToCreateVideo = () => {
    window.location.href = "/create-video";
  };

  const goToProjects = () => {
    window.location.href = "/projects";
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .home-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 10%, rgba(99, 102, 241, 0.16), transparent 30%),
            radial-gradient(circle at 85% 15%, rgba(139, 92, 246, 0.14), transparent 28%),
            #f8fafc;
          color: #111827;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .home-container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        /* NAVBAR */
        .home-nav {
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #111827;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .brand-name span {
          color: #6366f1;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-btn {
          border: 0;
          background: transparent;
          padding: 10px 16px;
          border-radius: 10px;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .nav-btn:hover {
          background: #eef2ff;
          color: #4f46e5;
        }

        .nav-primary {
          background: #4f46e5;
          color: white;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.2);
        }

        .nav-primary:hover {
          background: #4338ca;
          color: white;
        }

        /* HERO */
        .hero {
          min-height: 570px;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          align-items: center;
          gap: 70px;
          padding: 70px 0 65px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border-radius: 999px;
          background: #eef2ff;
          border: 1px solid #e0e7ff;
          color: #4f46e5;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6366f1;
        }

        .hero h1 {
          margin: 0;
          max-width: 650px;
          font-size: clamp(42px, 5vw, 68px);
          line-height: 1.03;
          letter-spacing: -3px;
          font-weight: 850;
        }

        .gradient-text {
          background: linear-gradient(90deg, #4f46e5, #7c3aed, #9333ea);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-description {
          max-width: 590px;
          margin: 24px 0 0;
          color: #64748b;
          font-size: 18px;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 30px;
        }

        .main-btn {
          border: 0;
          border-radius: 12px;
          padding: 14px 22px;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .main-btn-primary {
          color: white;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
        }

        .main-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(79, 70, 229, 0.32);
        }

        .main-btn-secondary {
          background: white;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .main-btn-secondary:hover {
          border-color: #c7d2fe;
          background: #f8faff;
        }

        .hero-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          color: #94a3b8;
          font-size: 13px;
        }

        /* HERO VISUAL */
        .hero-visual {
          position: relative;
        }

        .dashboard-card {
          position: relative;
          padding: 18px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow:
            0 30px 70px rgba(15, 23, 42, 0.12),
            0 10px 25px rgba(79, 70, 229, 0.07);
          backdrop-filter: blur(15px);
        }

        .dashboard-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .window-dots {
          display: flex;
          gap: 6px;
        }

        .window-dots i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
        }

        .dashboard-title {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .video-preview {
          min-height: 270px;
          border-radius: 17px;
          overflow: hidden;
          position: relative;
          background:
            linear-gradient(135deg, rgba(30, 41, 59, 0.94), rgba(79, 70, 229, 0.9)),
            #1e293b;
        }

        .video-glow {
          position: absolute;
          width: 180px;
          height: 180px;
          right: -40px;
          top: -45px;
          border-radius: 50%;
          background: rgba(167, 139, 250, 0.3);
          filter: blur(5px);
        }

        .video-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
        }

        .play-icon {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-left: 4px;
          font-size: 25px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.28);
          backdrop-filter: blur(8px);
          margin-bottom: 16px;
        }

        .video-content strong {
          font-size: 18px;
        }

        .video-content span {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
        }

        .pipeline {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .pipeline-item {
          padding: 11px 5px;
          text-align: center;
          border-radius: 11px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .pipeline-item div {
          font-size: 18px;
          margin-bottom: 4px;
        }

        .pipeline-item span {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        /* TRUST */
        .trust-row {
          display: flex;
          justify-content: center;
          gap: 45px;
          flex-wrap: wrap;
          padding: 18px 0 55px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 650;
        }

        /* FEATURES */
        .section {
          padding: 75px 0;
        }

        .section-header {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 45px;
        }

        .section-label {
          color: #6366f1;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 10px;
        }

        .section-header h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 44px);
          letter-spacing: -1.5px;
          line-height: 1.15;
        }

        .section-header p {
          margin: 14px auto 0;
          color: #64748b;
          line-height: 1.7;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .feature-card {
          background: white;
          border: 1px solid #e8edf4;
          border-radius: 18px;
          padding: 27px;
          transition: 0.25s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          border-color: #c7d2fe;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.07);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #eef2ff;
          font-size: 22px;
          margin-bottom: 18px;
        }

        .feature-card h3 {
          margin: 0;
          font-size: 18px;
        }

        .feature-card p {
          margin: 9px 0 0;
          color: #64748b;
          line-height: 1.65;
          font-size: 14px;
        }

        /* STEPS */
        .steps-section {
          background: #0f172a;
          color: white;
        }

        .steps-section .section-label {
          color: #a5b4fc;
        }

        .steps-section .section-header p {
          color: #94a3b8;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .step-card {
          position: relative;
          padding: 24px;
          min-height: 185px;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .step-number {
          color: #a5b4fc;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .step-card h3 {
          margin: 0;
          font-size: 17px;
        }

        .step-card p {
          margin: 9px 0 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }

        /* CTA */
        .cta {
          margin: 75px 0;
          padding: 55px 35px;
          border-radius: 25px;
          text-align: center;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          box-shadow: 0 25px 60px rgba(79, 70, 229, 0.25);
        }

        .cta h2 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          letter-spacing: -1px;
        }

        .cta p {
          max-width: 560px;
          margin: 14px auto 25px;
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.6;
        }

        .cta button {
          border: 0;
          border-radius: 11px;
          padding: 13px 22px;
          background: white;
          color: #4f46e5;
          font-weight: 800;
          cursor: pointer;
        }

        /* FOOTER */
        .footer {
          padding: 28px 0;
          border-top: 1px solid #e2e8f0;
          color: #94a3b8;
          font-size: 13px;
        }

        .footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 45px;
            padding-top: 55px;
          }

          .hero h1 {
            letter-spacing: -2px;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .steps-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .home-container {
            width: min(100% - 28px, 1180px);
          }

          .home-nav {
            height: 68px;
          }

          .brand-name {
            font-size: 17px;
          }

          .brand-icon {
            width: 38px;
            height: 38px;
          }

          .nav-btn {
            padding: 8px;
            font-size: 12px;
          }

          .nav-primary {
            padding: 9px 12px;
          }

          .hero {
            padding: 45px 0;
          }

          .hero h1 {
            font-size: 42px;
          }

          .hero-description {
            font-size: 16px;
          }

          .hero-actions {
            flex-direction: column;
          }

          .main-btn {
            width: 100%;
          }

          .pipeline {
            grid-template-columns: repeat(2, 1fr);
          }

          .steps-grid {
            grid-template-columns: 1fr;
          }

          .trust-row {
            gap: 15px;
            justify-content: flex-start;
          }

          .footer-inner {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>

      <div className="home-page">
        <div className="home-container">
          {/* NAVBAR */}
          <nav className="home-nav">
            <a href="/" className="brand">
              <div className="brand-icon">🎬</div>
              <div className="brand-name">
                AI <span>Video Creator</span>
              </div>
            </a>

            <div className="nav-actions">
              <button
                className="nav-btn"
                onClick={goToProjects}
              >
                My Projects
              </button>

              <button
                className="nav-btn nav-primary"
                onClick={goToCreateVideo}
              >
                Create Video
              </button>
            </div>
          </nav>

          {/* HERO */}
          <section className="hero">
            <div>
              <div className="hero-badge">
                <span className="badge-dot"></span>
                AI-powered video creation
              </div>

              <h1>
                Turn your ideas into{" "}
                <span className="gradient-text">
                  amazing videos.
                </span>
              </h1>

              <p className="hero-description">
                Create complete YouTube videos with AI-generated
                scripts, voiceovers, visuals and final MP4 —
                all from one simple workflow.
              </p>

              <div className="hero-actions">
                <button
                  className="main-btn main-btn-primary"
                  onClick={goToCreateVideo}
                >
                  ✨ Create Your First Video
                </button>

                <button
                  className="main-btn main-btn-secondary"
                  onClick={goToProjects}
                >
                  📁 View My Projects
                </button>
              </div>

              <div className="hero-note">
                ✓ Script → Voice → Visuals → Final Video
              </div>
            </div>

            {/* PRODUCT PREVIEW */}
            <div className="hero-visual">
              <div className="dashboard-card">
                <div className="dashboard-top">
                  <div className="window-dots">
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>

                  <div className="dashboard-title">
                    VIDEO WORKSPACE
                  </div>
                </div>

                <div className="video-preview">
                  <div className="video-glow"></div>

                  <div className="video-content">
                    <div className="play-icon">▶</div>

                    <strong>Your AI Video</strong>

                    <span>
                      Ready to create something amazing
                    </span>
                  </div>
                </div>

                <div className="pipeline">
                  <div className="pipeline-item">
                    <div>📝</div>
                    <span>Script</span>
                  </div>

                  <div className="pipeline-item">
                    <div>🎙️</div>
                    <span>Voice</span>
                  </div>

                  <div className="pipeline-item">
                    <div>🖼️</div>
                    <span>Visuals</span>
                  </div>

                  <div className="pipeline-item">
                    <div>🎬</div>
                    <span>MP4</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TRUST / CAPABILITIES */}
          <div className="trust-row">
            <span>⚡ AI Script Generation</span>
            <span>🎙️ AI Voiceover</span>
            <span>🖼️ Pexels Visuals</span>
            <span>🎬 FFmpeg Rendering</span>
          </div>
        </div>

        {/* FEATURES */}
        <section className="section">
          <div className="home-container">
            <div className="section-header">
              <div className="section-label">Everything in one place</div>

              <h2>
                From idea to finished video
              </h2>

              <p>
                A simple workflow designed to take your
                content from a topic to a complete video.
              </p>
            </div>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">🤖</div>

                <h3>AI Script</h3>

                <p>
                  Generate structured scenes and narration
                  from your video topic using AI.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🎙️</div>

                <h3>Voice Generation</h3>

                <p>
                  Turn your scenes into natural voiceovers
                  for the complete video.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🖼️</div>

                <h3>Smart Visuals</h3>

                <p>
                  Search Pexels images, upload your own
                  images and arrange them scene by scene.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="section steps-section">
          <div className="home-container">
            <div className="section-header">
              <div className="section-label">
                Simple workflow
              </div>

              <h2>
                Create a video in 4 steps
              </h2>

              <p>
                Keep your workflow simple and focus on
                creating great content.
              </p>
            </div>

            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">STEP 01</div>

                <h3>💡 Choose your idea</h3>

                <p>
                  Enter a topic or provide your own script
                  for the video.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">STEP 02</div>

                <h3>📝 Create the script</h3>

                <p>
                  AI structures your content into scenes
                  with narration and visual descriptions.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">STEP 03</div>

                <h3>🎙️ Add voice & visuals</h3>

                <p>
                  Generate voiceovers and select or upload
                  images for every scene.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">STEP 04</div>

                <h3>🎬 Generate MP4</h3>

                <p>
                  Compile everything into your final video
                  ready for preview.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="home-container">
          <section className="cta">
            <h2>Ready to create your video?</h2>

            <p>
              Start with an idea and let AI handle the
              production workflow.
            </p>

            <button onClick={goToCreateVideo}>
              ✨ Start Creating
            </button>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <div className="home-container">
            <div className="footer-inner">
              <span>
                © 2026 AI Video Creator
              </span>

              <span>
                Script • Voice • Visuals • Video
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;