import { withAuth } from "next-auth/middleware";

// Protege as páginas. As rotas /api/* fazem a própria checagem no servidor
// (nunca confie só no frontend).
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false;
      if (req.nextUrl.pathname.startsWith("/admin")) return token.role === "ADMIN";
      return true;
    },
  },
});

export const config = {
  matcher: ["/admin/:path*", "/agendar", "/meus-agendamentos"],
};
