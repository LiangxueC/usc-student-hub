import { supabase } from "../api/supabase";

export default function Login() {
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>USC Student Hub</h1>
        <p style={styles.subtitle}>Track classes, assignments, and grades — all in one place.</p>
        <button onClick={handleGoogleLogin} style={styles.button}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    padding: "48px",
    border: "1px solid #e5e4e7",
    borderRadius: "12px",
    maxWidth: "400px",
    width: "100%",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 600,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: 0,
    textAlign: "center",
    color: "#6b6375",
    fontSize: "15px",
  },
  button: {
    marginTop: "8px",
    padding: "10px 24px",
    fontSize: "15px",
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: "8px",
    border: "1px solid #e5e4e7",
    background: "#fff",
    color: "#08060d",
    transition: "box-shadow 0.2s",
  },
};
