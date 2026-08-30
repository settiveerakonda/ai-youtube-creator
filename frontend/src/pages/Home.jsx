import { Link } from "react-router-dom";

function Home() {
  return (
    <div>
      <h1>AI Video Creator</h1>

      <Link to="/create-video">
        <button>Create Video</button>
      </Link>

      <Link to="/projects">
        <button>My Projects</button>
      </Link>
    </div>
  );
}

export default Home;