import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

import { WriteGate } from "@/components/WriteGate";
import { useAuth } from "@/context/AuthContext";

const mockUseAuth = useAuth as jest.Mock;

function mockAuth(canWrite: boolean) {
  mockUseAuth.mockReturnValue({ canWrite });
}

describe("WriteGate", () => {
  it("oculta los hijos cuando el visitante no tiene sesión", async () => {
    mockAuth(false);

    await render(
      <WriteGate>
        <Text>Crear edición</Text>
      </WriteGate>
    );

    expect(screen.queryByText("Crear edición")).toBeNull();
  });

  it("oculta los hijos cuando el usuario está autenticado pero sin Person reclamada", async () => {
    mockAuth(false);

    await render(
      <WriteGate>
        <Text>Crear edición</Text>
      </WriteGate>
    );

    expect(screen.queryByText("Crear edición")).toBeNull();
  });

  it("muestra los hijos cuando canWrite es true", async () => {
    mockAuth(true);

    await render(
      <WriteGate>
        <Text>Crear edición</Text>
      </WriteGate>
    );

    expect(screen.getByText("Crear edición")).toBeTruthy();
  });

  it("renderiza el fallback cuando no puede escribir y se provee uno", async () => {
    mockAuth(false);

    await render(
      <WriteGate fallback={<Text>Solo lectura</Text>}>
        <Text>Crear edición</Text>
      </WriteGate>
    );

    expect(screen.queryByText("Crear edición")).toBeNull();
    expect(screen.getByText("Solo lectura")).toBeTruthy();
  });
});
