import { fireEvent, render, screen } from "@testing-library/react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { SignInPrompt } from "@/components/SignInPrompt";
import { ThemeProvider } from "@/theme";

describe("SignInPrompt", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("muestra la CTA de iniciar sesión con Google", async () => {
    await render(
      <ThemeProvider>
        <SignInPrompt />
      </ThemeProvider>
    );

    expect(screen.getByText("Accede con tu cuenta")).toBeTruthy();
    expect(screen.getByText("Iniciar sesión con Google")).toBeTruthy();
  });

  it("navega a /sign-in al pulsar la CTA", async () => {
    await render(
      <ThemeProvider>
        <SignInPrompt />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByText("Iniciar sesión con Google"));

    expect(mockPush).toHaveBeenCalledWith("/sign-in");
  });
});
