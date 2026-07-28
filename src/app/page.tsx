import PipelineDemo from "./components/PipelineDemo";

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <h1>
          <span>KiroSpec Studio</span>
        </h1>
        <p>
          From idea to implementation-ready specs in seconds. 4 AI agents
          working together.
        </p>
      </header>

      <PipelineDemo />
    </main>
  );
}
