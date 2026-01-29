export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Stock Researcher</h1>
      <p>AI-Assisted Market Research &amp; Options Strategy Platform</p>
      <nav style={{ marginTop: "2rem" }}>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: "1rem" }}>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/scan">Market Scan</a></li>
          <li><a href="/analyze">Analyze</a></li>
          <li><a href="/plans">Trade Plans</a></li>
        </ul>
      </nav>
    </main>
  );
}
