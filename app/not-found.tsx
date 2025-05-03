export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>404 - Page Not Found</h1>
      <p style={{ marginBottom: "2rem" }}>Sorry, the page you are looking for does not exist.</p>
      <a
        href="/"
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#059669",
          color: "white",
          borderRadius: "0.375rem",
          textDecoration: "none",
        }}
      >
        Return Home
      </a>
    </div>
  )
}
