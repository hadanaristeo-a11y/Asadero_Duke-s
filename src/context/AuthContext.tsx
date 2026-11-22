
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "admin" | "mesero" | "cocina";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

type AuthContextValue = {
  user: AuthUser | null;
  login: (
    role: Role,
    correo: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("dukes-user");

    if (!saved) return null;

    try {
      return JSON.parse(saved) as AuthUser;
    } catch {
      localStorage.removeItem("dukes-user");
      return null;
    }
  });

  const value = useMemo(
    () => ({
      user,

      // INICIAR SESIÓN SIN BACKEND
      login: async (role: Role, correo: string, password: string) => {
        const usuario: AuthUser = {
          id: 1,
          name: correo.trim() || "Usuario de prueba",
          email: correo.trim(),
          role,
        };

        localStorage.setItem(
          "dukes-user",
          JSON.stringify(usuario),
        );

        setUser(usuario);
      },

      // CERRAR SESIÓN
      logout: () => {
        localStorage.removeItem("dukes-user");
        setUser(null);
      },
    }),
    [user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// UTILIZAR AUTENTICACIÓN
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider",
    );
  }

  return context;
}
